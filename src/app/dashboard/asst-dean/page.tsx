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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
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
  asstDeanComment: TermScoped<string> | Record<string, string>
  asstDeanScore: TermScoped<number> | Record<string, number>
  canReview: boolean
}

export default function AsstDeanDashboard() {
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
  const [openTeacherId, setOpenTeacherId] = useState<string | null>(null)
  // removed unused state

  // HOD evaluation state
  interface HodItem {
    id: string
    name: string
    department?: { id: string; name: string } | null
    existingReview?: {
      comments: string
      totalScore?: number | null
      submitted: boolean
    } | null
    comments?: string
    totalScore?: number
    rubric?: Record<string, number>
  }
  const [hods, setHods] = useState<HodItem[]>([])
  const [hodTerm, setHodTerm] = useState<'START' | 'END'>("START")
  const [hodLoading, setHodLoading] = useState(false)
  const [hodSubmittingId, setHodSubmittingId] = useState<string | null>(null)
  const [hodConfirmOpen, setHodConfirmOpen] = useState(false)
  const [hodSelected, setHodSelected] = useState<HodItem | null>(null)
  const [openHodId, setOpenHodId] = useState<string | null>(null)

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments/public')
      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }
      const data = await response.json()
      // public endpoint returns an array; fallback supports { departments } shape
      setDepartments(Array.isArray(data) ? data : (data.departments || []))
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
      const response = await fetch(`/api/reviews/asst-dean/teacher-data?departmentId=${selectedDept}`)
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
      // ignore; handled by null check on submit
    }
  }

  // Submit review for a teacher
  const submitReview = async (teacherId: string, comment: string, score: number) => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/reviews/asst-dean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          comment: comment.trim(),
          score,
          term: activeTerm,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit review')
      }

      setSuccess('Review submitted successfully!')
      toast.success('Review submitted successfully!')
      
      // Update local state
      setTeachers(prev => prev.map(t => 
        t.id === teacherId 
          ? { ...t, status: 'REVIEWED', canReview: false }
          : t
      ))
      
      setShowConfirmDialog(false)
      setSelectedTeacher(null)
      setOpenTeacherId(null)
    } catch (error) {
      console.error('Error submitting review:', error)
      const msg = error instanceof Error ? error.message : 'Failed to submit review'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // HOD evaluation: fetch HODs for selected term
  const fetchHods = async () => {
    setHodLoading(true)
    try {
      const res = await fetch(`/api/reviews/asst-dean/hod?term=${hodTerm}`)
      if (!res.ok) throw new Error('Failed to load HODs')
      const data = await res.json()
      const mapped: HodItem[] = (data.hods || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        department: h.department || null,
        existingReview: h.hodPerformanceReviewsReceived?.[0]
          ? {
              comments: h.hodPerformanceReviewsReceived[0].comments,
              totalScore: h.hodPerformanceReviewsReceived[0].totalScore,
              submitted: h.hodPerformanceReviewsReceived[0].submitted,
            }
          : null,
        comments: h.hodPerformanceReviewsReceived?.[0]?.comments || '',
        totalScore: h.hodPerformanceReviewsReceived?.[0]?.totalScore || 0,
      }))
      setHods(mapped)
    } catch (e) {
      setError('Failed to load HODs')
      toast.error('Failed to load HODs')
    } finally {
      setHodLoading(false)
    }
  }

  // HOD evaluation: submit one HOD review
  const submitHodReview = async (hod: HodItem) => {
    if (!hod.comments || hod.comments.trim().length === 0) {
      setError('Please enter comments for the HOD')
      toast.error('Please enter comments for the HOD')
      return
    }
    setHodSubmittingId(hod.id)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/reviews/asst-dean/hod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hodId: hod.id,
          term: hodTerm,
          comments: hod.comments.trim(),
          scores: hod.rubric || {},
          totalScore: null,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to submit HOD review')
      }
      setSuccess('HOD review submitted successfully')
      toast.success('HOD review submitted successfully')
      // reflect submitted state locally
      setHods(prev => prev.map(item => (item.id === hod.id ? { ...item, existingReview: { comments: hod.comments!, totalScore: hod.totalScore, submitted: true } } : item)))
      setOpenHodId(null)
    } catch (e: any) {
      const msg = e.message || 'Failed to submit HOD review'
      setError(msg)
      toast.error(msg)
    } finally {
      setHodSubmittingId(null)
    }
  }

  // Update teacher data locally
  const updateTeacher = (teacherId: string, updates: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => 
      t.id === teacherId ? { ...t, ...updates } : t
    ))
  }

  // Handle review submission
  const handleSubmit = (teacher: Teacher) => {
    if (!activeTerm) {
      setError('No active term set for the selected department')
      toast.error('No active term set for the selected department')
      return
    }
    const termKey = activeTerm
    const commentVal = (teacher.asstDeanComment as any)?.[termKey] || ''
    if (!commentVal?.trim()) {
      setError('Please add a comment before submitting')
      toast.error('Please add a comment before submitting')
      return
    }

    const scoreVal = Number((teacher.asstDeanScore as any)?.[termKey] || 0)
    if (!scoreVal || scoreVal < 1 || scoreVal > 10) {
      setError('Please provide a valid score between 1 and 10')
      toast.error('Please provide a valid score between 1 and 10')
      return
    }

    setSelectedTeacher(teacher)
    setShowConfirmDialog(true)
  }

  // Confirm submission
  const confirmSubmit = () => {
    if (!selectedTeacher) return
    const termKey = activeTerm as 'START' | 'END'
    const commentVal = (selectedTeacher.asstDeanComment as any)?.[termKey] || ''
    const scoreVal = Number((selectedTeacher.asstDeanScore as any)?.[termKey] || 0)
    submitReview(selectedTeacher.id, commentVal, scoreVal)
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

  // Fetch HODs when hodTerm changes
  useEffect(() => {
    if (session?.user) {
      fetchHods()
    }
  }, [session, hodTerm])

  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['ASST_DEAN']}>
        <DashboardLayout title="Assistant Dean Dashboard">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['ASST_DEAN']}>
      <DashboardLayout title="Assistant Dean Dashboard">
        {/* HOD submit confirm dialog */}
        <Dialog open={hodConfirmOpen} onOpenChange={setHodConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit HOD Review</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit this HOD review? You won’t be able to edit it afterwards.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHodConfirmOpen(false)}>Cancel</Button>
              <Button onClick={() => { if (hodSelected) { submitHodReview(hodSelected).finally(()=> setHodConfirmOpen(false)) }}}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-100">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {session.user.name}!
                  </h2>
                  <p className="text-gray-600">
                    Assistant Dean Dashboard
                  </p>
                </div>
                <Badge variant="outline" className="text-base">Assistant Dean</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toasts replace banners for success/error */}

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
              <h2 className="text-xl font-semibold">Teachers to Review</h2>
              {teachers.map((teacher) => (
                <Card key={teacher.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{teacher.name}</CardTitle>
                        <p className="text-sm text-gray-600">{teacher.email}</p>
                      </div>
                      <Badge
                        variant={teacher.status === 'REVIEWED' ? 'default' : 'secondary'}
                        className={
                          teacher.status === 'REVIEWED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {teacher.status === 'REVIEWED' ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                        <Accordion type="single" collapsible className="w-full" value={openTeacherId===teacher.id? 'review' : undefined} onValueChange={(v)=> setOpenTeacherId(v ? teacher.id : null)}>
                      <AccordionItem value="review">
                        <AccordionTrigger>Review Details</AccordionTrigger>
                        <AccordionContent>
                          <Tabs defaultValue="hod-comments" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="hod-comments">HOD Comments</TabsTrigger>
                              <TabsTrigger value="teacher-answers">Teacher Answers</TabsTrigger>
                              <TabsTrigger value="asst-dean-review">Assistant Dean Review</TabsTrigger>
                            </TabsList>
                            
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
                            
                              <TabsContent value="teacher-answers" className="space-y-4">
                              <div className="space-y-3">
                                  {(teacher.teacherAnswers?.[activeTerm || 'START'] || []).map((answer, index) => (
                                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium">Question {index + 1}: {answer.question.question}</p>
                                    <p className="text-sm text-gray-700 mt-1">{answer.answer}</p>
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
                            
                            <TabsContent value="asst-dean-review" className="space-y-4">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Your Comments</label>
                                  <Textarea
                                    placeholder="Enter your comments..."
                                    value={(teacher.asstDeanComment as any)?.[activeTerm || 'START'] || ''}
                                    onChange={(e) => updateTeacher(teacher.id, { asstDeanComment: { ...(teacher.asstDeanComment as any), [activeTerm || 'START']: e.target.value } as any })}
                                    className="mt-1"
                                    disabled={!teacher.canReview}
                                  />
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Score (1-10)</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={Number((teacher.asstDeanScore as any)?.[activeTerm || 'START'] || '')}
                                    onChange={(e) => updateTeacher(teacher.id, { asstDeanScore: { ...(teacher.asstDeanScore as any), [activeTerm || 'START']: parseInt(e.target.value) || 0 } as any })}
                                    className="mt-1 w-24"
                                    disabled={!teacher.canReview}
                                  />
                                </div>
                                
                                {teacher.canReview && (
                                  <Button 
                                    onClick={() => setShowConfirmDialog(true)}
                                    disabled={teacher.status === 'REVIEWED' || submitting || !teacher.canReview}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                  >
                                    {submitting ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Submitting...
                                      </>
                                    ) : (
                                      'Submit Review'
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
          {/* HOD Evaluation */}
          <Card>
            <CardHeader>
              <CardTitle>Evaluate Heads of Department (HODs)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-48">
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
                {hodLoading && (
                  <div className="text-sm text-gray-500 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2"/>Loading HODs...</div>
                )}
              </div>

              {!hodLoading && hods.length === 0 && (
                <div className="text-sm text-gray-500">No HODs found.</div>
              )}

              {!hodLoading && hods.length > 0 && (
                <div className="space-y-4">
                  {hods.map(h => (
                    <Card key={h.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{h.name}</CardTitle>
                            <p className="text-sm text-gray-600">{h.department?.name || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={h.existingReview?.submitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                              {h.existingReview?.submitted ? 'Submitted' : 'Pending'}
                            </Badge>
                            <button
                              type="button"
                              aria-label={openHodId === h.id ? 'Collapse' : 'Expand'}
                              onClick={() => setOpenHodId(prev => (prev === h.id ? null : h.id))}
                              className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100"
                            >
                              {openHodId === h.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      {openHodId === h.id && (
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Comments</label>
                          <Textarea
                            placeholder="Enter your comments..."
                            value={h.comments || ''}
                            onChange={(e) => setHods(prev => prev.map(x => x.id === h.id ? { ...x, comments: e.target.value } : x))}
                            className="mt-1"
                            disabled={!!h.existingReview?.submitted}
                          />
                        </div>

                        {/* HOD Rubric (1–5 per item) */}
                        <div className="space-y-3">
                          <div className="text-base md:text-lg font-semibold">Professionalism</div>
                          {['Compliance','Punctuality/Attendance','Competence and Performance'].map((label, idx) => {
                            const key = `[Professionalism] ${label}`
                            const val = h.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => !h.existingReview?.submitted && setHods(prev => prev.map(x => x.id === h.id ? { ...x, rubric: { ...(x.rubric||{}), [key]: n } } : x))}
                                      className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                      disabled={!!h.existingReview?.submitted}
                                    >{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          <div className="text-base md:text-lg font-semibold mt-3">Leadership and Administration</div>
                          {['Planning & Organization','Department Duties','Collegial Relationship & Work Delegation','College Committees'].map((label, idx) => {
                            const key = `[Leadership] ${label}`
                            const val = h.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} type="button" onClick={() => !h.existingReview?.submitted && setHods(prev => prev.map(x => x.id === h.id ? { ...x, rubric: { ...(x.rubric||{}), [key]: n } } : x))} className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`} disabled={!!h.existingReview?.submitted}>{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          <div className="text-base md:text-lg font-semibold mt-3">Professional Development</div>
                          {['In-Service Training','Research and Publications','National and International Conferences'].map((label, idx) => {
                            const key = `[Development] ${label}`
                            const val = h.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} type="button" onClick={() => !h.existingReview?.submitted && setHods(prev => prev.map(x => x.id === h.id ? { ...x, rubric: { ...(x.rubric||{}), [key]: n } } : x))} className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`} disabled={!!h.existingReview?.submitted}>{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          <div className="text-base md:text-lg font-semibold mt-3">Professional Service and Consultancy</div>
                          {['Students’ Engagement','Community Engagement'].map((label, idx) => {
                            const key = `[Service] ${label}`
                            const val = h.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} type="button" onClick={() => !h.existingReview?.submitted && setHods(prev => prev.map(x => x.id === h.id ? { ...x, rubric: { ...(x.rubric||{}), [key]: n } } : x))} className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`} disabled={!!h.existingReview?.submitted}>{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Preview total (normalized) */}
                        <div className="text-sm text-gray-700">
                          {(() => {
                            const s = h.rubric || {}
                            const groups = [
                              Object.keys(s).filter(k => k.startsWith('[Professionalism]')),
                              Object.keys(s).filter(k => k.startsWith('[Leadership]')),
                              Object.keys(s).filter(k => k.startsWith('[Development]')),
                              Object.keys(s).filter(k => k.startsWith('[Service]')),
                            ]
                            const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (s[k] || 0), 0)
                            const raw = groups.reduce((acc, g) => acc + sum(g), 0)
                            const max = groups.reduce((acc, g) => acc + g.length * 5, 0)
                            const normalized = max > 0 ? Math.round((raw / max) * 100) : 0
                            return <span>Estimated Total: {normalized}/100</span>
                          })()}
                        </div>
                        <Button
                          onClick={() => { setHodSelected(h); setHodConfirmOpen(true) }}
                          disabled={hodSubmittingId === h.id || !!h.existingReview?.submitted}
                          className="w-full"
                        >
                          {hodSubmittingId === h.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...
                            </>
                          ) : 'Submit HOD Review'}
                        </Button>
                      </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
              <DialogTitle>Confirm Submission</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit your review for {selectedTeacher?.name}? This action cannot be undone.
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
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  )
}
