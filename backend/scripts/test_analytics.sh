#!/bin/bash

# =====================================================
# Learning Analytics System - Quick Test Script
# =====================================================

echo "=========================================="
echo "🧠 Testing Learning Analytics System"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo ""
echo "1️⃣  Checking database connection..."
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_URL or SUPABASE_KEY not set${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Environment variables found${NC}"
fi

echo ""
echo "2️⃣  Checking required tables exist..."

# Check if we can run Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    exit 1
fi

# Run Python health check
echo ""
echo "3️⃣  Running analytics health check..."
python3 scripts/check_analytics.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Analytics system is operational!${NC}"
else
    echo -e "${RED}❌ Analytics health check failed${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Test Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start a practice session in the frontend"
echo "2. Answer some questions with confidence ratings"
echo "3. Complete the session to trigger a snapshot"
echo "4. Re-run this script to see your data!"
echo ""
echo "For detailed queries, check:"
echo "  backend/supabase/monitoring_queries.sql"
echo ""

