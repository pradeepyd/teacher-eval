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
import { Calendar, Play, Plus, Edit2, Trash2, Loader2, Info } from 'lucide-react'

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
    termStates: {
      activeTerm: string
      startTermVisibility?: string
      endTermVisibility?: string
    }[]
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
  const [activatedTerms, setActivatedTerms] = useState<Set<string>>(new Set())
  const [completedTerms, setCompletedTerms] = useState<Set<string>>(new Set())

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
      
      // Initialize activated and completed terms based on existing data
      const activated = new Set<string>()
      const completed = new Set<string>()
      data.terms?.forEach((term: Term) => {

        
        // Check if term is activated
        const isActivated = term.departments.some(dept => 
          dept.termStates.some(ts => ts.activeTerm === term.status)
        )
        
        // Check if term is completed
        const isCompleted = term.departments.some(dept => 
          dept.termStates.some(ts => 
            (term.status === 'START' && ts.startTermVisibility === 'COMPLETE') ||
            (term.status === 'END' && ts.endTermVisibility === 'COMPLETE')
          )
        )
        
        if (isActivated) {

          activated.add(term.id)
        }
        
        if (isCompleted) {

          completed.add(term.id)
        }
      })
      
      setActivatedTerms(activated)
      setCompletedTerms(completed)
    } catch (error) {

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
    } catch (error) {

      setError('Failed to load departments')
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

    // Check if any selected departments already have terms of the same type for the same year
    const conflictingDepartments = formData.selectedDepartments.filter(deptId => {
      const existingTerm = terms.find(term => 
        term.year === parseInt(formData.year) && 
        term.status === formData.termType &&
        term.departments.some(d => d.id === deptId)
      )
      return existingTerm !== undefined
    })

    if (conflictingDepartments.length > 0) {
      const deptNames = departments
        .filter(d => conflictingDepartments.includes(d.id))
        .map(d => d.name)
        .join(', ')
      setError(`Cannot create ${formData.termType} term for ${deptNames} in ${formData.year}. A term of this type already exists for these departments.`)
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
        const errorMessage = errorData.error || 'Failed to create term'
        
        // Show more helpful error messages for common validation issues
        if (errorMessage.includes('already exists')) {
          throw new Error(errorMessage)
        } else if (errorMessage.includes('Missing required fields')) {
          throw new Error('Please fill in all required fields')
        } else {
          throw new Error(errorMessage)
        }
      }

      setSuccess('Term created successfully!')
      await fetchTerms()
      setShowAddModal(false)
      resetForm()
    } catch (error) {

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
      setActivatedTerms(prev => {
        const newSet = new Set([...prev, termId])
        return newSet
      })
      await fetchTerms()
    } catch (error) {

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
      setActivatedTerms(prev => {
        const newSet = new Set([...prev, termId])
        return newSet
      })
      await fetchTerms()
    } catch (error) {

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
          {/* Term Status Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Simple Workflow</h3>
                  <p className="text-xs text-blue-700">
                    <strong>1.</strong> Create START and END terms for the year. 
                    <strong>2.</strong> Activate a term (START or END). 
                    <strong>3.</strong> HOD publishes questions → Teachers submit answers → HOD evaluates automatically. 
                    <strong>4.</strong> Assistant Dean and Dean complete the evaluation cycle.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Year Term Status */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="py-4">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="h-5 w-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-900">Current Year ({new Date().getFullYear()}) Term Status</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map(dept => {
                  const startTerm = terms.find(term => 
                    term.year === new Date().getFullYear() && 
                    term.status === 'START' &&
                    term.departments.some(d => d.id === dept.id)
                  )
                  const endTerm = terms.find(term => 
                    term.year === new Date().getFullYear() && 
                    term.status === 'END' &&
                    term.departments.some(d => d.id === dept.id)
                  )
                  
                  return (
                    <div key={dept.id} className="text-xs space-y-1">
                      <div className="font-medium text-gray-700">{dept.name}</div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          startTerm ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          START: {startTerm ? '✓ Created' : '✗ Missing'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          endTerm ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          END: {endTerm ? '✓ Created' : '✗ Missing'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Header with Add Button */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Term Management</h1>
              <p className="text-muted-foreground">Create and manage evaluation terms</p>
            </div>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Term
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTerm ? 'Edit Term' : 'Add New Term'}</DialogTitle>
                  <DialogDescription>
                    {editingTerm ? 'Update term information' : 'Create a new evaluation term'}
                  </DialogDescription>
                  {!editingTerm && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                      <div className="flex items-start space-x-2">
                        <span className="text-amber-600">⚠️</span>
                        <div>
                          <strong>Important:</strong> You cannot create multiple terms of the same type (START/END) for the same department in the same year.
                          <br />
                          <span className="text-amber-700">Complete the existing term first before creating a new one.</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                      {departments.map(dept => {
                        // Check if this department already has a term of the selected type for the selected year
                        const existingTerm = terms.find(term => 
                          term.year === parseInt(formData.year) && 
                          term.status === formData.termType &&
                          term.departments.some(d => d.id === dept.id)
                        )
                        
                        const isDisabled = existingTerm !== undefined
                        
                        return (
                          <div key={dept.id} className="space-y-1">
                            <div className="flex items-center space-x-2">
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
                                disabled={submitting || isDisabled}
                                className="rounded"
                              />
                              <label htmlFor={`dept-${dept.id}`} className={`text-sm ${isDisabled ? 'text-gray-400' : ''}`}>
                                {dept.name}
                              </label>
                            </div>
                                                        {existingTerm && (
                              <div className="ml-6 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                <div className="flex items-center space-x-1">
                                  <span>⚠️</span>
                                  <span className="font-medium">{formData.termType} term exists for {formData.year}</span>
                                </div>
                                <span className="text-amber-700">Complete existing term first</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Validation Message */}
                  {(() => {
                    const disabledDepartments = departments.filter(dept => {
                      const existingTerm = terms.find(term => 
                        term.year === parseInt(formData.year) && 
                        term.status === formData.termType &&
                        term.departments.some(d => d.id === dept.id)
                      )
                      return existingTerm !== undefined
                    })
                    
                    if (disabledDepartments.length > 0) {
                      return (
                        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                          <div className="flex items-start space-x-2">
                            <span className="text-amber-600">ℹ️</span>
                            <div>
                              <strong>Departments with existing {formData.termType} terms for {formData.year}:</strong>
                              <br />
                              <span className="text-amber-700 font-medium">{disabledDepartments.map(d => d.name).join(', ')}</span>
                              <br />
                              <span className="text-amber-600">These departments cannot be selected until the existing term is completed.</span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
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
                                {completedTerms.has(term.id) ? (
                                  <Badge className="bg-purple-100 text-purple-800">Complete</Badge>
                                ) : activatedTerms.has(term.id) ? (
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
                                {completedTerms.has(term.id) ? (
                                  <Badge className="bg-purple-100 text-purple-800">Complete</Badge>
                                ) : activatedTerms.has(term.id) ? (
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
                               disabled={submitting || completedTerms.has(term.id)}
                               className={completedTerms.has(term.id) ? "opacity-50 cursor-not-allowed" : ""}
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