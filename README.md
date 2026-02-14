# Temple Danka CRM

Temple Danka CRM is a Next.js + Prisma + PostgreSQL app for temple household/event/payment operations, with RBAC and audit logging.

## Stack
- Next.js (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Auth.js (NextAuth) + Google OAuth

## Environment Variables
Copy `.env.example` to `.env` and set values:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="..."
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
ALLOWED_GOOGLE_EMAILS="admin@example.com,staff@example.com"
```

### Auth policy
- Google login is allowlist-based (`ALLOWED_GOOGLE_EMAILS`).
- First Google login auto-creates a `Staff` user if not found.
- Legacy `username/password` login is still enabled for phased migration.

## Local Setup
1. Install deps
   ```bash
   npm install
   ```
2. Run Prisma migration and generate client
   ```bash
   npm run db:migrate
   npx prisma generate
   ```
3. Seed initial data
   ```bash
   npm run db:seed
   ```
4. Start app
   ```bash
   npm run dev
   ```

## Shared Data Operation (multi-PC)
- Use one shared PostgreSQL instance (recommended: Supabase Postgres).
- Set the same `DATABASE_URL` on every operator PC.
- Apply migrations once per environment.

## Google OAuth Setup
In Google Cloud Console:
1. Create OAuth Client (Web application).
2. Add redirect URI:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `<your-domain>/api/auth/callback/google` (production)
3. Put Client ID/Secret in `.env`.

## Production Checklist (Vercel + Supabase + Google OAuth)

Example production domain used in this checklist:
- `https://temple-crm.vercel.app`

### 0) Preflight (before first deploy)
- [ ] `main` branch is up-to-date and build passes locally:
  ```bash
  npm run lint
  npm run build
  ```
- [ ] Supabase project is created and connection string is ready (`DATABASE_URL`).
- [ ] Google OAuth client exists (Web application).
- [ ] Allowed emails are finalized for operations (`ALLOWED_GOOGLE_EMAILS`).

### 1) Supabase (production DB)
- [ ] In Supabase, confirm DB is reachable from Vercel.
- [ ] Apply schema migration to production DB:
  ```bash
  npx prisma migrate deploy
  npx prisma generate
  ```
- [ ] Seed only required data (roles/admin). Avoid sample data in production.

### 2) Google OAuth (production)
- [ ] OAuth consent screen is configured (app name/support email).
- [ ] If app is in Testing, add all operator accounts to Test users.
- [ ] OAuth client settings include:
  - [ ] Authorized JavaScript origins: `https://temple-crm.vercel.app`
  - [ ] Authorized redirect URIs: `https://temple-crm.vercel.app/api/auth/callback/google`

### 3) Vercel project setup
- [ ] Import GitHub repo into Vercel.
- [ ] Set Framework preset to Next.js.
- [ ] Configure Environment Variables (Production):
  - [ ] `DATABASE_URL`
  - [ ] `DIRECT_URL`
  - [ ] `NEXTAUTH_URL` = `https://temple-crm.vercel.app`
  - [ ] `NEXTAUTH_SECRET`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `ALLOWED_GOOGLE_EMAILS`
  - [ ] `JWT_SECRET`
- [ ] Trigger production deploy.

### 4) Post-deploy smoke test
- [ ] Open `https://temple-crm.vercel.app/login`.
- [ ] Confirm Google sign-in works for allowlisted account.
- [ ] Confirm non-allowlisted Google account is denied.
- [ ] Confirm Admin can open `/admin/users` and change role/isActive.
- [ ] Confirm Staff cannot access Admin endpoints (403 expected).
- [ ] Create/update one record each (household/deceased/event/transaction).
- [ ] Verify audit logs are written for key mutations.

### 5) Operations and rollback
- [ ] Keep previous Vercel deployment available for instant rollback.
- [ ] If production issue occurs:
  1. Roll back to previous Vercel deployment.
  2. Revert problematic code in Git.
  3. Re-deploy after verification in preview/local.
