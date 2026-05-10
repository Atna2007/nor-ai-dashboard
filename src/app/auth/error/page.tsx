"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Extract error parameters from URL that NextAuth passes
  const errorType = searchParams.get("error") || "unknown"
  const errorMessage = searchParams.get("message")

  const handleBackToSignIn = () => {
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            There was an issue with your sign-in attempt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Error: {errorType}
            </p>
            {errorMessage && (
              <p className="text-sm text-muted-foreground break-all">
                Details: {errorMessage}
              </p>
            )}
          </div>

          <p className="text-muted-foreground text-center">
            If you continue to see this message, please contact support.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleBackToSignIn}
          >
            Go back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}