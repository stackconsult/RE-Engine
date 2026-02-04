# RE Engine Data Directory

This directory contains the CSV-based data storage for the RE Engine.

## Files

- `approvals.csv` - Approval workflow records
- `leads.csv` - Lead management data
- `events.csv` - Activity log and audit trail
- `contacts.csv` - Channel contact mappings
- `identities.csv` - Social media identity tracking
- `icp_profiles.csv` - Ideal Customer Profile configurations

## Important Notes

- **Never commit this directory to version control** - it contains sensitive data
- **Backup regularly** - This is your production data
- **CSV Format** - All files use UTF-8 encoding with comma separators
- **Migration Path** - See DEPLOYMENT.md for PostgreSQL migration instructions

## Data Privacy

This directory may contain personally identifiable information (PII). Ensure proper access controls and encryption in production environments.
