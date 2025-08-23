/**
 * Comprehensive Hook Type Definitions
 * Replaces all 'any' types with proper TypeScript interfaces
 */

import type { User, Department, Question, TermState, TermType, UpdateTermStateRequest } from './api'

// ============================================================================
// ADMIN DATA TYPES
// ============================================================================

export interface AdminData {
  users: User[]
  departments: Department[]
  stats: DashboardStats
  activities: Activity[]
  loading: boolean
  error: string | null
  refetch: () => void
  invalidateCache: () => void
  createUser: (userData: CreateUserRequest) => Promise<User>
  updateUser: (userId: string, userData: UpdateUserRequest) => Promise<User>
  deleteUser: (userId: string) => Promise<void>
  createDepartment: (departmentData: CreateDepartmentRequest) => Promise<Department>
  updateDepartment: (departmentId: string, departmentData: UpdateDepartmentRequest) => Promise<Department>
  deleteDepartment: (departmentId: string) => Promise<void>
  assignHod: (departmentId: string, hodId: string) => Promise<void>
  assignTeachers: (departmentId: string, teacherIds: string[]) => Promise<void>
}

export interface DashboardStats {
  totalUsers: number
  totalTeachers: number
  totalDepartments: number
  activeEvaluations: number
  completedReviews: number
  pendingReviews: number
}

export interface Activity {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  timestamp: string
  details?: Record<string, unknown>
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: User['role']
  departmentId?: string
  secretCode?: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: User['role']
  departmentId?: string
}

export interface CreateDepartmentRequest {
  name: string
}

export interface UpdateDepartmentRequest {
  name?: string
}

// ============================================================================
// HOD DATA TYPES
// ============================================================================

export interface HodTeacher extends User {
  status: string
  answers: Record<string, string>
  selfComment: string
  hodComment: string
  hodScore: number
  canReview: boolean
  rubric?: Record<string, number>
}

export interface HodData {
  questions: Question[]
  teachers: HodTeacher[]
  termState: TermState | null
  loading: boolean
  error: string | null
  refetch: () => void
  refetchForTerm: (term: TermType) => Promise<Question[]>
  removeQuestionLocally: (questionId: string) => void
  invalidateCache: () => void
  fetchQuestionsForTerm: (term: TermType) => Promise<Question[]>
  fetchTeachersForEvaluation: () => Promise<HodTeacher[]>
  fetchTermStateForDepartment: (departmentId: string) => Promise<TermState>
  fetchDepartmentStates: () => Promise<TermState>
  createQuestion: (questionData: CreateQuestionRequest) => Promise<Question>
  updateQuestion: (questionId: string, questionData: UpdateQuestionRequest) => Promise<Question>
  deleteQuestion: (questionId: string) => Promise<void>
  publishQuestions: (term: TermType) => Promise<void>
  submitHodReview: (reviewData: SubmitHodReviewRequest) => Promise<void>
  getEvaluationReport: (term: TermType) => Promise<EvaluationReport>
  createRubricTemplate: (rubricData: Record<string, unknown>) => Promise<void>
  fetchTeacherDataForReview: (teacherId: string, term: TermType) => Promise<TeacherReviewData>
  updateTermState: (departmentId: string, updates: UpdateTermStateRequest) => Promise<TermStateUpdateResult>
  submitTeacherEvaluation: (teacherId: string) => Promise<void>
  updateTeacherEvaluation: (teacherId: string, field: keyof HodTeacher, value: string | number | boolean | Record<string, number>) => void
}

export interface CreateQuestionRequest {
  question: string
  type: Question['type']
  options?: string[]
  optionScores?: number[]
  required: boolean
  order: number
  term: TermType
  year?: number
  departmentId?: string
}

export interface UpdateQuestionRequest {
  question?: string
  type?: Question['type']
  options?: string[]
  optionScores?: number[]
  required?: boolean
  order?: number
}

export interface SubmitHodReviewRequest {
  teacherId: string
  comment: string
  score: number
  scores: {
    questionScores: { [key: string]: number }
    rubric: Record<string, number>
    professionalismSubtotal: number
    responsibilitiesSubtotal: number
    developmentSubtotal: number
    totalScore: number
  }
  term: TermType
}

export interface EvaluationReport {
  id: string
  teacherId: string
  term: TermType
  year: number
  hodComment?: string
  hodScore?: number
  asstDeanComment?: string
  asstDeanScore?: number
  deanComment?: string
  deanScore?: number
  status: string
  submitted: boolean
}

export interface TeacherReviewData {
  id: string
  name: string
  email: string
  departmentId: string
  answers: TeacherAnswer[]
  selfComment: string
  hodComment: string
  hodScore: number
  rubric: Record<string, number>
}

export interface TeacherAnswer {
  id: string
  questionId: string
  answer: string
  question: {
    id: string
    question: string
    type: string
    options?: string[]
  }
}

export interface TermStateUpdateResult {
  success: boolean
  error?: string
  termState?: TermState
}

// ============================================================================
// TEACHER DATA TYPES
// ============================================================================

export interface TeacherData {
  questions: Question[]
  termState: TermState | null
  loading: boolean
  error: string | null
  refetch: () => void
  submitAnswers: (answers: TeacherAnswerSubmission[], selfComment: string, term: TermType) => Promise<SubmissionResult>
  updateEvaluation: (evaluationId: string, data: EvaluationUpdateData) => Promise<EvaluationResult>
  updateAnswers: (data: AnswerUpdateData) => Promise<AnswerUpdateResult>
}

export interface TeacherAnswerSubmission {
  questionId: string
  answer: string
  questionType: Question['type']
}

export interface SubmissionResult {
  success: boolean
  error?: string
  evaluationId?: string
}

export interface EvaluationUpdateData {
  selfComment?: string
  status?: string
}

export interface EvaluationResult {
  success: boolean
  error?: string
  evaluation?: unknown
}

export interface AnswerUpdateData {
  answers: TeacherAnswerSubmission[]
  selfComment?: string
}

export interface AnswerUpdateResult {
  success: boolean
  error?: string
  updatedAnswers?: TeacherAnswerSubmission[]
}

// ============================================================================
// DEAN DATA TYPES
// ============================================================================

export interface DeanData {
  teachers: DeanTeacher[]
  termState: TermState | null
  loading: boolean
  error: string | null
  refetch: () => void
  submitDeanReview: (data: DeanReviewData) => Promise<DeanReviewResult>
  submitHodFinalReview: (data: HodFinalReviewData) => Promise<HodFinalReviewResult>
}

export interface DeanTeacher extends User {
  hodReview?: HodReviewSummary
  asstDeanReview?: AsstDeanReviewSummary
  finalReview?: FinalReviewSummary
  evaluationStatus: string
  canReview: boolean
}

export interface HodReviewSummary {
  id: string
  comment: string
  score: number
  submitted: boolean
  submittedAt: string
}

export interface AsstDeanReviewSummary {
  id: string
  comment: string
  score: number
  submitted: boolean
  submittedAt: string
}

export interface FinalReviewSummary {
  id: string
  comment: string
  score: number
  status: string
  submitted: boolean
  submittedAt: string
}

export interface DeanReviewData {
  teacherId: string
  comment: string
  score: number
  promoted: boolean
  term: TermType
}

export interface DeanReviewResult {
  success: boolean
  error?: string
  review?: unknown
}

export interface HodFinalReviewData {
  teacherId: string
  comment: string
  score: number
  term: TermType
}

export interface HodFinalReviewResult {
  success: boolean
  error?: string
  review?: unknown
}

// ============================================================================
// ASSISTANT DEAN DATA TYPES
// ============================================================================

export interface AsstDeanData {
  teachers: AsstDeanTeacher[]
  termState: TermState | null
  loading: boolean
  error: string | null
  refetch: () => void
  submitAsstDeanReview: (data: AsstDeanReviewData) => Promise<AsstDeanReviewResult>
  submitHodReview: (data: AsstDeanHodReviewData) => Promise<AsstDeanHodReviewResult>
}

export interface AsstDeanTeacher extends User {
  hodReview?: HodReviewSummary
  asstDeanReview?: AsstDeanReviewSummary
  evaluationStatus: string
  canReview: boolean
}

export interface AsstDeanReviewData {
  teacherId: string
  comment: string
  score: number
  term: TermType
}

export interface AsstDeanReviewResult {
  success: boolean
  error?: string
  review?: unknown
}

export interface AsstDeanHodReviewData {
  hodId: string
  comments: string
  scores: Record<string, number>
  totalScore: number | null
  term: TermType
}

export interface AsstDeanHodReviewResult {
  success: boolean
  error?: string
  review?: unknown
}

// ============================================================================
// TERM MANAGEMENT TYPES
// ============================================================================

export interface TermManagementData {
  terms: Term[]
  departments: Department[]
  loading: boolean
  error: string | null
  refetch: () => void
  createTerm: (termData: CreateTermRequest) => Promise<Term>
  updateTerm: (termId: string, termData: UpdateTermRequest) => Promise<Term>
  deleteTerm: (termId: string) => Promise<void>
  activateTerm: (termId: string, termType: TermType) => Promise<void>
}

export interface Term {
  id: string
  name: string
  year: number
  status: string
  startDate: string
  endDate: string
  departments?: Department[]
}

export interface CreateTermRequest {
  name: string
  year: number
  startDate: string
  endDate: string
  departmentIds: string[]
}

export interface UpdateTermRequest {
  name?: string
  year?: number
  startDate?: string
  endDate?: string
  departmentIds?: string[]
}

// ============================================================================
// RESULTS DATA TYPES
// ============================================================================

export interface ResultsData {
  results: TeacherResult[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export interface TeacherResult {
  id: string
  name: string
  email: string
  department: string
  terms: Record<string, TermResult>
  overallScore: number
  status: string
}

export interface TermResult {
  hasSubmitted: boolean
  status: string
  score?: number
  hodScore?: number
  asstDeanScore?: number
  deanScore?: number
}

// ============================================================================
// REVIEW DATA TYPES
// ============================================================================

export interface ReviewData {
  teachers: ReviewTeacher[]
  loading: boolean
  error: string | null
  refetch: () => void
  submitReview: (data: ReviewSubmissionData, reviewerRole: 'HOD' | 'ASST_DEAN') => Promise<ReviewSubmissionResult>
}

export interface ReviewTeacher extends User {
  evaluationStatus: string
  canReview: boolean
  hodReview?: ReviewSummary
  asstDeanReview?: ReviewSummary
}

export interface ReviewSummary {
  id: string
  comment: string
  score: number
  submitted: boolean
  submittedAt: string
}

export interface ReviewSubmissionData {
  teacherId: string
  comment: string
  score: number
  term: TermType
}

export interface ReviewSubmissionResult {
  success: boolean
  error?: string
  review?: unknown
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

export interface LoadingState {
  isLoading: boolean
  error: string | null
  lastUpdated: number
}

