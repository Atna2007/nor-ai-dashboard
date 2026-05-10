import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/onboarding', () => ({
  ensureUserOnboarding: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { ensureUserOnboarding } from '@/lib/onboarding'
import { POST } from './route'

const mockedPrisma = vi.mocked(prisma)

function request(body: unknown) {
  return new NextRequest('http://localhost/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid email and short password', async () => {
    const response = await POST(request({ name: '', email: 'bad', password: '123' }))

    expect(response.status).toBe(400)
  })

  it('rejects whitespace-only name', async () => {
    const response = await POST(request({
      name: '   ',
      email: 'ariel@example.com',
      password: 'password123',
    }))

    expect(response.status).toBe(400)
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('rejects duplicate email', async () => {
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' } as never)

    const response = await POST(request({
      name: 'Ariel',
      email: 'ariel@example.com',
      password: 'password123',
    }))

    expect(response.status).toBe(409)
  })

  it('returns conflict when user creation hits a unique email race', async () => {
    mockedPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockedPrisma.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['email'] },
      })
    )

    const response = await POST(request({
      name: 'Ariel',
      email: 'ariel@example.com',
      password: 'password123',
    }))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data).toEqual({ error: 'Email is already in use' })
    expect(ensureUserOnboarding).not.toHaveBeenCalled()
  })

  it('creates user and runs onboarding', async () => {
    mockedPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockedPrisma.user.create.mockResolvedValueOnce({
      id: 'user_1',
      name: 'Ariel',
      email: 'ariel@example.com',
      image: null,
    } as never)

    const response = await POST(request({
      name: 'Ariel',
      email: 'ARIEL@example.com',
      password: 'password123',
    }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.user.email).toBe('ariel@example.com')
    expect(mockedPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Ariel',
        email: 'ariel@example.com',
        password: expect.any(String),
      }),
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })
    expect(ensureUserOnboarding).toHaveBeenCalledWith({
      id: 'user_1',
      name: 'Ariel',
      email: 'ariel@example.com',
      image: null,
    })
  })
})
