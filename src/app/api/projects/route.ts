import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma, ProjectStatus } from '@prisma/client'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  status: z.enum(['active', 'completed', 'archived']),
})

function toProjectStatus(status: string): ProjectStatus {
  return status.toUpperCase() as ProjectStatus
}

function serializeProject(project: Prisma.ProjectGetPayload<{
  include: {
    organization: { select: { id: true; name: true; slug: true } }
    _count: { select: { metrics: true } }
  }
}>) {
  return {
    id: project.id,
    name: project.name,
    description: project.description || '',
    status: project.status.toLowerCase(),
    org: project.organization.name,
    organization: project.organization,
    events: project._count.metrics,
    createdAt: project.createdAt.toISOString().slice(0, 10),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig) as Session | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')

    const where: Prisma.ProjectWhereInput = {
      organization: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = toProjectStatus(status)
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            metrics: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ projects: projects.map(serializeProject) })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
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
    const validated = createProjectSchema.parse(body)

    // Get user's default organization (first one)
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

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        description: validated.description,
        status: toProjectStatus(validated.status),
        organizationId: userOrg.id,
        userId: session.user.id,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            metrics: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'PROJECT',
        resourceId: project.id,
        organizationId: project.organizationId,
        metadata: {
          projectName: project.name,
        },
      },
    })

    return NextResponse.json({ project: serializeProject(project) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
