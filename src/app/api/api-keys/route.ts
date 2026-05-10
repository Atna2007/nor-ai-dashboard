import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
})

function maskKey(key: string) {
  return `${key.slice(0, 12)}...${key.slice(-4)}`
}

export async function GET() {
  const session = await getServerSession(authConfig) as Session | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      userId: session.user.id,
      revoked: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({
    apiKeys: apiKeys.map((apiKey) => ({
      id: apiKey.id,
      name: apiKey.name,
      key: maskKey(apiKey.key),
      createdAt: apiKey.createdAt.toISOString(),
      lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
      expiresAt: apiKey.expiresAt?.toISOString() || null,
    })),
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createApiKeySchema.parse(body)
    const key = `nor_live_${randomBytes(24).toString('hex')}`

    const apiKey = await prisma.apiKey.create({
      data: {
        name: validated.name,
        key,
        userId: session.user.id,
      },
    })

    const organization = await prisma.organization.findFirst({
      where: { members: { some: { userId: session.user.id } } },
      select: { id: true },
    })

    if (organization) {
      await prisma.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: session.user.id,
          action: 'CREATE',
          resource: 'API_KEY',
          resourceId: apiKey.id,
          metadata: { name: apiKey.name },
        },
      })
    }

    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: maskKey(apiKey.key),
        createdAt: apiKey.createdAt.toISOString(),
        lastUsedAt: null,
        expiresAt: null,
      },
      plainTextKey: key,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
