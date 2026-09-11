import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnlockButton } from "@/components/unlock-button";
import { Card, CardContent } from "@/components/ui/card";
import type { Course, Lesson, Module } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course } = await supabase
    .from("courses").select("*").eq("id", courseId).single();
  if (!course) redirect("/dashboard");
  const c = course as Course;

  const [{ data: modules }, { data: ent }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", courseId).order("order_index"),
    supabase.from("entitlements").select("course_id").eq("user_id", user.id).eq("course_id", courseId),
  ]);
  const unlocked = (ent ?? []).length > 0;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, module_id, title, order_index, is_free_preview")
    .in("module_id", ((modules ?? []) as Module[]).map((m) => m.id))
    .order("order_index");

  const { data: progress } = await supabase
    .from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("completed", true);
  const done = new Set((progress ?? []).map((p) => p.lesson_id));

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16">
      <header className="py-4">
        <Link href="/dashboard"><Button variant="ghost" size="sm">← Dashboard</Button></Link>
      </header>

      <Badge>{c.paper_code}</Badge>
      <h1 className="mt-2 text-3xl font-black">{c.title}</h1>
      <p className="mt-2 text-stone-500">{c.description}</p>

      {!unlocked && (
        <Card className="mt-6 border-amber-300 bg-amber-50">
          <CardContent className="pt-5">
            <UnlockButton courseId={c.id} priceKes={c.price_kes} title={c.title} />
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-3">
        {((modules ?? []) as Module[]).map((m, mi) => {
          const modLessons = ((lessons ?? []) as Lesson[]).filter((l) => l.module_id === m.id);
          return (
            <Accordion
              key={m.id}
              defaultOpen={mi === 0}
              title={<span>Module {mi + 1}: {m.title}</span>}
              meta={<Badge variant="secondary">{modLessons.length} lessons</Badge>}
            >
              <ul className="space-y-1">
                {modLessons.map((l) => {
                  const locked = !unlocked && !l.is_free_preview;
                  const row = (
                    <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-stone-100">
                      <span className={done.has(l.id) ? "text-green-700" : "text-stone-300"}>
                        {done.has(l.id) ? "●" : "○"}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      {l.is_free_preview && <Badge variant="outline">Free</Badge>}
                      {locked && <span title="Locked">🔒</span>}
                    </span>
                  );
                  return (
                    <li key={l.id}>
                      {locked ? <div className="opacity-60">{row}</div> : <Link href={`/learn/${l.id}`}>{row}</Link>}
                    </li>
                  );
                })}
              </ul>
            </Accordion>
          );
        })}
      </div>
    </main>
  );
}
