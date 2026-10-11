import { fetch as expoFetch } from "expo/fetch";

export const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
let token: string | null = null;
export const setApiToken = (t: string | null) => { token = t; };

export type User = {
  id: string; email: string; name: string; role: "student" | "teacher";
  wilaya?: string | null; study_year?: number | null; bio?: string | null; instructor_type?: "doctor" | "top_student" | null;
  ccp_account?: string | null; baridimob_rip?: string | null; phone?: string | null;
};
export type Course = {
  id: string; teacher_id: string; teacher_name: string; teacher_type?: string | null; title: string; description: string;
  module: string; study_year: number; wilaya: string; price: number; cover_image?: string | null;
  rating_avg: number; rating_count: number; lessons_count: number; students_count: number;
};
export type Enrollment = {
  id: string; course_id: string; course_title: string; student_name: string; student_wilaya?: string | null;
  price: number; payment_method: string; payment_ref: string; note?: string | null;
  status: "pending" | "approved" | "rejected"; created_at: string; course?: Course | null;
};
export type Review = { id: string; student_name: string; rating: number; comment: string; created_at: string };
export type LessonMeta = { id: string; title: string; order: number; has_video: boolean };
export type CourseDetail = {
  course: Course; lessons: LessonMeta[]; enrollment: Enrollment | null; is_owner: boolean; has_access: boolean;
  teacher: { id: string; name: string; bio?: string | null; instructor_type?: string | null; study_year?: number | null; wilaya?: string | null; ccp_account?: string | null; baridimob_rip?: string | null; phone?: string | null } | null;
};
export type Lesson = { id: string; course_id: string; course_title: string; title: string; content: string; video_url?: string | null };
export type ChatMsg = { id?: string; role: "user" | "assistant"; content: string };

export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data?.detail;
    throw new Error(Array.isArray(d) ? d.map((x: any) => x.msg).join(", ") : d || "Request failed");
  }
  return data as T;
}

export async function streamChat(message: string, language: string, onDelta: (s: string) => void) {
  const res = await expoFetch(`${BASE}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, language }),
  });
  if (!res.ok || !res.body) throw new Error("AI request failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const line = p.replace(/^data: /, "").trim();
      if (!line || line === "[DONE]") continue;
      const j = JSON.parse(line);
      if (j.error) throw new Error(j.error);
      if (j.delta) onDelta(j.delta);
    }
  }
}
