/**
 * Comprehensive API Type Definitions
 * Replaces all 'any' types with proper TypeScript interfaces
 */

// Base entity types
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// User related types
export interface User extends BaseEntity {
  email: string
  name: string
  role: UserRole
  departmentId: string | null
  department?: Department | null
  emailVerified: string | null
  failedLogins: number
  lastLogin: string | null
  lockedUntil: string | null
}

export type UserRole = 'TEACHER' | 'HOD' | 'ASST_DEAN' | 'DEAN' | 'ADMIN'

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: UserRole
  departmentId?: string
  secretCode?: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: UserRole
  departmentId?: string
}

// Department related types
export interface Department extends BaseEntity {
  name: string
  hod?: {
    id: string
    name: string
  } | null
  termStates?: TermState[]
  users?: User[]
  _count?: {
    users: number
  }
}

export interface CreateDepartmentRequest {
  name: string
}

export interface UpdateDepartmentRequest {
  name?: string
}

// Term related types
export type TermType = 'START' | 'END'
export type TermStatus = 'INACTIVE' | 'START' | 'END'

export interface Term extends BaseEntity {
  name: string
  year: number
  status: TermStatus
  startDate: string
  endDate: string
  departments?: Department[]
}

export interface TermState extends BaseEntity {
  departmentId: string
  activeTerm: TermType
  year: number
  endTermVisibility: string
  hodVisibility: string
  startTermVisibility: string
  visibility: string
  department?: Department
}

export interface UpdateTermStateRequest {
  activeTerm?: TermType
  visibility?: string
  hodVisibility?: string
  startTermVisibility?: string
  endTermVisibility?: string
  term?: TermType
  termVisibility?: string
}

// Question related types
export type QuestionType = 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'

export interface Question extends BaseEntity {
  departmentId: string
  term: TermType
  type: QuestionType
  question: string
  options: string[]
  order: number
  isActive: boolean
  isPublished?: boolean
  optionScores: number[]
  year?: number
  required?: boolean
}

export interface CreateQuestionRequest {
  departmentId: string
  term: TermType
  type: QuestionType
  question: string
  options: string[]
  order?: number
  optionScores?: number[]
  year?: number
  required?: boolean
}

export interface UpdateQuestionRequest {
  question?: string
  options?: string[]
  order?: number
  optionScores?: number[]
  isActive?: boolean
}

// Review related types
export interface ReviewScores {
  rubric?: Record<string, Record<string, number>>
  totalScore?: number
  overallRating?: number
}

export interface TeacherAnswer extends BaseEntity {
  teacherId: string
  questionId: string
  term: TermType
  year: number
  answer: string | number | boolean
  teacher?: User
  question?: Question
}

export interface SelfComment extends BaseEntity {
  teacherId: string
  term: TermType
  year: number
  comment: string
  teacher?: User
}

export interface HodReview extends BaseEntity {
  teacherId: string
  reviewerId: string
  term: TermType
  year: number
  comments: string
  scores: ReviewScores
  submitted: boolean
  termId?: string | null
  teacher?: User
  reviewer?: User
}

export interface AsstReview extends BaseEntity {
  teacherId: string
  reviewerId: string
  term: TermType
  year: number
  comments: string
  scores: ReviewScores
  submitted: boolean
  termId?: string | null
  teacher?: User
  reviewer?: User
}

export interface FinalReview extends BaseEntity {
  teacherId: string
  reviewerId: string
  term: TermType
  year: number
  comments: string
  scores: ReviewScores
  submitted: boolean
  termId?: string | null
  teacher?: User
  reviewer?: User
}

// Review submission types
export interface SubmitReviewRequest {
  teacherId: string
  term: TermType
  comment: string
  score?: number
  scores?: ReviewScores
}

export interface SubmitHodReviewRequest extends SubmitReviewRequest {
  // HOD-specific fields
  year?: number
}

export interface SubmitAsstDeanReviewRequest extends SubmitReviewRequest {
  // Assistant Dean-specific fields
  year?: number
}

export interface SubmitDeanReviewRequest extends SubmitReviewRequest {
  // Dean-specific fields  
  year?: number
  isFinalized?: boolean
}

// Dashboard stats types
export interface DashboardStats {
  totalUsers: number
  totalTeachers: number
  totalDepartments: number
  activeEvaluations: number
  completedReviews: number
  pendingReviews: number
}

// Activity types
export interface Activity extends BaseEntity {
  type: string
  message: string
  department?: string | null
  timestamp: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  code?: string
  details?: string[]
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Session types
export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  departmentId: string | null
  departmentName: string | null
}

export interface ExtendedSession {
  user: SessionUser
  expires: string
}

// Form types
export interface TeacherAnswerSubmission {
  answers: Array<{
    questionId: string
    answer: string | number | boolean
  }>
  selfComment: string
  term: TermType
}

// Hook return types
export interface UseDataHookResult<T = unknown> {
  data: T
  loading: boolean
  error: string | null
  refetch: () => void
  invalidateCache: () => void
}

// Common utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface FormValidationError {
  field: string
  message: string
}

export interface SelectOption {
  value: string
  label: string
}

// Error types
export interface ValidationError {
  field: string
  code: string
  message: string
}

export interface ApiError {
  message: string
  code: string
  statusCode: number
  details?: ValidationError[]
}
