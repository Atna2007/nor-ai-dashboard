import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'VIEWER']),
})

export async function GET() {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's default organization
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

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: userOrg.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Transform to match frontend interface
    const teamMembers = members.map((m) => ({
      id: m.id,
      name: m.user?.name || m.user?.email?.split('@')[0] || m.inviteEmail?.split('@')[0] || 'Unknown',
      email: m.user?.email || m.inviteEmail || '',
      role: m.role,
      status: m.user ? 'active' : 'invited',
      avatar: m.user?.image,
    }))

    return NextResponse.json({ members: teamMembers })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = inviteMemberSchema.parse(body)

    // Get user's organization and check permissions
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

    // Check if member already exists
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: userOrg.id,
        OR: [
          { inviteEmail: validated.email },
          { user: { email: validated.email } },
        ],
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Member already exists' },
        { status: 400 }
      )
    }

    // Try to find existing user by email
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validated.email,
      },
    })

    if (existingUser) {
      // Add existing user to organization
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: userOrg.id,
          userId: existingUser.id,
          role: validated.role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'INVITE',
          resource: 'TEAM_MEMBER',
          resourceId: member.id,
          organizationId: userOrg.id,
          metadata: {
            invitedEmail: validated.email,
            invitedRole: validated.role,
          },
        },
      })

      return NextResponse.json({
        member: {
          id: member.id,
          name: member.user?.name || validated.email.split('@')[0],
          email: member.user?.email || validated.email,
          role: member.role,
          status: 'active',
        },
      })
    } else {
      // Create invite (member without user - pending invitation)
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: userOrg.id,
          role: validated.role,
          inviteEmail: validated.email,
          // No userId yet: this represents a pending invite.
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'INVITE',
          resource: 'TEAM_MEMBER',
          resourceId: member.id,
          organizationId: userOrg.id,
          metadata: {
            invitedEmail: validated.email,
            invitedRole: validated.role,
          },
        },
      })

      return NextResponse.json(
        {
          member: {
            id: member.id,
            name: validated.email.split('@')[0],
            email: validated.email,
            role: validated.role,
            status: 'invited',
          },
        },
        { status: 201 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error inviting member:', error)
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    )
  }
}
