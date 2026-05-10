#!/usr/bin/env tsx
/**
 * Script to fix user organization membership for navasariel44@gmail.com
 * Creates user if doesn't exist, then ensures they have organization membership
 * Run with: npx tsx fix-user-organization.ts
 */

import { prisma } from './src/lib/db'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

async function main() {
  const email = 'navasariel44@gmail.com'
  const password = 'TemporalPassword123!' // Temporary password - user should change after first login
  const name = 'Navasa Ariel'

  console.log(`🔍 Checking user with email: ${email}`)

  // Find the user
  let user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.log(`📭 User not found with email: ${email}`)
    console.log('🔧 Creating user...')

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the user
    user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(), // Mark as verified for simplicity
      },
    })

    console.log(`✅ Created user: ${user.id} (${user.email})`)
  } else {
    console.log(`✅ Found user: ${user.id} (${user.email})`)
  }

  // Check for the "Main Organization" (slug: main)
  let organization = await prisma.organization.findUnique({
    where: { slug: 'main' },
  })

  if (!organization) {
    console.log(`📭 Organization with slug 'main' not found. Creating...`)
    organization = await prisma.organization.create({
      data: {
        name: 'Main Organization',
        slug: 'main',
      },
    })
    console.log(`✅ Created organization: ${organization.name} (${organization.slug})`)
  } else {
    console.log(`✅ Found existing organization: ${organization.name} (${organization.slug})`)
  }

  // Check if the user is already a member of this organization
  const existingMembership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: organization.id,
      userId: user.id,
    },
  })

  if (existingMembership) {
    console.log(`✅ User is already a member of the organization as ${existingMembership.role}`)
    console.log('')
    console.log('🎉 You should now be able to log in and access the application!')
    console.log(`   Email: ${user.email}`)
    console.log(`   Password: ${password} (temporary - please change after first login)`)
    return
  }

  console.log(`🔧 Adding user as OWNER to the organization...`)
  const membership = await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: Role.OWNER,
    },
  })

  console.log(`✅ Successfully added user to organization`)
  console.log(`   Organization: ${organization.name} (${organization.slug})`)
  console.log(`   Role: ${membership.role}`)
  console.log('')
  console.log('🎉 You should now be able to log in and access the application!')
  console.log(`   Email: ${user.email}`)
  console.log(`   Password: ${password} (temporary - please change after first login)`)
}

main()
  .catch(async (error) => {
    console.error('❌ Script failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })