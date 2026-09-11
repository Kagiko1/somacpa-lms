import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIERS = [
  {
    name: "Foundation",
    papers: ["CA11 Financial Accounting", "CA12 Communication Skills", "CA13 Law & Governance", "CA14 Economics", "CA15 Quantitative Analysis", "CA16 ICT"],
    price: "KES 2,500",
  },
  {
    name: "Intermediate",
    papers: ["CA21 Company Law", "CA22 Financial Management", "CA23 Financial Reporting", "CA24 Auditing & Assurance", "CA25 Management Accounting", "CA26 Public Finance & Taxation"],
    price: "KES 3,500",
  },
  {
    name: "Advanced",
    papers: ["CA31 Leadership & Management", "CA32 Adv. Financial Reporting", "CA33 Adv. Financial Management", "CA34 Adv. Management Accounting", "+ specialisation papers"],
    price: "KES 4,500",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="text-xl font-black tracking-tight">
          <span className="text-green-700">Soma</span>CPA
        </span>
        <div className="flex gap-2">
          <Link href="/login"><Button variant="ghost">Log in</Button></Link>
          <Link href="/signup"><Button>Start free</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-8 text-center sm:pt-16">
        <Badge className="mb-4">Built for KASNEB candidates in Kenya</Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
          Pass your CPA exams on your phone — even on a small bundle
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
          Bite-size notes, audio lessons you can save offline, KASNEB-style quizzes
          with grading rubrics, and mock exams. Pay per paper with M-Pesa — no
          expensive subscriptions.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup"><Button size="lg">Start learning free</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
        </div>
        <p className="mt-4 text-sm text-stone-500">
          Free preview lessons for every paper · Low-data mode · Works offline
        </p>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-center text-2xl font-bold">All three KASNEB levels</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <Card key={t.name}>
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <CardDescription>per paper · {t.price} · M-Pesa</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-stone-600">
                  {t.papers.map((p) => (
                    <li key={p} className="flex gap-2"><span className="text-green-700">✓</span>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="mb-8 text-center text-2xl font-bold">How SomaCPA works</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["📖", "Study the notes", "Clean, exam-focused notes per KASNEB topic."],
              ["🎧", "Listen offline", "Audio version of every lesson — save it, revise on the matatu."],
              ["📝", "Test yourself", "MCQs with instant explanations + long-answer questions with rubrics."],
              ["📶", "Save your bundle", "Low-data mode strips video. Everything else keeps working offline."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="text-center">
                <div className="text-4xl">{icon}</div>
                <h3 className="mt-2 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-stone-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/signup"><Button size="lg">Create free account</Button></Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-stone-400">
        SomaCPA is an independent exam-prep product and is not affiliated with KASNEB or ICPAK.
      </footer>
    </main>
  );
}
