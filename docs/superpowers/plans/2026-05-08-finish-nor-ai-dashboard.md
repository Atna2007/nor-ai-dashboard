# Finish nor.ai Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `nor-ai-dashboard` build reliably and complete the auth/onboarding/account workflows needed for a usable SaaS dashboard.

**Architecture:** Keep the existing Next.js 16 App Router, Prisma 7 PostgreSQL adapter, NextAuth v4, shadcn-style UI, and dashboard pages. Add narrowly scoped auth helpers, API routes, and focused tests instead of restructuring the app.

**Tech Stack:** Next.js 16.2.4, React 19, TypeScript 5, Prisma 7, NextAuth v4, Tailwind CSS v4, Vitest, Testing Library.

---

## Current Findings

- `npm run lint` passes.
- `npm run build` fails because `src/app/layout.tsx` uses `next/font/google` for Fira Sans and Fira Code, and the build environment cannot fetch Google Fonts.
- Signup/login pages still show email auth as "Coming soon" even though `User.password` already exists in `prisma/schema.prisma`.
- OAuth-created users can reach `/dashboard` with zero organizations; `/api/team`, audit logs, settings, and organization switcher assume at least one organization.
- There is no committed automated test setup, so auth/onboarding regressions are currently caught only by `lint` and `build`.
- Keep existing uncommitted user work intact. Do not revert unrelated files.

## File Structure

- Modify `package.json` and `package-lock.json`: add test scripts and test dependencies.
- Create `vitest.config.ts`: Vitest config with jsdom and path alias support.
- Create `src/test/setup.ts`: test environment bootstrap.
- Create `src/lib/slug.ts`: shared slug generation for organization slugs.
- Test `src/lib/slug.test.ts`: slug edge cases.
- Create `src/lib/onboarding.ts`: ensure every signed-in user has an organization and consume pending invites.
- Test `src/lib/onboarding.test.ts`: mocked Prisma coverage for organization creation and invite acceptance.
- Modify `src/lib/auth.ts`: add Credentials provider and `events.createUser` onboarding.
- Create `src/app/api/auth/signup/route.ts`: email/password signup endpoint.
- Test `src/app/api/auth/signup/route.test.ts`: validation, duplicate email, password hashing, default organization.
- Modify `src/app/auth/login/page.tsx`: enable email/password login.
- Modify `src/app/auth/signup/page.tsx`: enable email/password signup.
- Modify `src/app/layout.tsx`: remove remote Google font dependency.
- Create `src/app/terms/page.tsx` and `src/app/privacy/page.tsx`: fix signup footer links.
- Modify `README.md` and `.env.example`: align docs with Next.js 16, auth modes, and production build requirements.

---

### Task 1: Add Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install test dependencies**

Run:

```powershell
npm.cmd install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Expected: `package.json` and `package-lock.json` include the new dev dependencies.

- [ ] **Step 2: Add test scripts**

Modify `package.json` scripts to:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:setup": "tsx scripts/setup-db.ts",
  "db:push": "prisma db push",
  "db:generate": "prisma generate",
  "db:studio": "prisma studio"
}
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```ts
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Create test setup**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Verify empty test harness**

Run:

```powershell
npm.cmd run test -- --passWithNoTests
```

Expected: PASS with no test files found.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "test: add vitest harness"
```

---

### Task 2: Make Production Build Offline-Safe

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write failing verification**

Run:

```powershell
npm.cmd run build
```

Expected before implementation: FAIL with `Failed to fetch Fira Sans from Google Fonts` and `Failed to fetch Fira Code from Google Fonts`.

- [ ] **Step 2: Replace remote fonts with CSS variables**

Modify `src/app/layout.tsx` to:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "nor.ai | Dashboard",
  description: "Modern SaaS Dashboard - Multi-tenant Analytics Platform",
  keywords: ["dashboard", "analytics", "saas", "multi-tenant"],
  authors: [{ name: "nor.ai" }],
  openGraph: {
    title: "nor.ai | Dashboard",
    description: "Modern SaaS Dashboard - Multi-tenant Analytics Platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SessionProvider>
          <ThemeProvider defaultTheme="dark" storageKey="nor-ai-theme">
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build no longer fails on fonts**

Run:

```powershell
npm.cmd run build
```

Expected: no Google Fonts fetch error. If a different compile/runtime error appears, record it and fix it in the task where that file belongs.

- [ ] **Step 4: Commit**

```powershell
git add src/app/layout.tsx
git commit -m "fix: remove remote font dependency"
```

---

### Task 3: Add Slug Utility

**Files:**
- Create: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts`

- [ ] **Step 1: Write failing slug tests**

Create `src/lib/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createSlug } from './slug'

describe('createSlug', () => {
  it('normalizes names into lowercase URL slugs', () => {
    expect(createSlug('Ariel NOR AI')).toBe('ariel-nor-ai')
  })

  it('removes punctuation and collapses repeated separators', () => {
    expect(createSlug('  ACME, Inc. -- Panama!  ')).toBe('acme-inc-panama')
  })

  it('falls back when the name has no usable characters', () => {
    expect(createSlug('!!!', 'default-org')).toBe('default-org')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/lib/slug.test.ts
```

Expected: FAIL because `src/lib/slug.ts` does not exist.

- [ ] **Step 3: Implement slug utility**

Create `src/lib/slug.ts`:

```ts
export function createSlug(value: string, fallback = 'organization') {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return slug || fallback
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm.cmd run test -- src/lib/slug.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat: add shared slug utility"
```

---

### Task 4: Add User Onboarding Service

**Files:**
- Create: `src/lib/onboarding.ts`
- Test: `src/lib/onboarding.test.ts`

- [ ] **Step 1: Write failing onboarding tests**

Create `src/lib/onboarding.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm.cmd run test -- src/lib/onboarding.test.ts
```

Expected: FAIL because `src/lib/onboarding.ts` does not exist.

- [ ] **Step 3: Implement onboarding service**

Create `src/lib/onboarding.ts`:

```ts
import { Role } from '@prisma/client'
import { prisma } from './db'
import { createSlug } from './slug'

interface OnboardingUser {
  id: string
  email?: string | null
  name?: string | null
}

async function getAvailableOrganizationSlug(baseSlug: string) {
  let slug = baseSlug
  let suffix = 2

  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}

export async function ensureUserOnboarding(user: OnboardingUser) {
  if (!user.email) {
    return
  }

  const normalizedEmail = user.email.toLowerCase()
  const pendingInvites = await prisma.organizationMember.findMany({
    where: {
      inviteEmail: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
      userId: null,
    },
    select: {
      id: true,
      inviteEmail: true,
    },
  })

  await Promise.all(
    pendingInvites.map((invite) =>
      prisma.organizationMember.update({
        where: { id: invite.id },
        data: {
          userId: user.id,
          inviteEmail: null,
        },
      })
    )
  )

  const memberships = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId: user.id,
        },
      },
    },
    select: {
      id: true,
    },
    take: 1,
  })

  if (memberships.length > 0) {
    return
  }

  const displayName = user.name?.trim() || normalizedEmail.split('@')[0] || 'New User'
  const baseSlug = createSlug(displayName, `user-${user.id.slice(0, 8)}`)
  const slug = await getAvailableOrganizationSlug(baseSlug)

  await prisma.organization.create({
    data: {
      name: `${displayName}'s Organization`,
      slug,
      members: {
        create: {
          userId: user.id,
          role: Role.OWNER,
        },
      },
    },
  })
}
```

- [ ] **Step 4: Run onboarding tests**

Run:

```powershell
npm.cmd run test -- src/lib/onboarding.test.ts src/lib/slug.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/onboarding.ts src/lib/onboarding.test.ts
git commit -m "feat: add user onboarding service"
```

---

### Task 5: Wire Onboarding Into NextAuth

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add onboarding to auth config**

Modify `src/lib/auth.ts` imports and config:

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
        session.user.organizations = organizations.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.members.find(m => m.userId === token.id)?.role || 'MEMBER',
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

- [ ] **Step 2: Extend JWT typing**

Modify `src/types/next-auth.d.ts` to include JWT id:

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

- [ ] **Step 3: Verify type checking through build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS or only errors unrelated to `auth.ts`/NextAuth typing.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/auth.ts src/types/next-auth.d.ts
git commit -m "feat: complete auth onboarding"
```

---

### Task 6: Add Email Signup API

**Files:**
- Create: `src/app/api/auth/signup/route.ts`
- Test: `src/app/api/auth/signup/route.test.ts`

- [ ] **Step 1: Write failing signup route tests**

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

- [ ] **Step 2: Run tests to verify failure**

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
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 409 }
      )
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
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error signing up:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
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

### Task 7: Enable Email Login and Signup UI

**Files:**
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/auth/signup/page.tsx`

- [ ] **Step 1: Replace login page with working email form**

Modify `src/app/auth/login/page.tsx` to include `email`, `password`, `error`, and a `handleEmailSignIn` that calls:

```ts
const result = await signIn('credentials', {
  email,
  password,
  redirect: false,
  callbackUrl: '/dashboard',
})
if (result?.error) {
  setError('Invalid email or password')
  return
}
window.location.href = result?.url || '/dashboard'
```

Keep existing Google/GitHub buttons. Replace the disabled "Sign in with email" section with `Input` fields for email/password and a submit `Button`.

- [ ] **Step 2: Replace signup page with working email form**

Modify `src/app/auth/signup/page.tsx` to include `name`, `email`, `password`, `error`, and a `handleEmailSignup` that calls:

```ts
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password }),
})
if (!response.ok) {
  const data = await response.json().catch(() => null)
  setError(data?.error || 'Failed to create account')
  return
}
const result = await signIn('credentials', {
  email,
  password,
  redirect: false,
  callbackUrl: '/dashboard',
})
window.location.href = result?.url || '/dashboard'
```

Keep existing Google/GitHub signup buttons. Replace the disabled "Sign up with email" section with `Input` fields for name/email/password and a submit `Button`.

- [ ] **Step 3: Verify lint**

Run:

```powershell
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 4: Verify build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/app/auth/login/page.tsx src/app/auth/signup/page.tsx
git commit -m "feat: enable email auth screens"
```

---

### Task 8: Add Missing Legal Pages Linked From Signup

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

Expected: PASS and routes include `/terms` and `/privacy`.

- [ ] **Step 4: Commit**

```powershell
git add src/app/terms/page.tsx src/app/privacy/page.tsx
git commit -m "feat: add legal pages"
```

---

### Task 9: Add Delete Account API and Wire Danger Zone

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

In `src/app/dashboard/settings/page.tsx`, import `signOut`:

```ts
import { signOut, useSession } from 'next-auth/react'
```

Add:

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

### Task 10: Update Docs and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.example`**

Modify `.env.example` to:

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

- [ ] **Step 2: Update README accuracy**

Update README to say:

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

Keep the existing feature list and project structure, but change "Next.js 15" to "Next.js 16".

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

Expected: only intended changes remain staged or committed. Do not revert unrelated user changes.

- [ ] **Step 5: Commit docs**

```powershell
git add README.md .env.example
git commit -m "docs: document production setup"
```

---

## Self-Review

**Spec coverage:** The plan covers finishing the known blockers: reproducible build, email auth, user onboarding, organization creation, missing legal links, account deletion, and verification.

**Placeholder scan:** No `TBD`, `TODO`, "implement later", "similar to", or undefined task references remain.

**Type consistency:** `ensureUserOnboarding`, `createSlug`, `authConfig`, `Session.user.id`, `JWT.id`, signup route payloads, and Prisma model fields match names used across tasks.

**Known constraint:** This plan does not replace OAuth provider setup; it makes OAuth optional and adds email/password so the app remains usable without Google/GitHub credentials.
