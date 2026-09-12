export type QuestionKind = 'single' | 'true_false' | 'multiple' | 'typed' | 'poll'
export type PointsMode = 'standard' | 'double' | 'none'
export type QuizStatus = 'draft' | 'published'
export type GamePhase = 'lobby' | 'countdown' | 'question_open' | 'reveal' | 'leaderboard' | 'final' | 'ended'

export interface AnswerOption {
  id: string
  text: string
  isCorrect?: boolean
}

export interface Question {
  id?: string
  prompt: string
  kind: QuestionKind
  options: AnswerOption[]
  acceptedAnswers: string[]
  explanation: string
  imagePath?: string | null
  timeLimit: number
  pointsMode: PointsMode
  position: number
}

export interface Quiz {
  id?: string
  title: string
  description: string
  coverPath?: string | null
  status: QuizStatus
  isPublic: boolean
  questions: Question[]
  createdAt?: string
  updatedAt?: string
}

export interface QuizSummary {
  id: string
  title: string
  description: string
  status: QuizStatus
  is_public: boolean
  cover_path: string | null
  created_at: string
  updated_at: string
  question_count?: number
}

export interface Player {
  id: string
  nickname: string
  score: number
  streak: number
  removed?: boolean
  connected?: boolean
}

export interface PublicQuestion {
  id: string
  prompt: string
  kind: QuestionKind
  options: AnswerOption[]
  imagePath?: string | null
  timeLimit: number
  pointsMode: PointsMode
  position: number
}

export interface GameState {
  sessionId: string
  pin: string
  phase: GamePhase
  locked: boolean
  currentQuestionIndex: number
  totalQuestions: number
  phaseStartedAt: string | null
  phaseEndsAt: string | null
  quizTitle: string
  question: PublicQuestion | null
  players: Player[]
  submittedCount: number
  ownSubmission?: { answer: unknown; correct: boolean | null; points: number | null } | null
  reveal?: {
    correctOptionIds: string[]
    acceptedAnswers: string[]
    explanation: string
    distribution: Record<string, number>
  } | null
  leaderboard: Player[]
  isHost: boolean
  hostDisconnected?: boolean
}

export interface SessionSummary {
  id: string
  pin: string
  quiz_title: string
  phase: GamePhase
  created_at: string
  ended_at: string | null
  player_count: number
}

export interface AssignmentSummary {
  id: string
  title: string
  quiz_title: string
  deadline: string | null
  created_at: string
  completed_count: number
}

export interface ReportRow {
  playerId: string
  nickname: string
  score: number
  accuracy: number
  averageResponseMs: number
  answers: Array<{
    question: string
    answer: unknown
    correct: boolean
    points: number
    responseMs: number
  }>
}
