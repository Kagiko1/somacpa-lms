#!/usr/bin/env python3
"""Phase 2: retry failed illustration upload, then insert quizzes + questions with
return=minimal and retry/backoff (the Supabase endpoint drops connections randomly)."""
import json, os, glob, mimetypes, time
import urllib.request, urllib.error
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

def raw_req(method, path, data=None, headers=None, ctype="application/json"):
    h = {"apikey": SRV, "Authorization": f"Bearer {SRV}"}
    if headers: h.update(headers)
    body = None
    if data is not None:
        if isinstance(data, (dict, list)):
            body = json.dumps(data).encode(); h["Content-Type"] = ctype
        else:
            body = data; h["Content-Type"] = ctype
    last = None
    for a in range(6):
        try:
            r = urllib.request.Request(SB_URL + path, data=body, headers=h, method=method)
            with urllib.request.urlopen(r, timeout=120) as resp:
                raw = resp.read().decode()
                return resp.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as e:
            return e.code, {"error": e.read().decode()[:300]}
        except Exception as e:
            last = e
            print(f"  retry {a+1} {method} {path[:70]}: {type(e).__name__}")
            time.sleep(2 * (a + 1))
    raise RuntimeError(f"GAVE UP {method} {path}: {last}")

# 1. retry the failed illustration
fp = f"{BUILD}/m04-correction-of-errors-and-suspense-accounts/illustrations/suspense-account-flow.png"
obj = "ca11/m04-correction-of-errors-and-suspense-accounts/illustrations/suspense-account-flow.png"
with open(fp, "rb") as f: data = f.read()
st, _ = raw_req("POST", f"/storage/v1/object/{BUCKET}/{obj}", data,
                {"x-upsert": "true"}, ctype="image/png")
print(f"illustration retry: {st}")

# 2. get current state
def get(path):
    st, out = raw_req("GET", path)
    assert st == 200, (st, out)
    return out

ca11 = get("/rest/v1/courses?paper_code=eq.CA11&select=id")[0]["id"]
mods = get(f"/rest/v1/modules?course_id=eq.{ca11}&select=id,order_index&order=order_index")
assert len(mods) == 12, f"expected 12 modules, got {len(mods)}"
mod_id = {m["order_index"]: m["id"] for m in mods}
mids = ",".join(m["id"] for m in mods)
n_lessons = len(get(f"/rest/v1/lessons?module_id=in.({mids})&select=id"))
n_quiz = len(get(f"/rest/v1/quizzes?module_id=in.({mids})&select=id"))
print(f"state: modules=12 lessons={n_lessons} quizzes={n_quiz}")

# 3. insert quizzes if missing
if n_quiz == 0:
    slug_to = {}
    quiz_rows = []
    for mod_dir in sorted(glob.glob(f"{BUILD}/m*")):
        mj = json.load(open(f"{mod_dir}/module.json"))
        q = json.load(open(f"{mod_dir}/quiz.json"))
        slug_to[mj["slug"]] = (mod_dir, mj, q)
        quiz_rows.append({"module_id": mod_id[mj["order"]],
                          "title": q.get("title", f"{mj['title']} quiz"),
                          "_slug": mj["slug"], "_mock": False})
    mock = json.load(open(f"{BUILD}/final-mock-exam.json"))
    quiz_rows.append({"module_id": mod_id[12], "title": mock.get("title", "Final mock exam"),
                      "_slug": None, "_mock": True})
    payload = [{k: v for k, v in r.items() if not k.startswith("_")} for r in quiz_rows]
    st, _ = raw_req("POST", "/rest/v1/quizzes",
                    payload, {"Prefer": "return=minimal"})
    print(f"inserted {len(payload)} quizzes: {st}")

    qids = [q["id"] for q in get(
        f"/rest/v1/quizzes?module_id=in.({mids})&select=id,module_id,title")]

    def to_question(it, qi):
        qtype = it.get("qtype", "mcq")
        if qtype not in ("mcq", "theory"):
            qtype = "theory" if it.get("grading_rubric") else "mcq"
        return {"qtype": qtype, "question_text": it["question_text"],
                "options": it.get("options"), "correct_answer": it.get("correct_answer"),
                "explanation_markdown": it.get("explanation_markdown"),
                "grading_rubric": it.get("grading_rubric"), "order_index": qi}

    # map quizzes back to their question source via title/module
    q_rows = []
    for qr, qrow in zip(quiz_rows, get(f"/rest/v1/quizzes?module_id=in.({mids})&select=id,title,module_id")):
        if qr["_mock"]:
            items = mock["questions"]
        else:
            mod_dir, mj, q = slug_to[qr["_slug"]]
            items = q["questions"]
        for i, it in enumerate(items):
            row = to_question(it, i); row["quiz_id"] = qrow["id"]; q_rows.append(row)
    print(f"inserting {len(q_rows)} questions")
    for s in range(0, len(q_rows), 50):
        st, out = raw_req("POST", "/rest/v1/questions", q_rows[s:s+50],
                          {"Prefer": "return=minimal"})
        print(f"  batch {s//50+1}: {st}")
        assert st in (200, 201), out

# 4. final verification
nq = len(get(f"/rest/v1/quizzes?module_id=in.({mids})&select=id"))
qids = ",".join(q["id"] for q in get(f"/rest/v1/quizzes?module_id=in.({mids})&select=id"))
nques = get(f"/rest/v1/questions?quiz_id=in.({qids})&select=id", )
print(f"FINAL: modules=12 lessons={n_lessons} quizzes={nq} questions={len(nques)}")
mcq = len([1 for _ in get(f"/rest/v1/questions?quiz_id=in.({qids})&qtype=eq.mcq&select=id")])
thy = len([1 for _ in get(f"/rest/v1/questions?quiz_id=in.({qids})&qtype=eq.theory&select=id")])
print(f"question types: mcq={mcq} theory={thy}")
print("PHASE2 COMPLETE")
