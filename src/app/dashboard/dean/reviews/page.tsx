'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface Teacher {
  id: string
  name: string
  email: string
  department: {
    name: string
  }
  receivedHodReviews: Array<{
    term: 'START' | 'END'
    submitted: boolean
    comments: string
  }>
  receivedAsstReviews: Array<{
    term: 'START' | 'END'
    submitted: boolean
    comments: string
  }>
  receivedFinalReviews: Array<{
    term: 'START' | 'END'
    submitted: boolean
    status: 'PROMOTED' | 'ON_HOLD' | 'NEEDS_IMPROVEMENT'
    finalScore: number
  }>
}

export default function DeanReviewsPage() {
  const { data: session } = useSession()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTerm, setSelectedTerm] = useState<'START' | 'END' | 'ALL'>('ALL')

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const termParam = selectedTerm !== 'ALL' ? `?term=${selectedTerm}` : ''
        const response = await fetch(`/api/reviews/dean${termParam}`)
        
        if (response.ok) {
          const data = await response.json()
          setTeachers(data)
        } else {
          setError('Failed to fetch teachers for final review')
        }
      } catch (error) {
        setError('Error fetching teachers')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchTeachers()
    }
  }, [session, selectedTerm])

  const getReviewStatus = (teacher: Teacher, term: 'START' | 'END') => {
    const hodReview = teacher.receivedHodReviews.find(review => review.term === term)
    const asstReview = teacher.receivedAsstReviews.find(review => review.term === term)
    const finalReview = teacher.receivedFinalReviews.find(review => review.term === term)
    
    if (!hodReview || !hodReview.submitted) {
      return { status: 'HOD_PENDING', text: 'HOD Review Pending', color: 'gray' }
    }
    
    if (!asstReview || !asstReview.submitted) {
      return { status: 'ASST_PENDING', text: 'Asst Dean Review Pending', color: 'gray' }
    }
    
    if (!finalReview) {
      return { status: 'PENDING', text: 'Pending Final Review', color: 'yellow' }
    }
    
    if (finalReview.submitted) {
      return { 
        status: 'COMPLETED', 
        text: finalReview.status, 
        color: finalReview.status === 'PROMOTED' ? 'green' : 
               finalReview.status === 'ON_HOLD' ? 'yellow' : 'red'
      }
    }
    
    return { status: 'DRAFT', text: 'Draft Saved', color: 'blue' }
  }

  const filteredTeachers = teachers.filter(teacher => {
    if (selectedTerm === 'ALL') return true
    
    const hodReview = teacher.receivedHodReviews.find(review => review.term === selectedTerm)
    const asstReview = teacher.receivedAsstReviews.find(review => review.term === selectedTerm)
    
    return hodReview && hodReview.submitted && asstReview && asstReview.submitted
  })

  if (loading) {
    return (
      <RoleGuard allowedRoles={['DEAN']}>
        <DashboardLayout title="Final Reviews">
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['DEAN']}>
      <DashboardLayout title="Dean Final Reviews">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="ALL">All Terms</option>
                <option value="START">Start of Year</option>
                <option value="END">End of Year</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-600">
              {filteredTeachers.length} teacher(s) for final review
            </div>
          </div>

          {/* Teachers List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Teachers Ready for Final Decision
              </h3>

              {filteredTeachers.length > 0 ? (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Teacher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Department
                        </th>
                        {selectedTerm === 'ALL' ? (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              START Term
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              END Term
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Final Score
                            </th>
                          </>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTeachers.map((teacher) => (
                        <tr key={teacher.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {teacher.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {teacher.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {teacher.department.name}
                            </div>
                          </td>
                          
                          {selectedTerm === 'ALL' ? (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  const status = getReviewStatus(teacher, 'START')
                                  return (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      status.color === 'green' ? 'bg-green-100 text-green-800' :
                                      status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                      status.color === 'red' ? 'bg-red-100 text-red-800' :
                                      status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {status.text}
                                    </span>
                                  )
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  const status = getReviewStatus(teacher, 'END')
                                  return (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      status.color === 'green' ? 'bg-green-100 text-green-800' :
                                      status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                      status.color === 'red' ? 'bg-red-100 text-red-800' :
                                      status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {status.text}
                                    </span>
                                  )
                                })()}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(() => {
                                  const status = getReviewStatus(teacher, selectedTerm)
                                  return (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      status.color === 'green' ? 'bg-green-100 text-green-800' :
                                      status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                      status.color === 'red' ? 'bg-red-100 text-red-800' :
                                      status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {status.text}
                                    </span>
                                  )
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {(() => {
                                    const finalReview = teacher.receivedFinalReviews.find(review => review.term === selectedTerm)
                                    return finalReview ? finalReview.finalScore : '-'
                                  })()}
                                </div>
                              </td>
                            </>
                          )}
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              {selectedTerm !== 'ALL' ? (
                                <>
                                  {getReviewStatus(teacher, selectedTerm).status !== 'HOD_PENDING' && 
                                   getReviewStatus(teacher, selectedTerm).status !== 'ASST_PENDING' && (
                                    <Link
                                      href={`/dashboard/dean/reviews/${teacher.id}/${selectedTerm}`}
                                      className="text-red-600 hover:text-red-500 font-medium"
                                    >
                                      {getReviewStatus(teacher, selectedTerm).status === 'PENDING' ? 'Finalize' : 'View'}
                                    </Link>
                                  )}
                                </>
                              ) : (
                                <>
                                  {getReviewStatus(teacher, 'START').status !== 'HOD_PENDING' && 
                                   getReviewStatus(teacher, 'START').status !== 'ASST_PENDING' && (
                                    <Link
                                      href={`/dashboard/dean/reviews/${teacher.id}/START`}
                                      className="text-blue-600 hover:text-blue-500 font-medium text-xs"
                                    >
                                      START
                                    </Link>
                                  )}
                                  {getReviewStatus(teacher, 'END').status !== 'HOD_PENDING' && 
                                   getReviewStatus(teacher, 'END').status !== 'ASST_PENDING' && (
                                    <Link
                                      href={`/dashboard/dean/reviews/${teacher.id}/END`}
                                      className="text-green-600 hover:text-green-500 font-medium text-xs"
                                    >
                                      END
                                    </Link>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🏛️</div>
                  <p className="text-gray-500 mb-2">No teachers ready for final review</p>
                  <p className="text-sm text-gray-400">
                    Teachers will appear here once their HOD and Assistant Dean reviews are completed
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⏳</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teachers.filter(t => {
                          const startStatus = getReviewStatus(t, 'START')
                          const endStatus = getReviewStatus(t, 'END')
                          return startStatus.status === 'PENDING' || endStatus.status === 'PENDING'
                        }).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Promoted
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teachers.filter(t => {
                          const startStatus = getReviewStatus(t, 'START')
                          const endStatus = getReviewStatus(t, 'END')
                          return startStatus.text === 'PROMOTED' || endStatus.text === 'PROMOTED'
                        }).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⏸️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        On Hold
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teachers.filter(t => {
                          const startStatus = getReviewStatus(t, 'START')
                          const endStatus = getReviewStatus(t, 'END')
                          return startStatus.text === 'ON_HOLD' || endStatus.text === 'ON_HOLD'
                        }).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Needs Improvement
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teachers.filter(t => {
                          const startStatus = getReviewStatus(t, 'START')
                          const endStatus = getReviewStatus(t, 'END')
                          return startStatus.text === 'NEEDS_IMPROVEMENT' || endStatus.text === 'NEEDS_IMPROVEMENT'
                        }).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">🏢</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Departments
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {new Set(teachers.map(t => t.department.name)).size}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}