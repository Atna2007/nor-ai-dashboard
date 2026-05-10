'use client'

import * as React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Copy, Key, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsedAt: string | null
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([])
  const [name, setName] = React.useState('')
  const [plainTextKey, setPlainTextKey] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const fetchApiKeys = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/api-keys')
      if (!response.ok) throw new Error('Failed to load API keys')
      const data = await response.json()
      setApiKeys(data.apiKeys || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApiKeys()
  }, [fetchApiKeys])

  async function createApiKey() {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error('Failed to create API key')
      const data = await response.json()
      setApiKeys((keys) => [data.apiKey, ...keys])
      setPlainTextKey(data.plainTextKey)
      setName('')
      toast.success('API key created')
    } catch (error) {
      console.error(error)
      toast.error('Failed to create API key')
    } finally {
      setIsSaving(false)
    }
  }

  async function revokeApiKey(id: string) {
    try {
      const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to revoke API key')
      setApiKeys((keys) => keys.filter((key) => key.id !== id))
      toast.success('API key revoked')
    } catch (error) {
      console.error(error)
      toast.error('Failed to revoke API key')
    }
  }

  async function copyKey(value: string) {
    await navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate and revoke tokens for external integrations
          </p>
        </div>
        <Dialog open={open} onOpenChange={(value) => {
          setOpen(value)
          if (!value) setPlainTextKey(null)
        }}>
          <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
            <Plus className="h-3.5 w-3.5" />
            New Key
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                The full token is shown once after creation.
              </DialogDescription>
            </DialogHeader>
            {plainTextKey ? (
              <div className="space-y-3">
                <Label htmlFor="new-key">New token</Label>
                <div className="flex gap-2">
                  <Input id="new-key" value={plainTextKey} readOnly className="font-mono text-xs" />
                  <Button type="button" size="icon" variant="outline" onClick={() => copyKey(plainTextKey)} aria-label="Copy API key">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Production API"
                  disabled={isSaving}
                />
              </div>
            )}
            <DialogFooter>
              {plainTextKey ? (
                <Button onClick={() => setOpen(false)}>Done</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
                  <Button onClick={createApiKey} disabled={!name.trim() || isSaving}>
                    {isSaving ? 'Creating...' : 'Create'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Active Keys
          </CardTitle>
          <CardDescription>Tokens with access to the nor.ai API</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading API keys...</TableCell>
                </TableRow>
              ) : apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No API keys yet</TableCell>
                </TableRow>
              ) : (
                apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{apiKey.key}</TableCell>
                    <TableCell>
                      {apiKey.lastUsedAt ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true }) : <Badge variant="outline">Never</Badge>}
                    </TableCell>
                    <TableCell>{formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => revokeApiKey(apiKey.id)} aria-label="Revoke API key">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
