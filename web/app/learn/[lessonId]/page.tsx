import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonViewer } from "@/components/lesson-viewer";
import type { Lesson, Module, Quiz, Question } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function LearnPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
  if (!lesson) redirect("/dashboard");
  const l = lesson as Lesson;

  const { data: mod } = await supabase
    .from("modules").select("id, course_id, courses(id, paper_code, title)")
    .eq("id", l.module_id).single();
  const course = (mod?.courses ?? {}) as { id: string; paper_code: string; title: string };

  // Access: free preview OR entitled
  const { data: ent } = await supabase
    .from("entitlements").select("course_id")
    .eq("user_id", user.id).eq("course_id", course.id);
  const hasAccess = l.is_free_preview || (ent ?? []).length > 0;
  if (!hasAccess) redirect(`/courses/${course.id}`);

  const [{ data: modules }, { data: allLessons }, { data: prog }, { data: quizzes }] =
    await Promise.all([
      supabase.from("modules").select("*").eq("course_id", course.id).order("order_index"),
      supabase.from("lessons").select("*").order("order_index"),
      supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("lesson_id", lessonId).eq("completed", true),
      supabase.from("quizzes").select("*").eq("lesson_id", lessonId),
    ]);

  const mods = (modules ?? []) as Module[];
  const lessonsByModule: Record<string, Lesson[]> = {};
  ((allLessons ?? []) as Lesson[]).forEach((x) => {
    if (!mods.some((m) => m.id === x.module_id)) return;
    (lessonsByModule[x.module_id] ||= []).push(x);
  });

  let questions: Question[] = [];
  const quiz = ((quizzes ?? []) as Quiz[])[0] ?? null;
  if (quiz) {
    const { data } = await supabase.from("questions").select("*").eq("quiz_id", quiz.id).order("order_index");
    questions = (data ?? []) as Question[];
  }

  return (
    <LessonViewer
      lesson={l}
      courseId={course.id}
      courseTitle={course.title}
      paperCode={course.paper_code}
      modules={mods}
      lessonsByModule={lessonsByModule}
      quiz={quiz}
      questions={questions}
      initiallyCompleted={(prog ?? []).length > 0}
      hasAccess={hasAccess}
    />
  );
}
