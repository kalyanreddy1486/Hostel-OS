import { cookies } from "next/headers";

export const VIEW_AS_COOKIE = "controller_acting_as";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the tenant id the controller is currently "viewing as", or null.
 *
 * This cookie is *only* meaningful for controller users — `get_my_tenant_id()`
 * in Postgres ignores the corresponding `x-controller-acting-as` header
 * unless the caller's role is `controller`. So normal admins can't smuggle a
 * value in via dev tools.
 */
export function getControllerActingAs(): string | null {
  const v = cookies().get(VIEW_AS_COOKIE)?.value;
  if (v && UUID_RE.test(v)) return v;
  return null;
}
