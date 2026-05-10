import { afterEach, describe, expect, it, vi } from 'vitest'

describe('db module', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL

  afterEach(() => {
    vi.resetModules()
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
    } else {
      delete process.env.DATABASE_URL
    }
  })

  it('can be imported without DATABASE_URL during build-time route collection', async () => {
    delete process.env.DATABASE_URL

    const dbModule = await import('./db')

    expect(dbModule.prisma).toBeDefined()
  })

  it('throws a clear error only when Prisma is accessed without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL

    const { prisma } = await import('./db')

    expect(() => prisma.user).toThrow('DATABASE_URL environment variable is required')
  })
})
