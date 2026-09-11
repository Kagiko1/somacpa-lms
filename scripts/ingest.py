#!/usr/bin/env python3
"""
SomaCPA content ingestion: structured JSON -> Supabase (Postgres REST).

Usage:
    SUPABASE_URL=https://xyz.supabase.co \
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... \
    python3 scripts/ingest.py scripts/sample_lesson.json

Idempotent: courses upsert on paper_code; modules/lessons upsert on
(parent_id, order_index); a lesson's quiz is replaced wholesale
(delete questions, re-insert) so re-running a file is safe.

JSON contract (see scripts/sample_lesson.json and content_prompt.md):
{
  "course": {"paper_code": "CA11", "title": "...", "level": "Foundation",
             "description": "...", "price_kes": 2500},
  "modules": [
    {"title": "...", "order_index": 0,
     "lessons": [
       {"title": "...", "order_index": 0, "content_markdown": "...",
        "audio_url": null, "video_url": null, "is_free_preview": true,
        "quiz": {"title": "...",
                 "questions": [
                   {"qtype": "mcq", "question_text": "...",
                    "options": ["A) ...", "B) ..."],
                    "correct_answer": "A) ...",
                    "explanation_markdown": "...", "order_index": 0},
                   {"qtype": "theory", "question_text": "...",
                    "grading_rubric": "...", "order_index": 1}
                 ]}}
     ]}
  ]
}
"""
import json
import os
import sys

try:
    import requests
except ImportError:
    sys.exit("pip install requests")

BASE = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not BASE or not KEY:
    sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.")

H = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation",
}


def upsert(table, payload, on_conflict):
    r = requests.post(f"{BASE}/rest/v1/{table}?on_conflict={on_conflict}",
                      headers=H, json=payload, timeout=30)
    r.raise_for_status()
    rows = r.json()
    return rows[0] if isinstance(rows, list) else rows


def delete(table, params):
    r = requests.delete(f"{BASE}/rest/v1/{table}", headers=H, params=params, timeout=30)
    r.raise_for_status()


def insert(table, payload):
    h = dict(H)
    h["Prefer"] = "return=representation"
    r = requests.post(f"{BASE}/rest/v1/{table}", headers=h, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()


def main(path):
    with open(path) as f:
        doc = json.load(f)

    c = doc["course"]
    course = upsert("courses", {
        "paper_code": c["paper_code"], "title": c["title"], "level": c["level"],
        "description": c.get("description", ""), "price_kes": c.get("price_kes", 0),
        "is_published": c.get("is_published", True),
    }, "paper_code")
    print(f"course {course['paper_code']} -> {course['id']}")

    for m in doc.get("modules", []):
        module = upsert("modules", {
            "course_id": course["id"], "title": m["title"],
            "order_index": m.get("order_index", 0),
        }, "course_id,order_index")
        print(f"  module '{module['title']}'")

        for les in m.get("lessons", []):
            lesson = upsert("lessons", {
                "module_id": module["id"], "title": les["title"],
                "content_markdown": les.get("content_markdown", ""),
                "audio_url": les.get("audio_url"), "video_url": les.get("video_url"),
                "order_index": les.get("order_index", 0),
                "is_free_preview": les.get("is_free_preview", False),
            }, "module_id,order_index")
            print(f"    lesson '{lesson['title']}'")

            qd = les.get("quiz")
            if not qd:
                continue
            quiz = upsert("quizzes", {
                "module_id": module["id"], "lesson_id": lesson["id"],
                "title": qd["title"],
            }, "module_id,lesson_id")
            # Replace questions wholesale for idempotency.
            delete("questions", {"quiz_id": f"eq.{quiz['id']}"})
            for q in qd.get("questions", []):
                insert("questions", {
                    "quiz_id": quiz["id"], "qtype": q["qtype"],
                    "question_text": q["question_text"],
                    "options": q.get("options"),
                    "correct_answer": q.get("correct_answer"),
                    "explanation_markdown": q.get("explanation_markdown"),
                    "grading_rubric": q.get("grading_rubric"),
                    "order_index": q.get("order_index", 0),
                })
            print(f"      quiz '{quiz['title']}' ({len(qd.get('questions', []))} questions)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: ingest.py <lesson.json>")
    main(sys.argv[1])
