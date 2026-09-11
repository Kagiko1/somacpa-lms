import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Upserts lesson completion for the signed-in student. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { lesson_id, completed } = await req.json();
  const { error } = await supabase.from("lesson_progress").upsert(
    { user_id: user.id, lesson_id, completed: !!completed, updated_at: new Date().toISOString() },
    { onConflict: "user_id,lesson_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
