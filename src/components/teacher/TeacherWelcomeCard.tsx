'use client'

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { EvaluationStatus } from '@/types/teacher'

interface TeacherWelcomeCardProps {
  userName?: string
  departmentName?: string
  evaluationStatus: EvaluationStatus | null
  departmentStates: Record<string, unknown>
  departmentId?: string
}

function TeacherWelcomeCard({ 
  userName, 
  departmentName, 
  evaluationStatus, 
  departmentStates, 
  departmentId 
}: TeacherWelcomeCardProps) {
  return (
    <div className="mb-8">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 shadow-md">
        <CardContent className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Welcome, {userName || 'Teacher'}!
            </div>
            <div className="text-sm text-gray-600">
              Department: <span className="font-medium">{departmentName || '—'}</span>
            </div>
            {evaluationStatus?.activeTerm && (
              <div className="text-sm text-blue-600 font-medium">
                {(() => {
                  const currentTerm = evaluationStatus.activeTerm
                  const termState = departmentStates[departmentId || '']
                  const isCompleted = currentTerm === 'START' 
                    ? termState?.startTermVisibility === 'COMPLETE'
                    : termState?.endTermVisibility === 'COMPLETE'
                  
                  if (isCompleted) {
                    return <span className="text-purple-600">Term Completed: {currentTerm}</span>
                  }
                  
                  return <span className="text-blue-600">Active Term: {currentTerm}</span>
                })()}
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-base">Teacher</Badge>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(TeacherWelcomeCard)
