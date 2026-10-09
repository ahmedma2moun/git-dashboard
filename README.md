# GitHub Actions Dashboard

Next.js dashboard behind a username/password login. Shows your repos, latest workflow runs, and Actions minutes used/remaining this month.

## Deploy to Vercel
1. Push this repo, import it in Vercel (framework: Next.js, no build changes).
2. Set environment variables (see `.env.example`): `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD`, `SESSION_SECRET` (`openssl rand -hex 32`), `GITHUB_TOKEN`, optional `GITHUB_ORGS`.
3. Deploy. Visit the URL and sign in.

## GitHub token
Classic PAT with scopes `repo`, `read:user`, `user` (billing), and `read:org` for orgs. Fine-grained tokens can't read user billing.

## Local
`cp .env.example .env.local`, fill it in, `npm i && npm run dev`.

The token never reaches the browser; all GitHub calls are server-side behind a signed, HTTP-only session cookie.
