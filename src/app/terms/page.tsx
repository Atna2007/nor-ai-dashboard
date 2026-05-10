import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost">
          <Link href="/">Back</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>nor.ai provides dashboard, analytics, API key, webhook, and organization management tools.</p>
            <p>Users are responsible for the data they submit and for keeping account credentials secure.</p>
            <p>Access may be limited or removed when usage threatens platform reliability, security, or legal compliance.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}