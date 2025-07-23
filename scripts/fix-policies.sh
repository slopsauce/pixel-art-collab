#!/bin/bash

# Script to fix duplicate/conflicting RLS policies
# Usage: ./fix-policies.sh

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your Supabase database connection."
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Missing required environment variables!"
    echo "Please set DB_HOST and DB_PASSWORD in .env file"
    exit 1
fi

# Default values
DB_PORT=${DB_PORT:-6543}
DB_NAME=${DB_NAME:-postgres}
DB_USER=${DB_USER:-postgres}

echo "🔧 Fixing duplicate RLS policies..."
echo "📡 Connecting to: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Run the policy fix script via Docker
docker run --rm -i \
    -v "$(pwd)/scripts:/scripts" \
    postgres:15 \
    psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require" \
    -f /scripts/fix-duplicate-policies.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Policies fixed successfully!"
    echo "🎨 Your table now has clean, consistent 32x32 grid policies"
else
    echo ""
    echo "❌ Failed to fix policies - check your database connection"
    exit 1
fi