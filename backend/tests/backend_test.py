"""
TBIB-courses backend API tests - full end-to-end coverage.
Covers: auth, courses, lessons, enrollments, reviews, AI assistant SSE.
"""
import os
import re
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://tibb-courses.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEACHER_EMAIL = "teacher@tbib.dz"
TEACHER_PASS = "teacher123"
STUDENT_EMAIL = "student@tbib.dz"
STUDENT_PASS = "student123"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def teacher_tok(http):
    r = http.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": TEACHER_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def student_tok(http):
    r = http.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def fresh_student(http):
    """Register a brand new student used across the enrollment flow."""
    email = f"TEST_stud_{uuid.uuid4().hex[:8]}@tbib.dz"
    r = http.post(f"{API}/auth/register", json={
        "email": email, "password": "pass1234", "name": "TEST Student",
        "role": "student", "wilaya": "16", "study_year": 2,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["token"], "user": data["user"]}


# ---------- health ----------
def test_root(http):
    r = http.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------- auth ----------
class TestAuth:
    def test_register_duplicate_returns_409(self, http):
        r = http.post(f"{API}/auth/register", json={
            "email": TEACHER_EMAIL, "password": "whatever1", "name": "Dup",
            "role": "teacher",
        })
        assert r.status_code == 409

    def test_login_wrong_password(self, http):
        r = http.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": "bad"})
        assert r.status_code == 401

    def test_me_unauth(self, http):
        r = http.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_ok(self, http, teacher_tok):
        r = http.get(f"{API}/auth/me", headers=_auth(teacher_tok))
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == TEACHER_EMAIL
        assert d["role"] == "teacher"

    def test_update_me(self, http, student_tok):
        r = http.put(f"{API}/auth/me", json={"bio": "TEST bio updated"}, headers=_auth(student_tok))
        assert r.status_code == 200
        assert r.json()["bio"] == "TEST bio updated"


# ---------- courses listing & detail ----------
class TestCourses:
    def test_list_all(self, http):
        r = http.get(f"{API}/courses")
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list) and len(docs) >= 4
        # ensure no mongo _id leak
        assert all("_id" not in d for d in docs)
        assert all("id" in d for d in docs)

    def test_list_filter_year(self, http):
        r = http.get(f"{API}/courses", params={"year": 1})
        assert r.status_code == 200
        for c in r.json():
            assert c["study_year"] == 1

    def test_list_filter_wilaya(self, http):
        r = http.get(f"{API}/courses", params={"wilaya": "16"})
        assert r.status_code == 200
        for c in r.json():
            assert c["wilaya"] == "16"

    def test_list_search_q(self, http):
        r = http.get(f"{API}/courses", params={"q": "ECG"})
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        assert any("ECG" in c["title"] or "ECG" in c["description"] for c in docs)

    def test_course_detail_anon(self, http):
        cid = http.get(f"{API}/courses").json()[0]["id"]
        r = http.get(f"{API}/courses/{cid}")
        assert r.status_code == 200
        d = r.json()
        assert d["has_access"] is False
        assert d["is_owner"] is False
        assert d["enrollment"] is None
        assert "lessons" in d and len(d["lessons"]) >= 1
        assert d["teacher"] and "name" in d["teacher"]

    def test_course_detail_as_owner(self, http, teacher_tok):
        cid = http.get(f"{API}/courses").json()[0]["id"]
        r = http.get(f"{API}/courses/{cid}", headers=_auth(teacher_tok))
        assert r.status_code == 200
        d = r.json()
        assert d["is_owner"] is True
        assert d["has_access"] is True

    def test_course_detail_404(self, http):
        r = http.get(f"{API}/courses/000000000000000000000000")
        assert r.status_code == 404


# ---------- teacher CRUD + role guards ----------
class TestTeacherCRUD:
    created_course_id = None
    created_lesson_id = None

    def test_student_cannot_create_course(self, http, student_tok):
        r = http.post(f"{API}/courses", headers=_auth(student_tok), json={
            "title": "TEST should fail", "description": "nope", "module": "X",
            "study_year": 1, "wilaya": "16", "price": 100,
        })
        assert r.status_code == 403

    def test_create_course(self, http, teacher_tok):
        r = http.post(f"{API}/courses", headers=_auth(teacher_tok), json={
            "title": "TEST Course Pytest", "description": "created by backend_test",
            "module": "TESTModule", "study_year": 3, "wilaya": "16", "price": 1500,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "TEST Course Pytest"
        TestTeacherCRUD.created_course_id = d["id"]

    def test_add_lesson(self, http, teacher_tok):
        cid = TestTeacherCRUD.created_course_id
        r = http.post(f"{API}/courses/{cid}/lessons", headers=_auth(teacher_tok), json={
            "title": "TEST Lesson 1", "content": "Hello", "video_url": "https://youtube.com/x",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["course_id"] == cid
        TestTeacherCRUD.created_lesson_id = d["id"]
        # verify lessons_count via detail
        detail = http.get(f"{API}/courses/{cid}").json()
        assert detail["course"]["lessons_count"] >= 1

    def test_lesson_locked_for_other_student(self, http, student_tok):
        lid = TestTeacherCRUD.created_lesson_id
        r = http.get(f"{API}/lessons/{lid}", headers=_auth(student_tok))
        assert r.status_code == 403

    def test_update_course(self, http, teacher_tok):
        cid = TestTeacherCRUD.created_course_id
        r = http.put(f"{API}/courses/{cid}", headers=_auth(teacher_tok), json={
            "title": "TEST Course Updated", "description": "upd", "module": "TESTModule",
            "study_year": 3, "wilaya": "16", "price": 2000,
        })
        assert r.status_code == 200
        assert r.json()["title"] == "TEST Course Updated"
        assert r.json()["price"] == 2000


# ---------- enrollment flow ----------
class TestEnrollment:
    enrollment_id = None
    course_id = None

    def test_enroll(self, http, fresh_student):
        courses = http.get(f"{API}/courses").json()
        # pick first non-TEST course so students_count increments on a seed course
        target = next(c for c in courses if not c["title"].startswith("TEST"))
        TestEnrollment.course_id = target["id"]
        r = http.post(f"{API}/courses/{target['id']}/enroll",
                      headers=_auth(fresh_student["token"]),
                      json={"payment_method": "baridimob", "payment_ref": "REF-TEST-123"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["course_id"] == target["id"]
        TestEnrollment.enrollment_id = d["id"]

    def test_duplicate_enroll_409(self, http, fresh_student):
        r = http.post(f"{API}/courses/{TestEnrollment.course_id}/enroll",
                      headers=_auth(fresh_student["token"]),
                      json={"payment_method": "ccp", "payment_ref": "REF-DUP"})
        assert r.status_code == 409

    def test_teacher_sees_request(self, http, teacher_tok):
        r = http.get(f"{API}/teacher/requests", headers=_auth(teacher_tok))
        assert r.status_code == 200
        assert any(e["id"] == TestEnrollment.enrollment_id for e in r.json())

    def test_teacher_stats(self, http, teacher_tok):
        r = http.get(f"{API}/teacher/stats", headers=_auth(teacher_tok))
        assert r.status_code == 200
        d = r.json()
        for k in ("courses", "students", "pending", "revenue"):
            assert k in d

    def test_approve_increments_students_count(self, http, teacher_tok):
        before = http.get(f"{API}/courses/{TestEnrollment.course_id}").json()["course"]["students_count"]
        r = http.post(f"{API}/enrollments/{TestEnrollment.enrollment_id}/approve",
                      headers=_auth(teacher_tok))
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        after = http.get(f"{API}/courses/{TestEnrollment.course_id}").json()["course"]["students_count"]
        assert after == before + 1

    def test_double_approve_400(self, http, teacher_tok):
        r = http.post(f"{API}/enrollments/{TestEnrollment.enrollment_id}/approve",
                      headers=_auth(teacher_tok))
        assert r.status_code == 400

    def test_student_can_access_lesson(self, http, fresh_student):
        detail = http.get(f"{API}/courses/{TestEnrollment.course_id}",
                          headers=_auth(fresh_student["token"])).json()
        assert detail["has_access"] is True
        lid = detail["lessons"][0]["id"]
        r = http.get(f"{API}/lessons/{lid}", headers=_auth(fresh_student["token"]))
        assert r.status_code == 200
        assert "content" in r.json()


# ---------- reviews ----------
class TestReviews:
    def test_review_requires_enrollment(self, http, student_tok):
        courses = http.get(f"{API}/courses").json()
        cid = next(c["id"] for c in courses if not c["title"].startswith("TEST"))
        r = http.post(f"{API}/courses/{cid}/reviews", headers=_auth(student_tok),
                      json={"rating": 5, "comment": "nope"})
        assert r.status_code == 403

    def test_approved_student_can_review(self, http, fresh_student):
        cid = TestEnrollment.course_id
        r = http.post(f"{API}/courses/{cid}/reviews", headers=_auth(fresh_student["token"]),
                      json={"rating": 4, "comment": "TEST great"})
        assert r.status_code == 200
        assert r.json()["rating"] == 4
        detail = http.get(f"{API}/courses/{cid}").json()["course"]
        assert detail["rating_count"] >= 1
        assert detail["rating_avg"] >= 1


# ---------- AI assistant ----------
class TestAI:
    def test_history_initially_fetchable(self, http, student_tok):
        r = http.get(f"{API}/ai/history", headers=_auth(student_tok))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_clear_history(self, http, student_tok):
        r = http.delete(f"{API}/ai/history", headers=_auth(student_tok))
        assert r.status_code == 200

    def test_chat_sse_stream(self, http, student_tok):
        with requests.post(f"{API}/ai/chat", headers={**_auth(student_tok), "Content-Type": "application/json"},
                           json={"message": "Say hello in one short sentence.", "language": "fr"},
                           stream=True, timeout=60) as r:
            assert r.status_code == 200
            got_delta = False
            got_done = False
            deadline = time.time() + 45
            for raw in r.iter_lines(decode_unicode=True):
                if time.time() > deadline:
                    break
                if not raw:
                    continue
                if raw.startswith("data: "):
                    payload = raw[6:]
                    if payload == "[DONE]":
                        got_done = True
                        break
                    if "delta" in payload:
                        got_delta = True
            assert got_delta, "No streaming deltas received"
            assert got_done, "No [DONE] terminator received"

        # verify assistant turn persisted
        hist = http.get(f"{API}/ai/history", headers=_auth(student_tok)).json()
        assert any(m["role"] == "assistant" for m in hist)


# ---------- cleanup ----------
def test_zz_cleanup(http, teacher_tok):
    # delete lesson + course created by TestTeacherCRUD
    if TestTeacherCRUD.created_lesson_id:
        http.delete(f"{API}/lessons/{TestTeacherCRUD.created_lesson_id}", headers=_auth(teacher_tok))
    if TestTeacherCRUD.created_course_id:
        r = http.delete(f"{API}/courses/{TestTeacherCRUD.created_course_id}", headers=_auth(teacher_tok))
        assert r.status_code == 200
