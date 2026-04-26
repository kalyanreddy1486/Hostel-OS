import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getControllerActingAs } from "@/lib/controller-impersonation";

function isStrict() {
  return process.env.AUTH_MODE === "strict";
}

function homeFor(role: string | null | undefined): string {
  if (role === "controller") return "/controller";
  // Residents have no portal of their own — they pay via the public
  // /pay/[invoiceId] link sent in their reminder. Bounce them to /logout
  // so they can't get stuck in a redirect loop on a signed-in session.
  if (role === "resident") return "/logout";
  return "/dashboard";
}

// Controllers can step into a tenant via the View-as cookie. While that cookie
// is set, they should pass the same gates a real admin would (so admin pages
// render). Without the cookie, controllers get bounced back to /controller.
function isAdminLike(role: string | null | undefined): boolean {
  if (role === "admin" || role === "staff") return true;
  if (role === "controller" && getControllerActingAs()) return true;
  return false;
}

export async function requireSession() {
  const session = await getSessionProfile();
  if (isStrict() && session.user.id === "demo-user") {
    redirect("/login");
  }
  return session;
}

export async function requireStaffOrAdmin() {
  const session = await requireSession();
  if (isStrict()) {
    const role = session.profile?.role;
    if (!isAdminLike(role)) {
      redirect(homeFor(role));
    }
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (isStrict()) {
    const role = session.profile?.role;
    // Controllers count as admin only while impersonating.
    const isAdmin =
      role === "admin" ||
      (role === "controller" && getControllerActingAs() !== null);
    if (!isAdmin) {
      redirect(homeFor(role));
    }
  }
  return session;
}

export async function requireController() {
  const session = await requireSession();
  if (isStrict()) {
    const role = session.profile?.role;
    if (role !== "controller") {
      redirect(homeFor(role));
    }
  }
  return session;
}

export async function redirectResidentFromStaffHome() {
  const session = await requireSession();
  if (isStrict()) {
    const role = session.profile?.role;
    // Resident accounts have no portal — log them out (we never want a
    // resident sitting on a staff page).
    if (role === "resident") redirect("/logout");
    // Controllers go back to their portal *unless* they're View-as-ing.
    if (role === "controller" && !getControllerActingAs()) redirect("/controller");
  }
  return session;
}
