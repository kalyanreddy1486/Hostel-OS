"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, DEMO_RESIDENT_USER_ID } from "@/lib/demo-session";

export async function setDemoRole(formData: FormData) {
  const role = formData.get("role");
  const jar = cookies();
  if (role === "resident") {
    jar.set(DEMO_COOKIE, DEMO_RESIDENT_USER_ID, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect("/my-account");
  } else {
    jar.delete(DEMO_COOKIE);
    redirect("/dashboard");
  }
}
