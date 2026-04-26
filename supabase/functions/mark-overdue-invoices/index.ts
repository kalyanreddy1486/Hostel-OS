import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Body = {
  as_of?: string;
  late_fee?: number;
  dry_run?: boolean;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Body = {};
  if (req.method === "POST") {
    try {
      body = (await req.json()) as Body;
    } catch {
      body = {};
    }
  }

  const asOf = body.as_of ?? new Date().toISOString().slice(0, 10);
  const lateFee = Number(body.late_fee ?? 0);
  const dryRun = Boolean(body.dry_run);

  const { data: candidates, error: loadErr } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, due_date, late_fee, total_amount")
    .in("status", ["pending", "partial"])
    .lt("due_date", asOf);
  if (loadErr) {
    return new Response(
      JSON.stringify({ error: `load invoices: ${loadErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const ids = (candidates ?? []).map((c) => c.id);

  if (dryRun) {
    return new Response(
      JSON.stringify({
        as_of: asOf,
        would_mark: ids.length,
        late_fee: lateFee,
        dry_run: true,
        candidates: candidates ?? [],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (!ids.length) {
    return new Response(
      JSON.stringify({ as_of: asOf, marked: 0 }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // Always use plain `.update()` — the previous `.upsert()` path was unsafe
  // because Supabase upsert does INSERT ... ON CONFLICT DO UPDATE SET *,
  // which would zero out non-included columns (member_id, billing_month,
  // rent_amount, etc.) on any conflict mismatch. We per-row update late_fee
  // here when needed; status flips happen in a single batch update below.
  if (lateFee > 0) {
    for (const c of candidates ?? []) {
      const newLateFee = Number(c.late_fee ?? 0) + lateFee;
      const newTotal = Number(c.total_amount ?? 0) + lateFee;
      const { error: rowErr } = await supabase
        .from("invoices")
        .update({
          status: "overdue",
          late_fee: newLateFee,
          total_amount: newTotal,
        })
        .eq("id", c.id);
      if (rowErr) {
        return new Response(
          JSON.stringify({ error: `update invoice ${c.id}: ${rowErr.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  } else {
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .in("id", ids);
    if (updateErr) {
      return new Response(
        JSON.stringify({ error: `update invoices: ${updateErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  await supabase.from("audit_logs").insert({
    action: "mark_overdue",
    table_name: "invoices",
    new_values: {
      as_of: asOf,
      marked: ids.length,
      late_fee_added: lateFee,
      invoice_ids: ids,
    },
  });

  return new Response(
    JSON.stringify({ as_of: asOf, marked: ids.length, late_fee: lateFee }),
    { headers: { "Content-Type": "application/json" } },
  );
});
