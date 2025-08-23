#!/usr/bin/env tsx

import { config } from 'dotenv'
import { logger } from '../src/lib/logger'

// Load environment variables from .env file
config()

async function main() {
  console.log('🔍 Starting build validation...\n')

  try {
    // Basic build validation checks
    const result = {
      success: true,
      errors: [] as string[],
      warnings: [] as string[]
    }

    // Check if essential files exist
    const fs = require('fs')
    const path = require('path')
    
    const essentialFiles = [
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/components/DashboardLayout.tsx',
      'src/lib/prisma.ts',
      'prisma/schema.prisma'
    ]
    
    for (const file of essentialFiles) {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        result.errors.push(`Missing essential file: ${file}`)
        result.success = false
      }
    }

    if (result.success) {
      console.log('✅ Build validation PASSED')
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:')
        result.warnings.forEach((warning: string) => console.log(`  - ${warning}`))
      }
      
      console.log('\n🚀 Ready to build!')
      process.exit(0)
      
    } else {
      console.log('❌ Build validation FAILED')
      
      console.log('\n🚨 Errors:')
      result.errors.forEach((error: string) => console.log(`  - ${error}`))
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:')
        result.warnings.forEach((warning: string) => console.log(`  - ${warning}`))
      }
      
      console.log('\n📋 Summary:')
      console.log(`  Success: ${result.success ? '✅' : '❌'}`)
      console.log(`  Errors: ${result.errors.length}`)
      console.log(`  Warnings: ${result.warnings.length}`)
      
      console.log('\n🔧 Please fix all errors before building')
      process.exit(1)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('💥 Build validation process failed:', errorMessage)
    
    logger.error(
      `Build validation script failed: ${errorMessage}`,
      'build-validation-script'
    )
    
    process.exit(1)
  }
}

// Run validation
main().catch(error => {
  console.error('💥 Unhandled error in build validation:', error)
  process.exit(1)
})
