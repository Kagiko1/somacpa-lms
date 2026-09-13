#!/usr/bin/env python3
"""Upload CA11 course media to Supabase Storage and seed lessons/quizzes into Postgres via PostgREST.
Reads credentials from web/.env.local (never prints them). Idempotent for storage (x-upsert).
DB side: deletes existing CA11 modules (cascade) then inserts the 12 real modules, 41 lessons,
12 module quizzes + final mock, 230 questions.
"""
import json, os, glob, mimetypes, sys, time
import urllib.request, urllib.error

# Force IPv4: the Supabase host's IPv6 route hangs from this VM.
import socket as _socket
_orig_gai = _socket.getaddrinfo
def _v4only(*a, **k):
    return [r for r in _orig_gai(*a, **k) if r[0] == _socket.AF_INET]
_socket.getaddrinfo = _v4only

BASE = "/home/hatch/workspace/cpa-lms-kenya"
BUILD = f"{BASE}/course-build/ca11"

def load_env():
    env = {}
    with open(f"{BASE}/web/.env.local") as f:
        for line in f:
            line = line.strip()
            if line and "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k] = v
    return env

env = load_env()
SB_URL = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SRV = env["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = "course-media"

def req(method, path, data=None, headers=None, ctype="application/json"):
    h = {"apikey": SRV, "Authorization": f"Bearer {SRV}"}
    if headers: h.update(headers)
    body = None
    if data is not None:
        if isinstance(data, (dict, list)):
            body = json.dumps(data).encode()
            h["Content-Type"] = ctype
        else:
            body = data
            h["Content-Type"] = ctype
    r = urllib.request.Request(SB_URL + path, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()[:500]
        return e.code, {"error": raw}

def public_url(obj_path):
    return f"{SB_URL}/storage/v1/object/public/{BUCKET}/{obj_path}"

# ---------- 1. bucket ----------
st, out = req("POST", "/storage/v1/bucket", {"id": BUCKET, "name": BUCKET, "public": True})
print(f"bucket create: {st} (409/duplicate is fine)")

# ---------- 2. upload media ----------
media_files = []
for mod_dir in sorted(glob.glob(f"{BUILD}/m*")):
    slug = os.path.basename(mod_dir)
    for kind, pattern in [("audio", "audio/*.mp3"), ("video", "video.mp4"),
                          ("slides", "slides.pptx"), ("guide", "study-guide.pdf"),
                          ("illustrations", "illustrations/*.png")]:
        for fp in sorted(glob.glob(f"{mod_dir}/{pattern}")):
            obj = f"ca11/{slug}/{kind}/{os.path.basename(fp)}"
            media_files.append((fp, obj))
print(f"media files to upload: {len(media_files)}")
ok = fail = 0
failed = []
for fp, obj in media_files:
    ctype = mimetypes.guess_type(fp)[0] or "application/octet-stream"
    with open(fp, "rb") as f: data = f.read()
    uploaded = False
    for attempt in range(4):
        try:
            st, out = req("POST", f"/storage/v1/object/{BUCKET}/{obj}", data,
                          {"x-upsert": "true"}, ctype=ctype)
            if st in (200, 201):
                uploaded = True
                break
            print(f"  attempt {attempt+1} {obj}: {st} {out}")
        except Exception as e:
            print(f"  attempt {attempt+1} {obj}: EXC {type(e).__name__}: {e}")
        time.sleep(2 * (attempt + 1))
    if uploaded:
        ok += 1
    else:
        fail += 1
        failed.append(obj)
    if (ok + fail) % 20 == 0:
        print(f"  uploaded {ok+fail}/{len(media_files)}")
print(f"upload done: {ok} ok, {fail} failed")
if failed:
    print("FAILED OBJECTS:")
    for o in failed: print("  " + o)

# ---------- 3. DB seed via PostgREST ----------
def pg(method, table, payload=None, params=""):
    return req(method, f"/rest/v1/{table}{params}", payload,
               {"Prefer": "return=representation"} if method == "POST" else None)

# find CA11
st, courses = pg("GET", "courses", params="?paper_code=eq.CA11&select=id")
ca11_id = courses[0]["id"]
print("CA11 course id found")

# delete existing modules (cascade -> lessons, quizzes, questions)
st, out = pg("DELETE", "modules", params=f"?course_id=eq.{ca11_id}")
print(f"deleted old CA11 modules: {st}")

# insert modules
mod_rows, slug_to_order = [], {}
for mod_dir in sorted(glob.glob(f"{BUILD}/m*")):
    mj = json.load(open(f"{mod_dir}/module.json"))
    mod_rows.append({"course_id": ca11_id, "title": mj["title"], "order_index": mj["order"]})
    slug_to_order[mj["slug"]] = (mod_dir, mj)
st, inserted = pg("POST", "modules", mod_rows)
print(f"inserted modules: {st} count={len(inserted) if inserted else 0}")
mod_id = {r["order_index"]: r["id"] for r in inserted}

# insert lessons
lesson_rows = []
for slug, (mod_dir, mj) in slug_to_order.items():
    for i, lsn in enumerate(mj["lessons"]):
        with open(f"{mod_dir}/{lsn['md']}", encoding="utf-8") as f: body = f.read()
        audio = public_url(f"ca11/{slug}/audio/{os.path.basename(lsn['audio'])}")
        video = public_url(f"ca11/{slug}/video/video.mp4")
        lesson_rows.append({"module_id": mod_id[mj["order"]], "title": lsn["title"],
                            "content_markdown": body, "audio_url": audio, "video_url": video,
                            "order_index": i, "is_free_preview": (mj["order"] == 1 and i == 0)})
st, inserted = pg("POST", "lessons", lesson_rows)
print(f"inserted lessons: {st} count={len(inserted) if inserted else 0}")

# insert quizzes (one per module + final mock on module 12)
quiz_rows = []
for slug, (mod_dir, mj) in slug_to_order.items():
    q = json.load(open(f"{mod_dir}/quiz.json"))
    quiz_rows.append({"module_id": mod_id[mj["order"]], "title": q.get("title", f"{mj['title']} — quiz"),
                      "_slug": slug, "_mock": False})
mock = json.load(open(f"{BUILD}/final-mock-exam.json"))
quiz_rows.append({"module_id": mod_id[12], "title": mock.get("title", "Final mock exam — CA11"),
                  "_slug": None, "_mock": True})
payload = [{k: v for k, v in r.items() if not k.startswith("_")} for r in quiz_rows]
st, inserted = pg("POST", "quizzes", payload)
print(f"inserted quizzes: {st} count={len(inserted) if inserted else 0}")
quiz_ids = [r["id"] for r in inserted]

def to_question(it, qi):
    qtype = it.get("qtype", "mcq")
    if qtype not in ("mcq", "theory"):
        qtype = "theory" if it.get("grading_rubric") else "mcq"
    return {"qtype": qtype, "question_text": it["question_text"],
            "options": it.get("options"), "correct_answer": it.get("correct_answer"),
            "explanation_markdown": it.get("explanation_markdown"),
            "grading_rubric": it.get("grading_rubric"), "order_index": qi}

q_rows = []
for qr, qid in zip(quiz_rows, quiz_ids):
    if qr["_mock"]:
        items = mock["questions"] if isinstance(mock, dict) else mock
    else:
        mod_dir, mj = slug_to_order[qr["_slug"]]
        q = json.load(open(f"{mod_dir}/quiz.json"))
        items = q["questions"] if isinstance(q, dict) else q
    for i, it in enumerate(items):
        row = to_question(it, i); row["quiz_id"] = qid; q_rows.append(row)
print(f"total questions to insert: {len(q_rows)}")
B = 100
for s in range(0, len(q_rows), B):
    st, out = pg("POST", "questions", q_rows[s:s+B])
    print(f"  questions batch {s//B+1}: {st}")
    if st not in (200, 201):
        print(f"  ERROR: {out}"); sys.exit(1)

print("SEED COMPLETE")
