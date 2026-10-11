# TBIB-courses — PRD

## Original problem (AR)
Mobile app helping medical students across all Algerian wilayas (69) buy medical courses/lessons. Sellers are real doctors and top students who create accounts and propose their courses; students buy them. Name: TBIB-courses, advanced design with medical touches & medical colors.

## User choices
- Manual payment: student sends BaridiMob/CCP transfer ref, instructor approves/rejects
- JWT email/password auth
- Lessons: text + YouTube/Drive links
- Arabic (default, RTL) + French
- Reviews/ratings + filters (wilaya 1-69, year 1-7, module) + AI study assistant (Claude Sonnet 5.5, streaming)

## Architecture
- Backend: FastAPI + MongoDB (motor), bcrypt + PyJWT, emergentintegrations LLM (SSE)
- Frontend: Expo Router; tabs Home / Learn(Dashboard) / Assistant / Profile (NativeTabs on iOS 26+); screens: welcome, auth, course/[id], checkout/[id], lesson/[id], teacher/course-form, teacher/manage/[id]
- i18n in src/i18n.tsx, theme tokens in src/theme.ts (medical teal + red-cross accent), ECG/medical pattern components in src/components/Medical.tsx

## Implemented (Oct 2026)
- Auth with roles: student (buyer) / instructor (doctor or top student)
- Course marketplace with search & chips, course detail with curriculum/reviews, manual payment checkout
- Instructor dashboard: stats, approve/reject requests, create/edit/delete courses & lessons
- Lesson viewer with video link opening, reviews for approved students
- AI study assistant with chat history
- Profile: language toggle, wilaya/year, instructor type, payment info (CCP/RIP/phone)
- Seed data: 2 instructors, 1 student, 4 courses
- Tested: 31/31 backend tests + frontend flows passed

## Backlog
- P1: Receipt photo upload (object storage), course cover image upload
- P1: Instructor verification badge (admin approval of doctors)
- P2: Promo codes/bundles, in-app messaging student↔instructor, QCM quizzes per lesson
