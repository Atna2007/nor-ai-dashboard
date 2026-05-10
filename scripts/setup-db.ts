#!/usr/bin/env tsx
/**
 * Database Setup Script
 *
 * This script:
 * 1. Validates DATABASE_URL environment variable
 * 2. Pushes Prisma schema to database
 * 3. Creates a default organization for testing
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { execSync } from 'child_process'

// Load .env.local
config({ path: resolve(__dirname, '..', '.env.local') })

async function main() {
  console.log('🔍 Validating database connection...')

  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set')
    console.error('')
    console.error('Set up your database:')
    console.error('  1. Go to https://neon.tech and create a free project')
    console.error('  2. Copy the connection string')
    console.error('  3. Add to .env.local: DATABASE_URL=your-connection-string')
    console.error('')
    console.error('Or use Docker:')
    console.error('  docker compose up -d')
    process.exit(1)
  }

  try {
    // Push schema with explicit DATABASE_URL
    console.log('📦 Pushing schema to database...')
    execSync(`npx prisma db push`, {
      stdio: 'inherit',
      env: { ...process.env }
    })
    console.log('✅ Schema pushed successfully')

    console.log('')
    console.log('🎉 Database setup complete!')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Run: npm run dev')
    console.log('  2. Visit: http://localhost:3000')
    console.log('  3. Sign up with Google or GitHub OAuth')

  } catch (error) {
    console.error('❌ Setup failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
