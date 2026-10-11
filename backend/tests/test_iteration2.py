"""
TBIB-courses iteration 2 tests: receipt uploads, file access, verification + admin flows.
Note: pytest-xdist loadscope groups tests by class/module. Shared state via module globals works
within a single worker so we group related tests into one class.
"""
import os
import struct
import zlib
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@tbib.dz", "TbibAdmin2026!")
TEACHER = ("teacher@tbib.dz", "teacher123")
MAJOR = ("major@tbib.dz", "major123")
STUDENT = ("student@tbib.dz", "student123")


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def _png_bytes() -> bytes:
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00\xff\xff\xff"))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def test_register_admin_role_422():
    r = requests.post(f"{API}/auth/register", json={
        "email": f"TEST_adm_{uuid.uuid4().hex[:6]}@x.dz", "password": "pass1234",
        "name": "nope", "role": "admin",
    }, timeout=30)
    assert r.status_code == 422


class TestReceiptAndFiles:
    """Upload + File ACL + Enrollment with receipt_path (shared state via class attrs)."""
    student = None
    fresh = None
    teacher = None
    admin = None
    major = None
    rcpt_path = None
    fresh_rcpt = None

    def test_000_bootstrap(self):
        cls = TestReceiptAndFiles
        cls.student = _login(*STUDENT)
        cls.teacher = _login(*TEACHER)
        cls.admin = _login(*ADMIN)
        cls.major = _login(*MAJOR)
        email = f"TEST_rcpt_{uuid.uuid4().hex[:8]}@tbib.dz"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "pass1234", "name": "TEST Rcpt",
            "role": "student", "wilaya": "16", "study_year": 2,
        }, timeout=30)
        assert r.status_code == 200
        cls.fresh = r.json()

    def test_010_upload_requires_auth(self):
        r = requests.post(f"{API}/upload", files={"file": ("x.png", _png_bytes(), "image/png")},
                          data={"kind": "receipt"}, timeout=60)
        assert r.status_code == 401

    def test_020_upload_rejects_non_image(self):
        r = requests.post(f"{API}/upload", headers=_auth(self.student["token"]),
                          files={"file": ("x.txt", b"hello", "text/plain")}, data={"kind": "receipt"}, timeout=60)
        assert r.status_code == 400

    def test_030_upload_rejects_bad_kind(self):
        r = requests.post(f"{API}/upload", headers=_auth(self.student["token"]),
                          files={"file": ("x.png", _png_bytes(), "image/png")},
                          data={"kind": "bogus"}, timeout=60)
        assert r.status_code == 400

    def test_040_upload_receipt_ok(self):
        r = requests.post(f"{API}/upload", headers=_auth(self.student["token"]),
                          files={"file": ("rcpt.png", _png_bytes(), "image/png")},
                          data={"kind": "receipt"}, timeout=60)
        assert r.status_code == 200, r.text
        TestReceiptAndFiles.rcpt_path = r.json()["path"]
        assert TestReceiptAndFiles.rcpt_path

    def test_050_owner_can_read(self):
        r = requests.get(f"{API}/files/{self.rcpt_path}", headers=_auth(self.student["token"]), timeout=60)
        assert r.status_code == 200
        assert r.headers.get("Content-Type", "").startswith("image/")

    def test_060_token_query_works(self):
        r = requests.get(f"{API}/files/{self.rcpt_path}?token={self.student['token']}", timeout=60)
        assert r.status_code == 200

    def test_070_other_user_forbidden(self):
        r = requests.get(f"{API}/files/{self.rcpt_path}", headers=_auth(self.fresh["token"]), timeout=60)
        assert r.status_code == 403

    def test_080_unauth_forbidden(self):
        r = requests.get(f"{API}/files/{self.rcpt_path}", timeout=60)
        assert r.status_code == 401

    def test_090_admin_can_read(self):
        r = requests.get(f"{API}/files/{self.rcpt_path}", headers=_auth(self.admin["token"]), timeout=60)
        assert r.status_code == 200

    def test_100_enroll_rejects_without_ref_or_receipt(self):
        c = next(c for c in requests.get(f"{API}/courses").json() if c["teacher_name"].startswith("Dr. Amina"))
        TestReceiptAndFiles.target_course = c
        r = requests.post(f"{API}/courses/{c['id']}/enroll",
                          headers=_auth(self.fresh["token"]),
                          json={"payment_method": "ccp", "payment_ref": ""}, timeout=30)
        assert r.status_code == 400

    def test_110_enroll_rejects_foreign_receipt(self):
        c = TestReceiptAndFiles.target_course
        r = requests.post(f"{API}/courses/{c['id']}/enroll",
                          headers=_auth(self.fresh["token"]),
                          json={"payment_method": "baridimob", "payment_ref": "",
                                "receipt_path": self.rcpt_path}, timeout=30)
        assert r.status_code == 400

    def test_120_enroll_with_own_receipt_only_ok(self):
        up = requests.post(f"{API}/upload", headers=_auth(self.fresh["token"]),
                           files={"file": ("r.png", _png_bytes(), "image/png")},
                           data={"kind": "receipt"}, timeout=60)
        assert up.status_code == 200
        TestReceiptAndFiles.fresh_rcpt = up.json()["path"]
        c = TestReceiptAndFiles.target_course
        r = requests.post(f"{API}/courses/{c['id']}/enroll",
                          headers=_auth(self.fresh["token"]),
                          json={"payment_method": "baridimob", "payment_ref": "",
                                "receipt_path": self.fresh_rcpt}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["receipt_path"] == self.fresh_rcpt
        TestReceiptAndFiles.enrollment_id = d["id"]

    def test_130_teacher_requests_includes_receipt(self):
        r = requests.get(f"{API}/teacher/requests", headers=_auth(self.teacher["token"]), timeout=30)
        assert r.status_code == 200
        row = next((e for e in r.json() if e["id"] == TestReceiptAndFiles.enrollment_id), None)
        assert row is not None
        assert row["receipt_path"] == self.fresh_rcpt

    def test_140_teacher_can_view_receipt(self):
        r = requests.get(f"{API}/files/{self.fresh_rcpt}", headers=_auth(self.teacher["token"]), timeout=60)
        assert r.status_code == 200

    def test_150_other_teacher_cannot_view_receipt(self):
        r = requests.get(f"{API}/files/{self.fresh_rcpt}", headers=_auth(self.major["token"]), timeout=60)
        assert r.status_code == 403


class TestVerificationAndAdmin:
    """Verification request + admin review flow (grouped so loadscope keeps them on one worker)."""
    teacher = None
    student = None
    major = None
    admin = None
    major_doc = None
    major_id = None

    def test_000_bootstrap(self):
        cls = TestVerificationAndAdmin
        cls.teacher = _login(*TEACHER)
        cls.student = _login(*STUDENT)
        cls.major = _login(*MAJOR)
        cls.admin = _login(*ADMIN)
        cls.major_id = cls.major["user"]["id"]
        # If major is already approved from a prior run, reset by rejecting -> we can only reject pending.
        # Best effort: leave starting state as-is and let the test adapt.

    def test_010_student_cannot_request_verification(self):
        up = requests.post(f"{API}/upload", headers=_auth(self.student["token"]),
                           files={"file": ("v.png", _png_bytes(), "image/png")},
                           data={"kind": "verification"}, timeout=60)
        assert up.status_code == 200
        r = requests.post(f"{API}/verification/request", headers=_auth(self.student["token"]),
                          json={"doc_path": up.json()["path"], "note": "x"}, timeout=30)
        assert r.status_code == 403

    def test_020_already_verified_teacher_blocked(self):
        up = requests.post(f"{API}/upload", headers=_auth(self.teacher["token"]),
                           files={"file": ("v.png", _png_bytes(), "image/png")},
                           data={"kind": "verification"}, timeout=60)
        assert up.status_code == 200
        r = requests.post(f"{API}/verification/request", headers=_auth(self.teacher["token"]),
                          json={"doc_path": up.json()["path"]}, timeout=30)
        assert r.status_code == 400

    def test_030_major_submits_verification(self):
        up = requests.post(f"{API}/upload", headers=_auth(self.major["token"]),
                           files={"file": ("card.png", _png_bytes(), "image/png")},
                           data={"kind": "verification"}, timeout=60)
        assert up.status_code == 200, up.text
        TestVerificationAndAdmin.major_doc = up.json()["path"]
        # If already verified (approved from a prior run), skip the pending submission
        me = requests.get(f"{API}/auth/me", headers=_auth(self.major["token"]), timeout=30).json()
        if me.get("verified"):
            pytest.skip("major already verified from prior run; cannot create pending request")
        r = requests.post(f"{API}/verification/request", headers=_auth(self.major["token"]),
                          json={"doc_path": self.major_doc, "note": "TEST verification"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["verification_status"] == "pending"

    def test_040_verification_rejects_foreign_file(self):
        up = requests.post(f"{API}/upload", headers=_auth(self.student["token"]),
                           files={"file": ("v.png", _png_bytes(), "image/png")},
                           data={"kind": "verification"}, timeout=60)
        assert up.status_code == 200
        r = requests.post(f"{API}/verification/request", headers=_auth(self.major["token"]),
                          json={"doc_path": up.json()["path"]}, timeout=30)
        assert r.status_code == 400

    def test_050_non_admin_forbidden(self):
        r = requests.get(f"{API}/admin/verifications", headers=_auth(self.teacher["token"]), timeout=30)
        assert r.status_code == 403
        r = requests.get(f"{API}/admin/stats", headers=_auth(self.teacher["token"]), timeout=30)
        assert r.status_code == 403

    def test_060_admin_stats_shape(self):
        r = requests.get(f"{API}/admin/stats", headers=_auth(self.admin["token"]), timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("pending", "verified", "instructors", "students", "courses"):
            assert k in d and isinstance(d[k], int)

    def test_070_admin_lists_pending(self):
        r = requests.get(f"{API}/admin/verifications?status=pending", headers=_auth(self.admin["token"]), timeout=30)
        assert r.status_code == 200
        # Not strict: major may be skipped if already verified
        ids = [u["id"] for u in r.json()]
        me = requests.get(f"{API}/auth/me", headers=_auth(self.major["token"]), timeout=30).json()
        if me["verification_status"] == "pending":
            assert self.major_id in ids

    def test_080_reject_then_resubmit(self):
        me = requests.get(f"{API}/auth/me", headers=_auth(self.major["token"]), timeout=30).json()
        if me["verification_status"] != "pending":
            pytest.skip("major is not pending; skipping reject flow")
        r = requests.post(f"{API}/admin/verifications/{self.major_id}/reject",
                          headers=_auth(self.admin["token"]), json={"reason": "TEST unclear"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["verification_status"] == "rejected"
        assert r.json()["verification_reason"] == "TEST unclear"
        me = requests.get(f"{API}/auth/me", headers=_auth(self.major["token"]), timeout=30).json()
        assert me["verification_reason"] == "TEST unclear"
        # resubmit
        r = requests.post(f"{API}/verification/request", headers=_auth(self.major["token"]),
                          json={"doc_path": self.major_doc, "note": "resubmit"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["verification_status"] == "pending"

    def test_090_approve_sets_verified_and_courses(self):
        me = requests.get(f"{API}/auth/me", headers=_auth(self.major["token"]), timeout=30).json()
        if me["verification_status"] != "pending":
            pytest.skip("major not pending; cannot approve")
        r = requests.post(f"{API}/admin/verifications/{self.major_id}/approve",
                          headers=_auth(self.admin["token"]), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["verified"] is True
        assert d["verification_status"] == "approved"
        # Courses propagated
        courses = requests.get(f"{API}/courses", params={"teacher_id": self.major_id}, timeout=30).json()
        assert len(courses) >= 1
        assert all(c["teacher_verified"] is True for c in courses)
        cid = courses[0]["id"]
        det = requests.get(f"{API}/courses/{cid}", timeout=30).json()
        assert det["teacher"]["verified"] is True
