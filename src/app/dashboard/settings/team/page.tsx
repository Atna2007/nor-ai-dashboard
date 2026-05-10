'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, UserPlus, Shield, Trash2, Mail } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  status: 'active' | 'pending' | 'invited'
  avatar?: string
}

const roleColors: Record<string, string> = {
  OWNER: 'bg-purple-500',
  ADMIN: 'bg-blue-500',
  MEMBER: 'bg-green-500',
  VIEWER: 'bg-gray-500',
}

export default function TeamPage() {
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<'MEMBER' | 'VIEWER'>('MEMBER')
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch team members from API
  React.useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch('/api/team')
        if (!response.ok) throw new Error('Failed to fetch team members')
        const data = await response.json()
        setMembers(data.members || [])
      } catch (err) {
        console.error('Error fetching team:', err)
        toast.error('Failed to load team members')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTeam()
  }, [])

  const handleInvite = async () => {
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!response.ok) throw new Error('Failed to send invite')
      const data = await response.json()
      setMembers([...members, data.member])
      toast.success('Invite sent successfully')
      setIsInviteDialogOpen(false)
      setInviteEmail('')
      setInviteRole('MEMBER')
    } catch (err) {
      console.error('Error inviting member:', err)
      toast.error('Failed to send invite')
    }
  }

  const handleRemove = async (id: string) => {
    try {
      const response = await fetch(`/api/team/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to remove member')
      setMembers(members.filter((m) => m.id !== id))
      toast.success('Member removed successfully')
    } catch (err) {
      console.error('Error removing member:', err)
      toast.error('Failed to remove member')
    }
  }

  const handleRoleChange = async (id: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
    try {
      const response = await fetch(`/api/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!response.ok) throw new Error('Failed to update role')
      setMembers(
        members.map((m) => (m.id === id ? { ...m, role: newRole } : m))
      )
      toast.success('Role updated successfully')
    } catch (err) {
      console.error('Error updating role:', err)
      toast.error('Failed to update role')
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default'
      case 'ADMIN':
        return 'secondary'
      case 'MEMBER':
        return 'outline'
      case 'VIEWER':
        return 'outline'
      default:
        return 'default'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'invited':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as 'MEMBER' | 'VIEWER')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite}>
                <Mail className="mr-2 h-4 w-4" />
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People with access to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Loading team members...
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No team members found
                  </TableCell>
                </TableRow>
              ) : members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {member.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${roleColors[member.role]}`}
                      />
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(member.status)}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== 'OWNER' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'ADMIN')}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'MEMBER')}
                          >
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'VIEWER')}
                          >
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemove(member.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {members.some((m) => m.status === 'invited') && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              Invitations that have not been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members
                  .filter((m) => m.status === 'invited')
                  .map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>Pending</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
