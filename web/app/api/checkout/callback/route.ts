import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Flutterwave redirects here after hosted checkout (?tx_ref=...&transaction_id=...).
 * Verifies the transaction server-side, then grants the course entitlement.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const txRef = url.searchParams.get("tx_ref");
  const transactionId = url.searchParams.get("transaction_id");

  const supabase = await createClient();
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;

  if (txRef && transactionId && secret) {
    const verify = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const data = await verify.json();
    const ok = data?.status === "success" && data?.data?.status === "successful";

    const { data: txn } = await supabase
      .from("transactions").select("id, user_id, course_id").eq("provider_ref", txRef).single();

    if (txn) {
      await supabase.from("transactions").update({
        status: ok ? "success" : "failed",
        mpesa_receipt_number: data?.data?.flw_ref ?? null,
      }).eq("id", txn.id);
      if (ok) {
        await supabase.from("entitlements").upsert(
          { user_id: txn.user_id, course_id: txn.course_id },
          { onConflict: "user_id,course_id" }
        );
        redirect(`/courses/${txn.course_id}?paid=1`);
      }
    }
  }
  redirect("/dashboard?payment=failed");
}
