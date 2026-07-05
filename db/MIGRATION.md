# Manual DB migrations

This sandbox can't reach Neon directly (raw-TCP Postgres and Neon's HTTPS
data-API host are both blocked by network policy), so schema changes are
written here and run manually via Neon's web SQL Editor.

## 1. Widen the `mode` check constraint (required before the multi-capability UI ships)

The `mode` column now stores `Category` values (`image`/`video`/`audio`/`3d`/`tool`)
instead of the old `t2v`/`i2v`/`t2i`. Run this against the live DB before deploying
any build that writes the new values — otherwise inserts will fail the old CHECK
constraint:

```sql
alter table generations drop constraint generations_mode_check;
alter table generations add constraint generations_mode_check
  check (mode in ('t2v','i2v','t2i','image','video','audio','3d','tool'));
```

## 2. Rename `mode` -> `category` (later, once no code reads the old column name)

```sql
alter table generations rename column mode to category;
update generations set category = 'image' where category = 't2i';
update generations set category = 'video' where category in ('t2v', 'i2v');
alter table generations drop constraint generations_mode_check;
alter table generations add constraint generations_mode_check
  check (category in ('image','video','audio','3d','tool'));
```
