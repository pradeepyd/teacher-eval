'use client'

import { useState, useEffect } from 'react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileDown, Download, BarChart3 } from 'lucide-react'

interface TeacherResult {
  id: string
  name: string
  department: string
  finalScore: number
  promoted: boolean
  status: 'completed' | 'pending'
  comments: {
    hod: string
    asstDean: string
    dean: string
  }
  teacherAnswers: any[]
  createdAt: string
}

interface Department {
  id: string
  name: string
}

export default function ResultsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [results, setResults] = useState<TeacherResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Generate years for dropdown (current year and 5 years back)
  const years = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments')
        if (res.ok) {
          const data = await res.json()
          setDepartments(data)
          if (data.length > 0) setSelectedDept(data[0].id)
        } else {
          setError('Failed to fetch departments')
        }
      } catch (err) {
        setError('Error fetching departments')
      } finally {
        setLoading(false)
      }
    }

    fetchDepartments()
    setSelectedYear(new Date().getFullYear().toString())
  }, [])

  useEffect(() => {
    if (selectedDept && selectedYear) {
      fetchResults()
    }
  }, [selectedDept, selectedYear])

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/reports/results?departmentId=${selectedDept}&year=${selectedYear}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        setError('Failed to fetch results')
      }
    } catch (err) {
      setError('Error fetching results')
    }
  }

  const exportPDF = (teacher: TeacherResult) => {
    // Placeholder for PDF export functionality
    
  }

  const exportAllPDF = () => {
    // Placeholder for bulk PDF export
    
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPromotionBadge = (promoted: boolean) => {
    return (
      <Badge variant={promoted ? 'default' : 'secondary'}>
        {promoted ? 'Promoted' : 'Not Promoted'}
      </Badge>
    )
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={['DEAN']}>
        <DashboardLayout title="Results">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['DEAN']}>
      <DashboardLayout title="Results">
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Department</label>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Bar */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Summary
                  </CardTitle>
                  <Button onClick={exportAllPDF} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export All PDFs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.length}</div>
                    <div className="text-sm text-gray-600">Total Teachers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.filter(r => r.promoted).length}
                    </div>
                    <div className="text-sm text-gray-600">Promoted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {results.filter(r => r.finalScore >= 8).length}
                    </div>
                    <div className="text-sm text-gray-600">High Performers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {(results.reduce((sum, r) => sum + r.finalScore, 0) / results.length).toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results List */}
          {selectedDept && selectedYear && results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Teacher Results</h2>
              {results.map((teacher) => (
                <Card key={teacher.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{teacher.name}</CardTitle>
                        <p className="text-sm text-gray-600">{teacher.department}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPromotionBadge(teacher.promoted)}
                        <Badge variant={teacher.status === 'completed' ? 'default' : 'secondary'}>
                          {teacher.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportPDF(teacher)}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="details">
                        <AccordionTrigger>View Details</AccordionTrigger>
                        <AccordionContent>
                          <Tabs defaultValue="summary" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="summary">Summary</TabsTrigger>
                              <TabsTrigger value="comments">Comments</TabsTrigger>
                              <TabsTrigger value="answers">Teacher Answers</TabsTrigger>
                              <TabsTrigger value="scores">Scores</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="summary" className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Final Score</h4>
                                  <div className={`text-2xl font-bold ${getScoreColor(teacher.finalScore)}`}>
                                    {teacher.finalScore}/10
                                  </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Promotion Status</h4>
                                  <div className="text-lg">
                                    {teacher.promoted ? '✅ Recommended' : '❌ Not Recommended'}
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="comments" className="space-y-4">
                              <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                  <h4 className="font-medium mb-2">HOD Comments</h4>
                                  <p className="text-sm text-gray-700">{teacher.comments.hod || 'No comments'}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Assistant Dean Comments</h4>
                                  <p className="text-sm text-gray-700">{teacher.comments.asstDean || 'No comments'}</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Dean Comments</h4>
                                  <p className="text-sm text-gray-700">{teacher.comments.dean || 'No comments'}</p>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="answers" className="space-y-4">
                              <div className="space-y-3">
                                {teacher.teacherAnswers?.map((answer, index) => (
                                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium">Question {index + 1}</p>
                                    <p className="text-sm text-gray-700 mt-1">{answer}</p>
                                  </div>
                                )) || <p className="text-sm text-gray-500">No answers available</p>}
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="scores" className="space-y-4">
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-2">Evaluation Timeline</h4>
                                <div className="text-sm text-gray-600">
                                  Completed on: {new Date(teacher.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {selectedDept && selectedYear && results.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No results found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No evaluation results found for the selected department and year.
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
