export type CourseLevel = "Foundation" | "Intermediate" | "Advanced";

export interface Course {
  id: string;
  paper_code: string;
  title: string;
  level: CourseLevel;
  description: string | null;
  price_kes: number;
  is_published: boolean;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_markdown: string;
  audio_url: string | null;
  video_url: string | null;
  order_index: number;
  is_free_preview: boolean;
}

export interface Quiz {
  id: string;
  module_id: string;
  lesson_id: string | null;
  title: string;
}

export type QuestionType = "mcq" | "theory";

export interface Question {
  id: string;
  quiz_id: string;
  qtype: QuestionType;
  question_text: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation_markdown: string | null;
  grading_rubric: string | null;
  order_index: number;
}

export const LEVELS: CourseLevel[] = ["Foundation", "Intermediate", "Advanced"];

export function formatKes(n: number): string {
  return `KES ${n.toLocaleString("en-KE")}`;
}
