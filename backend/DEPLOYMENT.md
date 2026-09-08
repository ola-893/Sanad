# Production deployment

Deploy from the repository root, not `backend/`. The Docker build includes the
Node API and `agent/` Python evaluator. Local environment files are excluded.

Always pass the explicit API service ID shown below. Never run `railway up`
against the Postgres service: a source upload can deploy the Node app there,
replacing the database process even while the service still lists a Postgres
image. On 2026-09-08 this caused the database outage. The original volume was
preserved and service `374beec7-f41b-4475-9ad9-12a72e5c5335` was restored to
`ghcr.io/railwayapp-templates/postgres-ssl:18`.

Railway service: `e125e32f-4fb3-4539-94ba-a064ec2c231e`
Project: `6d6d4c8f-6af3-4872-8af7-c39f06066ce2`

```sh
railway up --detach --project 6d6d4c8f-6af3-4872-8af7-c39f06066ce2 --service e125e32f-4fb3-4539-94ba-a064ec2c231e --environment production
```

Service settings: root `/`, Dockerfile `backend/dockerfile`, start command
`node dist/main.js`, health check `/api/v1/health`, pre-deploy command
`node scripts/bootstrap-database.mjs`. Set `CORS_ORIGIN` to the exact frontend
origin. The API uses Railway's `PORT`, `DATABASE_URL`, and `REDIS_URL`.

The pre-deploy script initializes an **empty** `main` schema transactionally
from `postgres/bootstrap.sql`. It never seeds accounts or changes existing
tables. A partial schema requires a reviewed migration. The historical migration
journal references a missing `0013` file; do not replay it against the new
baseline or run the demo seed script in production (it resets an admin password).
Future schema changes need versioned, reviewed migrations against this baseline.

For existing databases missing investment/repayment tables, the explicit repair
is `node scripts/repair-production-tables.mjs`. This runs the approved
`postgres/production-repair.sql` transactionally with bounded lock/statement
timeouts. It creates only missing tables/indexes and preserves existing tables.
Applied successfully to production on 2026-09-08. The existing `main.test`
table retains its legacy columns; database health now checks `SELECT 1`.

The baseline was exported offline with:
`npx drizzle-kit export --config drizzle.bootstrap.config.ts`.
Tests: `node --test scripts/bootstrap-database.test.mjs`.

For Netlify, set production `NEXT_PUBLIC_API_URL` to
`https://sanad-production-6fa3.up.railway.app`, then rebuild from `frontend/`
with `netlify deploy --prod`. Socket connections default to the same URL unless
`NEXT_PUBLIC_SOCKET_URL` is explicitly set. Public Next.js variables are baked
into the client bundle and require a rebuild.

Smoke checks: `/`, `/api/v1/health`, `/api/v1/health/db`,
`/api/v1/scheduler/stats`, `/api/v1/sag`, and a CORS preflight from the Netlify
origin. Full KYC testing additionally requires a test account and wallet.
