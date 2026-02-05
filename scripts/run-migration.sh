#!/bin/bash

# Database Migration Execution Script
# Runs the service authentication migration safely

set -e

echo "🗄️ Database Migration: Service Authentication"
echo "============================================"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Check if database exists
if ! psql -h localhost -p 5432 -U postgres -lqt | cut -d \| -f 1 | grep -qw reengine; then
    echo "📦 Creating reengine database..."
    createdb -h localhost -p 5432 -U postgres reengine
    echo "✅ Database created"
fi

# Check if migration already ran
if psql -h localhost -p 5432 -U postgres -d reengine -c "\dt service_auth" >/dev/null 2>&1; then
    echo "⚠️  Migration appears to have run already. Checking version..."
    
    # Check if tables exist and have data
    TABLE_COUNT=$(psql -h localhost -p 5432 -U postgres -d reengine -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('service_auth', 'auth_audit_log');" | tr -d ' ')
    
    if [ "$TABLE_COUNT" -eq "2" ]; then
        echo "✅ Migration already completed. Tables exist."
        
        # Show current services
        echo ""
        echo "📋 Current registered services:"
        psql -h localhost -p 5432 -U postgres -d reengine -c "SELECT service_id, permissions, is_active, last_used_at FROM service_auth ORDER BY service_id;"
        
        echo ""
        echo "🔍 Recent audit log entries:"
        psql -h localhost -p 5432 -U postgres -d reengine -c "SELECT service_id, action, success, timestamp FROM auth_audit_log ORDER BY timestamp DESC LIMIT 5;"
        
        exit 0
    fi
fi

# Run the migration
echo "🚀 Running migration..."
psql -h localhost -p 5432 -U postgres -d reengine -f engine/src/database/migrations/003_add_service_auth.sql

echo "✅ Migration completed successfully!"

# Verify the migration
echo ""
echo "🔍 Verifying migration results..."

# Check tables
echo "📋 Created tables:"
psql -h localhost -p 5432 -U postgres -d reengine -c "\dt service_auth auth_audit_log"

# Check indexes
echo ""
echo "📋 Created indexes:"
psql -h localhost -p 5432 -U postgres -d reengine -c "\di service_auth auth_audit_log"

# Show registered services
echo ""
echo "📋 Registered services:"
psql -h localhost -p 5432 -U postgres -d reengine -c "SELECT service_id, permissions, is_active FROM service_auth ORDER BY service_id;"

# Show table statistics
echo ""
echo "📊 Table statistics:"
psql -h localhost -p 5432 -U postgres -d reengine -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables WHERE tablename IN ('service_auth', 'auth_audit_log');"

echo ""
echo "🎉 Migration verification complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with the generated API keys"
echo "2. Start the engine service: cd engine && npm start"
echo "3. Test authentication: curl -H 'X-API-Key: engine-key-dev' http://localhost:3001/api/protected"
echo "4. Check audit logs: psql -d reengine -c 'SELECT * FROM auth_audit_log ORDER BY timestamp DESC LIMIT 10;'"
