#!/bin/bash

# Script to audit Supabase pixels table via Docker psql
# Usage: ./audit-table.sh

# Check if .env file exists with database connection info
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your Supabase database connection:"
    echo ""
    echo "DB_HOST=db.your-project.supabase.co"
    echo "DB_PORT=6543"
    echo "DB_NAME=postgres"
    echo "DB_USER=postgres"
    echo "DB_PASSWORD=your-database-password"
    echo ""
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

echo "🔍 Auditing pixels table..."
echo "📡 Connecting to: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Run the SQL audit script via Docker
docker run --rm -i \
    -v "$(pwd)/scripts:/scripts" \
    postgres:15 \
    psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require" \
    -f /scripts/audit-table.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Audit completed successfully!"
else
    echo ""
    echo "❌ Audit failed - check your database connection"
    exit 1
fi