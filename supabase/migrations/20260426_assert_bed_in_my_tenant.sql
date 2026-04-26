-- Add the second tenant-guard helper. Symptom before this migration:
-- assigning or transferring a bed failed with
--   ERROR: function public.assert_bed_in_my_tenant(uuid) does not exist
-- Used by assign_bed() and transfer_bed() RPCs.

CREATE OR REPLACE FUNCTION public.assert_bed_in_my_tenant(p_bed_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_my_tenant uuid;
  v_bed_tenant uuid;
BEGIN
  v_my_tenant := public.get_my_tenant_id();
  IF v_my_tenant IS NULL THEN
    RAISE EXCEPTION 'Not authenticated to a tenant';
  END IF;

  SELECT tenant_id INTO v_bed_tenant
  FROM public.beds
  WHERE id = p_bed_id;

  IF v_bed_tenant IS NULL THEN
    RAISE EXCEPTION 'Bed % not found', p_bed_id;
  END IF;

  IF v_bed_tenant <> v_my_tenant THEN
    RAISE EXCEPTION 'Bed % does not belong to your tenant', p_bed_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_bed_in_my_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_bed_in_my_tenant(uuid) TO authenticated, service_role;
