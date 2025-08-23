'use client'

import { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Download, FileText } from 'lucide-react'
import type { EvaluationStatus, EvaluationReportData } from '@/types/teacher'

interface EvaluationReportDownloadProps {
  evaluationStatus: EvaluationStatus | null
  localLoading: boolean
  userName?: string
  onDownloadReport: (term: 'START' | 'END') => Promise<void>
}

function EvaluationReportDownload({
  evaluationStatus,
  localLoading,
  userName,
  onDownloadReport
}: EvaluationReportDownloadProps) {
  const handleDownload = useCallback((term: 'START' | 'END') => {
    onDownloadReport(term)
  }, [onDownloadReport])

  // Safety check for evaluationStatus
  if (!evaluationStatus) {
    return null
  }

  // Only show if there are completed evaluations
  const hasCompletedEvaluations = 
    evaluationStatus.start?.status === 'REVIEWED' || 
    evaluationStatus.end?.status === 'REVIEWED'

  if (!hasCompletedEvaluations) {
    return null
  }

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Download Evaluation Report
          </CardTitle>
          <CardDescription>
            Download your performance evaluation report (only available after Dean finalizes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {evaluationStatus.start?.status === 'REVIEWED' && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Start Term Evaluation Report</div>
                    <div className="text-sm text-gray-500">Ready for download</div>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownload('START')}
                  disabled={localLoading}
                >
                  {localLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {localLoading ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            )}
            
            {evaluationStatus.end?.status === 'REVIEWED' && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">End Term Evaluation Report</div>
                    <div className="text-sm text-gray-500">Ready for download</div>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDownload('END')}
                  disabled={localLoading}
                >
                  {localLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {localLoading ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(EvaluationReportDownload)
