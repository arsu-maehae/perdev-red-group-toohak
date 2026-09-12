# Acceptance checklist

This file separates code-complete checks from environment-dependent verification. Check an item only after observing it in the named environment.

## Automated locally

- [x] Production TypeScript/Vite build under `/perdev-red-group-toohak/`
- [x] Question validation and client/server scoring formulas covered
- [x] Answer-key tables have RLS, no client read policy, and explicit grant revocation
- [x] PIN phase/expiry/lock checks, duplicate/late rejection, host controls, deadlines, snapshots, and refresh identity are implemented in atomic RPCs
- [x] CI, Pages, database test, and live E2E workflows are included

## Requires connected Supabase + GitHub

- [x] Apply migration successfully to the hosted project
- [x] Host creates and publishes a quiz on the deployed site
- [x] Three independent players join one room
- [x] Countdown, question, submissions, reveal, leaderboard, and final podium synchronize
- [x] Refresh preserves player identity and accepted answer
- [x] Scores and reports persist; CSV downloads correctly
- [x] A second host cannot read private quizzes/reports
- [x] Assets and hash routes load from the Pages repository subpath
- [x] Deployed frontend connects to the real backend
- [ ] 50-player target load-tested; provider limits recorded

## Production evidence — 2026-09-13

- GitHub CI passed: [run 34706902910](https://github.com/arsu-maehae/perdev-red-group-toohak/actions/runs/34706902910).
- GitHub Pages build/deploy passed: [run 34706902853](https://github.com/arsu-maehae/perdev-red-group-toohak/actions/runs/34706902853).
- The committed Playwright live scenario passed against the public site with one temporary host and three independent anonymous-player browser contexts, including refresh, scoring, report rendering, and UTF-8 CSV download validation.
- A separate two-host production probe confirmed the second host received `[]` from direct private-quiz RLS, `null` from the ownership RPC, and an authorization error from the first host's report RPC.
- Temporary host/player accounts and their quiz/session data were deleted after each production run.

The optional `.github/workflows/live-e2e.yml` can repeat the browser scenario after dedicated test-host secrets are configured. Perform a separate 50-client load run only within the provider's approved limits; it is intentionally not claimed by this handoff.
