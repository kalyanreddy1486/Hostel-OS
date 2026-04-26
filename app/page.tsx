import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getControllerActingAs } from "@/lib/controller-impersonation";

export default async function Home() {
  const session = await getSessionProfile();
  const role = session.profile?.role;
  // Controller impersonating a tenant lands inside that tenant.
  if (role === "controller" && getControllerActingAs()) redirect("/dashboard");
  if (role === "controller") redirect("/controller");
  // Residents have no portal — they use the public /pay/[invoiceId] link
  // sent in their reminder. Bounce them out of any signed-in session.
  if (role === "resident") redirect("/logout");
  redirect("/dashboard");
}
