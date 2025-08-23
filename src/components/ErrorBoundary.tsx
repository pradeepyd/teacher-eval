'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error)
      console.error('Error info:', errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 text-red-500">
                <AlertTriangle className="w-full h-full" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription>
                We apologize for the inconvenience. Please try refreshing the page or return to the homepage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 p-3 bg-gray-100 rounded-md text-xs">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="text-gray-600 font-mono whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by hook:', error, errorInfo)
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReporting(error, errorInfo)
    }
  }
}

// Page-level error boundary wrapper
export function PageErrorBoundary({ 
  children, 
  pageName 
}: { 
  children: ReactNode
  pageName?: string 
}) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`Error in ${pageName || 'page'}:`, error, errorInfo)
  }

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}

// Specific error boundary for data loading
export function DataErrorBoundary({ 
  children, 
  fallback,
  dataType 
}: { 
  children: ReactNode
  fallback?: ReactNode
  dataType?: string
}) {
  const defaultFallback = (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-4" />
        <p className="text-center text-gray-600">
          Unable to load {dataType || 'data'}. Please try refreshing the page.
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()} 
          className="mt-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <ErrorBoundary fallback={fallback || defaultFallback}>
      {children}
    </ErrorBoundary>
  )
}

