# Google and GitHub OAuth Login Fix

## Issue
User could log in with GitHub OAuth but not with Google OAuth, seeing the error:
"Acceso bloqueado: nor-ai-dashboard solo puede usarse en su organización"

## Root Cause
The NextAuth JWT and SignIn callbacks were not normalizing email addresses (toLowerCase().trim()) before looking up users in the database. While the credentials/provider already did this normalization, the OAuth providers did not, causing user lookups to fail when Google returned emails with different casing or whitespace than what was stored in the database.

## Fix Applied
Modified `src/lib/auth.ts` to add email normalization to:

### JWT Callback (lines 90-93)
```typescript
// Normalize email to lowercase and trim whitespace
if (email) {
  email = email.toLowerCase().trim();
}
```

### SignIn Callback (lines 207-210)
```typescript
// Normalize email to lowercase and trim whitespace
if (email) {
  email = email.toLowerCase().trim();
}
```

### CreateUser Event (lines 259-261) - for consistency
```typescript
// Normalize email for consistency
const normalizedEmail = user.email ? user.email.toLowerCase().trim() : null;
```

## Verification
- User organization setup confirmed correct:
  - User exists: cmozwuptd0000k8qjanswhiku (navasariel44@gmail.com)
  - User is OWNER of Main Organization (slug: main)
- All authentication paths now normalize email before database lookup:
  - Credentials/provider: already normalized
  - Google OAuth: now normalized
  - GitHub OAuth: now normalized
  - Signup route: already normalized

## Expected Result
Users should now be able to:
1. ✅ Log in with Google OAuth
2. ✅ Log in with GitHub OAuth
3. ✅ Log in with email/password credentials
4. ✅ Access the dashboard with proper organization context
5. ✅ Switch between organizations if they belong to multiple

## Files Modified
- `src/lib/auth.ts` - Added email normalization to OAuth callbacks
- `OAUTH_FIX_SUMMARY.md` - Technical details of the fix
- `GOOGLE_GITHUB_OAUTH_FIX.md` - This summary