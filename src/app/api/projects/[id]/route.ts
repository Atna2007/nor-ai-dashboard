import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma, ProjectStatus } from '@prisma/client'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
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
    const validated = updateProjectSchema.parse(body)

    // Check if user has permission to update this project
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        organization: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...validated,
        status: validated.status ? toProjectStatus(validated.status) : undefined,
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
        action: 'UPDATE',
        resource: 'PROJECT',
        resourceId: project.id,
        organizationId: project.organizationId,
        metadata: {
          changes: validated,
        },
      },
    })

    return NextResponse.json({ project: serializeProject(project) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
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

    // Check if user has permission to delete this project
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        organization: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    await prisma.project.delete({
      where: { id },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resource: 'PROJECT',
        resourceId: id,
        organizationId: existingProject.organizationId,
        metadata: {
          projectName: existingProject.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
