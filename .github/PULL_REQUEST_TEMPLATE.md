## Why

<!-- Link to the Issue this PR addresses -->

Closes #

## What changed

<!-- Bullets describing the changes -->

-

## How verified

<!-- Commands run + brief results -->

```
pnpm check
pnpm test
```

If this change touches schema/DB behavior, prefer a MySQL-backed run:

```
docker-compose up -d
pnpm test:localdb
```

## Risk

<!-- low / med / high + brief explanation -->

**Risk:** low

---

### Checklist

- [ ] Diff is small and scoped
- [ ] AC from the Issue is met
- [ ] Evidence posted (commands + results)
- [ ] Appropriate verify label added (`verify:v0`, `verify:v1`, or `verify:v2`)
- [ ] If schema/db changed: migration added and MySQL-backed evidence included (local `pnpm test:localdb` or CI)

### For `verify:v2` only

- [ ] `evidence:db-or-ci` label added (if applicable)
- [ ] `evidence:deployed-smoke` label added (if applicable)
