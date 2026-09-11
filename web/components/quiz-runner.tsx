"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/content";

type McqState = Record<string, string>; // questionId -> chosen option
type TheoryState = Record<string, string>; // questionId -> essay text

export function QuizRunner({
  quizId,
  quizTitle,
  questions,
}: {
  quizId: string;
  quizTitle: string;
  questions: Question[];
}) {
  const [mcq, setMcq] = React.useState<McqState>({});
  const [theory, setTheory] = React.useState<TheoryState>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const mcqs = questions.filter((q) => q.qtype === "mcq");
  const theories = questions.filter((q) => q.qtype === "theory");

  const score = mcqs.filter((q) => mcq[q.id] === q.correct_answer).length;

  const submit = async () => {
    setSubmitted(true);
    setSaving(true);
    try {
      await fetch("/api/quiz-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quizId,
          score,
          total: mcqs.length,
          answers: { mcq, theory },
        }),
      });
    } catch {
      /* offline — attempt stays local */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📝 {quizTitle}
          <Badge variant="secondary">
            {mcqs.length} MCQ · {theories.length} theory
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {mcqs.map((q, i) => {
          const chosen = mcq[q.id];
          return (
            <div key={q.id}>
              <p className="font-semibold">
                Q{i + 1}. {q.question_text}
              </p>
              <div className="mt-3 space-y-2">
                {(q.options ?? []).map((opt) => {
                  const isChosen = chosen === opt;
                  const isCorrect = submitted && opt === q.correct_answer;
                  const isWrong = submitted && isChosen && opt !== q.correct_answer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitted}
                      onClick={() => setMcq((s) => ({ ...s, [q.id]: opt }))}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left text-sm transition-colors",
                        isCorrect && "border-green-600 bg-green-50 font-semibold",
                        isWrong && "border-red-500 bg-red-50",
                        !submitted && isChosen && "border-green-700 bg-green-50",
                        !submitted && !isChosen && "border-stone-200 hover:border-stone-400"
                      )}
                    >
                      {opt} {isCorrect && "✓"} {isWrong && "✗"}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation_markdown && (
                <div className="lesson-body mt-3 rounded-xl bg-stone-100 p-4 text-sm">
                  <ReactMarkdown>{q.explanation_markdown}</ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}

        {theories.map((q, i) => (
          <div key={q.id}>
            <p className="font-semibold">
              T{i + 1}. {q.question_text}{" "}
              <Badge variant="gold">KASNEB-style long answer</Badge>
            </p>
            <textarea
              value={theory[q.id] ?? ""}
              disabled={submitted}
              onChange={(e) => setTheory((s) => ({ ...s, [q.id]: e.target.value }))}
              rows={6}
              placeholder="Write your answer here, as you would in the exam…"
              className="mt-3 w-full rounded-xl border border-stone-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            />
            {submitted && q.grading_rubric && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-stone-200 p-4">
                  <p className="mb-2 text-xs font-bold uppercase text-stone-500">Your answer</p>
                  <p className="whitespace-pre-wrap text-sm">{theory[q.id] || "—"}</p>
                </div>
                <div className="lesson-body rounded-xl bg-amber-50 p-4 text-sm">
                  <p className="mb-2 text-xs font-bold uppercase text-amber-700">Grading rubric</p>
                  <ReactMarkdown>{q.grading_rubric}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}

        {!submitted ? (
          <Button onClick={submit} size="lg" className="w-full sm:w-auto">
            Submit answers
          </Button>
        ) : (
          <div className="rounded-xl bg-green-50 p-4 text-center">
            <p className="text-lg font-bold">
              Score: {score}/{mcqs.length}
              {mcqs.length > 0 && ` (${Math.round((score / mcqs.length) * 100)}%)`}
            </p>
            <p className="text-sm text-stone-500">
              {saving ? "Saving…" : "Attempt saved ✓"} Review the explanations above.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
