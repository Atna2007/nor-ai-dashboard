import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost">
          <Link href="/">Back</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>nor.ai stores account profile data, organization membership, audit logs, API key metadata, and webhook configuration.</p>
            <p>API key secrets are shown once at creation. OAuth provider data is used only for authentication and account display.</p>
            <p>Contact the site operator to request account deletion or data export.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}