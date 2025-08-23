/**
 * API performance optimization utilities
 * Fixes multiple database queries in loops and optimizes database operations
 * WITHOUT changing any existing logic, flow, or functionality
 */

import { prisma } from './prisma'

// Import types from Prisma
type TermType = 'START' | 'END'

/**
 * Batch fetches multiple records by IDs to avoid N+1 queries
 * This replaces multiple individual queries with a single batch query
 */
export async function batchFetchByIds<T extends { id: string }>(
  model: any,
  ids: string[],
  include?: any
): Promise<T[]> {
  if (!ids.length) return []
  
  const uniqueIds = [...new Set(ids)]
  
  const records = await model.findMany({
    where: { id: { in: uniqueIds } },
    include
  })
  
  // Maintain original order
  const recordMap = new Map(records.map((record: T) => [record.id, record]))
  return uniqueIds.map(id => recordMap.get(id)).filter(Boolean) as T[]
}

/**
 * Batch fetches records by a specific field to avoid N+1 queries
 */
export async function batchFetchByField<T>(
  model: any,
  field: string,
  values: any[],
  include?: any
): Promise<T[]> {
  if (!values.length) return []
  
  const uniqueValues = [...new Set(values)]
  
  const records = await model.findMany({
    where: { [field]: { in: uniqueValues } },
    include
  })
  
  return records
}

/**
 * Optimizes multiple count queries by combining them into a single query
 * This is especially useful for dashboard statistics
 */
export async function batchCountQueries(
  queries: Array<{ model: any; where: any; alias: string }>
): Promise<Record<string, number>> {
  if (!queries.length) return {}
  
  // For now, we'll use Promise.all to run queries in parallel
  // In the future, this could be optimized with raw SQL for complex cases
  const results = await Promise.all(
    queries.map(async ({ model, where, alias }) => {
      const count = await model.count({ where })
      return { alias, count }
    })
  )
  
  return results.reduce((acc, { alias, count }) => {
    acc[alias] = count
    return acc
  }, {} as Record<string, number>)
}

/**
 * Fetches related data in a single query to avoid multiple round trips
 * This is useful for getting questions with their answers, reviews, etc.
 */
export async function fetchWithRelations<T>(
  model: any,
  where: any,
  include: any
): Promise<T[]> {
  return await model.findMany({
    where,
    include
  })
}

/**
 * Optimizes term state queries by fetching all department term states at once
 * This replaces multiple individual term state queries
 */
export async function batchFetchTermStates(
  departmentIds: string[],
  year: number
): Promise<Record<string, any>> {
  if (!departmentIds.length) return {}
  
  const uniqueIds = [...new Set(departmentIds)]
  
  const termStates = await prisma.termState.findMany({
    where: {
      departmentId: { in: uniqueIds },
      year
    }
  })
  
  // Convert to map for easy lookup
  const termStateMap = new Map(
    termStates.map(ts => [ts.departmentId, ts])
  )
  
  return uniqueIds.reduce((acc, deptId) => {
    acc[deptId] = termStateMap.get(deptId) || null
    return acc
  }, {} as Record<string, any>)
}

/**
 * Optimizes question queries by fetching all questions for multiple terms at once
 * This replaces separate queries for START and END terms
 */
export async function batchFetchQuestions(
  departmentId: string,
  terms: TermType[],
  includePublished: boolean = true
): Promise<Record<string, any[]>> {
  if (!terms.length) return {}
  
  const currentYear = new Date().getFullYear()
  
  const questions = await prisma.question.findMany({
    where: {
      departmentId,
      term: { in: terms },
      year: currentYear,
      isActive: true,
      ...(includePublished && { isPublished: true })
    },
    orderBy: [
      { term: 'asc' },
      { order: 'asc' },
      { createdAt: 'asc' }
    ]
  })
  
  // Group by term
  return terms.reduce((acc, term) => {
    acc[term] = questions.filter(q => q.term === term)
    return acc
  }, {} as Record<string, any[]>)
}

/**
 * Optimizes teacher answer queries by fetching all answers for a teacher at once
 * This replaces separate queries for different terms
 */
export async function batchFetchTeacherAnswers(
  teacherId: string,
  terms: TermType[]
): Promise<Record<string, any[]>> {
  if (!terms.length) return {}
  
  const currentYear = new Date().getFullYear()
  
  const answers = await prisma.teacherAnswer.findMany({
    where: {
      teacherId,
      term: { in: terms },
      year: currentYear
    }
  })
  
  // Group by term
  return terms.reduce((acc, term) => {
    acc[term] = answers.filter(a => a.term === term)
    return acc
  }, {} as Record<string, any[]>)
}

/**
 * Optimizes review queries by fetching all reviews for multiple teachers at once
 * This replaces individual review queries for each teacher
 */
export async function batchFetchReviews(
  teacherIds: string[],
  terms: TermType[],
  reviewTypes: string[] = ['HOD', 'ASST_DEAN', 'DEAN']
): Promise<Record<string, Record<string, any>>> {
  if (!teacherIds.length || !terms.length) return {}
  
  // Note: Using hodReviews, asstReviews, and finalReviews instead of a single review model
  // This maintains the existing database structure without changes
  const hodReviews = await prisma.hodReview.findMany({
    where: {
      teacherId: { in: teacherIds },
      term: { in: terms }
    }
  })
  
  const asstReviews = await prisma.asstReview.findMany({
    where: {
      teacherId: { in: teacherIds },
      term: { in: terms }
    }
  })
  
  const finalReviews = await prisma.finalReview.findMany({
    where: {
      teacherId: { in: teacherIds },
      term: { in: terms }
    }
  })
  
  // Group by teacher ID and term
  const result: Record<string, Record<string, any>> = {}
  
  teacherIds.forEach(teacherId => {
    result[teacherId] = {}
    terms.forEach(term => {
      result[teacherId][term] = [
        ...hodReviews.filter((r: any) => r.teacherId === teacherId && r.term === term),
        ...asstReviews.filter((r: any) => r.teacherId === teacherId && r.term === term),
        ...finalReviews.filter((r: any) => r.teacherId === teacherId && r.term === term)
      ]
    })
  })
  
  return result
}

/**
 * Creates a database transaction to ensure data consistency
 * This is useful for operations that need to update multiple tables
 */
export async function withTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operation)
}

/**
 * Optimizes bulk operations by processing them in batches
 * This prevents memory issues with large datasets
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Caches expensive database queries to avoid repeated execution
 * This is especially useful for dashboard data that doesn't change frequently
 */
export class QueryCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  static async getOrSet<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    
    const data = await queryFn()
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    
    return data
  }
  
  static invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
  
  static clear(): void {
    this.cache.clear()
  }
}
