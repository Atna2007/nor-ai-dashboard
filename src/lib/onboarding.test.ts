import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./db', () => ({
  prisma: {
    organizationMember: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from './db'
import { ensureUserOnboarding } from './onboarding'

const mockedPrisma = vi.mocked(prisma)

describe('ensureUserOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('attaches pending invites that match the user email', async () => {
    mockedPrisma.organizationMember.findMany.mockResolvedValueOnce([
      { id: 'member_1', inviteEmail: 'person@example.com' },
    ] as never)
    mockedPrisma.organizationMember.update.mockResolvedValueOnce({ id: 'member_1' } as never)
    mockedPrisma.organization.findMany.mockResolvedValueOnce([{ id: 'org_1' }] as never)

    await ensureUserOnboarding({
      id: 'user_1',
      email: 'PERSON@example.com',
      name: 'Person Example',
    })

    expect(mockedPrisma.organizationMember.update).toHaveBeenCalledWith({
      where: { id: 'member_1' },
      data: {
        userId: 'user_1',
        inviteEmail: null,
      },
    })
    expect(mockedPrisma.organization.create).not.toHaveBeenCalled()
  })

  it('creates a default organization when user has no memberships', async () => {
    mockedPrisma.organizationMember.findMany.mockResolvedValueOnce([])
    mockedPrisma.organization.findMany.mockResolvedValueOnce([])
    mockedPrisma.organization.findUnique.mockResolvedValueOnce(null)
    mockedPrisma.organization.create.mockResolvedValueOnce({ id: 'org_1' } as never)

    await ensureUserOnboarding({
      id: 'user_1',
      email: 'founder@example.com',
      name: 'Ariel Founder',
    })

    expect(mockedPrisma.organization.create).toHaveBeenCalledWith({
      data: {
        name: "Ariel Founder's Organization",
        slug: 'ariel-founder',
        members: {
          create: {
            userId: 'user_1',
            role: 'OWNER',
          },
        },
      },
    })
  })
})
