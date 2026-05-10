import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'

const webhookSchema = z.object({
  name: z.string().min(1).max(80),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  active: z.boolean().optional().default(true),
})

function serializeWebhook(webhook: {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: Date
  lastTriggeredAt: Date | null
}) {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    events: webhook.events,
    active: webhook.active,
    createdAt: webhook.createdAt.toISOString(),
    lastTriggeredAt: webhook.lastTriggeredAt?.toISOString() || null,
  }
}

export async function GET() {
  const session = await getServerSession(authConfig) as Session | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhooks = await prisma.webhook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ webhooks: webhooks.map(serializeWebhook) })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = webhookSchema.parse(body)

    const webhook = await prisma.webhook.create({
      data: {
        ...validated,
        userId: session.user.id,
        secret: `whsec_${randomBytes(24).toString('hex')}`,
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
          resource: 'WEBHOOK',
          resourceId: webhook.id,
          metadata: { name: webhook.name, url: webhook.url },
        },
      })
    }

    return NextResponse.json({ webhook: serializeWebhook(webhook) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    )
  }
}
