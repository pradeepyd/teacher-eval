'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, UserCheck, GraduationCap, Shield, BookOpen, Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react'
import { useAdminData } from '@/hooks/useAdminData'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'DEAN' | 'ASST_DEAN' | 'HOD' | 'TEACHER'
  department?: {
    id: string
    name: string
  } | null
  departmentId?: string | null
  status?: 'active' | 'inactive'
  createdAt: string
  updatedAt?: string
}

const ITEMS_PER_PAGE = 10

export default function UsersPage() {
  const { data: session } = useSession()
  const hookData = useAdminData()
  
  // All useState hooks must be declared before any conditional returns
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '' as 'ADMIN' | 'DEAN' | 'ASST_DEAN' | 'HOD' | 'TEACHER' | '',
    departmentId: '',
    password: ''
  })
  
  // Password validation state
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    return errors
  }
  
  // Real-time password validation
  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })
    if (password.trim()) {
      const errors = validatePassword(password)
      setPasswordErrors(errors)
    } else {
      setPasswordErrors([])
    }
  }

  // Ensure hook data is properly initialized before destructuring
  if (!hookData || typeof hookData !== 'object') {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <DashboardLayout title="User Management">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }
  
  const { users, departments, refetch, loading, createUser, updateUser, deleteUser } = hookData
  
  // Safety check - ensure arrays exist before using them
  const safeUsers = users || []
  const safeDepartments = departments || []
  
  // Comprehensive loading and safety checks
  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <DashboardLayout title="User Management">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  // Show loading state while data is being fetched or if arrays are not properly initialized
  if (loading || !Array.isArray(safeUsers) || !Array.isArray(safeDepartments)) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <DashboardLayout title="User Management">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }
  
  // Add new user
  const handleAddUser = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      setError('Please fill in all required fields')
      return
    }

    // Validate password
    if (passwordErrors.length > 0) {
      setError('Please fix password validation errors before adding user')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role as 'ADMIN' | 'DEAN' | 'ASST_DEAN' | 'HOD' | 'TEACHER',
        departmentId: formData.departmentId || undefined,
        password: formData.password.trim(),
      })

      // Handle successful response
      if (response && typeof response === 'object' && 'id' in response) {
        setSuccess('User added successfully!')
        refetch()
        setShowAddModal(false)
        resetForm()
      } else {
        throw new Error('Invalid response from server')
      }

      setSuccess('User added successfully!')
      refetch() // Refresh data from cache
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add user')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit user
  const handleEditUser = async () => {
    if (!editingUser) return

    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      setError('Please fill in all required fields')
      return
    }

    // Validate password if provided
    if (formData.password.trim()) {
      if (passwordErrors.length > 0) {
        setError('Please fix password validation errors before updating')
        return
      }
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await updateUser(editingUser.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role as 'ADMIN' | 'DEAN' | 'ASST_DEAN' | 'HOD' | 'TEACHER',
        departmentId: formData.departmentId || undefined
      })

      // Handle successful response
      if (response && typeof response === 'object' && 'id' in response) {
        setSuccess('User updated successfully!')
        refetch()
        setShowAddModal(false)
        resetForm()
      } else {
        throw new Error('Invalid response from server')
      }

      setSuccess('User updated successfully!')
      refetch() // Refresh data from cache
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete user
  const handleDeleteUser = async () => {
    if (!deletingUser) return

    setSubmitting(true)
    setError(null)

    try {
      await deleteUser(deletingUser.id)

      setSuccess('User deleted successfully!')
      refetch() // Refresh data from cache
      setDeletingUser(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setSubmitting(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: '',
      departmentId: '',
      password: ''
    })
    setEditingUser(null)
    setPasswordErrors([])
  }

  // Open edit modal
  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.department?.id || '',
      password: ''
    })
    setPasswordErrors([])
    setShowAddModal(true)
  }

  // Filter and paginate users
  const filteredUsers = safeUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'DEAN':
        return 'default'
      case 'ASST_DEAN':
        return 'secondary'
      case 'HOD':
        return 'outline'
      case 'TEACHER':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4" />
      case 'DEAN':
        return <GraduationCap className="h-4 w-4" />
      case 'ASST_DEAN':
        return <UserCheck className="h-4 w-4" />
      case 'HOD':
        return <BookOpen className="h-4 w-4" />
      case 'TEACHER':
        return <Users className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <DashboardLayout title="User Management">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-orange-50 to-red-100">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {session.user.name}!
                  </h2>
                  <p className="text-gray-600">
                    User Management Dashboard
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
          {/* Header with Search and Add Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex-1 max-w-md">
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
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? 'Update user information' : 'Create a new user account'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder={editingUser ? "Enter new password or leave blank" : "Enter password"}
                      disabled={submitting}
                      className={passwordErrors.length > 0 ? "border-red-500" : ""}
                    />
                    {passwordErrors.length > 0 && (
                      <div className="text-xs text-red-600 space-y-1">
                        <p className="font-medium">Password validation errors:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {passwordErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!editingUser && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-medium">Password must contain:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>At least 8 characters</li>
                          <li>One number (0-9)</li>
                        </ul>
                      </div>
                    )}
                    {editingUser && (
                      <p className="text-xs text-gray-500">
                        Only fill this field if you want to change the user's password
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="role" className="text-sm font-medium">Role</label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => setFormData({ ...formData, role: value as 'ADMIN' | 'DEAN' | 'ASST_DEAN' | 'HOD' | 'TEACHER' })}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="HOD">Head of Department</SelectItem>
                        <SelectItem value="ASST_DEAN">Assistant Dean</SelectItem>
                        <SelectItem value="DEAN">Dean</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="department" className="text-sm font-medium">Department</label>
                    <Select 
                      value={formData.departmentId} 
                      onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeDepartments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={editingUser ? handleEditUser : handleAddUser} 
                    disabled={submitting || passwordErrors.length > 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {editingUser ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingUser ? 'Update User' : 'Add User'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Manage system users with pagination and search
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paginatedUsers.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                              {getRoleIcon(user.role)}
                              {user.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.department?.name || 'No Department'}</TableCell>
                          <TableCell>
                            <Badge variant="default">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(user)}
                                disabled={submitting}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeletingUser(user)}
                                    disabled={submitting}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {user.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteUser} disabled={submitting}>
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
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
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No users found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Users will appear here once they register in the system.'}
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
