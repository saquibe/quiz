This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## OGSOS Gold Medal Examination 2026

### Admin dashboard

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` to enable administrator sign-in at `/admin`. Set `ADMIN_SESSION_SECRET` to a long, random secret used to sign the eight-hour HTTP-only admin session cookie. If omitted, the session signature uses `ADMIN_PASSWORD`.

The dashboard provides candidate attempt search, status filters, score/date sorting, answer and unanswered-question details, and CSV export. All admin data and export APIs require a valid signed admin session.

The examination portal uses Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, and MongoDB/Mongoose. Its 50 questions and embedded image assets come from `PG MEDAL EXAM PART A.docx`.

### Run locally

1. Start MongoDB and copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` in `.env.local`.
3. Run `npm install`, then `npm run dev` and open `http://localhost:3000`.

Question records are seeded into MongoDB when an attempt starts. Correct answers remain server-side and are not included in question API responses. Timers are enforced server-side: each question receives 60 seconds, with its clock paused while skipped and resumed on return, and the section timers are 20, 20, and 10 minutes. Candidates can submit a section early after answering every question; otherwise the section advances when its timer expires.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
