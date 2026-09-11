import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LEVELS, formatKes, type Course } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: courses }, { data: entitlements }, { data: progress }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("courses").select("*").eq("is_published", true).order("paper_code"),
      supabase.from("entitlements").select("course_id").eq("user_id", user.id),
      supabase.from("lesson_progress").select("lesson_id, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    ]);

  const entitled = new Set((entitlements ?? []).map((e) => e.course_id));
  const doneLessons = new Set((progress ?? []).filter((p) => true).map((p) => p.lesson_id));

  // Resume: most recently touched lesson (with its course for the link label)
  let resume: { lesson_id: string; lesson_title: string; course_title: string } | null = null;
  const last = (progress ?? [])[0];
  if (last) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, modules!inner(course_id, courses!inner(title))")
      .eq("id", last.lesson_id)
      .single();
    if (lesson) {
      const mod = lesson.modules as unknown as { course_id: string; courses: { title: string } };
      resume = { lesson_id: lesson.id, lesson_title: lesson.title, course_title: mod.courses.title };
    }
  }

  // Per-course lesson counts for progress bars
  const { data: lessonCounts } = await supabase
    .from("lessons")
    .select("id, modules!inner(course_id)");
  const totalByCourse = new Map<string, number>();
  (lessonCounts ?? []).forEach((l) => {
    const m = l.modules as unknown as { course_id: string };
    totalByCourse.set(m.course_id, (totalByCourse.get(m.course_id) ?? 0) + 1);
  });

  const logout = async () => {
    "use server";
    const s = await createClient();
    await s.auth.signOut();
    redirect("/login");
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <span className="text-xl font-black"><span className="text-green-700">Soma</span>CPA</span>
        <form action={logout}><Button variant="ghost" size="sm">Log out</Button></form>
      </header>

      <h1 className="mt-2 text-2xl font-bold">
        Karibu{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
      </h1>
      <p className="text-stone-500">Your KASNEB command centre.</p>

      {resume && (
        <Link href={`/learn/${resume.lesson_id}`}>
          <Card className="mt-6 border-green-700 bg-green-50">
            <CardHeader>
              <CardDescription>Resume learning</CardDescription>
              <CardTitle>{resume.lesson_title}</CardTitle>
              <CardDescription>{resume.course_title} · pick up where you left off →</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      )}

      {LEVELS.map((level) => {
        const list = ((courses ?? []) as Course[]).filter((c) => c.level === level);
        if (!list.length) return null;
        return (
          <section key={level} className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              {level} Level <Badge variant="secondary">{list.length} papers</Badge>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => {
                const total = totalByCourse.get(c.id) ?? 0;
                return (
                  <Link key={c.id} href={`/courses/${c.id}`}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge>{c.paper_code}</Badge>
                          {entitled.has(c.id) ? (
                            <Badge variant="default">Unlocked ✓</Badge>
                          ) : (
                            <span className="text-sm font-bold text-green-700">{formatKes(c.price_kes)}</span>
                          )}
                        </div>
                        <CardTitle className="mt-2">{c.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{c.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {total > 0 && (
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Progress value={0} className="flex-1" />
                            {total} lessons
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
