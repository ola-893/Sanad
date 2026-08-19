#!/bin/bash
# ============================================================================
# SANAD PROTOCOL - Start All Services (tmux-based)
# ============================================================================
# Usage: ./start.sh
# Stop:  ./stop.sh
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  SANAD PROTOCOL - Starting All Services${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# ============================================================================
# 1. Load nvm
# ============================================================================
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ============================================================================
# 2. Kill old processes
# ============================================================================
echo -e "${YELLOW}[1/5] Cleaning up...${NC}"
tmux kill-session -t sanad-backend 2>/dev/null || true
tmux kill-session -t sanad-frontend 2>/dev/null || true
kill $(lsof -ti :5001 2>/dev/null) 2>/dev/null || true
kill $(lsof -ti :3000 2>/dev/null) 2>/dev/null || true
echo -e "  ${GREEN}✓ Done${NC}"

# ============================================================================
# 3. Docker containers
# ============================================================================
echo -e "${YELLOW}[2/5] Starting PostgreSQL & Redis...${NC}"

# Always sync .env → .env.production for Docker
if [ -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.production"
  echo -e "  ${GREEN}✓ Synced .env → .env.production${NC}"
fi

cd "$PROJECT_ROOT"
docker compose up -d postgres redis 2>&1 | tail -2

# Wait for healthy
for i in $(seq 1 30); do
  docker exec sanad-postgres pg_isready -U postgres > /dev/null 2>&1 && break
  sleep 1
done
for i in $(seq 1 15); do
  docker exec sanad-redis redis-cli ping > /dev/null 2>&1 && break
  sleep 1
done
echo -e "  ${GREEN}✓ PostgreSQL (15432) & Redis (6379) ready${NC}"

# ============================================================================
# 4. Backend
# ============================================================================
echo -e "${YELLOW}[3/5] Setting up Backend...${NC}"

cd "$BACKEND_DIR"

# Fix .env
[ ! -f .env ] && cp .env.example .env
grep -q 'POSTGRES_PORT="5432"' .env && sed -i '' 's/POSTGRES_PORT="5432"/POSTGRES_PORT="15432"/' .env && sed -i '' 's|localhost:5432|localhost:15432|' .env

npm install --silent 2>&1 | tail -1
echo -e "  ${CYAN}→ Seeding database...${NC}"
npm run seed 2>&1 | grep -E "✓|COMPLETED|ERROR" || true

echo -e "  ${CYAN}→ Starting backend on port 5001...${NC}"
tmux new-session -d -s sanad-backend \
  "export NVM_DIR=\$HOME/.nvm && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && nvm use 20 && cd $BACKEND_DIR && npm run dev"

# Wait for backend
for i in $(seq 1 20); do
  curl -s http://localhost:5001/ > /dev/null 2>&1 && break
  sleep 1
done

if curl -s http://localhost:5001/ > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓ Backend running on http://localhost:5001${NC}"
else
  echo -e "  ${RED}✗ Backend failed to start — check: tmux attach -t sanad-backend${NC}"
fi

# ============================================================================
# 5. Frontend
# ============================================================================
echo -e "${YELLOW}[4/5] Setting up Frontend...${NC}"

cd "$FRONTEND_DIR"

# Create or fix .env.local
if [ ! -f .env.local ]; then
  cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api/v1
EOF
  echo -e "  ${CYAN}→ Created .env.local${NC}"
else
  # Ensure API URL points to the correct backend port
  sed -i '' 's|http://localhost:[0-9]*|http://localhost:5001|g' .env.local
  echo -e "  ${CYAN}→ Verified .env.local${NC}"
fi

# Install deps
if command -v pnpm &> /dev/null; then
  PNPM="pnpm"
else
  npm install -g pnpm > /dev/null 2>&1
  PNPM="pnpm"
fi
$PNPM install --silent 2>&1 | tail -1

echo -e "  ${CYAN}→ Starting frontend on port 3000...${NC}"
tmux new-session -d -s sanad-frontend \
  "export NVM_DIR=\$HOME/.nvm && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && nvm use 20 && cd $FRONTEND_DIR && $PNPM dev"

# Wait for frontend
for i in $(seq 1 30); do
  curl -s http://localhost:3000/ > /dev/null 2>&1 && break
  sleep 1
done

if curl -s http://localhost:3000/ > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓ Frontend running on http://localhost:3000${NC}"
else
  echo -e "  ${RED}✗ Frontend failed to start — check: tmux attach -t sanad-frontend${NC}"
fi

# ============================================================================
# 6. Summary
# ============================================================================
echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}  ALL SERVICES STARTED!${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""
echo -e "  ${CYAN}Services:${NC}"
echo -e "    PostgreSQL  → localhost:15432"
echo -e "    Redis       → localhost:6379"
echo -e "    Backend API → http://localhost:5001"
echo -e "    Frontend    → http://localhost:3000"
echo ""
echo -e "  ${CYAN}Demo Logins (password: Password123!):${NC}"
echo -e "    Super Admin:    admin@sanad.finance"
echo -e "    Company Admin:  manager@sanad.finance"
echo -e "    Pawnshop:       pawnshop@sanad.finance"
echo -e "    Borrower:       borrower@sanad.finance"
echo -e "    Investor:       investor@sanad.finance"
echo ""
echo -e "  ${CYAN}View logs:${NC}"
echo -e "    Backend:   tmux attach -t sanad-backend"
echo -e "    Frontend:  tmux attach -t sanad-frontend"
echo -e "    Detach:    Ctrl+B then D"
echo ""
echo -e "  ${YELLOW}To stop all: ./stop.sh${NC}"
echo -e "${CYAN}================================================================${NC}"
