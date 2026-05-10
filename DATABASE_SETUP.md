# Database Setup Guide

This guide will help you set up the PostgreSQL database for nor-ai-dashboard.

## Quick Start (Recommended)

### Option 1: Neon (Cloud - Free Tier) **RECOMMENDED**

**Why Neon**: Serverless PostgreSQL, free tier includes 0.5 GB storage, no credit card required, setup in 2 minutes.

1. Go to [neon.tech](https://neon.tech) and sign up with GitHub
2. Click "Create a project"
3. Name it `nor-ai-dashboard`
4. Copy the connection string (looks like `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`)
5. Add to `.env.local`:
   ```
   DATABASE_URL=your_neon_connection_string
   ```

### Option 2: Docker (Local - Fast Setup)

**Why Docker**: Isolated, reproducible, no local PostgreSQL installation needed.

**Requires**: Docker Desktop installed

1. Start the database:
   ```bash
   docker compose up -d
   ```

2. The connection string is already configured in `.env.local`:
   ```
   DATABASE_URL=postgresql://nor:nor_dev_password@localhost:5432/nor_ai_dashboard
   ```

### Option 3: Local PostgreSQL

**Why Local**: Full control, no external dependencies.

**Requires**: PostgreSQL installed locally

1. Install PostgreSQL (if not already installed):
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - Use default port 5432

2. Create database:
   ```bash
   psql -U postgres
   CREATE DATABASE nor_ai_dashboard;
   CREATE USER nor WITH PASSWORD 'nor_dev_password';
   GRANT ALL PRIVILEGES ON DATABASE nor_ai_dashboard TO nor;
   ```

3. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://nor:nor_dev_password@localhost:5432/nor_ai_dashboard
   ```

---

## After Database Setup

### Step 1: Verify Connection

Ensure your `.env.local` has the correct `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://...
```

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Push Schema to Database

```bash
npx prisma db push
```

This creates all tables in your database based on `prisma/schema.prisma`.

### Step 4: (Optional) Open Prisma Studio

```bash
npx prisma studio
```

This opens a web-based database browser at http://localhost:5555

---

## Troubleshooting

### Error: "Can't reach database server"

- Check if PostgreSQL is running
- Verify connection string format
- Check firewall settings (port 5432)

### Error: "DATABASE_URL environment variable is required"

- Ensure `.env.local` exists in project root
- Restart development server after adding `.env.local`

### Error: "Authentication failed"

- Verify username/password in connection string
- Check database user permissions

---

## Next Steps

After database is set up:

1. Configure OAuth providers (Google, GitHub) in `.env.local`
2. Run `npm run dev` to start the development server
3. Test authentication flow
