#!/bin/bash

# Production Migration Script
# For production environments with proper security

set -e

echo "🔒 Production Database Migration"
echo "================================="

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-reengine}"
DB_USER="${DB_USER:-postgres}"
MIGRATION_FILE="engine/src/database/migrations/003_add_service_auth.sql"

# Security checks
echo "🔍 Security checks..."

# Check if running as root (should not be)
if [ "$EUID" -eq 0 ]; then
    echo "❌ Do not run this script as root"
    exit 1
fi

# Check if PostgreSQL connection string is secure
if [ -z "$DATABASE_URL" ] && [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Warning: No database password set. Using environment variables..."
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Backup database before migration
echo "💾 Creating database backup..."
BACKUP_FILE="backup_before_auth_migration_$(date +%Y%m%d_%H%M%S).sql"

if command -v pg_dump >/dev/null 2>&1; then
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  pg_dump not found. Skipping backup."
fi

# Run migration in transaction
echo "🚀 Running migration in transaction..."

# Create temporary migration script with transaction wrapping
TEMP_MIGRATION="/tmp/migration_with_transaction.sql"

cat > "$TEMP_MIGRATION" << EOF
BEGIN;

-- Run the actual migration
$(cat "$MIGRATION_FILE")

-- Verify migration success
DO \$\$
BEGIN
    -- Check if tables were created
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_auth') THEN
        RAISE EXCEPTION 'service_auth table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_audit_log') THEN
        RAISE EXCEPTION 'auth_audit_log table was not created';
    END IF;
    
    -- Check if services were inserted
    IF (SELECT COUNT(*) FROM service_auth) = 0 THEN
        RAISE EXCEPTION 'No services were inserted into service_auth';
    END IF;
END \$\$;

COMMIT;
EOF

# Execute the migration
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" < "$TEMP_MIGRATION"

# Clean up
rm -f "$TEMP_MIGRATION"

echo "✅ Migration completed successfully!"

# Post-migration verification
echo ""
echo "🔍 Post-migration verification..."

# Check table counts
SERVICE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -t -c "SELECT COUNT(*) FROM service_auth" "$DB_NAME" | tr -d ' ')
AUDIT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -t -c "SELECT COUNT(*) FROM auth_audit_log" "$DB_NAME" | tr -d ' ')

echo "📊 Service records: $SERVICE_COUNT"
echo "📊 Audit records: $AUDIT_COUNT"

# Show registered services
echo ""
echo "📋 Registered services:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" -c "SELECT service_id, permissions, is_active FROM service_auth ORDER BY service_id;"

# Security recommendations
echo ""
echo "🔒 Security Recommendations:"
echo "=========================="
echo "1. Rotate the default API keys immediately:"
echo "   UPDATE service_auth SET api_key_hash = crypt('new-secure-key', gen_salt('bf')) WHERE service_id = 'reengine-engine';"
echo ""
echo "2. Enable audit logging in PostgreSQL:"
echo "   ALTER SYSTEM SET log_statement = 'mod';"
echo "   ALTER SYSTEM SET log_min_duration_statement = 1000;"
echo ""
echo "3. Set up log rotation for auth_audit_log table:"
echo "   Consider partitioning by month for large volumes."
echo ""
echo "4. Monitor authentication failures:"
echo "   SELECT COUNT(*), service_id FROM auth_audit_log WHERE NOT success GROUP BY service_id;"

echo ""
echo "🎉 Production migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update application configuration with production API keys"
echo "2. Test authentication endpoints"
echo "3. Set up monitoring for authentication failures"
echo "4. Configure log rotation for audit tables"
