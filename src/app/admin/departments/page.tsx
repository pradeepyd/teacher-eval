'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      setDepartments(data)
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
      const response = await fetch('/api/users')
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
      const response = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update department')
      }

      setSuccess('Department updated successfully!')
      setEditingId(null)
      setEditingName('')
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
  const hodOptions = users.filter(u => u.role === 'HOD' && !u.departmentId)
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department Name</TableHead>
                      <TableHead>HOD</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Active Term</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((department) => (
                      <TableRow key={department.id} className="hover:bg-muted/50">
                        <TableCell>
                          {editingId === department.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8"
                                autoFocus
                                disabled={submitting}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateDepartment(department.id, editingName)}
                                disabled={!editingName.trim() || submitting}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={submitting}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="font-medium">{department.name}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{department.hod?.name || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{department._count.users}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              department.termState?.activeTerm === 'START' 
                                ? 'default' 
                                : department.termState?.activeTerm === 'END'
                                ? 'secondary'
                                : 'outline'
                            }
                            className={
                              department.termState?.activeTerm === 'START'
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : department.termState?.activeTerm === 'END'
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                : ''
                            }
                          >
                            {department.termState?.activeTerm || 'Not Set'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(department.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === department.id ? (
                            <span className="text-sm text-muted-foreground">Editing...</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(department)}
                                disabled={submitting}
                                className="h-8 w-8 p-0"
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
                                      {department._count.users > 0 && (
                                        <span className="block mt-2 text-destructive font-medium">
                                          Warning: This department has {department._count.users} users. 
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
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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