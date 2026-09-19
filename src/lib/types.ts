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

export interface SurveyResults {
  survey: Survey;
  totalResponses: number;
  questionResults: QuestionResult[];
}
