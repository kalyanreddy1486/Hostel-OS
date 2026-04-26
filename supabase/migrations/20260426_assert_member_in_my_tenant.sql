-- Add the missing tenant-guard function used by checkout_member().
-- Symptom before this migration: "Check out" on /members/[id] failed with
--   ERROR: function public.assert_member_in_my_tenant(uuid) does not exist
-- This function is the pattern several SECURITY DEFINER RPCs rely on to
-- prove the caller has access to a given member row before mutating it.

CREATE OR REPLACE FUNCTION public.assert_member_in_my_tenant(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_my_tenant uuid;
  v_member_tenant uuid;
BEGIN
  v_my_tenant := public.get_my_tenant_id();
  IF v_my_tenant IS NULL THEN
    RAISE EXCEPTION 'Not authenticated to a tenant';
  END IF;

  SELECT tenant_id INTO v_member_tenant
  FROM public.members
  WHERE id = p_member_id;

  IF v_member_tenant IS NULL THEN
    RAISE EXCEPTION 'Member % not found', p_member_id;
  END IF;

  IF v_member_tenant <> v_my_tenant THEN
    RAISE EXCEPTION 'Member % does not belong to your tenant', p_member_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_member_in_my_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_member_in_my_tenant(uuid) TO authenticated, service_role;
