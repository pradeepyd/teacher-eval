'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Users, Calendar, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

interface Department {
  id: string
  name: string
  termState?: {
    activeTerm: 'START' | 'END'
  } | null
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

interface User {
  id: string
  name: string
  email: string
  role: string
  departmentId?: string
}

export default function DepartmentsPage() {
  const { data: session } = useSession()
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
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

  // Fetch departments
  const fetchDepartments = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/departments')
      if (!response.ok) {
        throw new Error('Failed to fetch departments')
      }
      const data = await response.json()
      setDepartments(data.departments || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    }
  }

  // Create department
  const createDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDepartmentName.trim()) {
      setError('Department name is required')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: newDepartmentName.trim(),
          hodId: selectedHod || null,
          teacherIds: selectedTeachers
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create department')
      }

      setSuccess('Department created successfully!')
      setNewDepartmentName('')
      setSelectedHod('')
      setSelectedTeachers([])
      setShowAddModal(false)
      await fetchDepartments()
    } catch (error) {
      console.error('Error creating department:', error)
      setError(error instanceof Error ? error.message : 'Failed to create department')
    } finally {
      setSubmitting(false)
    }
  }

  // Update department
  const updateDepartment = async (id: string, name: string) => {
    if (!name.trim()) {
      setError('Department name is required')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Collect current selections for reassignment
      const hodId = selectedHod || undefined
      const teacherIds = selectedTeachers

      const response = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim(), hodId, teacherIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update department')
      }

      setSuccess('Department updated successfully!')
      setEditingId(null)
      setEditingName('')
      setSelectedHod('')
      setSelectedTeachers([])
      await fetchDepartments()
    } catch (error) {
      console.error('Error updating department:', error)
      setError(error instanceof Error ? error.message : 'Failed to update department')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete department
  const deleteDepartment = async (id: string) => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete department')
      }

      setSuccess('Department deleted successfully!')
      setDeletingId(null)
      await fetchDepartments()
    } catch (error) {
      console.error('Error deleting department:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete department')
    } finally {
      setSubmitting(false)
    }
  }

  // Start edit mode
  const startEdit = (department: Department) => {
    setEditingId(department.id)
    setEditingName(department.name)
  }

  // Cancel edit mode
  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  // Load data on component mount
  useEffect(() => {
    if (session?.user) {
      fetchDepartments()
      fetchUsers()
    }
  }, [session])

  // Filter users for HOD and teachers
  // Allow selecting either existing HODs or Teachers to promote to HOD
  const hodOptions = users.filter(u => u.role === 'HOD' || u.role === 'TEACHER')
  const teacherOptions = users.filter(u => u.role === 'TEACHER' && !u.departmentId)

  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <DashboardLayout title="Department Management">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <DashboardLayout title="Department Management">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-orange-50 to-red-100">
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

        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
                <Building2 className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{departments.length}</div>
                <CardDescription>Active departments</CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {departments.reduce((sum, dept) => sum + dept._count.users, 0)}
                </div>
                <CardDescription>Across all departments</CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Terms</CardTitle>
                <Calendar className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {departments.filter(dept => dept.termState?.activeTerm).length}
                </div>
                <CardDescription>Terms configured</CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Add Department Modal Trigger */}
          <div className="flex justify-end mb-4">
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Department</DialogTitle>
                </DialogHeader>
                <form onSubmit={createDepartment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Department Name</label>
                    <Input
                      type="text"
                      value={newDepartmentName}
                      onChange={e => setNewDepartmentName(e.target.value)}
                      placeholder="Enter department name"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Assign HOD</label>
                    <Select value={selectedHod} onValueChange={setSelectedHod} disabled={submitting}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select HOD" />
                      </SelectTrigger>
                      <SelectContent>
                        {hodOptions.map(hod => (
                          <SelectItem key={hod.id} value={hod.id}>{hod.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Assign Teachers</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {teacherOptions.map(teacher => (
                        <div key={teacher.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`teacher-${teacher.id}`}
                            checked={selectedTeachers.includes(teacher.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeachers([...selectedTeachers, teacher.id])
                              } else {
                                setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id))
                              }
                            }}
                            disabled={submitting}
                            className="rounded"
                          />
                          <label htmlFor={`teacher-${teacher.id}`} className="text-sm">
                            {teacher.name}
                          </label>
                        </div>
                      ))}
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

          {/* Departments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Existing Departments
              </CardTitle>
              <CardDescription>
                Manage and edit your organization&apos;s departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading departments...</span>
                </div>
              ) : departments.length > 0 ? (
                <div className="divide-y">
                  {departments.map((department) => {
                    const hasHod = !!department.hod?.name
                    const teacherCount = department._count.users
                    const status: 'Active' | 'Pending' = hasHod && teacherCount > 0 ? 'Active' : 'Pending'
                    const initials = (department.hod?.name || 'NA')
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()

                    return (
                      <div key={department.id} className="py-4 hover:bg-muted/50 rounded-md px-2">
                        <div className="flex items-center justify-between">
                        {/* Department */}
                        <div className="flex items-center gap-3 min-w-[260px]">
                          <div className="size-10 rounded-lg bg-blue-100 text-blue-700 grid place-items-center">🏷️</div>
                          <div>
                            <div className="font-medium">{department.name}</div>
                            <div className="text-xs text-muted-foreground">{department.name} Department</div>
                          </div>
                        </div>

                        {/* HOD */}
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <div className="size-9 rounded-full bg-gray-100 text-gray-700 grid place-items-center text-sm">
                            {hasHod ? initials : '—'}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{department.hod?.name || 'No HOD Assigned'}</div>
                            {hasHod && (
                              <Badge className="px-2 py-0 h-5 text-xs" variant="secondary">HOD</Badge>
                            )}
                          </div>
                        </div>

                        {/* Teachers */}
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <Badge variant="outline" className="text-sm px-3 py-1">{teacherCount} Teachers</Badge>
                          <Link href={`/admin/users?departmentId=${department.id}&role=TEACHER`} className="text-blue-600 text-sm hover:underline">View All</Link>
                        </div>

                        {/* Status */}
                          <div className="flex items-center gap-2 min-w-[180px] justify-end">
                          <Badge className={status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                              {status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(department)}
                              disabled={submitting}
                              className="h-8 w-8 p-0"
                              aria-label="Edit Department"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={submitting || deletingId === department.id}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  aria-label="Delete Department"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the department
                                    &quot;{department.name}&quot; and remove all associated data.
                                    {teacherCount > 0 && (
                                      <span className="block mt-2 text-destructive font-medium">
                                        Warning: This department has {teacherCount} users. 
                                        You must reassign or delete users first.
                                      </span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDepartment(department.id)}
                                    disabled={submitting}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {submitting ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Deleting...
                                      </>
                                    ) : (
                                      'Delete Department'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {editingId === department.id && (
                          <div className="mt-3 rounded-md border bg-white p-3">
                            <div className="grid gap-3 md:grid-cols-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">Department Name</label>
                                <Input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  disabled={submitting}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Reassign HOD</label>
                                <Select value={selectedHod} onValueChange={setSelectedHod} disabled={submitting}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select HOD" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {hodOptions.map(hod => (
                                      <SelectItem key={hod.id} value={hod.id}>{hod.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Assign Teachers</label>
                                <div className="max-h-32 overflow-y-auto border rounded p-2">
                                  {teacherOptions.map(teacher => (
                                    <div key={teacher.id} className="flex items-center space-x-2 py-0.5">
                                      <input
                                        type="checkbox"
                                        id={`reassign-${department.id}-${teacher.id}`}
                                        checked={selectedTeachers.includes(teacher.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedTeachers(prev => [...prev, teacher.id])
                                          } else {
                                            setSelectedTeachers(prev => prev.filter(id => id !== teacher.id))
                                          }
                                        }}
                                        disabled={submitting}
                                        className="rounded"
                                      />
                                      <label htmlFor={`reassign-${department.id}-${teacher.id}`} className="text-xs">
                                        {teacher.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={submitting}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateDepartment(department.id, editingName)}
                                disabled={!editingName.trim() || submitting}
                              >
                                {submitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                  </>
                                ) : 'Save Changes'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No departments found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create your first department to get started with the evaluation system.
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