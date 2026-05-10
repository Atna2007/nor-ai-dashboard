import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
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
    const validated = updateRoleSchema.parse(body)

    // Get user's organization
    const userOrg = await prisma.organization.findFirst({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: 'User not member of any organization' },
        { status: 400 }
      )
    }

    // Check if requesting user has permission
    const userRole = await prisma.organizationMember.findFirst({
      where: {
        organizationId: userOrg.id,
        userId: session.user.id,
      },
    })

    if (userRole?.role !== 'OWNER' && userRole?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get the member being updated
    const member = await prisma.organizationMember.findFirst({
      where: {
        id,
        organizationId: userOrg.id,
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Cannot change OWNER role
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      )
    }

    const updatedMember = await prisma.organizationMember.update({
      where: { id },
      data: { role: validated.role },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'TEAM_MEMBER',
        resourceId: id,
        organizationId: userOrg.id,
        metadata: {
          memberId: id,
          newRole: validated.role,
        },
      },
    })

    return NextResponse.json({ member: updatedMember })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user's organization
    const userOrg = await prisma.organization.findFirst({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: 'User not member of any organization' },
        { status: 400 }
      )
    }

    // Check if requesting user has permission
    const userRole = await prisma.organizationMember.findFirst({
      where: {
        organizationId: userOrg.id,
        userId: session.user.id,
      },
    })

    if (userRole?.role !== 'OWNER' && userRole?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get the member being removed
    const member = await prisma.organizationMember.findFirst({
      where: {
        id,
        organizationId: userOrg.id,
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Cannot remove owner
    if (member.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove owner' },
        { status: 400 }
      )
    }

    await prisma.organizationMember.delete({
      where: { id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'TEAM_MEMBER',
        resourceId: id,
        organizationId: userOrg.id,
        metadata: {
          memberId: id,
          removedEmail: member.userId || 'pending-invite',
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
