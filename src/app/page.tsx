import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-4xl sm:text-6xl font-bold text-gray-900">
              MCQ Teacher Evaluation
              <span className="block text-blue-600">System</span>
            </CardTitle>
            <CardDescription className="text-xl text-gray-600 max-w-2xl mx-auto">
              A comprehensive, role-based teacher evaluation platform with structured MCQ assessments, 
              multi-level reviews, and detailed performance tracking.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <div className="text-blue-600 text-3xl mb-3">👩‍🏫</div>
                  <CardTitle className="text-lg">Teachers</CardTitle>
                  <CardDescription>Submit self-evaluations and track progress</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <div className="text-green-600 text-3xl mb-3">👨‍💼</div>
                  <CardTitle className="text-lg">HODs</CardTitle>
                  <CardDescription>Create questions and review teachers</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <div className="text-yellow-600 text-3xl mb-3">👨‍🎓</div>
                  <CardTitle className="text-lg">Assistant Deans</CardTitle>
                  <CardDescription>Secondary review and scoring</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader>
                  <div className="text-purple-600 text-3xl mb-3">🏛️</div>
                  <CardTitle className="text-lg">Deans</CardTitle>
                  <CardDescription>Final decisions and promotions</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Button asChild size="lg">
                <Link href="/login">
                  Sign In to Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/admin">
                  Admin Portal
                </Link>
              </Button>
            </div>

            <div className="pt-8 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">🔒 Secure</Badge>
                  <span className="text-gray-600">Role-based access control with NextAuth.js authentication</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">📊 Comprehensive</Badge>
                  <span className="text-gray-600">Multi-level evaluation system with detailed reporting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">⚡ Modern</Badge>
                  <span className="text-gray-600">Built with Next.js, Prisma, and Supabase for performance</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
