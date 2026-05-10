import { prisma } from './db'
import { Role } from '@prisma/client'

/**
 * Create a new organization and set the creator as OWNER
 */
export async function createOrganization(userId: string, name: string, slug: string) {
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId,
          role: Role.OWNER,
        },
      },
    },
    include: {
      members: true,
    },
  })

  return organization
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      members: {
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
      },
    },
  })
}

/**
 * Get organization by slug with member count
 */
export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
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
      },
      projects: true,
    },
  })
}

/**
 * Get user's role in an organization
 */
export async function getUserRoleInOrganization(userId: string, organizationId: string): Promise<Role | null> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: {
      role: true,
    },
  })

  return member?.role || null
}

/**
 * Check if user has permission in organization
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  requiredRole: Role
): Promise<boolean> {
  const role = await getUserRoleInOrganization(userId, organizationId)

  if (!role) return false

  const roleHierarchy: Record<Role, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
  }

  return roleHierarchy[role] >= roleHierarchy[requiredRole]
}

/**
 * Add member to organization
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: Role = Role.MEMBER
) {
  return prisma.organizationMember.create({
    data: {
      organizationId,
      userId,
      role,
    },
  })
}

/**
 * Update member role
 */
export async function updateMemberRole(
  organizationId: string,
  userId: string,
  role: Role
) {
  return prisma.organizationMember.update({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    data: { role },
  })
}

/**
 * Remove member from organization
 */
export async function removeOrganizationMember(
  organizationId: string,
  userId: string
) {
  return prisma.organizationMember.delete({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  })
}

/**
 * Delete organization (only for OWNER)
 */
export async function deleteOrganization(organizationId: string) {
  return prisma.organization.delete({
    where: { id: organizationId },
  })
}
