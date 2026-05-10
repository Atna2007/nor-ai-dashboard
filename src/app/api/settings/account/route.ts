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