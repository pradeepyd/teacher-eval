'use client'

import { memo } from 'react'
import TeacherEvaluationCard from './TeacherEvaluationCard'
import type { EvaluationStatus, EvaluationData } from '@/types/teacher'

interface EvaluationCardsGridProps {
  evaluationStatus: EvaluationStatus | null
  startData: EvaluationData | null
  endData: EvaluationData | null
  startAnswersCount: number
  endAnswersCount: number
  startQuestionsCount: number
  endQuestionsCount: number
}

function EvaluationCardsGrid({
  evaluationStatus,
  startData,
  endData,
  startAnswersCount,
  endAnswersCount,
  startQuestionsCount,
  endQuestionsCount
}: EvaluationCardsGridProps) {
  // Use passed question counts from evaluationStatus for accuracy

  // Safety check for evaluationStatus
  if (!evaluationStatus) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <TeacherEvaluationCard
          title="Start of Year Assessment"
          subtitle="Self-evaluation and goal setting"
          term="START"
          questionsCount={startQuestionsCount}
          answersCount={startAnswersCount}
          status="NOT_AVAILABLE"
          deadline={null}
          isSubmitted={false}
        />
        <TeacherEvaluationCard
          title="End of Year Reflection"
          subtitle="Annual performance review"
          term="END"
          questionsCount={endQuestionsCount}
          answersCount={endAnswersCount}
          status="NOT_AVAILABLE"
          deadline={null}
          isSubmitted={false}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <TeacherEvaluationCard
        title="Start of Year Assessment"
        subtitle="Self-evaluation and goal setting"
        term="START"
        questionsCount={startQuestionsCount}
        answersCount={startAnswersCount}
        status={evaluationStatus.start?.status || 'NOT_AVAILABLE'}
        deadline={evaluationStatus.start?.deadline || null}
        isSubmitted={evaluationStatus.start?.status === 'SUBMITTED'}
      />
      <TeacherEvaluationCard
        title="End of Year Reflection"
        subtitle="Annual performance review"
        term="END"
        questionsCount={endQuestionsCount}
        answersCount={endAnswersCount}
        status={evaluationStatus.end?.status || 'NOT_AVAILABLE'}
        deadline={evaluationStatus.end?.deadline || null}
        isSubmitted={evaluationStatus.end?.status === 'SUBMITTED'}
      />
    </div>
  )
}

export default memo(EvaluationCardsGrid)
