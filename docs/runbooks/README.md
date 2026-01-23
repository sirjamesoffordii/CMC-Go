# Runbooks (Procedures)

Runbooks are the **procedural truth** for repeatable operations (setup, resets, migrations, external tooling).
If you need exact commands and step-by-step instructions, start here.

If you need guidance on judgment, authority, or how to choose work, use the doctrine docs (especially the Coherence Engine) instead.

## When to write/update a runbook

Update or add a runbook only when it’s **worth preserving**:

- Repeatable procedure that will recur (not a one-off)
- Non-obvious gotcha that wastes time or causes risk
- New safe default (a better way) that should become standard
- A verification sequence that consistently detects the issue

Avoid churn:

- Don’t rewrite for style
- Don’t document trivial one-time incidents
- Prefer small, surgical additions that future agents can follow exactly

If you add a new runbook, link it from this index.

## Common Scenarios

### Local Development Setup

- [LOCAL_SETUP.md](LOCAL_SETUP.md)
- [DEV_SETUP.md](DEV_SETUP.md)

### Database Setup / Verification / Reset

- [DB_SETUP_VERIFICATION.md](DB_SETUP_VERIFICATION.md)
- [DB_RESET_GUIDE.md](DB_RESET_GUIDE.md)
- [LOCAL_DB_SYNC.md](LOCAL_DB_SYNC.md)

### Migrations

- [MIGRATION_RULES.md](MIGRATION_RULES.md)
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

### Seeding

- [SEED_GUIDE.md](SEED_GUIDE.md)

### Sentry / Observability

- [SENTRY.md](SENTRY.md)

### Shared Demo DB

- [SHARED_DEMO_DB.md](SHARED_DEMO_DB.md)

### GitHub Automation Auth

- [GITHUB_AUTH_PERSISTENT.md](GITHUB_AUTH_PERSISTENT.md)
