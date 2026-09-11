import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST { course_id } -> { checkout_url } | { stub: true }
 * Creates a pending transaction, then (once FLUTTERWAVE_SECRET_KEY is set)
 * initiates a Flutterwave hosted checkout with M-Pesa enabled.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { course_id } = await req.json();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, price_kes")
    .eq("id", course_id)
    .single();
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const txRef = `somacpa-${user.id.slice(0, 8)}-${Date.now()}`;
  const { data: txn, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      course_id: course.id,
      amount: course.price_kes,
      status: "pending",
      provider_ref: txRef,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!secret) {
    // ---- MVP stub: instantly grant the entitlement so the UX is testable ----
    await supabase.from("entitlements").upsert(
      { user_id: user.id, course_id: course.id },
      { onConflict: "user_id,course_id" }
    );
    await supabase.from("transactions").update({ status: "success" }).eq("id", txn.id);
    return NextResponse.json({
      stub: true,
      message: `“${course.title}” unlocked (test mode). Add FLUTTERWAVE_SECRET_KEY for live M-Pesa payments.`,
    });
  }

  // ---- Live Flutterwave hosted checkout ----
  const fwRes = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: course.price_kes,
      currency: "KES",
      redirect_url: `${appUrl}/api/checkout/callback`,
      customer: { email: user.email ?? "" },
      customizations: { title: "SomaCPA", description: course.title },
      // Flutterwave enables M-Pesa (mpesa) for KES automatically on hosted checkout.
    }),
  });
  const fw = await fwRes.json();
  const link = fw?.data?.link;
  if (!link) return NextResponse.json({ error: "Could not start payment" }, { status: 502 });
  return NextResponse.json({ checkout_url: link });
}
