# nor.ai Dashboard

Modern SaaS Dashboard - Multi-tenant Analytics Platform built with Next.js 15, TypeScript, and shadcn/ui.

## Features

- **Multi-tenant Architecture** - Organization support with role-based access control (OWNER, ADMIN, MEMBER, VIEWER)
- **Authentication** - NextAuth with Google and GitHub OAuth providers
- **Real-time Analytics** - Dashboard with metrics and charts (Recharts ready)
- **API First** - RESTful API with API key management and webhooks
- **Audit Logs** - Complete audit trail for compliance and debugging
- **Dark/Light Mode** - Theme toggle with persistent preferences
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Type Safe** - Full TypeScript coverage

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
nor-ai-dashboard/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/
│   │   ├── api/auth/       # NextAuth routes
│   │   ├── auth/           # Login/Signup pages
│   │   ├── dashboard/      # Protected dashboard pages
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Marketing landing page
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── shared/         # Shared components
│   │   └── theme-provider.tsx
│   └── lib/
│       ├── auth.ts         # NextAuth config
│       ├── db.ts           # Prisma client
│       └── utils.ts
├── design-system/
│   └── MASTER.md           # Design system documentation
└── .env.example
```

## Database Schema

Main models:
- **User** - User accounts with OAuth support
- **Organization** - Multi-tenant organizations
- **OrganizationMember** - User memberships with roles
- **Project** - Projects within organizations
- **Metric** - Time-series metrics for analytics
- **ApiKey** - API authentication keys
- **Webhook** - Webhook configurations
- **AuditLog** - Audit trail logs

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository to Vercel
3. Configure environment variables
4. Deploy

## License

MIT License
