# Toohak — Red Group

An original, Kahoot-inspired multiplayer quiz app built with React, TypeScript, Vite, and Supabase. Hosts create quizzes and run synchronized rooms; authenticated anonymous players join with a PIN; PostgreSQL—not the browser—owns deadlines, answer validation, and scoring.

> Live deployment: https://arsu-maehae.github.io/perdev-red-group-toohak/ — GitHub CI/Pages, the hosted Supabase backend, and the one-host/three-player production acceptance scenario were verified on 2026-09-13.

## What is implemented

- Host email registration, login, logout, and password-reset flows
- Host dashboard with owned quizzes, live-session history, assignments, and reports
- Draft/private-by-default quiz editor with save protection, publishing validation, image uploads, reordering, duplication, preview, and deletion
- Explicit public sharing with answer-safe previews, share links, and server-side copying into another host's private drafts
- Single-answer, true/false, exact-set multiple select, normalized typed answer, and unscored poll questions
- Question explanations, 5–300 second timers, and standard/double/no-points settings
- Original English and Thai example quizzes, plus English/Thai interface switching
- Six-digit PIN join, authenticated anonymous player sessions, case-insensitive nickname uniqueness, join locking/removal, QR code, and 50-player room cap
- Realtime lobby plus synchronized countdown, open, reveal, leaderboard, next, and podium phases
- Atomic one-answer-per-question submission, server clock/deadline checks, server scoring, answer distribution, streaks, and refresh recovery
- Self-paced assignment links, deadlines, saved attempts, result review, and replay
- Host reports with score, accuracy, response times, per-question detail, deletion, and UTF-8 CSV download
- Responsive host/projector and mobile-player layouts, keyboard focus, answer symbols, mute control, and reduced-motion support
- Versioned migration, RLS, security-definer RPCs, storage policies, database checks, unit tests, live browser acceptance test, CI, and Pages deployment workflow

## Architecture

```text
React/Vite on GitHub Pages
        │ publishable key + user JWT
        ▼
Supabase Auth ── authenticated host / authenticated anonymous player
        │
        ├── PostgreSQL RPCs: phases, deadlines, validation, scoring, reports
        ├── Realtime: safe session-version and roster changes only
        └── Storage: public quiz images; owner-folder writes
```

GitHub Pages serves only static files. It is never used as a backend. The browser cannot select `session_answer_keys`, live answers, practice answer keys, or report source tables. Public question snapshots and secret keys are physically separated. Every privileged operation re-derives identity from `auth.uid()`.

## Local setup

Requirements: Node.js 22+, npm, Docker Desktop, and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
npm ci
npx supabase start
```

Copy `.env.example` to `.env.local`. `supabase start` prints the local API URL and publishable/anon key; place those values in:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=the-local-publishable-or-anon-key
```

Then run:

```bash
npm run dev
npm test
npx supabase test db
```

The Vite development URL includes the configured repository base: `http://localhost:5173/perdev-red-group-toohak/`. Routes use a hash, so GitHub Pages refreshes and direct links work without a server rewrite.

## Hosted Supabase setup

> Current backend: `toohak-red-group` (`tqzyiyburcwqsdykvlbm`) in Singapore (`ap-southeast-1`). Both committed migrations, Auth redirects, anonymous player sign-in, Realtime publication, RLS/RPC controls, and the 5 MiB storage limit are deployed.

1. Create a Supabase project on the free plan unless you intentionally approve another plan. Do not paste its database password or secret/service-role key into chat, issues, source files, or any `VITE_` variable.
2. In Authentication → Providers, enable anonymous sign-ins. Configure CAPTCHA/Turnstile before public promotion.
3. Add these Auth redirect URLs, replacing the username only if the repository owner changes:
   - `http://localhost:5173/**`
   - `https://arsu-maehae.github.io/perdev-red-group-toohak/**`
4. Authenticate the CLI securely in your own terminal (`npx supabase login`) and link/apply migrations:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

5. In Supabase Realtime settings, confirm database-change replication is enabled. The migration adds only `game_sessions` and `game_players` to the publication.
6. Optionally schedule `select public.cleanup_expired_toohak_data();` daily with Supabase Cron. It removes old room data, old rate events, and anonymous users older than 30 days.

The only frontend values are the project URL and **publishable** key. Supabase documents these for React/Vite in its [official quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs). Authorization comes from RLS and the RPC checks, not from hiding the publishable key.

## GitHub repository and Pages

The production repository is [arsu-maehae/perdev-red-group-toohak](https://github.com/arsu-maehae/perdev-red-group-toohak), with GitHub Actions selected as the Pages source. The public deployment is:

`https://arsu-maehae.github.io/perdev-red-group-toohak/`

In repository **Settings → Secrets and variables → Actions**, the browser-safe build configuration is stored as repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The optional **Live acceptance test** workflow additionally expects `TOOHAK_E2E_HOST_EMAIL` and `TOOHAK_E2E_HOST_PASSWORD` as repository secrets for a dedicated, non-admin test host. These are not required by the application or normal Pages deployments.

Every push to `main` runs CI, builds the repository subpath, and deploys Pages. The production acceptance scenario was also executed directly against the public site with temporary test accounts; all temporary host, player, quiz, and session data was removed afterward.

## Authoritative rules

### Scoring

- Standard correct answer: `round(1000 × (0.5 + 0.5 × speed))`
- Double points uses a base of 2,000; no-points and incorrect answers receive 0.
- `speed = clamp(1 - server_response_ms / question_limit_ms, 0, 1)`, so a correct scored answer earns 50–100% of its base.
- The server measures response time from the PostgreSQL phase start. Client timestamps and client scores are ignored.
- Multiple-select is all-or-nothing: submitted and correct option-ID sets must match exactly.
- Typed answers use Unicode NFKC normalization, trim surrounding whitespace, collapse internal whitespace, and compare case-insensitively against any accepted answer.
- Polls are unscored and do not change streaks. Tied leaderboard scores are ordered consistently by nickname.

### Sessions and recovery

- Active rooms expire 12 hours after creation. A PIN is only a locator; player authority comes from a persisted Supabase anonymous-auth session bound to one player row.
- Refresh reuses the auth session and player row, and `unique(question_id, player_id)` prevents duplicate answers.
- The UI flags a host as disconnected after 45 seconds without activity. After 10 minutes, a player state check closes the session so it cannot remain stuck.
- Snapshots isolate live games and assignments from later quiz edits.
- Hosts can explicitly delete stored session reports. The optional cleanup function provides retention cleanup when scheduled.

## Tests

| Command | Coverage |
| --- | --- |
| `npm test` | validation, normalization, scoring, exact multiple-select, CSV escaping, RLS/secret contract, PIN/phase/late/duplicate/deadline/reconnection controls in the migration |
| `npx supabase test db` | executable database assertions for RLS ownership, anonymous/host separation, answer-key grants, normalization, exact sets, and scoring |
| `npm run test:e2e:live` | real deployed Supabase; one host + three independent browser contexts; create/publish/join/refresh/answer/reveal/podium/report |

The live suite deliberately skips unless `TOOHAK_LIVE_E2E=1` and secure host credentials are present. It never substitutes localStorage multiplayer, simulated players, or fake API responses.

## Capacity and provider limits

The application enforces a target cap of 50 active players per room, but that capacity is not considered verified until the live acceptance/load run is completed on the selected Supabase project. Supabase currently rate-limits anonymous sign-ins by IP by default; a classroom behind one NAT may hit that limit before 50 players unless the project setting is reviewed. Supabase recommends CAPTCHA for anonymous sign-ins. Review the current [Auth limits](https://supabase.com/docs/guides/auth/rate-limits), [Realtime limits](https://supabase.com/docs/guides/realtime/limits), and [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) before a large event. No paid-plan change is required or performed by this repository.

## Troubleshooting

- **Backend setup required:** create `.env.local`, restart Vite, and ensure the values are not placeholders.
- **Anonymous sign-in error:** enable anonymous sign-ins in Supabase Auth and review CAPTCHA/rate-limit configuration.
- **Email link returns to the wrong page:** add both local and Pages wildcard redirect URLs.
- **PIN invalid:** rooms accept joins only while in an unlocked lobby and before the 12-hour expiry.
- **Images fail:** apply the migration, use a supported image under 5 MB, and check the `quiz-images` bucket policies.
- **Live updates pause:** polling still reconciles state every two seconds; confirm Realtime publication/settings and RLS migration.
- **Pages shows unconfigured backend:** verify the two GitHub Actions repository variables and rerun the Pages workflow.

## Verified provider/dependency assumptions

Provider requirements were checked against official Vite, GitHub, and Supabase documentation on 2026-09-13. Vite requires the repository base and a build workflow for Pages; Supabase's current browser client uses a URL plus publishable key, persisted Auth sessions, and authenticated anonymous users. The committed lockfile is the reproducible dependency source; Dependabot or a reviewed lockfile update should handle future upgrades.

- [Vite static deployment guide](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub Pages custom Actions workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

## License and originality

The visual identity, UI, examples, and generated sounds are original to Toohak — Red Group. No Kahoot logo, proprietary asset, music, or exact screen design is included.
