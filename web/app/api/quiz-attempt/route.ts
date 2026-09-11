import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Records a quiz attempt for the signed-in student. Works offline-tolerant (client retries). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { quiz_id, score, total, answers } = await req.json();
  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    quiz_id,
    score,
    total,
    answers,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
