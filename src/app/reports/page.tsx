'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Filter, FileText, ArrowLeft, Search, RefreshCw, Circle, Download, Eye } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface EvaluationResult {
  id: string
  name: string
  email: string
  role: string
  department: string
  departmentId: string
  year: number
  terms: {
    START: {
      hasSubmitted: boolean
      questionsAnswered: number
      maxQuestions: number
      hodScore: number
      asstScore: number
      totalCombinedScore: number
      finalScore: number
      maxPossibleScore: number
      status: string
      promoted: boolean
      band: string
    }
    END: {
      hasSubmitted: boolean
      questionsAnswered: number
      maxQuestions: number
      hodScore: number
      asstScore: number
      totalCombinedScore: number
      finalScore: number
      maxPossibleScore: number
      status: string
      promoted: boolean
      band: string
    }
  }
}

interface ReportsSummary {
  totalStaff: number
  totalTeachers: number
  totalHODs: number
  departmentsIncluded: string[]
  termsIncluded: string[]
  generatedAt: string
  generatedBy: string
}

export default function ReportsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [currentTime, setCurrentTime] = useState('')
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([])
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  
  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString())
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch evaluation results
  const fetchEvaluationResults = useCallback(async () => {
    if (!session?.user) return
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (departmentFilter !== 'ALL') params.append('departmentId', departmentFilter)
      if (roleFilter !== 'ALL') params.append('role', roleFilter)
      if (yearFilter !== 'ALL') params.append('year', yearFilter)
      
      const response = await fetch(`/api/reports/results?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation results')
      }
      
      const data = await response.json()
      setEvaluationResults(data.results || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [session?.user, departmentFilter, roleFilter, yearFilter])

  // Load data on mount and when filters change
  useEffect(() => {
    fetchEvaluationResults()
  }, [fetchEvaluationResults])

  // Download individual PDF report - EXACT same as teacher/HOD dashboards
  const downloadIndividualReport = useCallback(async (userId: string, userName: string, userRole: string, term: 'START' | 'END') => {
    setDownloadingPdf(`${userId}-${term}`)
    
    try {
      let evaluationData: any
      
      if (userRole === 'TEACHER') {
        // Use admin API endpoint to fetch teacher evaluation data
        const response = await fetch('/api/admin/teacher-evaluation-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ teacherId: userId, term })
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch teacher evaluation data')
        }
        
        evaluationData = await response.json()
      } else if (userRole === 'HOD') {
        // Use admin API endpoint to fetch HOD evaluation data
        const response = await fetch('/api/admin/hod-evaluation-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hodId: userId, term })
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch HOD evaluation data')
        }
        
        evaluationData = await response.json()
      }

      // Generate PDF using jsPDF - EXACT same logic as teacher/HOD dashboards
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      if (userRole === 'TEACHER') {
        // EXACT same PDF structure as teacher dashboard
        pdf.setFontSize(20)
        pdf.text('Teacher Performance Evaluation Report', 105, 20, { align: 'center' })
        
        pdf.setFontSize(12)
        pdf.text(`${term} Term ${new Date().getFullYear()}`, 105, 30, { align: 'center' })
        
        pdf.setFontSize(14)
        pdf.text('Teacher Information', 20, 50)
        pdf.setFontSize(10)
        pdf.text(`Name: ${userName}`, 20, 60)
        pdf.text(`Department: ${evaluationResults.find(r => r.id === userId)?.department || 'N/A'}`, 20, 70)
        pdf.text(`Term: ${term}`, 20, 80)
        
        // Add evaluation data - EXACT same as teacher dashboard
        let yPosition = 100
        
        // HOD Evaluation
        if (evaluationData.hodComment || evaluationData.hodScore || evaluationData.hodTotalScore) {
          pdf.setFontSize(14)
          pdf.text('HOD Evaluation', 20, yPosition)
          pdf.setFontSize(10)
          yPosition += 10
          
          if (evaluationData.hodComment) {
            pdf.text(`Comments: ${evaluationData.hodComment}`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.hodScore !== null && evaluationData.hodScore !== undefined) {
            pdf.text(`Overall Rating: ${evaluationData.hodScore}/10`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.hodTotalScore !== null && evaluationData.hodTotalScore !== undefined) {
            pdf.text(`Rubric Total Score: ${evaluationData.hodTotalScore}`, 20, yPosition)
            yPosition += 10
          }
        }
        
        // Assistant Dean Evaluation
        if (evaluationData.asstDeanComment || evaluationData.asstDeanScore) {
          pdf.setFontSize(14)
          pdf.text('Assistant Dean Evaluation', 20, yPosition)
          pdf.setFontSize(10)
          yPosition += 10
          
          if (evaluationData.asstDeanComment) {
            pdf.text(`Comments: ${evaluationData.asstDeanComment}`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.asstDeanScore !== null && evaluationData.asstDeanScore !== undefined) {
            pdf.text(`Score: ${evaluationData.asstDeanScore}/10`, 20, yPosition)
            yPosition += 10
          }
        }
        
        // Dean Final Review
        if (evaluationData.deanComment || evaluationData.finalScore || evaluationData.promoted !== undefined) {
          pdf.setFontSize(14)
          pdf.text('Dean Final Review', 20, yPosition)
          pdf.setFontSize(10)
          yPosition += 10
          
          if (evaluationData.deanComment) {
            pdf.text(`Comments: ${evaluationData.deanComment}`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.finalScore !== null && evaluationData.finalScore !== undefined) {
            pdf.text(`Final Score: ${evaluationData.finalScore}/10`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.promoted !== undefined) {
            pdf.text(`Promotion Status: ${evaluationData.promoted ? 'PROMOTED' : 'NOT PROMOTED'}`, 20, yPosition)
          }
        }
        
      } else if (userRole === 'HOD') {
        // EXACT same PDF structure as HOD dashboard
        pdf.setFontSize(20)
        pdf.text('HOD Performance Evaluation Report', 105, 20, { align: 'center' })
        
        pdf.setFontSize(12)
        pdf.text(`${term} Term ${new Date().getFullYear()}`, 105, 30, { align: 'center' })
        
        pdf.setFontSize(14)
        pdf.text('HOD Information', 20, 50)
        pdf.setFontSize(10)
        pdf.text(`Name: ${userName}`, 20, 60)
        pdf.text(`Department: ${evaluationResults.find(r => r.id === userId)?.department || 'N/A'}`, 20, 70)
        pdf.text(`Term: ${term}`, 20, 80)
        
        // Add evaluation data - EXACT same as HOD dashboard
        let yPosition = 100
        
        // Assistant Dean Evaluation
        if (evaluationData.asstDeanComment || evaluationData.asstDeanScore) {
          pdf.setFontSize(14)
          pdf.text('Assistant Dean Evaluation', 20, yPosition)
          pdf.setFontSize(10)
          yPosition += 10
          
          if (evaluationData.asstDeanComment) {
            pdf.text(`Comments: ${evaluationData.asstDeanComment}`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.asstDeanScore !== null && evaluationData.asstDeanScore !== undefined) {
            pdf.text(`Score: ${evaluationData.asstDeanScore}%`, 20, yPosition)
            yPosition += 10
          }
        }
        
        // Dean Final Review
        if (evaluationData.deanComment || evaluationData.deanScore || evaluationData.promoted !== undefined) {
          pdf.setFontSize(14)
          pdf.text('Dean Final Review', 20, yPosition)
          pdf.setFontSize(10)
          yPosition += 10
          
          if (evaluationData.deanComment) {
            pdf.text(`Comments: ${evaluationData.deanComment}`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.deanScore !== null && evaluationData.deanScore !== undefined) {
            pdf.text(`Final Score: ${evaluationData.deanScore}%`, 20, yPosition)
            yPosition += 10
          }
          
          if (evaluationData.promoted !== undefined) {
            pdf.text(`Promotion Status: ${evaluationData.promoted ? 'PROMOTED' : 'NOT PROMOTED'}`, 20, yPosition)
          }
        }
      }
      
      // Save PDF with exact same naming convention
      const fileName = `${userName}_${term}_${new Date().getFullYear()}_Evaluation.pdf`
      pdf.save(fileName)
      
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Failed to generate PDF report')
    } finally {
      setDownloadingPdf(null)
    }
  }, [evaluationResults])

  // Filter results based on search query
  const filteredResults = evaluationResults.filter(result => {
    const matchesSearch = searchQuery === '' || 
      result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.department.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  // Get unique departments for filter
  const uniqueDepartments = Array.from(new Set(evaluationResults.map(r => r.department)))

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROMOTED': return 'default'
      case 'NOT_PROMOTED': return 'destructive'
      case 'PENDING': return 'secondary'
      default: return 'outline'
    }
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PROMOTED': return 'Promoted'
      case 'NOT_PROMOTED': return 'Not Promoted'
      case 'PENDING': return 'Pending'
      default: return status || 'Not Available'
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8 px-6 max-w-7xl">
      {/* Back Button */}
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Evaluation Results & Reports</h1>
        <p className="text-gray-600">Comprehensive evaluation data and individual PDF reports for all staff members</p>
      </div>

      {/* Welcome Card */}
      <Card className="bg-blue-50 border-blue-200 shadow-sm">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Welcome, {session?.user?.name || 'Admin'}!</h2>
              <p className="text-gray-600">Evaluation Results & Reports Dashboard</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-sm font-semibold">ADMIN</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Card className="shadow-sm">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="text-2xl font-bold text-blue-600">{summary.totalStaff}</div>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="text-2xl font-bold text-green-600">{summary.totalTeachers}</div>
              <p className="text-xs text-muted-foreground">Total Teachers</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="text-2xl font-bold text-orange-600">{summary.totalHODs}</div>
              <p className="text-xs text-muted-foreground">Total HODs</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="text-2xl font-bold text-purple-600">{summary.departmentsIncluded.length}</div>
              <p className="text-xs text-muted-foreground">Departments</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter evaluation results by department, role, year, or search terms</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-medium">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="HOD">HOD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Year</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Years</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Refresh Button and Status */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={fetchEvaluationResults}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Circle className="w-2 h-2 text-green-500 fill-current" />
              <span>Real-time data</span>
              <span>•</span>
              <span>Last updated: {currentTime || 'Loading...'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardContent className="pt-6 pb-6 px-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Evaluation Results
          </CardTitle>
          <CardDescription>
            {filteredResults.length > 0 
              ? `Showing ${filteredResults.length} staff members` 
              : 'No results found'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading evaluation results...</span>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No results to display.</p>
              <p className="text-sm">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Name</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Role</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Department</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Start Term</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider">End Term</TableHead>
                    <TableHead className="px-3 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow key={result.id} className="hover:bg-gray-50">
                      <TableCell className="px-3 py-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{result.name}</div>
                          <div className="text-xs text-gray-500 truncate">{result.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge variant={result.role === 'HOD' ? 'default' : 'secondary'} className="text-xs">
                          {result.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="text-sm truncate max-w-24">{result.department}</div>
                      </TableCell>
                                             <TableCell className="px-3 py-2">
                         <div className="min-w-0">
                           {result.terms.START.promoted !== undefined ? (
                             <Badge variant={result.terms.START.promoted ? 'default' : 'destructive'} className="text-xs">
                               {result.terms.START.promoted ? 'Promoted' : 'Not Promoted'}
                             </Badge>
                           ) : (
                             <div className="text-xs font-medium">{getStatusText(result.terms.START.status)}</div>
                           )}
                         </div>
                       </TableCell>
                       <TableCell className="px-3 py-2">
                         <div className="min-w-0">
                           {result.terms.END.promoted !== undefined ? (
                             <Badge variant={result.terms.END.promoted ? 'default' : 'destructive'} className="text-xs">
                               {result.terms.END.promoted ? 'Promoted' : 'Not Promoted'}
                             </Badge>
                           ) : (
                             <div className="text-xs font-medium">{getStatusText(result.terms.END.status)}</div>
                           )}
                         </div>
                       </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadIndividualReport(result.id, result.name, result.role, 'START')}
                            disabled={downloadingPdf === `${result.id}-START`}
                            className="h-7 px-2 text-xs"
                          >
                            {downloadingPdf === `${result.id}-START` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            Start
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadIndividualReport(result.id, result.name, result.role, 'END')}
                            disabled={downloadingPdf === `${result.id}-END`}
                            className="h-7 px-2 text-xs"
                          >
                            {downloadingPdf === `${result.id}-END` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            End
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
