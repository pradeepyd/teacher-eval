'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Play, Eye, CalendarDays } from 'lucide-react'
import { statusMap, type EvaluationCardProps } from '@/types/teacher'

function TeacherEvaluationCard({ 
  title, 
  subtitle, 
  term, 
  questionsCount, 
  answersCount, 
  status, 
  deadline, 
  _isSubmitted 
}: EvaluationCardProps) {
  // Ensure answersCount never exceeds questionsCount and progress is capped at 100%
  const safeAnswersCount = Math.min(answersCount, questionsCount)
  const progress = questionsCount > 0 ? Math.min(Math.round((safeAnswersCount / questionsCount) * 100), 100) : 0
  const submitted = status === 'SUBMITTED'
  const notAvailable = status === 'NOT_AVAILABLE'
  const isStart = term === 'START'
  const iconBg = submitted
    ? 'bg-emerald-100 text-emerald-700'
    : isStart
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700'
  const deadlineClass = !submitted ? (isStart ? 'text-amber-600' : 'text-red-600') : ''
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className={`h-9 w-9 rounded-md flex items-center justify-center mt-0.5 ${iconBg}`}>
              {isStart ? (
                <Play className="h-4 w-4" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
            </div>
            <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
            </div>
          </div>
                <Badge className={submitted ? 'bg-emerald-100 text-emerald-700' : status==='IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : status==='NOT_STARTED' ? 'bg-rose-100 text-rose-700' : ''} variant={statusMap[status]?.color || 'secondary'}>
            {statusMap[status]?.label || status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress block */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Progress</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} trackClassName="bg-gray-200" indicatorClassName="bg-green-500" />
        </div>

        {/* Meta rows */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{submitted ? 'Submitted on:' : 'Deadline:'}</span>
          <span className={`font-medium text-gray-900 ${deadlineClass}`}>
            {submitted ? new Date().toLocaleDateString() : (deadline ? new Date(deadline).toLocaleDateString() : '—')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Questions completed:</span>
          <span className="font-medium text-gray-900">{safeAnswersCount}/{questionsCount}</span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex space-x-3">
          {(submitted || status === 'REVIEWED') ? (
            <Button asChild className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border-0">
              <Link href={`/dashboard/teacher/evaluation/${term}`}><Eye className="w-4 h-4 mr-2"/>View Submission</Link>
            </Button>
          ) : notAvailable ? (
            <Button disabled className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">Not Available</Button>
          ) : (
            <>
              <Button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Save Draft
              </Button>
              <Button asChild className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <Link href={`/dashboard/teacher/evaluation/${term}`}><Play className="w-4 h-4 mr-2"/>Continue</Link>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(TeacherEvaluationCard)
