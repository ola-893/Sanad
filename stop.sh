#!/bin/bash
# ============================================================================
# SANAD PROTOCOL - Stop All Services
# ============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping all Sanad services...${NC}"

# Kill tmux sessions
tmux kill-session -t sanad-backend 2>/dev/null && echo -e "  ${GREEN}✓ Backend stopped${NC}" || echo -e "  ${GREEN}✓ Backend was not running${NC}"
tmux kill-session -t sanad-frontend 2>/dev/null && echo -e "  ${GREEN}✓ Frontend stopped${NC}" || echo -e "  ${GREEN}✓ Frontend was not running${NC}"

# Kill any orphan processes on our ports
kill $(lsof -ti :5001 2>/dev/null) 2>/dev/null || true
kill $(lsof -ti :3000 2>/dev/null) 2>/dev/null || true

# Stop Docker containers
docker compose down 2>/dev/null && echo -e "  ${GREEN}✓ Docker containers stopped${NC}" || echo -e "  ${GREEN}✓ Docker was not running${NC}"

echo ""
echo -e "${GREEN}All services stopped.${NC}"
