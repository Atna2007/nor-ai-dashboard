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
  try {
    console.info('[Onboarding] Starting user onboarding process', {
      userId: user.id,
      email: user.email,
      name: user.name
    });

    if (!user.email) {
      console.warn('[Onboarding] User has no email, skipping onboarding');
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

    console.info('[Onboarding] Found pending invites:', {
      count: pendingInvites.length,
      invites: pendingInvites.map(i => ({ id: i.id, email: i.inviteEmail }))
    });

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

    console.info('[Onboarding] Found existing memberships:', {
      count: memberships.length
    });

    if (memberships.length > 0) {
      console.info('[Onboarding] User already has organization membership, skipping onboarding');
      return
    }

    const displayName = user.name?.trim() || normalizedEmail.split('@')[0] || 'New User'
    const baseSlug = createSlug(displayName, `user-${user.id.slice(0, 8)}`)
    const slug = await getAvailableOrganizationSlug(baseSlug)

    console.info('[Onboarding] Creating new organization for user', {
      displayName,
      baseSlug,
      slug
    });

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

    console.info('[Onboarding] User onboarding completed successfully');
  } catch (error) {
    console.error('[Onboarding] Error ensuring user onboarding:', error)
    // Don't throw - we don't want to block sign-in due to onboarding issues
  }
}