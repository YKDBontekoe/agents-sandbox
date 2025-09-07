This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Configuration

Environment variables are validated and layered in `packages/infrastructure/config/config.ts`. Provide values via `.env.local`.

| Key | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | Node environment | `development` |
| `VERCEL_ENV` | Vercel environment | `local` |
| `NEXT_PUBLIC_LOG_LEVEL` | Client log level | `debug` in development, `error` otherwise |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for browser | required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | required |
| `SUPABASE_URL` | Supabase service URL | required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | required |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | required |
| `OPENAI_API_KEY` | OpenAI key (optional) | - |
| `NEXT_PUBLIC_OFFLINE_MODE` | Use local data instead of API | `false` |
| `NEXT_PUBLIC_DISABLE_REALTIME` | Disable realtime updates | `false` |

## Design Tokens

Global color tokens are defined in `src/app/globals.css` and surfaced in Tailwind via `theme.extend.colors`.
Use these classes instead of hard-coded palettes when building UI:

| Token | Tailwind Class | Purpose |
|-------|---------------|---------|
| `--color-background` | `bg-background`, `text-background` | Page background color |
| `--color-foreground` | `text-foreground`, `bg-foreground` | Primary text color |
| `--color-primary` | `bg-primary`, `text-primary` | Brand accents and primary actions |
| `--color-secondary` | `bg-secondary`, `text-secondary` | Hover/active states for primary elements |
| `--color-accent` | `bg-accent`, `text-accent` | Supplementary accents |
| `--color-muted` | `text-muted`, `bg-muted` | De-emphasized text or surfaces |
| `--color-panel` | `bg-panel`, `text-panel` | Card and panel backgrounds |
| `--color-border` | `border-border` | Standard border color |
| `--color-success` | `bg-success`, `text-success` | Positive messaging |
| `--color-warning` | `bg-warning`, `text-warning` | Cautionary messaging |
| `--color-danger` | `bg-danger`, `text-danger` | Errors and destructive actions |
| `--color-inverse` | `text-inverse` | Text contrasting against accent backgrounds |

Dark mode overrides are provided under the `.dark` class.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
