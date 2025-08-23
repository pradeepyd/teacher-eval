/**
 * Simple logging utility for internal university website
 */

class SimpleLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  error(message: string, context?: string, userId?: string, action?: string): void {
    const timestamp = new Date().toISOString()
    const logData = { message, context, userId, action, timestamp }
    
    if (this.isDevelopment) {
      console.error('🚨 ERROR:', logData)
    } else {
      console.error('ERROR:', logData)
    }
  }

  warn(message: string, context?: string, userId?: string, action?: string): void {
    const timestamp = new Date().toISOString()
    const logData = { message, context, userId, action, timestamp }
    
    if (this.isDevelopment) {
      console.warn('⚠️ WARN:', logData)
    } else {
      console.warn('WARN:', logData)
    }
  }

  info(message: string, context?: string, userId?: string, action?: string): void {
    const timestamp = new Date().toISOString()
    const logData = { message, context, userId, action, timestamp }
    
    if (this.isDevelopment) {
      console.info('ℹ️ INFO:', logData)
    } else {
      console.info('INFO:', logData)
    }
  }

  debug(message: string, context?: string, userId?: string, action?: string): void {
    if (!this.isDevelopment) return // Only log debug in development
    
    const timestamp = new Date().toISOString()
    const logData = { message, context, userId, action, timestamp }
    console.debug('🐛 DEBUG:', logData)
  }

  security(message: string, context?: string, userId?: string, action?: string): void {
    const timestamp = new Date().toISOString()
    const logData = { message, context, userId, action, timestamp }
    
    if (this.isDevelopment) {
      console.warn('🔒 SECURITY:', logData)
    } else {
      console.warn('SECURITY:', logData)
    }
  }
}

// Export singleton instance
export const logger = new SimpleLogger()
