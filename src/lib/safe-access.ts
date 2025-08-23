/**
 * Safe data access utilities to prevent runtime errors
 */

// Safe property access with default values
export function safeGet<T>(obj: unknown, path: string, defaultValue: T): T {
  if (!obj || typeof obj !== 'object') return defaultValue
  
  const keys = path.split('.')
  let current = obj as Record<string, unknown>
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue
    }
    current = current[key] as Record<string, unknown>
  }
  
  return current !== undefined ? current as T : defaultValue
}

// Safe array access
export function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  return Array.isArray(value) ? value : defaultValue
}

// Safe string access
export function safeString(value: unknown, defaultValue: string = ''): string {
  return typeof value === 'string' ? value : defaultValue
}

// Safe number access
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  const num = Number(value)
  return !isNaN(num) && isFinite(num) ? num : defaultValue
}

// Safe boolean access
export function safeBoolean(value: unknown, defaultValue: boolean = false): boolean {
  return typeof value === 'boolean' ? value : defaultValue
}

// Safe date access
export function safeDate(value: unknown, defaultValue: Date = new Date()): Date {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  
  return defaultValue
}

// Safe object access with shape validation
export function safeObject<T extends Record<string, unknown>>(
  value: unknown, 
  shape: Partial<T>, 
  defaultValue: T
): T {
  if (!value || typeof value !== 'object') return defaultValue
  
  const result = { ...defaultValue }
  const valueObj = value as Record<string, unknown>
  
  for (const [key, expectedType] of Object.entries(shape)) {
    if (key in valueObj) {
      const actualValue = valueObj[key]
      
      // Type checking based on expected shape
      if (typeof expectedType === 'string' && typeof actualValue === 'string') {
        (result as Record<string, unknown>)[key] = actualValue
      } else if (typeof expectedType === 'number' && typeof actualValue === 'number') {
        (result as Record<string, unknown>)[key] = actualValue
      } else if (typeof expectedType === 'boolean' && typeof actualValue === 'boolean') {
        (result as Record<string, unknown>)[key] = actualValue
      } else if (Array.isArray(expectedType) && Array.isArray(actualValue)) {
        (result as Record<string, unknown>)[key] = actualValue
      } else if (expectedType && typeof expectedType === 'object' && actualValue && typeof actualValue === 'object') {
        (result as Record<string, unknown>)[key] = actualValue
      }
    }
  }
  
  return result
}

// Safe user access
export function safeUser(user: unknown) {
  // Create a properly typed user object
  const userObj = user as Record<string, unknown>
  const safeUserObj = {
    id: safeString(userObj?.id) || '',
    name: safeString(userObj?.name) || 'Unknown User',
    email: safeString(userObj?.email) || '',
    role: safeString(userObj?.role) || 'TEACHER',
    department: userObj?.department ? {
      id: safeString((userObj.department as Record<string, unknown>)?.id),
      name: safeString((userObj.department as Record<string, unknown>)?.name)
    } : null
  }
  
  return safeUserObj
}

// Safe department access
export function safeDepartment(dept: unknown) {
  // Create a properly typed department object
  const deptObj = dept as Record<string, unknown>
  const safeDept = {
    id: safeString(deptObj?.id) || '',
    name: safeString(deptObj?.name) || 'Unknown Department',
    createdAt: safeString(deptObj?.createdAt) || new Date().toISOString(),
    updatedAt: safeString(deptObj?.updatedAt) || new Date().toISOString(),
    hod: deptObj?.hod ? {
      id: safeString((deptObj.hod as Record<string, unknown>)?.id),
      name: safeString((deptObj.hod as Record<string, unknown>)?.name)
    } : undefined,
    termStates: safeArray(deptObj?.termStates).map((ts: unknown) => safeTermState(ts)),
    _count: {
      users: safeNumber((deptObj?._count as Record<string, unknown>)?.users) || 0
    }
  }
  
  return safeDept
}

// Safe teacher access
export function safeTeacher(teacher: unknown) {
  return safeObject(teacher, {
    id: '',
    name: '',
    email: '',
    status: '',
    answers: {},
    selfComment: '',
    hodComment: '',
    hodScore: 0,
    canReview: false,
    rubric: {}
  }, {
    id: '',
    name: 'Unknown Teacher',
    email: '',
    status: 'PENDING',
    answers: {},
    selfComment: '',
    hodComment: '',
    hodScore: 0,
    canReview: false,
    rubric: {}
  })
}

// Safe term state access
export function safeTermState(termState: unknown) {
  return safeObject(termState, {
    activeTerm: 'START',
    startTermVisibility: '',
    endTermVisibility: ''
  }, {
    activeTerm: 'START' as 'START' | 'END',
    startTermVisibility: 'HIDDEN',
    endTermVisibility: 'HIDDEN'
  })
}

// Safe API response wrapper
export function safeApiResponse<T>(response: unknown, dataKey: string, defaultValue: T): T {
  if (!response || typeof response !== 'object') return defaultValue
  
  const data = (response as Record<string, unknown>)[dataKey]
  return data !== undefined ? data as T : defaultValue
}

// Error-safe JSON parsing
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString)
  } catch {
    return defaultValue
  }
}

// Safe localStorage access
export function safeLocalStorage(key: string, defaultValue: string = ''): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key) || defaultValue
    }
  } catch {
    // Ignore localStorage errors
  }
  return defaultValue
}

// Safe sessionStorage access
export function safeSessionStorage(key: string, defaultValue: string = ''): string {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(key) || defaultValue
    }
  } catch {
    // Ignore sessionStorage errors
  }
  return defaultValue
}

// Safe activity access
export function safeActivity(activity: unknown) {
  return safeObject(activity, {
    id: '',
    type: '',
    message: '',
    department: null,
    timestamp: ''
  }, {
    id: '',
    type: 'UNKNOWN',
    message: 'Unknown activity',
    department: null,
    timestamp: new Date().toISOString()
  })
}
