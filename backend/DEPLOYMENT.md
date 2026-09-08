# Production deployment

Deploy from the repository root, not `backend/`. The Docker build includes the
Node API and `agent/` Python evaluator. Local environment files are excluded.

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
