'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileDown, Download, Search, BarChart3, Users, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Department {
  id: string
  name: string
}

interface TeacherResult {
  id: string
  name: string
  email: string
  role: string
  department: string
  departmentId: string
  year: number
  terms: {
    [key: string]: {
      hasSubmitted: boolean
      questionsAnswered: number
      maxQuestions: number
      hodScore: number
      asstScore: number
      finalScore: number
      maxPossibleScore: number
      status: string
      hodReviewer: string | null
      asstReviewer: string | null
      deanReviewer: string | null
      submittedAt: string | null
      hodReviewedAt: string | null
      asstReviewedAt: string | null
      finalReviewedAt: string | null
    }
  }
}

interface ResultsData {
  results: TeacherResult[]
  summary: {
    totalTeachers: number
    departmentsIncluded: string[]
    termsIncluded: string[]
    generatedAt: string
    generatedBy: string
  }
}

const ITEMS_PER_PAGE = 10

export default function ReportsPage() {
  const { data: session } = useSession()
  const [resultsData, setResultsData] = useState<ResultsData | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL')
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [selectedYear, setSelectedYear] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Generate years for dropdown (current year and 5 years back)
  const years = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  const roles = [
    { value: 'ALL', label: 'All Roles' },
    { value: 'TEACHER', label: 'Teacher' },
    { value: 'HOD', label: 'Head of Department' },
    { value: 'ASST_DEAN', label: 'Assistant Dean' },
    { value: 'DEAN', label: 'Dean' },
    { value: 'ADMIN', label: 'Admin' }
  ]

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments/public')
      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }
      const data = await response.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments')
    }
  }

  // Fetch results
  const fetchResults = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const params = new URLSearchParams()
      if (selectedDepartment !== 'ALL') params.append('departmentId', selectedDepartment)
      if (selectedRole !== 'ALL') params.append('role', selectedRole)
      if (selectedYear !== 'ALL') params.append('year', selectedYear)
      params.append('format', 'json')

      const response = await fetch(`/api/reports/results?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch results')
      }

      const data = await response.json()
      setResultsData(data)
      setSuccess('Report generated successfully!')
    } catch (error) {
      console.error('Error fetching results:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch results')
    } finally {
      setLoading(false)
    }
  }

  // Export to CSV
  const exportToCSV = async () => {
    setExporting(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedDepartment !== 'ALL') params.append('departmentId', selectedDepartment)
      if (selectedRole !== 'ALL') params.append('role', selectedRole)
      if (selectedYear !== 'ALL') params.append('year', selectedYear)
      params.append('format', 'csv')

      const response = await fetch(`/api/reports/results?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teacher-evaluation-results-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccess('CSV exported successfully!')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      setError(error instanceof Error ? error.message : 'Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedDepartment !== 'ALL') params.append('departmentId', selectedDepartment)
      if (selectedRole !== 'ALL') params.append('role', selectedRole)
      if (selectedYear !== 'ALL') params.append('year', selectedYear)
      params.append('format', 'pdf')

      const response = await fetch(`/api/reports/results?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teacher-evaluation-results-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccess('PDF exported successfully!')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      setError(error instanceof Error ? error.message : 'Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  // Print results
  const printResults = () => {
    window.print()
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROMOTED': return 'bg-green-100 text-green-800'
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800'
      case 'NEEDS_IMPROVEMENT': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get performance percentage
  const getPerformancePercentage = (finalScore: number, maxScore: number) => {
    return maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0
  }

  // Load data on component mount
  useEffect(() => {
    if (session?.user) {
      if (session.user.role === 'DEAN' || session.user.role === 'ASST_DEAN' || session.user.role === 'ADMIN') {
        fetchDepartments()
      }
      fetchResults()
    }
  }, [session])

  // Filter and paginate results
  const filteredResults = resultsData?.results.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'ALL' || teacher.role === selectedRole
    const matchesYear = selectedYear === 'ALL' || teacher.year.toString() === selectedYear
    return matchesSearch && matchesRole && matchesYear
  }) || []

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedResults = filteredResults.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN']}>
        <DashboardLayout title="Evaluation Results & Reports">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN']}>
      <DashboardLayout title="Evaluation Results & Reports">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-100">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {session.user.name}!
                  </h2>
                  <p className="text-gray-600">
                    Evaluation Results & Reports Dashboard
                  </p>
                </div>
                <Badge variant="outline" className="text-base">{session.user.role}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Department Filter */}
                {(session?.user?.role === 'DEAN' || session?.user?.role === 'ASST_DEAN' || session?.user?.role === 'ADMIN') && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Department</label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Role Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Years</SelectItem>
                      {years.map(year => (
                        <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button onClick={fetchResults} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </Button>

                {/* Export Actions */}
                {resultsData && (
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={printResults} disabled={exporting}>
                      🖨️ Print
                    </Button>
                    <Button variant="outline" onClick={exportToCSV} disabled={exporting}>
                      {exporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Exporting...
                        </>
                      ) : (
                        '📊 Export CSV'
                      )}
                    </Button>
                    <Button variant="outline" onClick={exportToPDF} disabled={exporting}>
                      {exporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4 mr-2" />
                          Export PDF
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          {resultsData && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Report Summary
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{resultsData.summary.totalTeachers}</div>
                    <div className="text-sm text-gray-600">Total Teachers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{resultsData.summary.departmentsIncluded.length}</div>
                    <div className="text-sm text-gray-600">Departments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{resultsData.summary.termsIncluded.length}</div>
                    <div className="text-sm text-gray-600">Terms Included</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {resultsData.results.filter(r => 
                        Object.values(r.terms).some((t: any) => t.status === 'PROMOTED')
                      ).length}
                    </div>
                    <div className="text-sm text-gray-600">Promoted</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Generated by {resultsData.summary.generatedBy} on {new Date(resultsData.summary.generatedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Table */}
          {resultsData && paginatedResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Teacher Evaluation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>HOD Score</TableHead>
                      <TableHead>Asst Dean Score</TableHead>
                      <TableHead>Final Score</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResults.map((teacher) => 
                      Object.entries(teacher.terms).map(([termKey, termData]: [string, any]) => {
                        if (!termData.hasSubmitted) return null
                        
                        return (
                          <TableRow key={`${teacher.id}-${termKey}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{teacher.name}</div>
                                <div className="text-sm text-gray-500">{teacher.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{teacher.department}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{teacher.role}</Badge>
                            </TableCell>
                            <TableCell>{teacher.year}</TableCell>
                            <TableCell>{termData.hodScore}/{termData.maxPossibleScore}</TableCell>
                            <TableCell>{termData.asstScore}/{termData.maxPossibleScore}</TableCell>
                            <TableCell className="font-medium">
                              {termData.finalScore}/{termData.maxPossibleScore}
                            </TableCell>
                            <TableCell>
                              {getPerformancePercentage(termData.finalScore, termData.maxPossibleScore)}%
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(termData.status)}>
                                {termData.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredResults.length)} of {filteredResults.length} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {resultsData && filteredResults.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <Image
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80"
                      alt="No results"
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No evaluation results found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try adjusting your filters or check if evaluations have been completed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}