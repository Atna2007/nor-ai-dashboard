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
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: 'openid email profile',
      accessType: 'offline',
      prompt: 'consent'
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
          console.warn('[NextAuth] Credentials sign in failed: missing email or password')
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user?.password) {
          console.warn(`[NextAuth] Credentials sign in failed: no password for user ${email}`)
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
          console.warn(`[NextAuth] Credentials sign in failed: invalid password for user ${email}`)
          return null
        }

        console.info(`[NextAuth] Credentials sign in successful for user ${email}`)
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
    async jwt({ token, user, account, profile }) {
      try {
        // When a user signs in, we need to get their actual database ID
        // For OAuth, the user.id is the provider account ID, not the database ID

        // Extract email from multiple possible sources (user, profile, account)
        let email = user?.email;
        if (!email && profile?.email) {
          email = profile.email;
        }
        if (!email && account?.email) {
          email = account.email;
        }

        // Normalize email to lowercase and trim whitespace
        if (email) {
          email = email.toLowerCase().trim();
        }

        console.info(`[NextAuth] JWT callback: received user object:`, {
          email: user?.email,
          profileEmail: profile?.email,
          accountEmail: account?.email,
          id: user?.id,
          name: user?.name
        });

        if (email) {
          const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          })

          if (existingUser) {
            console.info(`[NextAuth] JWT callback: setting token.id to database ID ${existingUser.id} for email ${email}`)
            token.id = existingUser.id
          } else if (user?.id) {
            // This is a new user being created - use the temporary ID from user object
            // The actual database ID will be available after createUser event
            console.info(`[NextAuth] JWT callback: setting token.id to temporary ID ${user.id} for new user ${email}`)
            token.id = user.id
          } else {
            console.warn(`[NextAuth] JWT callback: user has no email or id`, { email, userId: user?.id });
          }
        } else {
          console.warn(`[NextAuth] JWT callback: no email found in user, profile, or account objects`, {
            user: { email: user?.email, id: user?.id, name: user?.name },
            profile: { email: profile?.email },
            account: { email: account?.email }
          });
        }
        return token
      } catch (error) {
        console.error('[NextAuth] JWT callback error:', error)
        // Return token as-is to avoid breaking the flow
        return token
      }
    },
    async session({ session, token }) {
      try {
        // Guard against missing session.user
        if (!session.user) {
          console.info('[NextAuth] Session callback: no session.user, returning session as-is')
          return session
        }

        console.info(`[NextAuth] Session callback: processing session for user:`, {
          sessionUserId: session.user.id,
          tokenId: token?.id
        });

        // Get the actual database user ID by email (more reliable than token.id which might be OAuth ID for new users)
        let userId = token?.id;
        if (!userId && session.user?.email) {
          try {
            const userFromDb = await prisma.user.findUnique({
              where: { email: session.user.email },
              select: { id: true },
            });
            if (userFromDb) {
              userId = userFromDb.id;
              console.info(`[NextAuth] Session callback: looked up user ID ${userId} by email ${session.user.email}`);
            }
          } catch (error) {
            console.error('[NextAuth] Session callback: error looking up user by email:', error);
          }
        }

        // Fallback to token.id if we couldn't look up by email
        if (!userId) {
          userId = token?.id;
        }

        if (userId) {
          console.info(`[NextAuth] Session callback: setting session.user.id to ${userId}`)
          session.user.id = userId as string

          try {
            const organizations = await getUserOrganizations(userId as string)
            console.info(`[NextAuth] Session callback: found ${organizations.length} organizations for user ${userId}`)
            session.user.organizations = organizations.map((org) => ({
              id: org.id,
              name: org.name,
              slug: org.slug,
              role: org.members.find((member) => member.userId === userId)?.role || 'MEMBER',
            }))
          } catch (error) {
            console.error('[NextAuth] Session callback: error fetching user organizations:', error)
            // Continue with empty organizations array to avoid breaking the session
            session.user.organizations = []
          }
        } else {
          console.warn(`[NextAuth] Session callback: no user ID available`, { tokenId: token?.id, sessionUserEmail: session.user.email });
        }
        return session
      } catch (error) {
        console.error('[NextAuth] Session callback error:', error)
        return session
      }
    },
    async signIn({ user, account, profile }) {
      try {
        // Extract email from multiple possible sources (user, profile, account)
        let email = user?.email;
        if (!email && profile?.email) {
          email = profile.email;
        }
        if (!email && account?.email) {
          email = account.email;
        }

        // Normalize email to lowercase and trim whitespace
        if (email) {
          email = email.toLowerCase().trim();
        }

        console.info(`[NextAuth] SignIn callback: user signed in with email ${email} ${account ? `(provider: ${account.provider})` : ''}`, {
          user: {
            email: user?.email,
            id: user?.id,
            name: user?.name
          },
          profile: {
            email: profile?.email
          },
          account: account ? {
            provider: account.provider,
            type: account.type,
            email: account?.email
          } : null
        });

        if (email) {
          // Find user by email (works for both new and existing users)
          const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true },
          })

          if (existingUser) {
            console.info(`[NextAuth] SignIn callback: calling ensureUserOnboarding for existing user ${existingUser.id}`)
            await ensureUserOnboarding(existingUser)
          } else {
            console.info(`[NextAuth] SignIn callback: new user signing in, ensureUserOnboarding will be called via createUser event`)
          }
        } else {
          console.warn(`[NextAuth] SignIn callback: no email found in user, profile, or account objects`, {
            user: { email: user?.email, id: user?.id, name: user?.name },
            profile: { email: profile?.email },
            account: { email: account?.email }
          });
        }
        return true
      } catch (error) {
        console.error('[NextAuth] SignIn callback error:', error)
        // Return true to avoid blocking sign-in, but log the error
        return true
      }
    },
  },
  events: {
    async createUser({ user }) {
      try {
        // Normalize email for consistency
        const normalizedEmail = user.email ? user.email.toLowerCase().trim() : null;
        console.info(`[NextAuth] CreateUser event: new user created with id ${user.id} and email ${normalizedEmail || user.email}`, {
          user: {
            id: user.id,
            email: normalizedEmail || user.email,
            emailVerified: user.emailVerified,
            name: user.name
          }
        });
        await ensureUserOnboarding(user)
      } catch (error) {
        console.error('[NextAuth] CreateUser event error:', error)
        // Don't throw - we don't want to break user creation
      }
    },
  },
}

export const authHandler = NextAuth(authConfig)
