'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { PageErrorBoundary, DataErrorBoundary } from '@/components/ErrorBoundary'
import { safeDepartment, safeUser, safeArray, safeString } from '@/lib/safe-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
// Removed unused table imports - using card layout instead
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Calendar, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useAdminData } from '@/hooks/useAdminData'

interface Department {
  id: string
  name: string
  termStates?: {
    activeTerm: 'START' | 'END'
  }[]
  _count: {
    users: number
  }
  createdAt: string
  updatedAt: string
  hod?: {
    id: string
    name: string
  }
}

function DepartmentsPageContent() {
  const { data: session } = useSession()
  const hookData = useAdminData()
  
  // All useState hooks must be declared before any conditional returns
  const [submitting, setSubmitting] = useState(false)
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedHod, setSelectedHod] = useState('')
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  
  // Safe data access with comprehensive error handling
  const safeHookData = hookData || {}
  const { 
    departments = [], 
    users = [], 
    refetch, 
    loading = false, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment, 
    assignHod, 
    assignTeachers 
  } = safeHookData
  
  // Apply safe transformations to all data
  const safeUsers = safeArray(users).map(user => safeUser(user))
  const safeDepartments = safeArray(departments).map(dept => safeDepartment(dept))
  
  // Comprehensive loading and safety checks
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Create department with comprehensive error handling
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    const departmentName = safeString(newDepartmentName).trim()
    if (!departmentName) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      if (!createDepartment) {
        throw new Error('Department creation is not available at the moment')
      }
      
      await createDepartment({ name: departmentName })
      setSuccess('Department created successfully!')
      setNewDepartmentName('')
      setShowAddModal(false)
      if (refetch) refetch()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create department'
      setError(errorMessage)
      console.error('Error creating department:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Update department
  const handleUpdateDepartment = async () => {
    if (!editingId || !editingName.trim()) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await updateDepartment(editingId, { name: editingName.trim() })
      setSuccess('Department updated successfully!')
      setEditingId(null)
      setEditingName('')
      refetch() // Refresh data from cache
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update department')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete department
  const handleDeleteDepartment = async () => {
    if (!deletingId) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await deleteDepartment(deletingId)
      setSuccess('Department deleted successfully!')
      setDeletingId(null)
      refetch() // Refresh data from cache
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete department')
    } finally {
      setSubmitting(false)
    }
  }

  // Assign HOD to department
  const handleAssignHod = async () => {
    if (!selectedHod) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await assignHod(selectedHod, selectedHod)
      setSuccess('HOD assigned successfully!')
      setSelectedHod('')
      refetch() // Refresh data from cache
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to assign HOD')
    } finally {
      setSubmitting(false)
    }
  }

  // Assign teachers to department
  const handleAssignTeachers = async () => {
    if (selectedTeachers.length === 0) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await assignTeachers(selectedTeachers[0], selectedTeachers)
      setSuccess('Teachers assigned successfully!')
      setSelectedTeachers([])
      refetch() // Refresh data from cache
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to assign teachers')
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit modal
  const openEditModal = (dept: any) => {
    setEditingId(safeString(dept.id))
    setEditingName(safeString(dept.name))
  }

  // Get teachers in a department
  const getTeachersInDepartment = (deptId: string) => {
    return safeUsers.filter(user => user.department?.id === deptId && user.role === 'TEACHER')
  }

  // Get HOD of a department - used to display additional HOD information
const getHodOfDepartment = (deptId: string) => {
  return safeUsers.find(user => user.department?.id === deptId && user.role === 'HOD')
}

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <DashboardLayout title="Department Management">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-blue-100">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {session.user.name}!
                  </h2>
                  <p className="text-gray-600">
                    Department Management Dashboard
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
          {/* Header with Add Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Departments ({safeDepartments.length})</h3>
              <p className="text-sm text-muted-foreground">
                Manage academic departments and their staff
              </p>
            </div>
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button onClick={() => setNewDepartmentName('')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Department</DialogTitle>
                  <DialogDescription>
                    Create a new academic department
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDepartment}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="name" className="text-sm font-medium">Department Name</label>
                      <Input
                        id="name"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        placeholder="Enter department name"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || !newDepartmentName.trim()}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Department'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeDepartments.map((dept) => (
              <Card key={dept.id} className="hover:shadow-lg transition-all duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                                          <Badge variant={dept.termStates?.[0]?.activeTerm === 'START' ? 'default' : 'secondary'}>
                        {dept.termStates?.[0]?.activeTerm || 'INACTIVE'}
                      </Badge>
                  </div>
                  <CardDescription>
                    Created {new Date(dept.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Users:</span>
                    <span className="font-medium">{dept._count?.users || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">HOD:</span>
                    <span className="font-medium">
                      {(() => {
                        const hodUser = getHodOfDepartment(dept.id)
                        if (hodUser) {
                          return `${hodUser.name} (${hodUser.email})`
                        }
                        return dept.hod?.name || 'Not assigned'
                      })()}
                    </span>
                  </div>
                  
                  {/* Additional HOD info if available */}
                  {(() => {
                    const hodUser = getHodOfDepartment(dept.id)
                    if (hodUser) {
                      return (
                        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                          <div>HOD Email: {hodUser.email}</div>
                          <div>Role: {hodUser.role}</div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Teachers:</span>
                    <span className="font-medium">
                      {getTeachersInDepartment(dept.id).length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(dept)}
                      disabled={submitting}
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(dept.id)}
                          disabled={submitting}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Department</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {dept.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteDepartment} disabled={submitting}>
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Department Modal */}
          {editingId && (
            <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Department</DialogTitle>
                  <DialogDescription>
                    Update department information
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="editName" className="text-sm font-medium">Department Name</label>
                    <Input
                      id="editName"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Enter department name"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingId(null)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateDepartment} disabled={submitting || !editingName.trim()}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Department'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* HOD Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assign HOD to Department
              </CardTitle>
              <CardDescription>
                Assign a Head of Department to manage a department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Select HOD</label>
                  <Select value={selectedHod} onValueChange={setSelectedHod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a HOD" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeUsers.filter(user => user.role === 'HOD').map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignHod} disabled={!selectedHod || submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Assigning...
                    </>
                  ) : (
                    'Assign HOD'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Assign Teachers to Department
              </CardTitle>
              <CardDescription>
                Assign teachers to specific departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Teachers</label>
                  <Select value="" onValueChange={(value) => {
                    if (!selectedTeachers.includes(value)) {
                      setSelectedTeachers([...selectedTeachers, value])
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose teachers to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeUsers.filter(user => user.role === 'TEACHER' && !user.department).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTeachers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selected Teachers:</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeachers.map((teacherId) => {
                        const teacher = safeUsers.find(u => u.id === teacherId)
                        return teacher ? (
                          <Badge key={teacherId} variant="secondary" className="flex items-center gap-1">
                            {teacher.name}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1"
                              onClick={() => setSelectedTeachers(selectedTeachers.filter(id => id !== teacherId))}
                            >
                              ×
                            </Button>
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                <Button onClick={handleAssignTeachers} disabled={selectedTeachers.length === 0 || submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Teachers'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}

export default function DepartmentsPage() {
  return (
    <PageErrorBoundary pageName="Departments">
      <DataErrorBoundary dataType="department data">
        <DepartmentsPageContent />
      </DataErrorBoundary>
    </PageErrorBoundary>
  )
}