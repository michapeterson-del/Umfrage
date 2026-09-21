import type { ThemeId } from "./themes";

export type QuestionType = "single" | "multiple" | "rating" | "text";

export interface QuestionDraft {
  type: QuestionType;
  text: string;
  options?: string[];
  required: boolean;
}

export interface SurveyDraft {
  title: string;
  description: string;
  collectName: boolean;
  theme: ThemeId;
  allowMultipleResponses: boolean;
  questions: QuestionDraft[];
}

export interface Question extends QuestionDraft {
  id: string;
  position: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  collectName: boolean;
  theme: ThemeId;
  allowMultipleResponses: boolean;
  createdAt: string;
  questions: Question[];
}

export interface AnswerInput {
  questionId: string;
  value: string | string[] | number;
}

export interface QuestionResult {
  question: Question;
  totalAnswers: number;
  // for single/multiple: option -> count
  optionCounts?: Record<string, number>;
  // for rating: distribution 1..5 -> count, plus average
  ratingDistribution?: Record<number, number>;
  ratingAverage?: number;
  // for text: list of free-text answers
  textAnswers?: string[];
}

export interface ResponseSummary {
  id: string;
  createdAt: string;
  voterName: string | null;
  answers: Record<string, string | string[] | number>;
}

export interface SurveyResults {
  survey: Survey;
  totalResponses: number;
  questionResults: QuestionResult[];
  // Only present when the survey collects names — one entry per response,
  // so a name can be tied to that person's individual answers.
  responses?: ResponseSummary[];
}
