# Acceptance checklist

This file separates code-complete checks from environment-dependent verification. Check an item only after observing it in the named environment.

## Automated locally

- [x] Production TypeScript/Vite build under `/perdev-red-group-toohak/`
- [x] Question validation and client/server scoring formulas covered
- [x] Answer-key tables have RLS, no client read policy, and explicit grant revocation
- [x] PIN phase/expiry/lock checks, duplicate/late rejection, host controls, deadlines, snapshots, and refresh identity are implemented in atomic RPCs
- [x] CI, Pages, database test, and live E2E workflows are included

## Requires connected Supabase + GitHub

- [ ] Apply migration successfully to the hosted project
- [ ] Host creates and publishes a quiz on the deployed site
- [ ] Three independent players join one room
- [ ] Countdown, question, submissions, reveal, leaderboard, and final podium synchronize
- [ ] Refresh preserves player identity and accepted answer
- [ ] Scores and reports persist; CSV downloads correctly
- [ ] A second host cannot read private quizzes/reports
- [ ] Assets and hash routes load from the Pages repository subpath
- [ ] Deployed frontend connects to the real backend
- [ ] 50-player target load-tested; provider limits recorded

Run `.github/workflows/live-e2e.yml` for the first eight live checks, then perform a separate 50-client load run within the provider's approved limits.
