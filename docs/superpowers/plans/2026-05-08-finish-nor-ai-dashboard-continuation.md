# Finish nor.ai Dashboard Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining auth, signup, legal, settings, documentation, and production build tasks for `nor-ai-dashboard`.

**Architecture:** Continue the existing Next.js 16 App Router architecture without broad restructuring. Keep Prisma behind focused helpers, add credentials auth through NextAuth, and make build-time route collection safe when no database URL exists.

**Tech Stack:** Next.js 16.2.4, React 19, TypeScript 5, Prisma 7 with `@prisma/adapter-pg`, NextAuth v4, Tailwind CSS v4, Vitest, Testing Library.

---

## Verified Starting State

- `npm.cmd run test` passes: 2 files, 5 tests.
- `npm.cmd run lint` passes.
- `npm.cmd run build` compiles and type-checks, then fails while collecting page data because `src/lib/db.ts` throws at module import when `DATABASE_URL` is missing.
- Completed in the worktree: Vitest harness, offline-safe root layout, `src/lib/slug.ts`, `src/lib/onboarding.ts`, and their tests.
- Still incomplete: credentials provider, email signup API, working email login/signup UI, legal pages, account deletion, `.env.example`, README accuracy, and final build verification.

## File Structure

- Modify `src/lib/db.ts`: replace import-time database URL throw with lazy Prisma client access so build-time route imports do not crash.
- Test `src/lib/db.test.ts`: assert missing `DATABASE_URL` only fails when Prisma is accessed.
- Modify `src/lib/auth.ts`: add JWT sessions, Credentials provider, and onboarding hooks.
- Modify `src/types/next-auth.d.ts`: add JWT id typing.
- Create `src/app/api/auth/signup/route.ts`: validate and create email/password users.
- Test `src/app/api/auth/signup/route.test.ts`: invalid input, duplicate email, successful creation.
- Modify `src/app/auth/login/page.tsx`: enable email/password login while keeping OAuth.
- Modify `src/app/auth/signup/page.tsx`: enable email/password signup while keeping OAuth.
- Create `src/app/terms/page.tsx` and `src/app/privacy/page.tsx`: satisfy signup footer links.
- Create `src/app/api/settings/account/route.ts`: delete current user account.
- Modify `src/app/dashboard/settings/page.tsx`: wire Danger Zone button to account deletion.
- Create `.env.example`: document required runtime environment.
- Modify `README.md`: document current stack, auth modes, onboarding, and verification.

---

### Task 1: Make Prisma Import Build-Safe

**Files:**
- Modify: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

- [ ] **Step 1: Write failing test for lazy database configuration**

Create `src/lib/db.test.ts`:

```ts
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

    const module = await import('./db')

    expect(module.prisma).toBeDefined()
  })

  it('throws a clear error only when Prisma is accessed without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL

    const { prisma } = await import('./db')

    expect(() => prisma.user).toThrow('DATABASE_URL environment variable is required')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm.cmd run test -- src/lib/db.test.ts
```

Expected: FAIL because importing `src/lib/db.ts` currently throws immediately.

- [ ] **Step 3: Implement lazy Prisma client**

Replace `src/lib/db.ts` with:

```ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

function getPrismaClient() {
  if (!globalForPrisma.prismaClient) {
    globalForPrisma.prismaClient = createPrismaClient()
  }

  return globalForPrisma.prismaClient
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver)
  },
})
```

- [ ] **Step 4: Run database module test**

Run:

```powershell
npm.cmd run test -- src/lib/db.test.ts
```

Expected: PASS.

- [ ] **Step 5: Verify production build moves past missing DATABASE_URL**

Run:

```powershell
npm.cmd run build
```

Expected: no `DATABASE_URL environment variable is required` failure during page data collection. If a new error appears, handle it in the task that owns that file.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/db.ts src/lib/db.test.ts
git commit -m "fix: lazy load prisma client"
```

---

### Task 2: Wire Onboarding Into NextAuth

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/types/next-auth.d.ts`

- [ ] **Step 1: Replace auth config with JWT sessions and credentials provider**

Replace `src/lib/auth.ts` with:

```ts
import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { getUserOrganizations } from './organization'
import { ensureUserOnboarding } from './onboarding'

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  session: {
    strategy: 'jwt',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim()
        const password = credentials?.password

        if (!email || !password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user?.password) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
          return null
        }

        await ensureUserOnboarding(user)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string

        const organizations = await getUserOrganizations(token.id as string)
        session.user.organizations = organizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.members.find((member) => member.userId === token.id)?.role || 'MEMBER',
        }))
      }
      return session
    },
    async signIn({ user }) {
      if (user?.id) {
        await ensureUserOnboarding(user)
      }
      return true
    },
  },
  events: {
    async createUser({ user }) {
      await ensureUserOnboarding(user)
    },
  },
}

export const authHandler = NextAuth(authConfig)
```

- [ ] **Step 2: Extend NextAuth JWT type**

Replace `src/types/next-auth.d.ts` with:

```ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      organizations: Array<{
        id: string
        name: string
        slug: string
        role: string
      }>
    } & DefaultSession['user']
  }

  interface User {
    id: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
```

- [ ] **Step 3: Verify type checking through lint and build**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: PASS or only a new failure unrelated to `auth.ts` and `next-auth.d.ts`.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/auth.ts src/types/next-auth.d.ts
git commit -m "feat: complete nextauth onboarding"
```

---

### Task 3: Add Email Signup API

**Files:**
- Create: `src/app/api/auth/signup/route.ts`
- Test: `src/app/api/auth/signup/route.test.ts`

- [ ] **Step 1: Write signup route tests**

Create `src/app/api/auth/signup/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

  it('rejects duplicate email', async () => {
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' } as never)

    const response = await POST(request({
      name: 'Ariel',
      email: 'ariel@example.com',
      password: 'password123',
    }))

    expect(response.status).toBe(409)
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
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm.cmd run test -- src/app/api/auth/signup/route.test.ts
```

Expected: FAIL because signup route does not exist.

- [ ] **Step 3: Implement signup route**

Create `src/app/api/auth/signup/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ensureUserOnboarding } from '@/lib/onboarding'

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = signupSchema.parse(body)
    const email = validated.email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 409 })
    }

    const password = await bcrypt.hash(validated.password, 12)
    const user = await prisma.user.create({
      data: {
        name: validated.name.trim(),
        email,
        password,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    await ensureUserOnboarding(user)

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }

    console.error('Error signing up:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run signup route tests**

Run:

```powershell
npm.cmd run test -- src/app/api/auth/signup/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/app/api/auth/signup/route.ts src/app/api/auth/signup/route.test.ts
git commit -m "feat: add email signup api"
```

---

### Task 4: Enable Email Login and Signup UI

**Files:**
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/auth/signup/page.tsx`

- [ ] **Step 1: Add working email login form**

In `src/app/auth/login/page.tsx`, import `Input`, add `email`, `password`, `error`, and `isEmailLoading` state, and add:

```ts
const handleEmailSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  setError(null)
  setIsEmailLoading(true)

  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
    callbackUrl: '/dashboard',
  })

  setIsEmailLoading(false)

  if (result?.error) {
    setError('Invalid email or password')
    return
  }

  window.location.href = result?.url || '/dashboard'
}
```

Replace the disabled email section with:

```tsx
<form className="space-y-3" onSubmit={handleEmailSignIn}>
  <Input
    type="email"
    placeholder="Email"
    value={email}
    onChange={(event) => setEmail(event.target.value)}
    required
  />
  <Input
    type="password"
    placeholder="Password"
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    required
  />
  {error ? <p className="text-sm text-destructive">{error}</p> : null}
  <Button type="submit" className="w-full" disabled={isEmailLoading}>
    {isEmailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
    Sign in with email
  </Button>
</form>
```

- [ ] **Step 2: Add working email signup form**

In `src/app/auth/signup/page.tsx`, import `Input`, add `name`, `email`, `password`, `error`, and `isEmailLoading` state, and add:

```ts
const handleEmailSignup = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  setError(null)
  setIsEmailLoading(true)

  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    setError(data?.error || 'Failed to create account')
    setIsEmailLoading(false)
    return
  }

  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
    callbackUrl: '/dashboard',
  })

  setIsEmailLoading(false)

  if (result?.error) {
    setError('Account created, but sign in failed')
    return
  }

  window.location.href = result?.url || '/dashboard'
}
```

Replace the disabled email section with:

```tsx
<form className="space-y-3" onSubmit={handleEmailSignup}>
  <Input
    type="text"
    placeholder="Name"
    value={name}
    onChange={(event) => setName(event.target.value)}
    required
  />
  <Input
    type="email"
    placeholder="Email"
    value={email}
    onChange={(event) => setEmail(event.target.value)}
    required
  />
  <Input
    type="password"
    placeholder="Password"
    minLength={8}
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    required
  />
  {error ? <p className="text-sm text-destructive">{error}</p> : null}
  <Button type="submit" className="w-full" disabled={isEmailLoading}>
    {isEmailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
    Sign up with email
  </Button>
</form>
```

- [ ] **Step 3: Verify lint and build**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/app/auth/login/page.tsx src/app/auth/signup/page.tsx
git commit -m "feat: enable email auth screens"
```

---

### Task 5: Add Missing Legal Pages

**Files:**
- Create: `src/app/terms/page.tsx`
- Create: `src/app/privacy/page.tsx`

- [ ] **Step 1: Create terms page**

Create `src/app/terms/page.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost">
          <Link href="/">Back</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>nor.ai provides dashboard, analytics, API key, webhook, and organization management tools.</p>
            <p>Users are responsible for the data they submit and for keeping account credentials secure.</p>
            <p>Access may be limited or removed when usage threatens platform reliability, security, or legal compliance.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create privacy page**

Create `src/app/privacy/page.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost">
          <Link href="/">Back</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>nor.ai stores account profile data, organization membership, audit logs, API key metadata, and webhook configuration.</p>
            <p>API key secrets are shown once at creation. OAuth provider data is used only for authentication and account display.</p>
            <p>Contact the site operator to request account deletion or data export.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify route build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS and route output includes `/terms` and `/privacy`.

- [ ] **Step 4: Commit**

```powershell
git add src/app/terms/page.tsx src/app/privacy/page.tsx
git commit -m "feat: add legal pages"
```

---

### Task 6: Add Delete Account API and Wire Danger Zone

**Files:**
- Create: `src/app/api/settings/account/route.ts`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Create account deletion route**

Create `src/app/api/settings/account/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { authConfig } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE() {
  const session = await getServerSession(authConfig) as Session | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.user.delete({
    where: { id: session.user.id },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Wire settings Danger Zone**

In `src/app/dashboard/settings/page.tsx`, change the auth import to:

```ts
import { signOut, useSession } from 'next-auth/react'
```

Add state and handler inside the component:

```ts
const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)

const handleDeleteAccount = async () => {
  const confirmed = window.confirm('Delete your account and all related data? This cannot be undone.')
  if (!confirmed) return

  setIsDeletingAccount(true)
  try {
    const response = await fetch('/api/settings/account', { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete account')
    toast.success('Account deleted')
    await signOut({ callbackUrl: '/' })
  } catch (error) {
    console.error(error)
    toast.error('Failed to delete account')
  } finally {
    setIsDeletingAccount(false)
  }
}
```

Change the destructive button to:

```tsx
<Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
  <Trash2 className="mr-2 h-4 w-4" />
  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
</Button>
```

- [ ] **Step 3: Verify lint and build**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/app/api/settings/account/route.ts src/app/dashboard/settings/page.tsx
git commit -m "feat: add account deletion"
```

---

### Task 7: Update Docs and Final Verification

**Files:**
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create `.env.example`**

Create `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nor-ai-dashboard?schema=public

# Auth - Generate with: openssl rand -base64 32
AUTH_SECRET=
AUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers - optional when using email/password locally
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Update README auth and verification sections**

Modify `README.md` so it includes:

```md
# nor.ai Dashboard

Modern SaaS Dashboard - Multi-tenant Analytics Platform built with Next.js 16, TypeScript, Prisma, NextAuth, and shadcn/ui.

## Auth

The app supports:

- Email/password credentials for local development and production fallback
- Google OAuth when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured
- GitHub OAuth when `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are configured

New users automatically get a default organization. Pending team invites are attached on first signup/signin when the invite email matches the user email.

## Verification

Run before deployment:

```bash
npm run lint
npm run test
npm run build
```
```

Also change any `Next.js 15` mention to `Next.js 16`.

- [ ] **Step 3: Run complete verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Expected: all commands PASS.

- [ ] **Step 4: Inspect git status**

Run:

```powershell
git status --short
```

Expected: only intended files remain changed, staged, or committed.

- [ ] **Step 5: Commit docs**

```powershell
git add README.md .env.example
git commit -m "docs: document production setup"
```

---

## Self-Review

**Spec coverage:** This continuation covers the remaining blockers discovered in the worktree: lazy Prisma initialization for build reliability, credentials auth, signup API, email auth UI, legal links, account deletion, docs, and final verification.

**Placeholder scan:** No placeholders, deferred tasks, or "similar to" references remain. Each code-changing step includes concrete code or a concrete replacement.

**Type consistency:** `ensureUserOnboarding`, `prisma`, `authConfig`, `Session.user.id`, `JWT.id`, signup route payloads, and the settings deletion route use consistent names across tasks.

**Known constraint:** Runtime database-backed routes still require a valid `DATABASE_URL`; the build should not fail merely from importing those routes.
