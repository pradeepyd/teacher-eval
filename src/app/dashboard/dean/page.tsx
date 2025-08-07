'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileDown } from 'lucide-react'

interface Department {
  id: string
  name: string
}

interface TeacherAnswer {
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

interface Teacher {
  id: string
  name: string
  email: string
  department: string
  status: string
  teacherAnswers: TeacherAnswer[]
  selfComment: string
  hodComment: string
  hodScore: number
  asstDeanComment: string
  asstDeanScore: number
  deanComment: string
  finalScore: number
  promoted: boolean
  canReview: boolean
}

export default function DeanDashboard() {
  const { data: session } = useSession()
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }
      const data = await response.json()
      setDepartments(data.departments || [])
      if (data.departments?.length > 0) {
        setSelectedDept(data.departments[0].id)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments')
    }
  }

  // Fetch teachers for the selected department
  const fetchTeachers = async () => {
    if (!selectedDept) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reviews/dean/teacher-data?departmentId=${selectedDept}`)
      if (!response.ok) {
        throw new Error('Failed to fetch teachers')
      }
      const data = await response.json()
      setTeachers(data.teachers || [])
    } catch (error) {
      console.error('Error fetching teachers:', error)
      setError('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  // Submit final review for a teacher
  const submitFinalReview = async (teacherId: string, comment: string, finalScore: number, promoted: boolean) => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/reviews/dean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          comment: comment.trim(),
          finalScore,
          promoted,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit final review')
      }

      setSuccess('Final review submitted successfully!')
      
      // Update local state
      setTeachers(prev => prev.map(t => 
        t.id === teacherId 
          ? { ...t, status: 'FINALIZED', canReview: false }
          : t
      ))
      
      setShowConfirmDialog(false)
      setSelectedTeacher(null)
    } catch (error) {
      console.error('Error submitting final review:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit final review')
    } finally {
      setSubmitting(false)
    }
  }

  // Update teacher data locally
  const updateTeacher = (teacherId: string, updates: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => 
      t.id === teacherId ? { ...t, ...updates } : t
    ))
  }

  // Handle final review submission
  const handleSubmit = (teacher: Teacher) => {
    if (!teacher.deanComment?.trim()) {
      setError('Please add final comments before submitting')
      return
    }

    if (!teacher.finalScore || teacher.finalScore < 1 || teacher.finalScore > 10) {
      setError('Please provide a valid final score between 1 and 10')
      return
    }

    setSelectedTeacher(teacher)
    setShowConfirmDialog(true)
  }

  // Confirm submission
  const confirmSubmit = () => {
    if (!selectedTeacher) return
    submitFinalReview(
      selectedTeacher.id, 
      selectedTeacher.deanComment, 
      selectedTeacher.finalScore, 
      selectedTeacher.promoted
    )
  }

  // Export PDF (placeholder)
  const exportPDF = (teacher: Teacher) => {
    console.log('Exporting PDF for:', teacher.name)
    // TODO: Implement PDF export functionality
    setSuccess(`PDF export initiated for ${teacher.name}`)
  }

  // Load data on component mount
  useEffect(() => {
    if (session?.user) {
      fetchDepartments()
    }
  }, [session])

  // Fetch teachers when department changes
  useEffect(() => {
    if (selectedDept) {
      fetchTeachers()
    }
  }, [selectedDept])

  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['DEAN']}>
        <DashboardLayout title="Dean Dashboard">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['DEAN']}>
      <DashboardLayout title="Dean Dashboard">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-red-50 to-pink-100">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {session.user.name}!
                  </h2>
                  <p className="text-gray-600">
                    Dean Dashboard - Final Review
                  </p>
                </div>
                <Badge variant="outline" className="text-base">Dean</Badge>
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
          {/* Department Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Department</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading teachers...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teachers List */}
          {selectedDept && !loading && teachers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Teachers for Final Review</h2>
              {teachers.map((teacher) => (
                <Card key={teacher.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{teacher.name}</CardTitle>
                        <p className="text-sm text-gray-600">{teacher.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={teacher.status === 'FINALIZED' ? 'default' : 'secondary'}>
                          {teacher.status === 'FINALIZED' ? 'Finalized' : 'Pending'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportPDF(teacher)}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="review">
                        <AccordionTrigger>Final Review Details</AccordionTrigger>
                        <AccordionContent>
                          <Tabs defaultValue="teacher-answers" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="teacher-answers">Teacher Answers</TabsTrigger>
                              <TabsTrigger value="hod-comments">HOD Comments</TabsTrigger>
                              <TabsTrigger value="asst-dean-comments">Asst Dean Comments</TabsTrigger>
                              <TabsTrigger value="dean-final">Dean Final Review</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="teacher-answers" className="space-y-4">
                              <div className="space-y-3">
                                {teacher.teacherAnswers?.map((answer, index) => (
                                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium">Question {index + 1}: {answer.question.question}</p>
                                    <p className="text-sm text-gray-700 mt-1">{answer.answer}</p>
                                  </div>
                                )) || <p className="text-sm text-gray-500">No answers available</p>}
                                {teacher.selfComment && (
                                  <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-sm font-medium">Teacher's Self Comment:</p>
                                    <p className="text-sm text-gray-700 mt-1">{teacher.selfComment}</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="hod-comments" className="space-y-4">
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-2">HOD Comments:</h4>
                                <p className="text-sm text-gray-700">{teacher.hodComment || 'No comments available'}</p>
                                <div className="mt-2">
                                  <span className="text-sm font-medium">HOD Score: </span>
                                  <span className="text-sm text-gray-700">{teacher.hodScore}/10</span>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="asst-dean-comments" className="space-y-4">
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-2">Assistant Dean Comments:</h4>
                                <p className="text-sm text-gray-700">{teacher.asstDeanComment || 'No comments available'}</p>
                                <div className="mt-2">
                                  <span className="text-sm font-medium">Assistant Dean Score: </span>
                                  <span className="text-sm text-gray-700">{teacher.asstDeanScore}/10</span>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="dean-final" className="space-y-4">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Final Comments</label>
                                  <Textarea
                                    placeholder="Enter your final comments..."
                                    value={teacher.deanComment}
                                    onChange={(e) => updateTeacher(teacher.id, { deanComment: e.target.value })}
                                    className="mt-1"
                                    disabled={!teacher.canReview}
                                  />
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Final Score (1-10)</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={teacher.finalScore || ''}
                                    onChange={(e) => updateTeacher(teacher.id, { finalScore: parseInt(e.target.value) || 0 })}
                                    className="mt-1 w-24"
                                    disabled={!teacher.canReview}
                                  />
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`promotion-${teacher.id}`}
                                    checked={teacher.promoted}
                                    onCheckedChange={(checked) => updateTeacher(teacher.id, { promoted: checked })}
                                    disabled={!teacher.canReview}
                                  />
                                  <label htmlFor={`promotion-${teacher.id}`} className="text-sm font-medium">
                                    Recommend for Promotion
                                  </label>
                                </div>
                                
                                {teacher.canReview && (
                                  <Button 
                                    onClick={() => handleSubmit(teacher)}
                                    disabled={teacher.status === 'FINALIZED' || submitting}
                                    className="w-full"
                                  >
                                    {submitting ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Finalizing...
                                      </>
                                    ) : (
                                      'Finalize Review'
                                    )}
                                  </Button>
                                )}
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
          {selectedDept && !loading && teachers.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">No teachers found in this department</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Final Review</DialogTitle>
              <DialogDescription>
                Are you sure you want to finalize the review for {selectedTeacher?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Finalizing...
                  </>
                ) : (
                  'Finalize Review'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  )
}