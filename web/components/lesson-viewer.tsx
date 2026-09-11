"use client";

import * as React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioBar } from "@/components/audio-bar";
import { QuizRunner } from "@/components/quiz-runner";
import { cn } from "@/lib/utils";
import type { Lesson, Module, Quiz, Question } from "@/lib/content";

export function LessonViewer({
  lesson,
  courseId,
  courseTitle,
  paperCode,
  modules,
  lessonsByModule,
  quiz,
  questions,
  initiallyCompleted,
  hasAccess,
}: {
  lesson: Lesson;
  courseId: string;
  courseTitle: string;
  paperCode: string;
  modules: Module[];
  lessonsByModule: Record<string, Lesson[]>;
  quiz: Quiz | null;
  questions: Question[];
  initiallyCompleted: boolean;
  hasAccess: boolean;
}) {
  const [lowData, setLowData] = React.useState(false);
  const [completed, setCompleted] = React.useState(initiallyCompleted);
  const [navOpen, setNavOpen] = React.useState(false);

  const markComplete = async () => {
    setCompleted(true);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lesson.id, completed: true }),
      });
    } catch { /* offline — stays local */ }
  };

  const flat = modules.flatMap((m) => lessonsByModule[m.id] ?? []);
  const idx = flat.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex items-center justify-between py-3">
        <Link href={`/courses/${courseId}`}><Button variant="ghost" size="sm">← {paperCode} {courseTitle}</Button></Link>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-stone-600">
          <button
            type="button"
            role="switch"
            aria-checked={lowData}
            onClick={() => setLowData((v) => !v)}
            className={cn("h-6 w-11 rounded-full p-0.5 transition-colors", lowData ? "bg-green-700" : "bg-stone-300")}
          >
            <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-transform", lowData && "translate-x-5")} />
          </button>
          Low-data mode
        </label>
      </header>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        {/* Sidebar: left on desktop, collapsible sheet on mobile */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Button variant="outline" size="sm" className="mb-3 lg:hidden" onClick={() => setNavOpen((o) => !o)}>
            {navOpen ? "Hide lessons ▴" : "All lessons ▾"}
          </Button>
          <nav className={cn("space-y-4", !navOpen && "hidden lg:block")}>
            {modules.map((m, mi) => (
              <div key={m.id}>
                <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-stone-400">
                  Module {mi + 1}: {m.title}
                </p>
                <ul className="space-y-0.5">
                  {(lessonsByModule[m.id] ?? []).map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/learn/${l.id}`}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm",
                          l.id === lesson.id
                            ? "bg-green-100 font-semibold text-green-900"
                            : "text-stone-600 hover:bg-stone-100"
                        )}
                      >
                        {l.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main viewport */}
        <article className="min-w-0">
          {lesson.audio_url && (
            <AudioBar audioUrl={lesson.audio_url} title={lesson.title} lowData={lowData} />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{paperCode}</Badge>
            {lesson.is_free_preview && <Badge variant="outline">Free preview</Badge>}
            {completed && <Badge variant="default">Completed ✓</Badge>}
          </div>
          <h1 className="mt-2 text-3xl font-black">{lesson.title}</h1>

          {!lowData && lesson.video_url && (
            <video controls preload="metadata" src={lesson.video_url} className="mt-6 w-full rounded-2xl" />
          )}

          <div className="lesson-body mt-4">
            <ReactMarkdown>{lesson.content_markdown}</ReactMarkdown>
          </div>

          {!completed && hasAccess && (
            <Button onClick={markComplete} size="lg" className="mt-8">
              Mark as complete ✓
            </Button>
          )}

          {quiz && questions.length > 0 && (
            <QuizRunner quizId={quiz.id} quizTitle={quiz.title} questions={questions} />
          )}

          <div className="mt-10 flex justify-between border-t border-stone-200 pt-6">
            {prev ? (
              <Link href={`/learn/${prev.id}`}><Button variant="outline">← {prev.title}</Button></Link>
            ) : <span />}
            {next && (
              <Link href={`/learn/${next.id}`}><Button>Next: {next.title} →</Button></Link>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
