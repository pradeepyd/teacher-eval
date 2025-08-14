'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calendar, Play, Square, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'

interface Term {
  id: string
  name: string
  year: number
  status: 'INACTIVE' | 'START' | 'END'
  startDate: string
  endDate: string
  departments: {
    id: string
    name: string
    termState: {
      activeTerm: string
    } | null
  }[]
  createdAt: string
  updatedAt: string
}

interface Department {
  id: string
  name: string
}

export default function TermManagementPage() {
  const { data: session } = useSession()
  const [terms, setTerms] = useState<Term[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTerm, setEditingTerm] = useState<Term | null>(null)
  const [deletingTerm, setDeletingTerm] = useState<Term | null>(null)
  const [dispatchDept, setDispatchDept] = useState<string>('')
  const [dispatchTerm, setDispatchTerm] = useState<'START'|'END'>('START')
  const [departmentStates, setDepartmentStates] = useState<Record<string, any>>({})

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear().toString(),
    startDate: '',
    endDate: '',
    termType: 'START' as 'START' | 'END',
    selectedDepartments: [] as string[]
  })

  // Fetch terms
  const fetchTerms = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/terms')
      if (!response.ok) {
        throw new Error('Failed to fetch terms')
      }
      const data = await response.json()
      setTerms(data.terms || [])
    } catch (error) {
      console.error('Error fetching terms:', error)
      setError('Failed to load terms')
    } finally {
      setLoading(false)
    }
  }

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments/public')
      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }
      const data = await response.json()
      setDepartments(data)
      
      // Fetch department states
      await fetchDepartmentStates(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments')
    }
  }

  // Fetch department publishing states
  const fetchDepartmentStates = async (depts: Department[] = departments) => {
    try {
      const states: Record<string, any> = {}
      await Promise.all(
        depts.map(async (dept) => {
          try {
            const response = await fetch(`/api/departments/${dept.id}/term-state`)
            if (response.ok) {
              const data = await response.json()
              states[dept.id] = data
            }
          } catch (e) {
            // Ignore individual failures
          }
        })
      )
      setDepartmentStates(states)
    } catch (error) {
      console.error('Error fetching department states:', error)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      year: new Date().getFullYear().toString(),
      startDate: '',
      endDate: '',
      termType: 'START' as 'START' | 'END',
      selectedDepartments: []
    })
    setEditingTerm(null)
  }

  // Add term
  const handleAddTerm = async () => {
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          year: parseInt(formData.year),
          startDate: formData.startDate,
          endDate: formData.endDate,
          termType: formData.termType,
          departmentIds: formData.selectedDepartments
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create term')
      }

      setSuccess('Term created successfully!')
      await fetchTerms()
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating term:', error)
      setError(error instanceof Error ? error.message : 'Failed to create term')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit term
  const handleEditTerm = async () => {
    if (!editingTerm) return

    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/terms/${editingTerm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          year: parseInt(formData.year),
          startDate: formData.startDate,
          endDate: formData.endDate,
          departmentIds: formData.selectedDepartments
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update term')
      }

      setSuccess('Term updated successfully!')
      await fetchTerms()
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error updating term:', error)
      setError(error instanceof Error ? error.message : 'Failed to update term')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete term
  const handleDeleteTerm = async () => {
    if (!deletingTerm) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/terms/${deletingTerm.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete term')
      }

      setSuccess('Term deleted successfully!')
      await fetchTerms()
      setDeletingTerm(null)
    } catch (error) {
      console.error('Error deleting term:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete term')
    } finally {
      setSubmitting(false)
    }
  }

  // Start term
  const startTerm = async (termId: string) => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/terms/${termId}/start`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start term')
      }

      setSuccess('START term activated successfully!')
      await fetchTerms()
      await fetchDepartmentStates()
    } catch (error) {
      console.error('Error starting term:', error)
      setError(error instanceof Error ? error.message : 'Failed to start term')
    } finally {
      setSubmitting(false)
    }
  }

  // End term
  const endTerm = async (termId: string) => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/terms/${termId}/end`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to end term')
      }

      setSuccess('END term activated successfully!')
      await fetchTerms()
      await fetchDepartmentStates()
    } catch (error) {
      console.error('Error ending term:', error)
      setError(error instanceof Error ? error.message : 'Failed to end term')
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit modal
  const openEditModal = (term: Term) => {
    setEditingTerm(term)
    setFormData({
      name: term.name,
      year: term.year.toString(),
      startDate: term.startDate.split('T')[0],
      endDate: term.endDate.split('T')[0],
      termType: term.status as 'START' | 'END',
      selectedDepartments: term.departments.map(d => d.id)
    })
    setShowAddModal(true)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'START':
        return <Badge className="bg-green-100 text-green-800">START Term</Badge>
      case 'END':
        return <Badge className="bg-blue-100 text-blue-800">END Term</Badge>
      default:
        return <Badge variant="secondary">Inactive</Badge>
    }
  }

  // Removed unused getStatusColor

  // Load data on component mount
  useEffect(() => {
    if (session?.user) {
      fetchTerms()
      fetchDepartments()
    }
  }, [session])

  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <DashboardLayout title="Term Management">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <DashboardLayout title="Term Management">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-orange-50 to-red-100">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {session.user.name}!
                  </h2>
                  <p className="text-gray-600">
                    Term Management Dashboard
                  </p>
                </div>
                <Badge variant="outline" className="text-base">Admin</Badge>
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
          {/* Dispatch Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle>Dispatch Evaluations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <Select value={dispatchDept} onValueChange={setDispatchDept}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Term <span className="text-blue-600 font-medium">({dispatchTerm})</span></label>
                  <Select value={dispatchTerm} onValueChange={(v: any) => setDispatchTerm(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="START">START - Beginning of Year</SelectItem>
                      <SelectItem value="END">END - End of Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col md:flex-row md:flex-wrap md:items-end md:justify-end gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                    type="button"
                    className="w-full md:w-full bg-blue-600 hover:bg-blue-700"
                    variant="default"
                    disabled={!dispatchDept || submitting}
                      >
                        Enable HOD Review Access ({dispatchTerm})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Enable HOD Review Access for {dispatchTerm} Term?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will enable HODs to <strong>review and evaluate teachers</strong> for the {dispatchTerm} term in the selected department. Note: Teachers can already access evaluations once HOD creates questions. Proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            if (!dispatchDept) return
                            setSubmitting(true)
                            setError(null)
                            setSuccess(null)
                            try {
                              const res = await fetch(`/api/departments/${dispatchDept}/term-state`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  activeTerm: dispatchTerm, 
                                  term: dispatchTerm, 
                                  termVisibility: 'PUBLISHED' 
                                })
                              })
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}))
                                throw new Error(data.error || 'Failed to publish teacher evaluation')
                              }
                              setSuccess(`${dispatchTerm} term teacher evaluation published for selected department`)
                              toast.success(`${dispatchTerm} term teacher evaluation published`)
                              await fetchDepartmentStates()
                            } catch (e) {
                              const msg = e instanceof Error ? e.message : 'Failed to publish teacher evaluation'
                              setError(msg)
                              toast.error(msg)
                            } finally {
                              setSubmitting(false)
                            }
                          }}
                          disabled={submitting}
                        >
                          Confirm Publish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        className="w-full md:w-full bg-blue-600 hover:bg-blue-700 text-white"
                        variant="default"
                        disabled={!dispatchDept || submitting}
                      >
                        Publish HOD Evaluation
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Publish HOD Evaluation Access?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will enable <strong>Assistant Dean and Dean to evaluate HODs</strong> for the selected department and term. Note: HODs already have access to review teachers once teacher evaluations are published above.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            if (!dispatchDept) return
                            setSubmitting(true)
                            setError(null)
                            setSuccess(null)
                            try {
                              const res = await fetch(`/api/departments/${dispatchDept}/term-state`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ activeTerm: dispatchTerm, hodVisibility: 'PUBLISHED' })
                              })
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}))
                                throw new Error(data.error || 'Failed to publish HOD evaluation')
                              }
                              setSuccess(`${dispatchTerm} term HOD evaluation published for selected department`)
                              toast.success(`${dispatchTerm} term HOD evaluation published`)
                              await fetchDepartmentStates()
                            } catch (e) {
                              const msg = e instanceof Error ? e.message : 'Failed to publish HOD evaluation'
                              setError(msg)
                              toast.error(msg)
                            } finally {
                              setSubmitting(false)
                            }
                          }}
                          disabled={submitting}
                        >
                          Confirm Publish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-900 mb-1">Publishing Preview:</div>
                <div className="text-sm text-blue-700">
                  {dispatchDept && dispatchTerm ? (
                    <>Department: <span className="font-medium">{departments.find(d => d.id === dispatchDept)?.name}</span> | Term: <span className="font-medium">{dispatchTerm}</span></>
                  ) : (
                    "Select department and term to see preview"
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>HOD Review Access:</strong> Enables HODs to review and score teachers (teachers already have access once HOD creates questions). <strong>HOD Evaluation:</strong> Enables Assistant Dean/Dean to evaluate HODs.
              </p>
            </CardContent>
          </Card>

          {/* Department Publishing Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Department Publishing Status</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDepartmentStates()}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {departments.map((dept) => {
                  const state = departmentStates[dept.id]
                  const startPublished = state?.startTermVisibility === 'PUBLISHED' || state?.visibility === 'PUBLISHED'
                  const endPublished = state?.endTermVisibility === 'PUBLISHED' || state?.visibility === 'PUBLISHED'
                  
                  return (
                    <div key={dept.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{dept.name}</h3>
                        <Badge variant="outline">
                          Active: {state?.activeTerm || 'Not Set'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>START Term:</span>
                          <Badge 
                            className={startPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                          >
                            {startPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>END Term:</span>
                          <Badge 
                            className={endPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                          >
                            {endPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>HOD Evaluation:</span>
                          <Badge 
                            className={state?.hodVisibility === 'PUBLISHED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
                          >
                            {state?.hodVisibility === 'PUBLISHED' ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {departments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No departments found. Create departments first.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Header with Add Button */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Term Management</h1>
              <p className="text-muted-foreground">Manage evaluation terms and their status</p>
            </div>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Term
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingTerm ? 'Edit Term' : 'Add New Term'}</DialogTitle>
                  <DialogDescription>
                    {editingTerm ? 'Update term information' : 'Create a new evaluation term'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">Term Name</label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Fall 2024"
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="year" className="text-sm font-medium">Year</label>
                    <Select 
                      value={formData.year} 
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() + i
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="termType" className="text-sm font-medium">Term Type</label>
                    <Select 
                      value={formData.termType} 
                      onValueChange={(value: 'START' | 'END') => setFormData({ ...formData, termType: value })}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="START">START - Beginning of Year</SelectItem>
                        <SelectItem value="END">END - End of Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="startDate" className="text-sm font-medium">Start Date</label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="endDate" className="text-sm font-medium">End Date</label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Assign to Departments</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {departments.map(dept => (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`dept-${dept.id}`}
                            checked={formData.selectedDepartments.includes(dept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, selectedDepartments: [...formData.selectedDepartments, dept.id] })
                              } else {
                                setFormData({ ...formData, selectedDepartments: formData.selectedDepartments.filter(id => id !== dept.id) })
                              }
                            }}
                            disabled={submitting}
                            className="rounded"
                          />
                          <label htmlFor={`dept-${dept.id}`} className="text-sm">
                            {dept.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={editingTerm ? handleEditTerm : handleAddTerm} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {editingTerm ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingTerm ? 'Update Term' : 'Add Term'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Terms Table */}
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Terms</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading terms...</span>
                </div>
              ) : terms.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Term</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Departments</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terms.map((term) => (
                      <TableRow key={term.id}>
                        <TableCell className="font-medium">{term.name}</TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-nowrap">
                            {new Date(term.startDate).toLocaleDateString()} 
                            <span className="text-muted-foreground mx-1">–</span>
                            {new Date(term.endDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(term.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {term.departments.length} departments
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {term.status === 'START' && (
                              <>
                                {term.departments.some(dept => dept.termState?.activeTerm === 'START') ? (
                                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startTerm(term.id)}
                                    disabled={submitting}
                                  >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                                    Activate
                                  </Button>
                                )}
                              </>
                            )}
                            {term.status === 'END' && (
                              <>
                                {term.departments.some(dept => dept.termState?.activeTerm === 'END') ? (
                                  <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => endTerm(term.id)}
                                    disabled={submitting}
                                  >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                                    Activate
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(term)}
                              disabled={submitting}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingTerm(term)}
                                  disabled={submitting}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Term</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {term.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteTerm} disabled={submitting}>
                                    {submitting ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Deleting...
                                      </>
                                    ) : (
                                      'Delete'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No terms found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create your first evaluation term to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}