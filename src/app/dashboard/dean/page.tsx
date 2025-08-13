'use client'
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

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
import { toast } from 'sonner'

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

interface TermScoped<T> { START: T; END: T }

interface Teacher {
  id: string
  name: string
  email: string
  department: string
  status: string
  teacherAnswers: TermScoped<TeacherAnswer[]>
  selfComment: TermScoped<string>
  hodComment: TermScoped<string>
  hodScore: TermScoped<number>
  asstDeanComment: TermScoped<string>
  asstDeanScore: TermScoped<number>
  deanComment: TermScoped<string>
  finalScore: TermScoped<number>
  promoted: TermScoped<boolean>
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
  const [activeTerm, setActiveTerm] = useState<'START' | 'END' | null>(null)
  type HodReviewView = { reviewer: { id: string; name: string; role: string }, comments: string, totalScore: number | null }
  type HodView = { id: string; name: string; department?: { id: string; name: string } | null; reviews: HodReviewView[] }
  const [hods, setHods] = useState<HodView[]>([])
  const [hodTerm, setHodTerm] = useState<'START'|'END'>('START')
  const [hodLoading, setHodLoading] = useState(false)

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments/public')
      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }
      const data = await response.json()
      const list = Array.isArray(data) ? data : (data.departments || [])
      setDepartments(list)
      if (list.length > 0) {
        setSelectedDept(list[0].id)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments')
      toast.error('Failed to load departments')
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
      toast.error('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  // Fetch active term for selected department
  const fetchTermState = async () => {
    if (!selectedDept) return
    try {
      const response = await fetch(`/api/departments/${selectedDept}/term-state`)
      if (response.ok) {
        const data = await response.json()
        setActiveTerm(data.activeTerm || null)
      }
    } catch (e) {
      // ignore
    }
  }

  // Fetch HOD performance with Asst. Dean and Dean reviews
  const fetchHodPerformance = async () => {
    setHodLoading(true)
    try {
      const res = await fetch(`/api/reviews/dean/hod?term=${hodTerm}`)
      if (!res.ok) throw new Error('Failed to load HOD performance')
      const data: { hods?: Array<{ id: string; name: string; department?: { id: string; name: string } | null; hodPerformanceReviewsReceived?: Array<{ reviewer: { id: string; name: string; role: string }, comments: string, totalScore: number | null }> }> } = await res.json()
      const mapped: HodView[] = (data.hods || []).map((h) => ({
        id: h.id,
        name: h.name,
        department: h.department || null,
        reviews: (h.hodPerformanceReviewsReceived || []).map((r) => ({ reviewer: r.reviewer, comments: r.comments, totalScore: r.totalScore ?? null }))
      }))
      setHods(mapped)
    } catch (e) {
      // surface under main error banner
      setError('Failed to load HOD performance')
      toast.error('Failed to load HOD performance')
    } finally {
      setHodLoading(false)
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
          score: finalScore,
          promoted,
          term: activeTerm,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = errorData.error || 'Failed to submit final review'
        // If already finalized, notify and update UI
        if (msg.includes('Final review already submitted')) {
          toast.success('This teacher has already been finalized for this term')
          setTeachers(prev => prev.map(t => (
            t.id === teacherId ? { ...t, status: 'FINALIZED', canReview: false } : t
          )))
          return
        }
        throw new Error(msg)
      }

      setSuccess('Final review submitted successfully!')
      toast.success('Final review submitted successfully!')
      
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
      const msg = error instanceof Error ? error.message : 'Failed to submit final review'
      if (msg.includes('Final review already submitted')) {
        toast.success('This teacher has already been finalized for this term')
        setTeachers(prev => prev.map(t => (
          t.id === teacherId ? { ...t, status: 'FINALIZED', canReview: false } : t
        )))
      } else {
        setError(msg)
        toast.error(msg)
      }
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
    if (!activeTerm) {
      setError('No active term set for the selected department')
      return
    }
    const termKey = activeTerm
    const deanCommentVal = (teacher.deanComment as any)?.[termKey] || ''
    if (!deanCommentVal?.trim()) {
      setError('Please add final comments before submitting')
      return
    }

    const finalScoreVal = Number((teacher.finalScore as any)?.[termKey] || 0)
    if (!finalScoreVal || finalScoreVal < 1 || finalScoreVal > 10) {
      setError('Please provide a valid final score between 1 and 10')
      return
    }

    setSelectedTeacher(teacher)
    setShowConfirmDialog(true)
  }

  // Confirm submission
  const confirmSubmit = () => {
    if (!selectedTeacher) return
    const termKey = activeTerm as 'START' | 'END'
    const deanCommentVal = (selectedTeacher.deanComment as any)?.[termKey] || ''
    const finalScoreVal = Number((selectedTeacher.finalScore as any)?.[termKey] || 0)
    const promotedVal = Boolean((selectedTeacher.promoted as any)?.[termKey] || false)
    submitFinalReview(selectedTeacher.id, deanCommentVal, finalScoreVal, promotedVal)
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
      fetchTermState()
    }
  }, [selectedDept])

  useEffect(() => {
    if (session?.user) {
      fetchHodPerformance()
    }
  }, [session, hodTerm])

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
          {/* HOD Performance Reviews (Assistant Dean + Dean) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>HOD Performance (By Asst. Dean & Dean)</CardTitle>
                <div className="w-40">
                  <Select value={hodTerm} onValueChange={(v: any) => setHodTerm(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="START">START</SelectItem>
                      <SelectItem value="END">END</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hodLoading ? (
                <div className="text-sm text-gray-500 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2"/>Loading HODs...</div>
              ) : (
                <div className="space-y-3">
                  {hods.map((h: HodView) => (
                    <div key={h.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{h.name}</div>
                          <div className="text-sm text-gray-500">{h.department?.name || '—'}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-sm font-medium mb-1">Assistant Dean Review</div>
                          {h.reviews.filter((r: HodReviewView) => r.reviewer.role === 'ASST_DEAN').length === 0 ? (
                            <div className="text-sm text-gray-500">No review yet</div>
                          ) : (
                            h.reviews.filter((r: HodReviewView) => r.reviewer.role === 'ASST_DEAN').map((r: HodReviewView, idx: number) => (
                              <div key={idx} className="text-sm text-gray-700">
                                <div className="mb-1">{r.comments || '—'}</div>
                                <div>Score: {r.totalScore ?? '—'}</div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-sm font-medium mb-1">Dean Review</div>
                          {h.reviews.filter((r: HodReviewView) => r.reviewer.role === 'DEAN').length === 0 ? (
                            <div className="text-sm text-gray-500">No review yet</div>
                          ) : (
                            h.reviews.filter((r: HodReviewView) => r.reviewer.role === 'DEAN').map((r: HodReviewView, idx: number) => (
                              <div key={idx} className="text-sm text-gray-700">
                                <div className="mb-1">{r.comments || '—'}</div>
                                <div>Score: {r.totalScore ?? '—'}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hods.length === 0 && (
                    <div className="text-sm text-gray-500">No HODs found.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
                                  {(teacher.teacherAnswers?.[activeTerm || 'START'] || []).map((answer, index) => (
                                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium">Question {index + 1}: {answer.question.question}</p>
                                    <div className="text-sm text-gray-700 mt-1">
                                      {(() => {
                                        try {
                                          const parsed = typeof answer.answer === 'string' ? JSON.parse(answer.answer) : null
                                          if (parsed && parsed.details && typeof parsed.details === 'object') {
                                            const entries = Object.entries(parsed.details as Record<string,string>).filter(([,v]) => (v||'').trim().length > 0)
                                            if (entries.length > 0) {
                                              return (
                                                <div className="space-y-1">
                                                  {entries.map(([label, value]) => (
                                                    <div key={label}><span className="font-medium">{label}:</span> {value}</div>
                                                  ))}
                                                </div>
                                              )
                                            }
                                          }
                                        } catch {}
                                        return <span>{String(answer.answer)}</span>
                                      })()}
                                    </div>
                                  </div>
                                )) || <p className="text-sm text-gray-500">No answers available</p>}
                                  {((teacher.selfComment as any)?.[activeTerm || 'START']) && (
                                  <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-sm font-medium">Teacher's Self Comment:</p>
                                      <p className="text-sm text-gray-700 mt-1">{(teacher.selfComment as any)?.[activeTerm || 'START']}</p>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                            
                              <TabsContent value="hod-comments" className="space-y-4">
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-2">HOD Comments:</h4>
                                  <p className="text-sm text-gray-700">{(teacher.hodComment as any)?.[activeTerm || 'START'] || 'No comments available'}</p>
                                <div className="mt-2">
                                  <span className="text-sm font-medium">HOD Score: </span>
                                    <span className="text-sm text-gray-700">{(teacher.hodScore as any)?.[activeTerm || 'START'] || 0}/10</span>
                                </div>
                              </div>
                            </TabsContent>
                            
                              <TabsContent value="asst-dean-comments" className="space-y-4">
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium mb-2">Assistant Dean Comments:</h4>
                                  <p className="text-sm text-gray-700">{(teacher.asstDeanComment as any)?.[activeTerm || 'START'] || 'No comments available'}</p>
                                <div className="mt-2">
                                  <span className="text-sm font-medium">Assistant Dean Score: </span>
                                    <span className="text-sm text-gray-700">{(teacher.asstDeanScore as any)?.[activeTerm || 'START'] || 0}/10</span>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="dean-final" className="space-y-4">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Final Comments</label>
                                  <Textarea
                                    placeholder="Enter your final comments..."
                                    value={(teacher.deanComment as any)?.[activeTerm || 'START'] || ''}
                                    onChange={(ev) => updateTeacher(teacher.id, { deanComment: { ...(teacher.deanComment as any), [activeTerm || 'START']: ev.target.value } as any })}
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
                                    value={Number((teacher.finalScore as any)?.[activeTerm || 'START'] || '')}
                                    onChange={(ev) => updateTeacher(teacher.id, { finalScore: { ...(teacher.finalScore as any), [activeTerm || 'START']: parseInt(ev.target.value) || 0 } as any })}
                                    className="mt-1 w-24"
                                    disabled={!teacher.canReview}
                                  />
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`promotion-${teacher.id}`}
                                    checked={Boolean((teacher.promoted as any)?.[activeTerm || 'START'] || false)}
                                    onCheckedChange={(checked) => updateTeacher(teacher.id, { promoted: { ...(teacher.promoted as any), [activeTerm || 'START']: checked } as any })}
                                    disabled={!teacher.canReview}
                                  />
                                  <label htmlFor={`promotion-${teacher.id}`} className="text-sm font-medium">
                                    {teacher.promoted ? 'Status: PROMOTED' : 'Status: ON_HOLD'}
                                  </label>
                                </div>
                                
                                {teacher.canReview && (
                                  <Button 
                                    onClick={() => handleSubmit(teacher)}
                                    disabled={teacher.status === 'FINALIZED' || submitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
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