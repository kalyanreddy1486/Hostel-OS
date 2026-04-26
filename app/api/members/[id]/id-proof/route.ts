import { NextResponse } from "next/server";
import { createBackendClient } from "@/lib/backend/supabase";
import { requireStaffOrAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

const ID_PROOF_BUCKET = "id-proofs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await requireStaffOrAdmin();

  const supabase = createBackendClient();
  const { data: member, error } = await supabase
    .from("members")
    .select("id_proof_url")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  const path = member.id_proof_url;
  if (!path) {
    return NextResponse.json({ error: "No ID proof on file" }, { status: 404 });
  }

  // Legacy rows may have a full URL instead of a storage path — just redirect.
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return NextResponse.redirect(path);
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(ID_PROOF_BUCKET)
    .createSignedUrl(path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signErr?.message ?? "Could not sign URL" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
