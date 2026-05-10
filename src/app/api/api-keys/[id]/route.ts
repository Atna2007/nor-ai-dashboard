import { NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getServerSession(authConfig) as Session | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
      revoked: false,
    },
  })

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revoked: true },
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
        action: 'DELETE',
        resource: 'API_KEY',
        resourceId: apiKey.id,
        metadata: { name: apiKey.name },
      },
    })
  }

  return NextResponse.json({ success: true })
}
