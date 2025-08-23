'use client'


import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { PageErrorBoundary, DataErrorBoundary } from '@/components/ErrorBoundary'
import { safeArray, safeNumber, safeDepartment, safeActivity } from '@/lib/safe-access'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Building2, 
  Calendar, 
  BarChart3, 
  BookOpen,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react'
import { useAdminData } from '@/hooks/useAdminData'



function AdminDashboardContent() {
  const { data: session, status } = useSession()
  const hookData = useAdminData()
  
  // Safe data access with comprehensive error handling
  const safeHookData = hookData || {}
  const { 
    stats = {
      totalUsers: 0,
      totalTeachers: 0,
      totalDepartments: 0,
      activeEvaluations: 0,
      completedReviews: 0,
      pendingReviews: 0
    }, 
    departments = [], 
    activities = [], 
    loading = false 
  } = safeHookData
  
  // Apply safe transformations to all data
  const safeDepartments = safeArray(departments).map(dept => safeDepartment(dept))
  const safeActivities = safeArray(activities).map(activity => safeActivity(activity))
  const safeStats = {
    totalUsers: safeNumber(stats.totalUsers),
    totalTeachers: safeNumber(stats.totalTeachers),
    totalDepartments: safeNumber(stats.totalDepartments),
    activeEvaluations: safeNumber(stats.activeEvaluations),
    completedReviews: safeNumber(stats.completedReviews),
    pendingReviews: safeNumber(stats.pendingReviews)
  }

  // Comprehensive loading and safety checks
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access the admin dashboard.</p>
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
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

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <DashboardLayout title="Admin Dashboard" showBack={false}>
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Management</CardTitle>
                <Users className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{safeStats.totalUsers}</div>
                <CardDescription>Total system users</CardDescription>
                <Link href="/admin/users">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    Manage Users
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <Building2 className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{safeStats.totalDepartments}</div>
                <CardDescription>Active departments</CardDescription>
                <Link href="/admin/departments">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    Manage Departments
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Term Management</CardTitle>
                <Calendar className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {safeDepartments.filter(d => 
                    d.termStates?.some(ts => ts.activeTerm === 'START')
                  ).length}
                </div>
                <CardDescription>Active terms</CardDescription>
                <Link href="/admin/term-management">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    Manage Terms
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Analytics</CardTitle>
                <BarChart3 className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{safeStats.completedReviews}</div>
                <CardDescription>Completed reviews</CardDescription>
                <Link href="/reports">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    View Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">System Overview</CardTitle>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <span className="text-lg font-semibold">{safeStats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Teachers</span>
                  <Badge variant="secondary">{safeStats.totalTeachers}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Departments</span>
                  <Badge variant="outline">{safeStats.totalDepartments}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Evaluation Progress</CardTitle>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Evaluations</span>
                  <span className="text-lg font-semibold text-blue-600">{safeStats.activeEvaluations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <Badge className="bg-green-100 text-green-800">{safeStats.completedReviews}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="destructive">{safeStats.pendingReviews}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Term Status</CardTitle>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {safeDepartments.slice(0, 4).map((dept) => {
                  const activeTerm = dept.termStates?.find(ts => ts.activeTerm === 'START')?.activeTerm
                  
                  return (
                    <div key={dept.id} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground truncate">{dept.name}</span>
                      <Badge 
                        variant={activeTerm ? 'default' : 'secondary'}
                        className={activeTerm ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                      >
                        {activeTerm || 'No Term'}
                      </Badge>
                    </div>
                  )
                })}
                {safeDepartments.length > 4 && (
                  <div className="text-center pt-2">
                    <Link href="/admin/term-management">
                      <Button variant="ghost" size="sm">
                        View All ({safeDepartments.length})
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>





          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activities
              </CardTitle>
              <CardDescription>
                Latest system activities and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {safeActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {activity.department && (
                          <Badge variant="outline" className="text-xs">
                            {activity.department}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}

export default function AdminDashboard() {
  return (
    <PageErrorBoundary pageName="Admin Dashboard">
      <DataErrorBoundary dataType="admin dashboard data">
        <AdminDashboardContent />
      </DataErrorBoundary>
    </PageErrorBoundary>
  )
}