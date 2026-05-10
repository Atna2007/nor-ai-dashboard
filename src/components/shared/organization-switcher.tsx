'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Organization {
  id: string
  name: string
  slug: string
  role: string
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
  currentOrgSlug?: string
  onSelectOrg?: (org: Organization) => void
}

export function OrganizationSwitcher({
  organizations,
  currentOrgSlug,
  onSelectOrg,
}: OrganizationSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [newOrgName, setNewOrgName] = React.useState('')
  const [newOrgSlug, setNewOrgSlug] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const currentOrg = organizations.find((org) => org.slug === currentOrgSlug)

  const handleCreateOrg = async () => {
    if (!newOrgName || !newOrgSlug) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug.toLowerCase().replace(/\s+/g, '-'),
        }),
      })

      if (response.ok) {
        setCreateDialogOpen(false)
        setNewOrgName('')
        setNewOrgSlug('')
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to create organization:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger render={<Button variant="outline" role="combobox" aria-expanded={open} aria-label="Select organization" className="w-full justify-between" />}>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                {currentOrg?.name?.[0]?.toUpperCase() || 'O'}
              </span>
            </div>
            <span className="truncate">{currentOrg?.name || 'Select...'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                onSelectOrg?.(org)
                setOpen(false)
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground font-bold text-xs">
                    {org.name[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="truncate">{org.name}</span>
                {org.slug === currentOrgSlug && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setCreateDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Create a new organization to collaborate with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                placeholder="Acme Inc"
                value={newOrgName}
                onChange={(e) => {
                  setNewOrgName(e.target.value)
                  setNewOrgSlug(
                    e.target.value.toLowerCase().replace(/\s+/g, '-')
                  )
                }}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                placeholder="acme-inc"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This will be used in URLs
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateOrg}
              disabled={isLoading || !newOrgName || !newOrgSlug}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
