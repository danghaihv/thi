export interface Question {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number;
  points?: number;
  explanation?: string;
  imageUrl?: string;
  level?: string;
}

export interface QuizSettings {
  timeLimit: number; // in seconds
}

export type QuizState = 'idle' | 'playing' | 'finished';
