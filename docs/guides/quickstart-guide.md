# Local setup and testing

Run these commands from the repository root unless stated otherwise. Use a disposable local database and testnet wallets; do not point local seed scripts at production.

## 1. Install dependencies

You need Node.js 20 or newer, npm, Docker Compose, and an EVM wallet for on-chain tests. Foundry is needed for Solidity tests. Python is optional unless testing the evaluator.

```sh
cd backend
npm install
cd ../frontend
npm install
cd ..
```

## 2. Configure the environment

If the files do not already exist, copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env.local`. Preserve existing configuration.

Set backend `PORT=5002`, local database/Redis connection settings, and `CORS_ORIGIN=http://localhost:3000`. Set frontend `NEXT_PUBLIC_API_URL=http://localhost:5002`. The backend otherwise falls back to port 8000; all API and socket URLs must agree with your chosen port.

Sample credentials and private keys are placeholders, not valid production signers. Configure testnet RPC access and appropriately authorized test wallets only when needed. Never put a private key in a `NEXT_PUBLIC_*` variable.

## 3. Start the database and Redis

```sh
docker compose up -d postgres redis
```

Match the database host port and credentials to your local Compose configuration.

For a disposable development database only:

```sh
cd backend
npm run seed
```

The seed script may reset demo/admin credentials. Never use it as a production migration. Follow the [deployment runbook](../deployment/production.md) for production initialization and repairs.

## 4. Start the application

Backend terminal, from `backend/`:

```sh
npm run dev
```

Frontend terminal, from `frontend/`:

```sh
npm run dev
```

Open http://localhost:3000 and check http://localhost:5002/api/v1/health and http://localhost:5002/api/v1/health/db. Register a test wallet through the application. On-chain actions require network gas and the relevant contract role, not just an application account.

## 5. Verify changes

From `backend/`:

```sh
npm run build
node --test scripts/bootstrap-database.test.mjs
```

From `frontend/`:

```sh
npm run build
```

From `backend/src/contracts/sepolia/`:

```sh
forge test -vvv
```

E2E scripts in `backend/src/scripts/` may send real testnet transactions. Read the selected script and confirm addresses, signers, and network before running it.

For an application walkthrough, see the [demo guide](demo-pitch-script.md). For optional appraisal support, see [Python setup](../development/python-setup.md).
