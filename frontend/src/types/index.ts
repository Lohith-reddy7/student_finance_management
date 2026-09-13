export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  summary: string;
  created_at: string;
  quiz_count?: number;
}

export interface DocumentDetail extends Document {
  raw_text: string;
  summaries?: {
    detailed: string;
    short: string;
    cheatsheet: string;
  };
  embeddings_generated?: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  type?: "multiple" | "true_false" | "fill_blank";
  options: string[];
  correct_index: number;
}

export interface Quiz {
  id: string;
  document_id: string;
  title: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizFeedbackItem {
  question_id: number;
  question: string;
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation: string;
}

export interface QuizResult {
  attempt_id: number;
  score: number;
  total: number;
  percentage: number;
  rating: string;
  feedback: QuizFeedbackItem[];
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface DashboardStats {
  total_documents: number;
  total_quizzes: number;
  total_attempts: number;
  average_score: number;
  recent_documents: Document[];
  recent_attempts: Array<{
    id: number;
    score: number;
    total: number;
    rating: string;
    created_at: string;
  }>;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
