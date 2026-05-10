import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ensureUserOnboarding } from '@/lib/onboarding'

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

function isUniqueEmailError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('email')
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = signupSchema.parse(body)
    const email = validated.email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 })
    }

    const password = await bcrypt.hash(validated.password, 12)
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email,
        password,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    await ensureUserOnboarding(user)

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }

    if (isUniqueEmailError(error)) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 })
    }

    console.error('Error signing up:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
