import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { z } from 'zod'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'

const webhookSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validated = webhookSchema.parse(body)

    const existingWebhook = await prisma.webhook.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingWebhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt.toISOString(),
        lastTriggeredAt: webhook.lastTriggeredAt?.toISOString() || null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getServerSession(authConfig) as Session | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const webhook = await prisma.webhook.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  await prisma.webhook.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
