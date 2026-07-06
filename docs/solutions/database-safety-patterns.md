# Database Safety Patterns

> **Consolidated (2026-07-03).** This digest verbatim-duplicated the checklists of two more specific
> docs, so its content was merged into them to stop the two copies drifting apart. It is kept as a
> pointer because several docs and plans link here. Go to the canonical source for each topic:
>
> - **Non-atomic multi-table operations / transaction atomicity** →
>   [`database-issues/drizzle-transaction-atomicity.md`](./database-issues/drizzle-transaction-atomicity.md)
>   (transaction rule, `tx` usage, rollback test case, when-to-use table)
> - **SQL LIKE pattern injection / search-input escaping** →
>   [`security-issues/like-pattern-sql-injection.md`](./security-issues/like-pattern-sql-injection.md)
>   (`escapeLikePattern`, the numeric-`CAST … ILIKE` case, escape tests)
> - **External numeric ID column sizing (int4 overflow)** →
>   [`database-issues/external-id-column-sizing.md`](./database-issues/external-id-column-sizing.md)
>   (external ids are `bigint`/`text`, never `int4`; the 2026-07-03 `22003` payments outage)
