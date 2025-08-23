'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { useTeacherData } from '@/hooks/useTeacherData'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import TeacherWelcomeCard from '@/components/teacher/TeacherWelcomeCard'
import EvaluationCardsGrid from '@/components/teacher/EvaluationCardsGrid'
import EvaluationReportDownload from '@/components/teacher/EvaluationReportDownload'
import { PageErrorBoundary, DataErrorBoundary } from '@/components/ErrorBoundary'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import type { Question, EvaluationReportData } from '@/types/teacher'

function TeacherDashboard() {
  const { data: session } = useSession()
  const { 
    evaluationStatus, 
    startData, 
    endData, 
    termState, 
    loading: hookLoading, 
    error: hookError, 
    refetch,
    submitAnswers,
    getEvaluationReport
  } = useTeacherData()
  
  // Use centralized error handling
  const { error: localError, setError: setLocalError, clearError: clearLocalError, handleError } = useErrorHandler()
  
  const [startAnswers, setStartAnswers] = useState<Record<string, string>>({})
  const [endAnswers, setEndAnswers] = useState<Record<string, string>>({})
  const [startComment, setStartComment] = useState('')
  const [endComment, setEndComment] = useState('')
  const [localLoading, setLocalLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [departmentStates, setDepartmentStates] = useState<Record<string, any>>({})

  // Memoized values for performance
  const sessionUser = useMemo(() => session?.user, [session])
  const userName = useMemo(() => sessionUser?.name || undefined, [sessionUser])
  const departmentName = useMemo(() => (sessionUser as any)?.departmentName || undefined, [sessionUser])
  const departmentId = useMemo(() => (sessionUser as any)?.departmentId, [sessionUser])
  
  // Use evaluationStatus data directly for accurate counts with safety validation
  const startAnswersCount = useMemo(() => {
    const count = evaluationStatus?.start?.answersCount || 0
    const maxCount = evaluationStatus?.start?.questionsCount || 0
    return Math.min(count, maxCount)
  }, [evaluationStatus?.start?.answersCount, evaluationStatus?.start?.questionsCount])
  
  const endAnswersCount = useMemo(() => {
    const count = evaluationStatus?.end?.answersCount || 0
    const maxCount = evaluationStatus?.end?.questionsCount || 0
    return Math.min(count, maxCount)
  }, [evaluationStatus?.end?.answersCount, evaluationStatus?.end?.questionsCount])
  
  // Also get question counts from evaluationStatus
  const startQuestionsCount = useMemo(() => evaluationStatus?.start?.questionsCount || 0, [evaluationStatus?.start?.questionsCount])
  const endQuestionsCount = useMemo(() => evaluationStatus?.end?.questionsCount || 0, [evaluationStatus?.end?.questionsCount])

  // Load existing answers when data changes
  useEffect(() => {
    if (startData?.questions) {
      const answers: Record<string, string> = {}
      startData.questions.forEach((q: Question) => {
        if (q.existingAnswer) {
          answers[q.id] = q.existingAnswer
        }
      })
      setStartAnswers(answers)
      setStartComment(startData.existingSelfComment || '')
    }
  }, [startData])

  useEffect(() => {
    if (endData?.questions) {
      const answers: Record<string, string> = {}
      endData.questions.forEach((q: Question) => {
        if (q.existingAnswer) {
          answers[q.id] = q.existingAnswer
        }
      })
      setEndAnswers(answers)
      setEndComment(endData.existingSelfComment || '')
    }
  }, [endData])

  // Removed problematic useEffect that was causing infinite loop
  // The useTeacherData hook already handles data fetching automatically

  // Submit evaluation for a specific term
  const submitEvaluation = async (term: 'START' | 'END') => {
    setLocalLoading(true)
    clearLocalError()
    setSuccess(null)

    try {
      const answers = term === 'START' ? startAnswers : endAnswers
      const comment = term === 'START' ? startComment : endComment
      const questions = term === 'START' ? startData?.questions : endData?.questions

      if (!questions) {
        throw new Error('No questions available')
      }

      // Validate all questions are answered
      const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
      if (unansweredQuestions.length > 0) {
        throw new Error(`Please answer all questions. ${unansweredQuestions.length} question(s) remaining.`)
      }

      if (!comment.trim()) {
        throw new Error('Please add a comment before submitting.')
      }

      await submitAnswers(
        questions.map(q => ({
          questionId: q.id,
          answer: answers[q.id],
          questionType: q.type
        })), 
        comment.trim(), 
        term
      )
      
      // Show success message
      setSuccess(`Evaluation submitted successfully for ${term} term!`)
      
      // Refresh data to show updated status
      refetch()
    } catch (error) {
      handleError(error, {
        operation: 'submit evaluation',
        component: 'TeacherDashboard'
      })
    } finally {
      setLocalLoading(false)
    }
  }

  // Save draft (just update local state for now)
  const saveDraft = (term: 'START' | 'END') => {
    setSuccess(`Draft saved for ${term} term`)
    setTimeout(() => setSuccess(null), 3000)
  }

  // Download evaluation report as PDF
  const downloadEvaluationReport = useCallback(async (term: 'START' | 'END') => {
    setLocalLoading(true)
    clearLocalError()
    setSuccess(null)

    try {
      // Fetch evaluation data for the specific term
      const data = await getEvaluationReport(term)
       
      // Generate PDF using jsPDF
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Add content to PDF
      pdf.setFontSize(20)
      pdf.text('Teacher Performance Evaluation Report', 105, 20, { align: 'center' })
      
      pdf.setFontSize(12)
      pdf.text(`${term} Term ${new Date().getFullYear()}`, 105, 30, { align: 'center' })
      
      pdf.setFontSize(14)
      pdf.text('Teacher Information', 20, 50)
      pdf.setFontSize(10)
      pdf.text(`Name: ${userName || 'N/A'}`, 20, 60)
      pdf.text(`Department: ${departmentName || 'N/A'}`, 20, 70)
      pdf.text(`Term: ${term}`, 20, 80)
      
      // Add evaluation data
      let yPosition = 100
       
      // HOD Evaluation
      if (data.hodComment || data.hodScore || data.hodTotalScore) {
        pdf.setFontSize(14)
        pdf.text('HOD Evaluation', 20, yPosition)
        pdf.setFontSize(10)
        yPosition += 10
        
        if (data.hodComment) {
          pdf.text(`Comments: ${data.hodComment}`, 20, yPosition)
          yPosition += 10
        }
        
        if (data.hodScore !== null && data.hodScore !== undefined) {
          pdf.text(`Overall Rating: ${data.hodScore}/10`, 20, yPosition)
          yPosition += 10
        }
        
        if (data.hodTotalScore !== null && data.hodTotalScore !== undefined) {
          pdf.text(`Rubric Total Score: ${data.hodTotalScore}`, 20, yPosition)
          yPosition += 10
        }
      }
       
      // Assistant Dean Evaluation
      if (data.asstDeanComment || data.asstDeanScore) {
        pdf.setFontSize(14)
        pdf.text('Assistant Dean Evaluation', 20, yPosition)
        pdf.setFontSize(10)
        yPosition += 10
        
        if (data.asstDeanComment) {
          pdf.text(`Comments: ${data.asstDeanComment}`, 20, yPosition)
          yPosition += 10
        }
        
        if (data.asstDeanScore !== null && data.asstDeanScore !== undefined) {
          pdf.text(`Score: ${data.asstDeanScore}/10`, 20, yPosition)
          yPosition += 10
        }
      }
       
      // Dean Final Review
      if (data.deanComment || data.finalScore || data.promoted !== undefined) {
        pdf.setFontSize(14)
        pdf.text('Dean Final Review', 20, yPosition)
        pdf.setFontSize(10)
        yPosition += 10
        
        if (data.deanComment) {
          pdf.text(`Comments: ${data.deanComment}`, 20, yPosition)
          yPosition += 10
        }
        
        if (data.finalScore !== null && data.finalScore !== undefined) {
          pdf.text(`Final Score: ${data.finalScore}/10`, 20, yPosition)
          yPosition += 10
        }
        
        if (data.promoted !== undefined) {
          pdf.text(`Promotion Status: ${data.promoted ? 'PROMOTED' : 'NOT PROMOTED'}`, 20, yPosition)
        }
      }
      
      // Save PDF
      const fileName = `${userName || 'Teacher'}_${term}_${new Date().getFullYear()}_Evaluation.pdf`
      pdf.save(fileName)
      
      setSuccess(`Evaluation report downloaded successfully!`)
      
    } catch (error) {
      handleError(error, {
        operation: 'download evaluation report',
        component: 'TeacherDashboard'
      })
    } finally {
      setLocalLoading(false)
    }
  }, [getEvaluationReport, userName, departmentName, handleError])

  // Show loading state while hook is loading
  if (!sessionUser || hookLoading) {
    return (
      <RoleGuard allowedRoles={['TEACHER']}>
        <DashboardLayout title="Teacher Dashboard">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  // Show error state if hook has error
  if (hookError) {
    return (
      <RoleGuard allowedRoles={['TEACHER']}>
        <DashboardLayout title="Teacher Dashboard">
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {hookError} - <Button onClick={refetch} variant="outline" size="sm">Retry</Button>
            </AlertDescription>
          </Alert>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <PageErrorBoundary pageName="Teacher Dashboard">
      <RoleGuard allowedRoles={['TEACHER']}>
        <DashboardLayout title="Teacher Dashboard">
          <DataErrorBoundary dataType="teacher welcome data">
            <TeacherWelcomeCard
              userName={userName}
              departmentName={departmentName}
              evaluationStatus={evaluationStatus}
              departmentStates={departmentStates}
              departmentId={departmentId}
            />
          </DataErrorBoundary>

          {localError && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{localError}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <DataErrorBoundary dataType="evaluation cards data">
                      <EvaluationCardsGrid
            evaluationStatus={evaluationStatus}
            startData={startData}
            endData={endData}
            startAnswersCount={startAnswersCount}
            endAnswersCount={endAnswersCount}
            startQuestionsCount={startQuestionsCount}
            endQuestionsCount={endQuestionsCount}
          />
          </DataErrorBoundary>

          <DataErrorBoundary dataType="evaluation report data">
            <EvaluationReportDownload
              evaluationStatus={evaluationStatus}
              localLoading={localLoading}
              userName={userName}
              onDownloadReport={downloadEvaluationReport}
            />
          </DataErrorBoundary>

        </DashboardLayout>
      </RoleGuard>
    </PageErrorBoundary>
  )
}

export default memo(TeacherDashboard)