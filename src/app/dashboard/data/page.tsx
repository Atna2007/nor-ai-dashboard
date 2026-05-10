"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, FolderOpen,
  ChevronLeft, ChevronRight, ArrowUpDown, CheckCircle2,
  Clock, Archive, Filter, X, Database,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "active" | "completed" | "archived"

interface Project {
  id: string
  name: string
  description: string
  status: Status
  org: string
  events: number
  createdAt: string
}

const PAGE_SIZE = 6

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig: Record<Status, { label: string; icon: React.ElementType; className: string }> = {
  active:    { label: "Active",    icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  completed: { label: "Completed", icon: Clock,        className: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  archived:  { label: "Archived",  icon: Archive,      className: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" },
}

function StatusBadge({ status }: { status: Status }) {
  const { label, icon: Icon, className } = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
        {hasFilter ? <Search className="h-6 w-6 text-muted-foreground" /> : <FolderOpen className="h-6 w-6 text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium text-foreground">
        {hasFilter ? "No projects match your search" : "No projects yet"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {hasFilter ? "Try adjusting your filters or search term" : "Create your first project to get started"}
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DataPage() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [search, setSearch] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const [sortField, setSortField] = React.useState<keyof Project>("createdAt")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")
  const [page, setPage] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Project | null>(null)
  const [form, setForm] = React.useState({ name: "", description: "", status: "active" as Status, org: "" })

  const fetchProjects = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/projects")
      if (!response.ok) throw new Error("Failed to load projects")
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error(error)
      toast.error("Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects()
  }, [fetchProjects])

  // ── Filter + Sort + Paginate ────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return projects
      .filter((p) => {
        const matchTab = activeTab === "all" || p.status === activeTab
        const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.org.toLowerCase().includes(q)
        return matchTab && matchSearch
      })
      .sort((a, b) => {
        const av = a[sortField]
        const bv = b[sortField]
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sortDir === "asc" ? cmp : -cmp
      })
  }, [projects, search, activeTab, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(field: keyof Project) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    setForm({ name: "", description: "", status: "active", org: "" })
    setDialogOpen(true)
  }

  function openEdit(p: Project) {
    setEditing(p)
    setForm({ name: p.name, description: p.description, status: p.status, org: p.org })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    const payload = {
      name: form.name,
      description: form.description,
      status: form.status,
    }

    try {
      if (editing) {
        const response = await fetch(`/api/projects/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error("Failed to update project")
        const data = await response.json()
        setProjects((ps) => ps.map((p) => p.id === editing.id ? data.project : p))
      toast.success("Project updated")
      } else {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error("Failed to create project")
        const data = await response.json()
        setProjects((ps) => [data.project, ...ps])
        toast.success("Project created")
      }
      setDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast.error(editing ? "Failed to update project" : "Failed to create project")
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete project")
      setProjects((ps) => ps.filter((p) => p.id !== id))
      toast.success("Project deleted")
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete project")
    }
  }

  // ── Counts for tabs ─────────────────────────────────────────────────────────

  const counts = React.useMemo(() => ({
    all:       projects.length,
    active:    projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
    archived:  projects.filter((p) => p.status === "archived").length,
  }), [projects])

  const hasFilter = search.length > 0 || activeTab !== "all"

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage projects across all organizations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" onClick={openCreate} className="cursor-pointer gap-1.5" />}>
            <Plus className="h-3.5 w-3.5" /> New Project
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Project" : "New Project"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update the details for this project." : "Add a new project to your organization."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Name <span className="text-destructive">*</span></Label>
                <Input id="proj-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Analytics Service" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc">Description</Label>
                <Input id="proj-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description of the project" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-org">Organization</Label>
                <Input id="proj-org" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-status">Status</Label>
                <select
                  id="proj-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={handleSave} className="cursor-pointer">{editing ? "Save changes" : "Create project"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Projects", value: projects.length, icon: Database,    color: "text-blue-500",    bg: "bg-blue-500/10"    },
          { label: "Active",         value: counts.active,   icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Completed",      value: counts.completed, icon: Clock,       color: "text-violet-500",  bg: "bg-violet-500/10"  },
          { label: "Archived",       value: counts.archived,  icon: Archive,     color: "text-zinc-500",    bg: "bg-zinc-500/10"    },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="py-3 hover-card glass cursor-default">
            <CardContent className="flex items-center gap-3 px-4 py-0">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table card */}
      <Card className="glass">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <CardTitle className="text-base">Projects</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                {hasFilter && " · filtered"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-8 h-8 w-52 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value)
            setPage(1)
          }} className="mt-2">
            <TabsList className="h-8 text-xs">
              {(["all", "active", "completed", "archived"] as const).map((tab) => (
                <TabsTrigger key={tab} value={tab} className="text-xs px-3 capitalize cursor-pointer">
                  {tab === "all" ? "All" : tab}
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {counts[tab]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  {[
                    { key: "name",      label: "Project",      cls: "pl-6 w-[220px]" },
                    { key: "org",       label: "Organization",  cls: "hidden md:table-cell" },
                    { key: "status",    label: "Status",        cls: "hidden sm:table-cell" },
                    { key: "events",    label: "Events",        cls: "hidden lg:table-cell text-right" },
                    { key: "createdAt", label: "Created",       cls: "hidden md:table-cell" },
                  ].map(({ key, label, cls }) => (
                    <TableHead key={key} className={`text-xs font-medium ${cls}`}>
                      <button
                        onClick={() => toggleSort(key as keyof Project)}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      >
                        {label}
                        <ArrowUpDown className={`h-3 w-3 ${sortField === key ? "text-primary" : "text-muted-foreground/40"}`} />
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="w-12 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6"><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState hasFilter={hasFilter} />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((p) => (
                    <TableRow key={p.id} className="group cursor-default hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px] mt-0.5">{p.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.org}</TableCell>
                      <TableCell className="hidden sm:table-cell"><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-sm tabular-nums text-muted-foreground">
                        {p.events.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground tabular-nums">{p.createdAt}</TableCell>
                      <TableCell className="pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEdit(p)} className="cursor-pointer text-xs">
                              <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(p.id)} className="cursor-pointer text-xs text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {filtered.length} results
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon" className="h-7 w-7 cursor-pointer"
                  onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <Button
                    key={pg} variant={pg === page ? "default" : "ghost"}
                    size="icon" className="h-7 w-7 text-xs cursor-pointer"
                    onClick={() => setPage(pg)}
                  >
                    {pg}
                  </Button>
                ))}
                <Button
                  variant="outline" size="icon" className="h-7 w-7 cursor-pointer"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
