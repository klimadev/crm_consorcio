# Legacy Auth Migration Notes

## Runtime DB policy

- Canonical runtime DB for NextAuth + multi-tenant domain is `data/saas.db`.
- Legacy DB (`data/database.db`) is supported only as migration source.

## Migration command

```bash
npm run db:migrate-legacy-auth
```

Optional dry-run:

```bash
npm run db:migrate-legacy-auth -- --dry-run
```

## What is migrated

- `tenants` -> `companies`
- `users` -> `users` (legacy `name` mapped to `full_name`)
- user-tenant membership -> `memberships`

Role mapping:

- `ADMIN` -> `OWNER`
- `MANAGER` -> `MANAGER`
- all other roles -> `COLLABORATOR`

Status mapping:

- `is_active = 1` -> `ACTIVE`
- `is_active = 0` -> `SUSPENDED`

## Rollback notes

If a migration run needs rollback:

1. Stop the app.
2. Restore `data/saas.db` from backup.
3. Re-run `npm run db:init` and `npm run db:seed` if no backup exists.
4. Validate login with a known account.

## Post-migration validation

- Login with valid company slug + user credentials.
- Confirm protected pages load (`/leads`, `/settings`).
- Confirm inactive users are blocked.
