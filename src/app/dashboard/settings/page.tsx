'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Building2, User, Bell, Shield, Trash2, Save } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
  members: Array<{
    userId: string | null
    role: string
  }>
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [formData, setFormData] = React.useState({
    name: undefined as string | undefined,
    email: undefined as string | undefined,
    notifications: {
      email: true,
      push: false,
      marketing: false,
    },
  })
  const [organization, setOrganization] = React.useState<Organization | null>(null)
  const [orgForm, setOrgForm] = React.useState({
    name: '',
    slug: '',
  })
  const [isSavingProfile, setIsSavingProfile] = React.useState(false)
  const [isSavingOrg, setIsSavingOrg] = React.useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)
  const profileName = formData.name ?? session?.user?.name ?? ''
  const profileEmail = formData.email ?? session?.user?.email ?? ''
  const canEditOrganization = organization?.members.some(
    (member) =>
      member.userId === session?.user?.id &&
      (member.role === 'OWNER' || member.role === 'ADMIN')
  ) ?? false

  React.useEffect(() => {
    async function fetchOrganization() {
      try {
        const response = await fetch('/api/organizations')
        if (!response.ok) throw new Error('Failed to load organizations')
        const data = await response.json()
        const firstOrganization = data.organizations?.[0] as Organization | undefined

        if (firstOrganization) {
          setOrganization(firstOrganization)
          setOrgForm({
            name: firstOrganization.name,
            slug: firstOrganization.slug,
          })
        }
      } catch (error) {
        console.error(error)
        toast.error('Failed to load organization settings')
      }
    }

    if (session?.user?.id) {
      fetchOrganization()
    }
  }, [session?.user?.id])

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save profile')
      }

      await update()
      toast.success('Profile updated')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveOrganization = async () => {
    if (!organization) return

    setIsSavingOrg(true)
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgForm),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save organization')
      }

      const data = await response.json()
      setOrganization((current) => current ? { ...current, ...data.organization } : current)
      setOrgForm({
        name: data.organization.name,
        slug: data.organization.slug,
      })
      await update()
      toast.success('Organization updated')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save organization')
    } finally {
      setIsSavingOrg(false)
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Settings</CardTitle>
          </div>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profileName}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profileEmail}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={isSavingProfile || !profileName || !profileEmail}>
            <Save className="mr-2 h-4 w-4" />
            {isSavingProfile ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Organization Settings</CardTitle>
          </div>
          <CardDescription>
            Manage your organization details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgForm.name}
              onChange={(event) => setOrgForm({ ...orgForm, name: event.target.value })}
              placeholder="Acme Inc"
              disabled={!organization || !canEditOrganization || isSavingOrg}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-slug">Organization Slug</Label>
            <Input
              id="org-slug"
              value={orgForm.slug}
              onChange={(event) => setOrgForm({
                ...orgForm,
                slug: event.target.value.toLowerCase().replace(/\s+/g, '-'),
              })}
              placeholder="acme-inc"
              disabled={!organization || !canEditOrganization || isSavingOrg}
            />
            <p className="text-xs text-muted-foreground">
              {organization
                ? 'This will be used in URLs'
                : 'Create an organization to manage these settings'}
            </p>
          </div>
          <Button
            onClick={handleSaveOrganization}
            disabled={!organization || !canEditOrganization || !orgForm.name || !orgForm.slug || isSavingOrg}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSavingOrg ? 'Saving...' : 'Save Organization'}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <CardDescription>
            Choose how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Button
              variant={formData.notifications.email ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({
                ...formData,
                notifications: { ...formData.notifications, email: !formData.notifications.email },
              })}
            >
              {formData.notifications.email ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications in the app
              </p>
            </div>
            <Button
              variant={formData.notifications.push ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({
                ...formData,
                notifications: { ...formData.notifications, push: !formData.notifications.push },
              })}
            >
              {formData.notifications.push ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive product updates and offers
              </p>
            </div>
            <Button
              variant={formData.notifications.marketing ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({
                ...formData,
                notifications: { ...formData.notifications, marketing: !formData.notifications.marketing },
              })}
            >
              {formData.notifications.marketing ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}