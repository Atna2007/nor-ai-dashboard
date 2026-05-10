'use client'

import * as React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Globe, Plus, Power, Trash2 } from 'lucide-react'
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

const AVAILABLE_EVENTS = ['project.created', 'project.updated', 'api_key.created', 'team.invited']

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  lastTriggeredAt: string | null
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([])
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    name: '',
    url: '',
    events: ['project.created'],
  })

  const fetchWebhooks = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/webhooks')
      if (!response.ok) throw new Error('Failed to load webhooks')
      const data = await response.json()
      setWebhooks(data.webhooks || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load webhooks')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWebhooks()
  }, [fetchWebhooks])

  function toggleEvent(eventName: string) {
    setForm((current) => ({
      ...current,
      events: current.events.includes(eventName)
        ? current.events.filter((event) => event !== eventName)
        : [...current.events, eventName],
    }))
  }

  async function createWebhook() {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error('Failed to create webhook')
      const data = await response.json()
      setWebhooks((items) => [data.webhook, ...items])
      setForm({ name: '', url: '', events: ['project.created'] })
      setOpen(false)
      toast.success('Webhook created')
    } catch (error) {
      console.error(error)
      toast.error('Failed to create webhook')
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleActive(webhook: Webhook) {
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !webhook.active }),
      })
      if (!response.ok) throw new Error('Failed to update webhook')
      const data = await response.json()
      setWebhooks((items) => items.map((item) => item.id === webhook.id ? data.webhook : item))
      toast.success(data.webhook.active ? 'Webhook enabled' : 'Webhook paused')
    } catch (error) {
      console.error(error)
      toast.error('Failed to update webhook')
    }
  }

  async function deleteWebhook(id: string) {
    try {
      const response = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete webhook')
      setWebhooks((items) => items.filter((item) => item.id !== id))
      toast.success('Webhook deleted')
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete webhook')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send product events to external systems
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
            <Plus className="h-3.5 w-3.5" />
            New Webhook
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create webhook</DialogTitle>
              <DialogDescription>Choose the events your endpoint should receive.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-name">Name</Label>
                <Input id="webhook-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Production events" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input id="webhook-url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://example.com/webhooks/nor" />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {AVAILABLE_EVENTS.map((eventName) => (
                    <label key={eventName} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.events.includes(eventName)}
                        onChange={() => toggleEvent(eventName)}
                        className="h-4 w-4"
                      />
                      <span className="font-mono text-xs">{eventName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={createWebhook} disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0 || isSaving}>
                {isSaving ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Configured Webhooks
          </CardTitle>
          <CardDescription>Delivery endpoints connected to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading webhooks...</TableCell>
                </TableRow>
              ) : webhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No webhooks configured</TableCell>
                </TableRow>
              ) : (
                webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="max-w-[260px] truncate font-mono text-xs text-muted-foreground">{webhook.url}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((eventName) => <Badge key={eventName} variant="outline">{eventName}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.active ? 'default' : 'secondary'}>
                        {webhook.active ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {webhook.lastTriggeredAt ? formatDistanceToNow(new Date(webhook.lastTriggeredAt), { addSuffix: true }) : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(webhook)} aria-label="Toggle webhook">
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteWebhook(webhook.id)} aria-label="Delete webhook">
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
