export interface Question {
  id: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  question: string
  options?: string[]
  existingAnswer?: string
}

export interface EvaluationData {
  questions: Question[]
  existingSelfComment: string
  isSubmitted: boolean
  canEdit: boolean
}

export interface EvaluationStatus {
  activeTerm: string | null
  start: {
    status: string
    questionsCount: number
    answersCount: number
    hasSelfComment: boolean
    canSubmit: boolean
    deadline?: string | null
  }
  end: {
    status: string
    questionsCount: number
    answersCount: number
    hasSelfComment: boolean
    canSubmit: boolean
    deadline?: string | null
  }
}

export interface EvaluationCardProps {
  title: string
  subtitle: string
  term: 'START' | 'END'
  questionsCount: number
  answersCount: number
  status: string
  deadline?: string | null
  isSubmitted: boolean
}

export interface EvaluationReportData {
  hodComment?: string
  hodScore?: number
  hodTotalScore?: number
  asstDeanComment?: string
  asstDeanScore?: number
  deanComment?: string
  finalScore?: number
  promoted?: boolean
}

export const statusMap: Record<string, { label: string; color: string }> = {
  NOT_AVAILABLE: { label: 'Not Available', color: 'secondary' },
  NOT_STARTED: { label: 'Not Started', color: 'destructive' },
  IN_PROGRESS: { label: 'In Progress', color: 'secondary' },
  SUBMITTED: { label: 'Submitted', color: 'default' },
  REVIEWED: { label: 'Reviewed', color: 'success' },
}
