
export enum GameMode {
  SETUP = 'SETUP',
  LIVE_VOICE = 'LIVE_VOICE',
  QUIZ_SEARCH = 'QUIZ_SEARCH',
  LEADERBOARD = 'LEADERBOARD',
  STUDY_HUB = 'STUDY_HUB',
  MATH_TUTOR = 'MATH_TUTOR',
}

export interface GameConfig {
  studyMaterial: string;
  examinerStyle: string;
  difficulty: string;
  language: string;
  examFormat: 'open' | 'test';
  totalQuestions: number;
  examPlan?: string[];
  minQuestions?: number;
  staticQuestions?: ExamQuestion[]; // For Review Mode
}

export interface ExamQuestion {
  question: string;
  contextSnippet?: string;
  options?: string[]; 
  correctAnswerIndex?: number; 
  topic?: string; // Added for analytics tracking
}

export interface FailedQuestion {
  question: ExamQuestion;
  timestamp: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  avatar: string;
  isFriend?: boolean;
  rank?: number;
}

export interface Theme {
  id: string;
  nameKey: string;
  bgApp: string;       // Main body background
  textMain: string;    // H1, H2, bold text
  textSecondary: string; // Paragraphs, hints
  cardBg: string;      // Containers
  cardBorder: string;  // Borders
  primaryBtn: string;  // Main action
  secondaryBtn: string;// Secondary action
  inputBg: string;     // Textarea/Input background
  accentColor: string; // Icons, highlights
  font: string;        // Font family class
  visualizerColor: string; // RGB string for audio viz
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface UserProfile {
  userId: string;
  savedSyllabus: string;
  lastLanguage: string;
  totalScore: number;
  themePreference?: string; // Added for theme persistence
  topicStats?: Record<string, { correct: number; total: number }>; // Analytics
  isPro?: boolean; // Monetization status
  failedQuestions?: FailedQuestion[]; // For Review Mode
  learnedFlashcards?: string[]; // Hashes or front text of known cards
  dailyUsage?: number;
  lastUsageDate?: string; // ISO Date string YYYY-MM-DD
  customApiKey?: string; // BYOK: Bring Your Own Key
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface MathStep {
  latex: string;
  explanation: string;
}

// Web Speech API Types
export interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: (event: any) => void;
}
