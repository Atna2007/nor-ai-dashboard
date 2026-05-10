'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Filter, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'INVITE'
  resource: 'PROJECT' | 'ORGANIZATION' | 'TEAM_MEMBER' | 'API_KEY' | 'WEBHOOK'
  resourceId: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string | null
  } | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  LOGIN: 'bg-purple-500',
  LOGOUT: 'bg-gray-500',
  INVITE: 'bg-yellow-500',
}

const getActionBadgeVariant = (action: string) => {
  switch (action) {
    case 'CREATE':
      return 'default'
    case 'UPDATE':
      return 'secondary'
    case 'DELETE':
      return 'destructive'
    case 'LOGIN':
    case 'LOGOUT':
      return 'outline'
    case 'INVITE':
      return 'outline'
    default:
      return 'default'
  }
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterAction, setFilterAction] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await fetch('/api/audit-logs')
        if (!response.ok) throw new Error('Failed to fetch audit logs')
        const data = await response.json()
        setAuditLogs(data.auditLogs || [])
      } catch (err) {
        console.error('Error fetching audit logs:', err)
        toast.error('Failed to load audit logs')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAuditLogs()
  }, [])

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = !filterAction || log.action === filterAction

    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Track all actions in your organization
        </p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterAction || 'All Actions'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterAction(null)}>
                  All Actions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterAction('CREATE')}>
                  Create
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterAction('UPDATE')}>
                  Update
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterAction('DELETE')}>
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterAction('LOGIN')}>
                  Login
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterAction('LOGOUT')}>
                  Logout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterAction('INVITE')}>
                  Invite
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Recent actions from your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterAction
                      ? 'No logs found matching your filters'
                      : 'No audit logs available'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${actionColors[log.action]}`}
                        />
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{log.resource}</TableCell>
                    <TableCell>
                      {log.user?.name || log.user?.email || 'System'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-80">
                            <div className="p-2">
                              <p className="text-xs font-medium mb-2">Metadata</p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Retention Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Log Retention</CardTitle>
          </div>
          <CardDescription>
            Audit log retention period based on your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Free Plan:</span> 90 days
            </p>
            <p>
              <span className="font-medium">Pro/Enterprise:</span> 1 year
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
