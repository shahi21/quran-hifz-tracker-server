# Quran Hifz Tracker (Server)

Express + TypeScript API with Prisma + PostgreSQL and JWT auth.

## Setup

1. Install
   - `npm ci`
2. Configure env
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
3. Prisma
   - `npm run prisma:generate`
   - Dev DB migration: `npm run prisma:migrate`
   - Seed (surahs): `npm run prisma:seed`
4. Run
   - `npm run dev`

## Production

1. Build: `npm run build`
2. Migrate: `npm run prisma:migrate:deploy`
3. Start: `npm run start`

## Health

- `GET /health`

