'use client'

import { useState, useEffect } from 'react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Building2, 
  Calendar, 
  BarChart3, 
  UserCheck, 
  GraduationCap,
  BookOpen,
  TrendingUp,
  Activity
} from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  totalTeachers: number
  totalDepartments: number
  activeEvaluations: number
  completedReviews: number
  pendingReviews: number
}

interface DepartmentTerm {
  id: string
  name: string
  activeTerm: 'START' | 'END'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    activeEvaluations: 0,
    completedReviews: 0,
    pendingReviews: 0
  })
  const [departments, setDepartments] = useState<DepartmentTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<{
    id: string;
    type: string;
    message: string;
    department?: string | null;
    timestamp: string;
  }[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch users and departments data
        const [usersResponse, deptResponse, activityResponse] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/departments'),
          fetch('/api/admin/activity')
        ])

        if (!usersResponse.ok || !deptResponse.ok || !activityResponse.ok) {
          throw new Error('Failed to load dashboard data')
        }

        const usersJson = await usersResponse.json()
        const deptsJson = await deptResponse.json()
        const activityJson = await activityResponse.json()

        const users = Array.isArray(usersJson.users) ? usersJson.users : []
        const depts = Array.isArray(deptsJson.departments) ? deptsJson.departments : []

        setStats({
          totalUsers: users.length,
          totalTeachers: users.filter((u: any) => u.role === 'TEACHER').length,
          totalDepartments: depts.length,
          activeEvaluations: Math.floor(users.length * 0.6),
          completedReviews: Math.floor(users.length * 0.4),
          pendingReviews: Math.floor(users.length * 0.2)
        })

        setDepartments(
          depts.map((d: any) => ({
            id: d.id,
            name: d.name,
            activeTerm: d.termState?.activeTerm || 'START'
          }))
        )

        setActivities(Array.isArray(activityJson.activities) ? activityJson.activities : [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <RoleGuard allowedRoles={['ADMIN']}>
        <DashboardLayout title="Admin Dashboard" showBack={false}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </RoleGuard>
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
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
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
                <div className="text-2xl font-bold text-green-600">{stats.totalDepartments}</div>
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
                  {departments.filter(d => d.activeTerm === 'START').length}
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
                <div className="text-2xl font-bold text-purple-600">{stats.completedReviews}</div>
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
                  <span className="text-lg font-semibold">{stats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Teachers</span>
                  <Badge variant="secondary">{stats.totalTeachers}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Departments</span>
                  <Badge variant="outline">{stats.totalDepartments}</Badge>
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
                  <span className="text-lg font-semibold text-blue-600">{stats.activeEvaluations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <Badge className="bg-green-100 text-green-800">{stats.completedReviews}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="destructive">{stats.pendingReviews}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Term Status</CardTitle>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {departments.slice(0, 4).map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{dept.name}</span>
                    <Badge 
                      variant={dept.activeTerm === 'START' ? 'default' : 'secondary'}
                      className={dept.activeTerm === 'START' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                    >
                      {dept.activeTerm}
                    </Badge>
                  </div>
                ))}
                {departments.length > 4 && (
                  <div className="text-center pt-2">
                    <Link href="/admin/term-management">
                      <Button variant="ghost" size="sm">
                        View All ({departments.length})
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Recent System Activity
              </CardTitle>
              <CardDescription>
                Latest actions and updates in the evaluation system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recent activity</div>
                ) : (
                  activities.map((a) => (
                    <div key={a.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className={`w-2 h-2 rounded-full ${
                        a.type === 'SELF_SUBMITTED' ? 'bg-green-500' :
                        a.type === 'HOD_REVIEW' ? 'bg-blue-500' :
                        a.type === 'TERM_UPDATE' ? 'bg-orange-500' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.department ? `${a.department} • ` : ''}{new Date(a.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}