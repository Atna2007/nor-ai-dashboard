import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/organization'

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens'),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validated = updateOrganizationSchema.parse(body)

    const canUpdate = await hasPermission(session.user.id, id, Role.ADMIN)
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      )
    }

    const existingSlug = await prisma.organization.findFirst({
      where: {
        slug: validated.slug,
        NOT: { id },
      },
      select: { id: true },
    })

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Organization slug is already in use' },
        { status: 409 }
      )
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: id,
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'ORGANIZATION',
        resourceId: id,
        metadata: validated,
      },
    })

    return NextResponse.json({ organization })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating organization:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}
