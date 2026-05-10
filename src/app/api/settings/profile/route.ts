import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { z } from 'zod'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateProfileSchema.parse(body)

    const existingEmail = await prisma.user.findFirst({
      where: {
        email: validated.email,
        NOT: { id: session.user.id },
      },
      select: { id: true },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 409 }
      )
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: validated,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
