# GitHub Actions Dashboard

Next.js dashboard behind a username/password login. Shows your repos, latest workflow runs, and Actions minutes used/remaining this month.

## Deploy to Vercel
1. Push this repo, import it in Vercel (framework: Next.js).
2. Set `SESSION_SECRET` (`openssl rand -hex 32`) and optionally `GITHUB_ORGS`.
3. Deploy, open the URL and sign in by pasting a GitHub **classic** token (`repo`, `read:user`, `user`, `read:org`). The login page explains how to create one.

## Local
`cp .env.example .env.local`, set SESSION_SECRET, `npm i && npm run dev`.

The token is kept in an AES-GCM encrypted, HTTP-only cookie; all GitHub calls are server-side.
