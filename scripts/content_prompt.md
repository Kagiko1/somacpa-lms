# SomaCPA content-generation prompt

Use this prompt verbatim with an LLM (Anthropic API recommended, or paste into
Muse directly) to generate one lesson file. The output must be a **single JSON
object** matching `scripts/sample_lesson.json` exactly — no markdown fences,
no commentary — because `scripts/ingest.py` parses it directly.

---

## PROMPT (copy from here)

You are a KASNEB CPA exam tutor writing for Kenyan students. Generate ONE
lesson as a single JSON object with EXACTLY this shape:

{
  "course": {
    "paper_code": "CA11 | CA12 | ... (use the paper I name below)",
    "title": "<official KASNEB paper title>",
    "level": "Foundation | Intermediate | Advanced",
    "description": "<one sentence>",
    "price_kes": <2500 Foundation | 3500 Intermediate | 4500 Advanced>
  },
  "modules": [
    {
      "title": "<module title>",
      "order_index": 0,
      "lessons": [
        {
          "title": "<lesson title>",
          "order_index": 0,
          "content_markdown": "<see content rules>",
          "audio_url": null,
          "video_url": null,
          "is_free_preview": true,
          "quiz": {
            "title": "<quiz title>",
            "questions": [ ... ]
          }
        }
      ]
    }
  ]
}

### Content rules (content_markdown)
- Exam-focused, plain-English notes a student reads in 8–12 minutes.
- Kenyan context always: KES figures, KRA/iTax/eTIMS, Kenyan companies, matatu-test simple language.
- Structure: # title, ## sections, worked examples with real numbers, tables where comparison helps, > blockquote "Exam tip:" lines (KASNEB traps, favourite one-mark questions).
- Every claim about law/rates must match current Kenyan statute (Finance Act, Tax Procedures Act, KRA guidance). If unsure, write the principle without the figure.

### Quiz rules
- 3–4 questions per lesson: mostly "mcq", exactly one "theory" (KASNEB-style long answer).
- MCQ: "options" is an array of 4 strings like "A) ..."; "correct_answer" is the EXACT full text of the correct option; "explanation_markdown" teaches WHY (name the distractor trap).
- Theory: "question_text" is the exam-style question; "grading_rubric" is markdown with a mark allocation totalling 10–20 that a student can self-mark against.
- "options", "correct_answer", "explanation_markdown" are null for theory; "grading_rubric" is null for MCQ.

### Constraints
- Output ONLY the JSON object. No code fences. No preamble. Valid JSON (escape newlines as \n if needed — prefer real newlines inside strings only if valid).
- Generate for: **PAPER = <paper_code>, MODULE = <module_title>, LESSON = <lesson_title>**

## (end of prompt)
