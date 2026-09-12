# Security policy

Please do not report vulnerabilities in a public issue. Contact the repository owner privately through GitHub.

The browser receives only the Supabase project URL and publishable key. Never commit a service-role key, database password, personal access token, or test-host password. Database functions validate identity, ownership, phases, deadlines, and server timestamps. `session_answer_keys` and answer tables are denied to browser roles.

If a secret is accidentally committed, revoke or rotate it first, then remove it from Git history. Rewriting history alone does not revoke a credential.
