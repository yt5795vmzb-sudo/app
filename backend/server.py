from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict, EmailStr
from typing import Annotated, List, Literal, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import json
import logging
import re
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger("meddorous")
logging.basicConfig(level=logging.INFO)


# ---------- Mongo helpers ----------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude={"id"})
        return data


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def oid(v: str) -> ObjectId:
    if not ObjectId.is_valid(v):
        raise HTTPException(404, "Not found")
    return ObjectId(v)


# ---------- Models ----------
Role = Literal["student", "teacher"]
InstructorType = Literal["doctor", "top_student"]


class User(BaseDocument):
    email: str
    name: str
    role: Role
    wilaya: Optional[str] = None
    study_year: Optional[int] = None
    instructor_type: Optional[InstructorType] = None
    bio: Optional[str] = None
    ccp_account: Optional[str] = None
    baridimob_rip: Optional[str] = None
    phone: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class Course(BaseDocument):
    teacher_id: str
    teacher_name: str
    teacher_type: Optional[str] = None
    title: str
    description: str
    module: str
    study_year: int
    wilaya: str
    price: int
    cover_image: Optional[str] = None
    language: str = "fr"
    rating_avg: float = 0
    rating_count: int = 0
    lessons_count: int = 0
    students_count: int = 0
    created_at: str = Field(default_factory=now_iso)


class Lesson(BaseDocument):
    course_id: str
    title: str
    content: str = ""
    video_url: Optional[str] = None
    order: int = 0
    created_at: str = Field(default_factory=now_iso)


class Enrollment(BaseDocument):
    course_id: str
    course_title: str
    teacher_id: str
    student_id: str
    student_name: str
    student_wilaya: Optional[str] = None
    price: int
    payment_method: str
    payment_ref: str
    note: Optional[str] = None
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: str = Field(default_factory=now_iso)


class Review(BaseDocument):
    course_id: str
    student_id: str
    student_name: str
    rating: int
    comment: str = ""
    created_at: str = Field(default_factory=now_iso)


class ChatMessage(BaseDocument):
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: str = Field(default_factory=now_iso)


# ---------- Inputs ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=2)
    role: Role
    wilaya: Optional[str] = None
    study_year: Optional[int] = None
    instructor_type: Optional[InstructorType] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    name: Optional[str] = None
    wilaya: Optional[str] = None
    study_year: Optional[int] = None
    instructor_type: Optional[InstructorType] = None
    bio: Optional[str] = None
    ccp_account: Optional[str] = None
    baridimob_rip: Optional[str] = None
    phone: Optional[str] = None


class CourseIn(BaseModel):
    title: str = Field(min_length=3)
    description: str = Field(min_length=3)
    module: str
    study_year: int = Field(ge=1, le=7)
    wilaya: str
    price: int = Field(ge=0)
    cover_image: Optional[str] = None
    language: str = "fr"


class LessonIn(BaseModel):
    title: str = Field(min_length=2)
    content: str = ""
    video_url: Optional[str] = None


class EnrollIn(BaseModel):
    payment_method: Literal["ccp", "baridimob"]
    payment_ref: str = Field(min_length=3)
    note: Optional[str] = None


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class ChatIn(BaseModel):
    message: str = Field(min_length=1)
    language: str = "ar"


# ---------- Auth ----------
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_pw(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(user_id: str, role: str) -> str:
    n = datetime.now(timezone.utc)
    return jwt.encode({"sub": user_id, "role": role, "iat": n, "exp": n + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALG)


async def current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        claims = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid or expired token")
    sub = claims.get("sub")
    if not sub or not ObjectId.is_valid(sub):
        raise HTTPException(401, "Invalid token")
    doc = await db.users.find_one({"_id": ObjectId(sub)})
    if not doc:
        raise HTTPException(401, "User not found")
    return User.from_mongo(doc)


async def teacher_user(user: User = Depends(current_user)) -> User:
    if user.role != "teacher":
        raise HTTPException(403, "Teachers only")
    return user


def user_out(u: User) -> dict:
    return u.model_dump()


@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    itype = (body.instructor_type or "doctor") if body.role == "teacher" else None
    u = User(email=email, name=body.name.strip(), role=body.role, wilaya=body.wilaya, study_year=body.study_year,
             instructor_type=itype)
    data = u.to_mongo()
    data["password_hash"] = hash_pw(body.password)
    res = await db.users.insert_one(data)
    u.id = str(res.inserted_id)
    return {"token": make_token(u.id, u.role), "user": user_out(u)}


@api.post("/auth/login")
async def login(body: LoginIn):
    doc = await db.users.find_one({"email": body.email.lower().strip()})
    if not doc or not verify_pw(body.password, doc["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    u = User.from_mongo(doc)
    return {"token": make_token(u.id, u.role), "user": user_out(u)}


@api.get("/auth/me")
async def me(user: User = Depends(current_user)):
    return user_out(user)


@api.put("/auth/me")
async def update_me(body: ProfileIn, user: User = Depends(current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": updates})
        if user.role == "teacher":
            cu = {}
            if "name" in updates:
                cu["teacher_name"] = updates["name"]
            if "instructor_type" in updates:
                cu["teacher_type"] = updates["instructor_type"]
            if cu:
                await db.courses.update_many({"teacher_id": user.id}, {"$set": cu})
    doc = await db.users.find_one({"_id": ObjectId(user.id)})
    return user_out(User.from_mongo(doc))


# ---------- Courses ----------
@api.get("/courses")
async def list_courses(q: Optional[str] = None, year: Optional[int] = None, wilaya: Optional[str] = None,
                       module: Optional[str] = None, teacher_id: Optional[str] = None):
    filt: dict = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        filt["$or"] = [{"title": rx}, {"description": rx}, {"module": rx}, {"teacher_name": rx}]
    if year:
        filt["study_year"] = year
    if wilaya:
        filt["wilaya"] = wilaya
    if module:
        filt["module"] = module
    if teacher_id:
        filt["teacher_id"] = teacher_id
    docs = await db.courses.find(filt).sort("created_at", -1).to_list(200)
    return [Course.from_mongo(d).model_dump() for d in docs]


async def get_course_or_404(course_id: str) -> Course:
    doc = await db.courses.find_one({"_id": oid(course_id)})
    if not doc:
        raise HTTPException(404, "Course not found")
    return Course.from_mongo(doc)


@api.get("/courses/{course_id}")
async def course_detail(course_id: str, authorization: Optional[str] = Header(None)):
    course = await get_course_or_404(course_id)
    user = None
    if authorization:
        try:
            user = await current_user(authorization)
        except HTTPException:
            user = None
    lessons = await db.lessons.find({"course_id": course_id}).sort("order", 1).to_list(500)
    enrollment = None
    is_owner = bool(user and user.id == course.teacher_id)
    if user and not is_owner:
        e = await db.enrollments.find_one({"course_id": course_id, "student_id": user.id}, sort=[("created_at", -1)])
        if e:
            enrollment = Enrollment.from_mongo(e).model_dump()
    has_access = is_owner or (enrollment is not None and enrollment["status"] == "approved")
    tdoc = await db.users.find_one({"_id": ObjectId(course.teacher_id)})
    teacher = User.from_mongo(tdoc) if tdoc else None
    return {
        "course": course.model_dump(),
        "lessons": [{"id": str(l["_id"]), "title": l["title"], "order": l.get("order", 0),
                     "has_video": bool(l.get("video_url"))} for l in lessons],
        "enrollment": enrollment,
        "is_owner": is_owner,
        "has_access": has_access,
        "teacher": {
            "id": teacher.id, "name": teacher.name, "bio": teacher.bio, "instructor_type": teacher.instructor_type,
            "study_year": teacher.study_year, "wilaya": teacher.wilaya,
            "ccp_account": teacher.ccp_account, "baridimob_rip": teacher.baridimob_rip, "phone": teacher.phone,
        } if teacher else None,
    }


@api.post("/courses")
async def create_course(body: CourseIn, user: User = Depends(teacher_user)):
    c = Course(teacher_id=user.id, teacher_name=user.name, teacher_type=user.instructor_type, **body.model_dump())
    res = await db.courses.insert_one(c.to_mongo())
    c.id = str(res.inserted_id)
    return c.model_dump()


@api.put("/courses/{course_id}")
async def update_course(course_id: str, body: CourseIn, user: User = Depends(teacher_user)):
    course = await get_course_or_404(course_id)
    if course.teacher_id != user.id:
        raise HTTPException(403, "Not your course")
    await db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": body.model_dump()})
    return (await get_course_or_404(course_id)).model_dump()


@api.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: User = Depends(teacher_user)):
    course = await get_course_or_404(course_id)
    if course.teacher_id != user.id:
        raise HTTPException(403, "Not your course")
    await db.courses.delete_one({"_id": ObjectId(course_id)})
    await db.lessons.delete_many({"course_id": course_id})
    return {"ok": True}


# ---------- Lessons ----------
@api.post("/courses/{course_id}/lessons")
async def add_lesson(course_id: str, body: LessonIn, user: User = Depends(teacher_user)):
    course = await get_course_or_404(course_id)
    if course.teacher_id != user.id:
        raise HTTPException(403, "Not your course")
    count = await db.lessons.count_documents({"course_id": course_id})
    l = Lesson(course_id=course_id, order=count + 1, **body.model_dump())
    res = await db.lessons.insert_one(l.to_mongo())
    await db.courses.update_one({"_id": ObjectId(course_id)}, {"$inc": {"lessons_count": 1}})
    l.id = str(res.inserted_id)
    return l.model_dump()


@api.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, user: User = Depends(current_user)):
    doc = await db.lessons.find_one({"_id": oid(lesson_id)})
    if not doc:
        raise HTTPException(404, "Lesson not found")
    lesson = Lesson.from_mongo(doc)
    course = await get_course_or_404(lesson.course_id)
    if course.teacher_id != user.id:
        e = await db.enrollments.find_one({"course_id": lesson.course_id, "student_id": user.id, "status": "approved"})
        if not e:
            raise HTTPException(403, "Enroll to access this lesson")
    return {**lesson.model_dump(), "course_title": course.title}


@api.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, user: User = Depends(teacher_user)):
    doc = await db.lessons.find_one({"_id": oid(lesson_id)})
    if not doc:
        raise HTTPException(404, "Lesson not found")
    course = await get_course_or_404(doc["course_id"])
    if course.teacher_id != user.id:
        raise HTTPException(403, "Not your course")
    await db.lessons.delete_one({"_id": doc["_id"]})
    await db.courses.update_one({"_id": ObjectId(course.id)}, {"$inc": {"lessons_count": -1}})
    return {"ok": True}


# ---------- Enrollments ----------
@api.post("/courses/{course_id}/enroll")
async def enroll(course_id: str, body: EnrollIn, user: User = Depends(current_user)):
    if user.role != "student":
        raise HTTPException(403, "Students only")
    course = await get_course_or_404(course_id)
    existing = await db.enrollments.find_one({"course_id": course_id, "student_id": user.id,
                                              "status": {"$in": ["pending", "approved"]}})
    if existing:
        raise HTTPException(409, "Request already exists")
    e = Enrollment(course_id=course_id, course_title=course.title, teacher_id=course.teacher_id,
                   student_id=user.id, student_name=user.name, student_wilaya=user.wilaya,
                   price=course.price, **body.model_dump())
    res = await db.enrollments.insert_one(e.to_mongo())
    e.id = str(res.inserted_id)
    return e.model_dump()


@api.get("/me/enrollments")
async def my_enrollments(user: User = Depends(current_user)):
    docs = await db.enrollments.find({"student_id": user.id}).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        e = Enrollment.from_mongo(d).model_dump()
        c = await db.courses.find_one({"_id": ObjectId(e["course_id"])})
        e["course"] = Course.from_mongo(c).model_dump() if c else None
        out.append(e)
    return out


@api.get("/teacher/courses")
async def teacher_courses(user: User = Depends(teacher_user)):
    docs = await db.courses.find({"teacher_id": user.id}).sort("created_at", -1).to_list(500)
    return [Course.from_mongo(d).model_dump() for d in docs]


@api.get("/teacher/requests")
async def teacher_requests(status: Optional[str] = None, user: User = Depends(teacher_user)):
    filt = {"teacher_id": user.id}
    if status:
        filt["status"] = status
    docs = await db.enrollments.find(filt).sort("created_at", -1).to_list(500)
    return [Enrollment.from_mongo(d).model_dump() for d in docs]


@api.get("/teacher/stats")
async def teacher_stats(user: User = Depends(teacher_user)):
    approved = await db.enrollments.find({"teacher_id": user.id, "status": "approved"}).to_list(5000)
    pending = await db.enrollments.count_documents({"teacher_id": user.id, "status": "pending"})
    courses = await db.courses.count_documents({"teacher_id": user.id})
    return {"courses": courses, "students": len(approved), "pending": pending,
            "revenue": sum(e.get("price", 0) for e in approved)}


async def set_status(enrollment_id: str, status: str, user: User):
    doc = await db.enrollments.find_one({"_id": oid(enrollment_id)})
    if not doc or doc["teacher_id"] != user.id:
        raise HTTPException(404, "Request not found")
    if doc["status"] != "pending":
        raise HTTPException(400, "Already processed")
    await db.enrollments.update_one({"_id": doc["_id"]}, {"$set": {"status": status}})
    if status == "approved":
        await db.courses.update_one({"_id": ObjectId(doc["course_id"])}, {"$inc": {"students_count": 1}})
    doc["status"] = status
    return Enrollment.from_mongo(doc).model_dump()


@api.post("/enrollments/{enrollment_id}/approve")
async def approve(enrollment_id: str, user: User = Depends(teacher_user)):
    return await set_status(enrollment_id, "approved", user)


@api.post("/enrollments/{enrollment_id}/reject")
async def reject(enrollment_id: str, user: User = Depends(teacher_user)):
    return await set_status(enrollment_id, "rejected", user)


# ---------- Reviews ----------
@api.get("/courses/{course_id}/reviews")
async def list_reviews(course_id: str):
    docs = await db.reviews.find({"course_id": course_id}).sort("created_at", -1).to_list(500)
    return [Review.from_mongo(d).model_dump() for d in docs]


@api.post("/courses/{course_id}/reviews")
async def add_review(course_id: str, body: ReviewIn, user: User = Depends(current_user)):
    await get_course_or_404(course_id)
    e = await db.enrollments.find_one({"course_id": course_id, "student_id": user.id, "status": "approved"})
    if not e:
        raise HTTPException(403, "Only enrolled students can review")
    r = Review(course_id=course_id, student_id=user.id, student_name=user.name, **body.model_dump())
    await db.reviews.update_one({"course_id": course_id, "student_id": user.id}, {"$set": r.to_mongo()}, upsert=True)
    all_r = await db.reviews.find({"course_id": course_id}).to_list(5000)
    avg = round(sum(x["rating"] for x in all_r) / len(all_r), 1)
    await db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": {"rating_avg": avg, "rating_count": len(all_r)}})
    return r.model_dump()


# ---------- AI assistant ----------
SYSTEM_PROMPT = (
    "You are 'TBIB AI', a friendly study assistant for Algerian medical students (1st to 7th year, "
    "French-language medical curriculum). Explain clearly, structured with short headings and bullet points, "
    "give mnemonics and clinical correlations when useful, and keep French medical terminology. "
    "You are an educational tool, not a substitute for clinical judgement. Keep answers concise."
)


@api.get("/ai/history")
async def ai_history(user: User = Depends(current_user)):
    docs = await db.chat_messages.find({"user_id": user.id}).sort("created_at", 1).to_list(200)
    return [ChatMessage.from_mongo(d).model_dump() for d in docs]


@api.delete("/ai/history")
async def ai_clear(user: User = Depends(current_user)):
    await db.chat_messages.delete_many({"user_id": user.id})
    return {"ok": True}


@api.post("/ai/chat")
async def ai_chat(body: ChatIn, user: User = Depends(current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    history = await db.chat_messages.find({"user_id": user.id}).sort("created_at", -1).to_list(12)
    history.reverse()
    transcript = "\n".join(f"{'Student' if h['role'] == 'user' else 'Assistant'}: {h['content']}" for h in history)
    lang = "Arabic (you may keep medical terms in French)" if body.language == "ar" else "French"
    system = f"{SYSTEM_PROMPT}\nAnswer in {lang} unless the student writes in another language."
    if transcript:
        system += f"\n\nPrevious conversation:\n{transcript}"

    await db.chat_messages.insert_one(ChatMessage(user_id=user.id, role="user", content=body.message).to_mongo())
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"tbib-{user.id}-{now_iso()}",
                   system_message=system).with_model("anthropic", "claude-sonnet-5-5")

    async def gen():
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as ex:
            logger.exception("AI error")
            yield f"data: {json.dumps({'error': str(ex)})}\n\n"
        if full:
            await db.chat_messages.insert_one(ChatMessage(user_id=user.id, role="assistant", content=full).to_mongo())
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/")
async def root():
    return {"app": "TBIB-courses", "ok": True}


# ---------- Seed ----------
SEED_COURSES = [
    {"title": "Anatomie du membre supérieur", "module": "Anatomie", "study_year": 1, "wilaya": "16", "price": 2500,
     "description": "Ostéologie, myologie et innervation du membre supérieur avec schémas et QCM corrigés.",
     "cover_image": "https://images.unsplash.com/photo-1532153470116-e8c2088b8ac1?w=900&q=70"},
    {"title": "Cardiologie : ECG de A à Z", "module": "Cardiologie", "study_year": 4, "wilaya": "31", "price": 4000,
     "description": "Lecture systématique de l'ECG, troubles du rythme et de la conduction, cas cliniques.",
     "cover_image": "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=900&q=70"},
    {"title": "Biochimie métabolique", "module": "Biochimie", "study_year": 1, "wilaya": "25", "price": 2000,
     "description": "Glycolyse, cycle de Krebs, chaîne respiratoire : résumés clairs et exercices.",
     "cover_image": "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=900&q=70"},
    {"title": "Préparation au Résidanat — Pédiatrie", "module": "Pédiatrie", "study_year": 7, "wilaya": "16", "price": 6000,
     "description": "Les sujets incontournables du concours de résidanat en pédiatrie, avec annales commentées.",
     "cover_image": "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=900&q=70"},
]


@app.on_event("startup")
async def seed():
    await db.users.create_index("email", unique=True)
    if await db.users.find_one({"email": "teacher@tbib.dz"}):
        return
    t = User(email="teacher@tbib.dz", name="Dr. Amina Benali", role="teacher", wilaya="16", instructor_type="doctor",
             bio="Maître-assistante en anatomie, CHU Mustapha Pacha.", ccp_account="0023456789 clé 45",
             baridimob_rip="00799999002345678945", phone="0550 12 34 56").to_mongo()
    t["password_hash"] = hash_pw("teacher123")
    tid = str((await db.users.insert_one(t)).inserted_id)
    s = User(email="student@tbib.dz", name="Yacine Kaci", role="student", wilaya="31", study_year=1).to_mongo()
    s["password_hash"] = hash_pw("student123")
    await db.users.insert_one(s)
    ts = User(email="major@tbib.dz", name="Sara Mansouri", role="teacher", wilaya="25", instructor_type="top_student",
              study_year=6, bio="Major de promo, 6e année — Faculté de médecine de Constantine.",
              baridimob_rip="00799999001122334455", phone="0661 22 33 44").to_mongo()
    ts["password_hash"] = hash_pw("major123")
    tsid = str((await db.users.insert_one(ts)).inserted_id)
    owners = [(tid, "Dr. Amina Benali", "doctor"), (tid, "Dr. Amina Benali", "doctor"),
              (tsid, "Sara Mansouri", "top_student"), (tid, "Dr. Amina Benali", "doctor")]
    for sc, (oid_, oname, otype) in zip(SEED_COURSES, owners):
        c = Course(teacher_id=oid_, teacher_name=oname, teacher_type=otype, **sc)
        cid = str((await db.courses.insert_one(c.to_mongo())).inserted_id)
        lessons = [
            Lesson(course_id=cid, order=1, title="Introduction et objectifs",
                   content=f"Bienvenue dans le cours « {sc['title']} ».\n\nDans ce cours nous allons couvrir les notions essentielles du module {sc['module']}, avec des fiches de synthèse et des QCM.",
                   video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
            Lesson(course_id=cid, order=2, title="Notions fondamentales",
                   content="1. Définitions\n2. Rappels physiologiques\n3. Points clés à retenir pour l'examen."),
            Lesson(course_id=cid, order=3, title="QCM corrigés",
                   content="Série de 20 QCM avec corrections détaillées.",
                   video_url="https://drive.google.com/"),
        ]
        await db.lessons.insert_many([l.to_mongo() for l in lessons])
        await db.courses.update_one({"_id": ObjectId(cid)}, {"$set": {"lessons_count": len(lessons)}})
    logger.info("Seeded demo data")


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
