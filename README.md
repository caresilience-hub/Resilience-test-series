# Resilience Test Series

Modern, mobile-friendly Next.js scaffold for a CA Final online test series platform with:

- Public landing page
- Student registration flow
- Student dashboard
- Admin dashboard
- OTP/email login flow
- Razorpay payment integration
- Prisma/PostgreSQL schema
- Upload and evaluation APIs
- Refund eligibility logic
- Seed demo data

## Tech Stack

- Next.js App Router
- Tailwind CSS
- Prisma ORM
- PostgreSQL or Supabase PostgreSQL
- Razorpay
- SMTP-ready email notifications
- WhatsApp integration placeholder

## Project Structure

- `app/` pages, dashboards, and API routes
- `components/` shared UI shells
- `lib/` pricing, business logic, session helpers, and mock data
- `prisma/schema.prisma` database schema
- `prisma/seed.ts` demo data seed

## Pricing Logic

- Full 6-subject package: `₹1199` course fee + `₹1000` refundable deposit
- Individual subject slabs: dynamic pricing based on selected subjects
- Example supported in scaffold: `3 subjects = ₹599 + ₹500 deposit`

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Point `DATABASE_URL` to PostgreSQL or Supabase.

4. Generate Prisma client and push schema:

```bash
npm run prisma:generate
npm run db:push
```

5. Seed demo data:

```bash
npm run seed
```

6. Start development server:

```bash
npm run dev
```

## Demo Credentials

- Admin email: `admin@resillience.in`
- Student email: `student@resillience.in`
- Dev OTP: `123456`

## Notes

- Razorpay checkout is wired through API routes and will require production keys for live use.
- Sample answer access is gated until a submission exists for that paper.
- Refund approval is manually controlled by admin after checking sincere attempt and deadline compliance.
- Email and WhatsApp integrations are intentionally scaffolded so they can be connected to production providers later.
- File uploads use Vercel Blob in production and can fall back to local disk during development when the Blob token is not configured.
