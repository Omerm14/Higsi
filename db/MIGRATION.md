# Manual DB migrations

This sandbox can't reach Neon directly (raw-TCP Postgres and Neon's HTTPS
data-API host are both blocked by network policy), so schema changes are
written here and run manually via Neon's web SQL Editor.

## Current state

The `generations` table's `category` column already exists (renamed from the
original `mode` column) and only accepts `image`/`video`/`audio`/`3d`/`tool`.
`db/schema.sql` and `lib/db.ts` now match this.

## Restore the check constraint

A prior manual migration attempt dropped `generations_mode_check` while
trying to re-add it against the wrong (pre-rename) column name, so the
constraint is currently missing entirely. Run this to restore it:

```sql
alter table generations add constraint generations_mode_check
  check (category in ('image','video','audio','3d','tool'));
```

This is safe to run even if a constraint by that name already exists (it'll
just error harmlessly — check first with the query below if unsure):

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'generations_mode_check';
```
