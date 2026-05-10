"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  BarChart3,
  Database,
  Settings,
  FileText,
  Bell,
  LogOut,
  Building2,
  Key,
  Webhook,
} from "lucide-react"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { OrganizationSwitcher } from "@/components/shared/organization-switcher"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Data", href: "/dashboard/data", icon: Database },
]

const settings = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Team", href: "/dashboard/settings/team", icon: Building2 },
  { name: "API Keys", href: "/dashboard/settings/api-keys", icon: Key },
  { name: "Webhooks", href: "/dashboard/settings/webhooks", icon: Webhook },
  { name: "Audit Logs", href: "/dashboard/audit-logs", icon: FileText },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const organizations = React.useMemo(
    () => session?.user?.organizations || [],
    [session?.user?.organizations]
  )
  const [selectedOrgSlug, setSelectedOrgSlug] = React.useState<string>()
  const currentOrgSlug = selectedOrgSlug || organizations[0]?.slug

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar hidden md:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">nor</span>
              </div>
              <span className="font-semibold text-foreground">nor.ai</span>
            </Link>
          </div>

          {/* Organization Switcher */}
          <div className="p-3 border-b border-border">
            <OrganizationSwitcher
              organizations={organizations}
              currentOrgSlug={currentOrgSlug}
              onSelectOrg={(org) => setSelectedOrgSlug(org.slug)}
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <div className="mb-4">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Main
              </p>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>

            <div>
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Settings
              </p>
              {settings.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-6">
          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <LayoutDashboard className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
