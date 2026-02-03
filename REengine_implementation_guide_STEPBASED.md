# REengine Implementation Guide (Step-Based)

## Overview
This guide provides step-by-step instructions to complete the REengine automation platform. Each phase must be completed in order. Dependencies are clearly marked.

---

## PHASE 1: CRITICAL INFRASTRUCTURE (P0)
**Prerequisites:** OpenClaw installed and configured  
**Completion Criteria:** Error handling, rate limiting, and DNC enforcement working

### Step 1: Error Handling & Retry Logic

**1.1. Create failed_sends.csv**
```csv
id,original_approval_id,channel,target,message,error_code,error_msg,retry_count,max_retries,next_retry_at,failed_at
```

**1.2. Create retry_failed_sends.py**
- Implement exponential backoff: 5min → 15min → 1hr → 4hr → 24hr
- Read from failed_sends.csv where next_retry_at <= now
- Attempt resend via OpenClaw CLI
- If successful: remove from failed_sends, log to events
- If failed: increment retry_count, calculate next_retry_at
- If retry_count >= max_retries: move to dead_letter.csv

**1.3. Create dead_letter.csv**
```csv
id,original_approval_id,channel,target,message,final_error,failed_at,moved_to_dead_letter_at
```

**1.4. Update send_approved_router.py**
```python
# Add at top
from utils.log_event import log_event

# Wrap send in try/catch
try:
    result = subprocess.run(['openclaw', 'message', 'send', ...])
    if result.returncode != 0:
        log_to_failed_sends(approval, result.stderr)
    else:
        log_event('message_sent', channel=channel, approval_id=approval['id'])
except Exception as e:
    log_to_failed_sends(approval, str(e))
```

**1.5. Add retry cron**
```bash
openclaw cron add 'retry-failed' '*/15 * * * *' 'cd $WORKSPACE/realestate-engine/scripts && python3 retry_failed_sends.py'
```

---

### Step 2: Rate Limiting & Throttling

**2.1. Create config/rate_limits.json**
```json
{
  "whatsapp": {"per_hour": 20, "per_day": 150, "min_delay_seconds": 180},
  "telegram": {"per_hour": 30, "per_day": 200, "min_delay_seconds": 120},
  "email": {"per_hour": 50, "per_day": 500, "min_delay_seconds": 30},
  "linkedin": {"per_hour": 5, "per_day": 25, "min_delay_seconds": 600},
  "facebook": {"per_hour": 5, "per_day": 25, "min_delay_seconds": 600}
}
```

**2.2. Create send_window.csv**
```csv
channel,approval_id,sent_at
```

**2.3. Create utils/rate_limiter.py**
- Implement load_rate_limits() to read JSON config
- Implement get_send_count(channel, time_window) to count recent sends
- Implement can_send(channel) to check if under limits
- Implement record_send(channel, approval_id) to log send

**2.4. Update send_approved_router.py**
```python
from utils.rate_limiter import can_send, record_send

for approval in approved_items:
    can, reason = can_send(approval['channel'])
    if not can:
        print(f"Rate limit: {reason}, keeping for next run")
        keep_for_next_run.append(approval)
        continue

    # Send message
    if success:
        record_send(approval['channel'], approval['id'])
```

---

### Step 3: DNC Enforcement

**3.1. Expand dnc.csv schema**
```csv
phone,email,reason,added_by,added_at,source,notes
```

Source values: `manual`, `complaint`, `legal`, `opt_out`, `bounce`

**3.2. Create utils/check_dnc.py**
```python
def load_dnc():
    # Load into set for O(1) lookup

def is_dnc(identifier):
    # Returns (bool, reason) tuple

def add_to_dnc(identifier, reason, added_by, source, notes):
    # Append to dnc.csv with timestamp
```

**3.3. Update ALL draft generation scripts**
```python
from utils.check_dnc import is_dnc
from utils.log_event import log_event

for lead in leads:
    identifier = lead['email'] or lead['phone']

    blocked, reason = is_dnc(identifier)
    if blocked:
        log_event('dnc_blocked', lead_id=lead['id'], 
                 metadata={'reason': reason})
        continue  # Skip this lead

    # Create draft approval
```

**3.4. Create dnc_reconcile.py**
- Remove duplicates
- Normalize phone/email formats
- Sort by added_at descending
- Run weekly via cron

**3.5. Add DNC reconciliation cron**
```bash
openclaw cron add 'weekly-dnc-reconcile' '0 3 * * 0' 'cd $WORKSPACE/realestate-engine/scripts && python3 dnc_reconcile.py'
```

---

## PHASE 2: OBSERVABILITY & METRICS (P0)
**Prerequisites:** Complete Phase 1 (Steps 1-3)  
**Completion Criteria:** Events logging, metrics generation, and alerting working

### Step 4: Events Schema & Logging

**4.1. Finalize events.csv schema**
```csv
event_id,timestamp,event_type,channel,lead_id,approval_id,status,metadata_json,user_id
```

**4.2. Create utils/log_event.py**
```python
import uuid, datetime, json, csv

EVENT_TYPES = [
    'draft_created', 'draft_approved', 'draft_rejected',
    'message_sent', 'message_delivered', 'message_bounced', 'message_failed',
    'reply_received', 'hot_reply_detected', 'dnc_added', 'opt_out_received',
    'link_clicked', 'alert_triggered'
]

def log_event(event_type, channel=None, lead_id=None, approval_id=None,
              status='success', metadata=None, user_id='system'):
    event_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now().isoformat()
    # Write to events.csv
```

**4.3. Create events_daily_summary.csv**
```csv
date,total_drafts,total_sent,total_delivered,total_bounced,total_replies,total_dnc_adds
```

---

### Step 5: Metrics Dashboard Data

**5.1. Create metrics.py**
```python
# Read events.csv for today
# Calculate:
#   - sends_by_channel (dict)
#   - approval_rate (approved / created)
#   - delivery_rate (delivered / sent)
#   - reply_rate (replied / sent)
#   - bounce_rate (bounced / sent)
#   - dnc_count (total DNC entries)
#   - backlog_count (pending approvals)

# Output to metrics.json
# Append to metrics_history.csv
```

**5.2. Create metrics_history.csv**
```csv
date,channel,sends,delivered,bounced,replies,approval_rate,delivery_rate,reply_rate,bounce_rate
```

**5.3. Add metrics cron**
```bash
openclaw cron add 'daily-metrics' '0 23 * * *' 'cd $WORKSPACE/realestate-engine/scripts && python3 metrics.py'
```

---

### Step 6: Alerting System

**6.1. Create alerts.py**
```python
# Load today's metrics
# Check thresholds:
#   - bounce_rate > 10%
#   - failed_sends > 50
#   - backlog > 200
#   - dnc_violations detected

# If threshold breached:
#   - Log to alerts_log.csv
#   - Send alert via: openclaw message send --channel telegram --target YOUR_ID --message "ALERT: ..."
```

**6.2. Create alerts_log.csv**
```csv
alert_id,timestamp,alert_type,severity,message,resolved_at
```

**6.3. Create config/alert_thresholds.json**
```json
{
  "bounce_rate_threshold": 0.10,
  "failed_sends_threshold": 50,
  "backlog_threshold": 200,
  "dnc_violation_threshold": 1
}
```

**6.4. Add alerts cron**
```bash
openclaw cron add 'hourly-alerts' '0 * * * *' 'cd $WORKSPACE/realestate-engine/scripts && python3 alerts.py'
```

---

## PHASE 3: COMPLIANCE & AUDIT TRAIL (P1)
**Prerequisites:** Complete Phase 2 (Steps 4-6)  
**Completion Criteria:** Full audit trail, backup system, and GDPR tools ready

### Step 7: Approval Audit Trail

**7.1. Add columns to approvals.csv**
```csv
...,approved_by,approved_at,approval_method,original_draft_hash
```

**7.2. Create approvals_archive.csv**
- Same schema as approvals.csv
- Move sent/rejected items here after processing
- Never delete (permanent audit trail)

**7.3. Create approval_changes.csv**
```csv
change_id,approval_id,changed_by,changed_at,field_changed,old_value,new_value
```

**7.4. Create audit_report.py**
```python
# Generate report for date range or specific lead
# Include:
#   - All drafts created
#   - Who approved/rejected
#   - What was sent (original vs edited)
#   - DNC check results
#   - Delivery status

# Output: audit_report_<date_range>.csv
```

---

### Step 8: Data Retention & Backup

**8.1. Create backup_csvs.sh**
```bash
#!/bin/bash
BACKUP_DIR="$WORKSPACE/realestate-engine/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/csvs_backup_$TIMESTAMP.tar.gz"     $WORKSPACE/realestate-engine/data/*.csv

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/csvs_backup_*.tar.gz | tail -n +8 | xargs rm -f
```

**8.2. Create restore_from_backup.sh**
```bash
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./restore_from_backup.sh <backup_file.tar.gz>"
    exit 1
fi

tar -xzf "$1" -C $WORKSPACE/realestate-engine/
echo "Restored from $1"
```

**8.3. Add backup cron**
```bash
openclaw cron add 'daily-backup' '0 2 * * *' 'cd $WORKSPACE/realestate-engine && bash scripts/backup_csvs.sh'
```

---

### Step 9: Opt-Out/Unsubscribe Flow

**9.1. Update email templates**
- Add unsubscribe link in footer: `{{unsubscribe_url}}`
- Link format: `https://yourdomain.com/unsubscribe?id={{lead_id}}&token={{hash}}`

**9.2. Create opt_out_handler.py**
```python
# Parse incoming opt-out requests
# Sources:
#   - Email replies with "STOP", "UNSUBSCRIBE", "REMOVE"
#   - WhatsApp/Telegram messages with "STOP"
#   - Web form submissions

# For each opt-out:
#   1. Log to opt_out_log.csv
#   2. Add to dnc.csv with source='opt_out'
#   3. Send confirmation message
#   4. Log event
```

**9.3. Create opt_out_log.csv**
```csv
opt_out_id,identifier,channel,opted_out_at,confirmation_sent_at
```

**9.4. Update poll_imap_replies.py**
```python
# Check for opt-out keywords in subject/body
keywords = ['STOP', 'UNSUBSCRIBE', 'REMOVE', 'OPT OUT', 'OPT-OUT']

for message in inbox:
    if any(kw in message.subject.upper() or kw in message.body.upper() for kw in keywords):
        opt_out_handler.process(message.from_email, 'email')
```

**9.5. Add /optout WebChat command**
```python
# In OpenClaw WebChat handler
if command == '/optout':
    identifier = args[0]
    opt_out_handler.process(identifier, 'manual')
    return f"✅ {identifier} opted out"
```

---

### Step 10: GDPR/CCPA Compliance Tools

**10.1. Create data_export.py**
```python
# Usage: python3 data_export.py <identifier>
# Search all CSVs for matching identifier
# Export to JSON:
{
  "identifier": "email@example.com",
  "leads": [...],
  "approvals": [...],
  "events": [...],
  "dnc_entries": [...],
  "opt_outs": [...]
}
```

**10.2. Create data_delete.py**
```python
# Usage: python3 data_delete.py <identifier> --confirm
# Remove from ALL CSVs:
#   - leads.csv
#   - approvals.csv (pending only)
#   - contacts.csv
# Keep in (for audit):
#   - events.csv (mark as deleted)
#   - dnc.csv (must retain for legal)
#   - opt_out_log.csv (must retain)
# Log deletion event
```

**10.3. Create consent_log.csv**
```csv
consent_id,identifier,consent_type,obtained_at,source,ip_address,notes
```

Consent types: `explicit_opt_in`, `implied_business_relationship`, `legitimate_interest`

**10.4. Create compliance_report.py**
```python
# Generate full compliance report for regulatory audit
# Include:
#   - Total contacts
#   - Consent breakdown by type
#   - Opt-out rate
#   - DNC list size and sources
#   - Data retention summary
#   - GDPR/CCPA request log
```

---

## PHASE 4: LINKEDIN/FACEBOOK SEMI-AUTO (P2)
**Prerequisites:** Complete Phase 1-3  
**Completion Criteria:** Semi-automated posting with manual confirmation

### Step 11: Browser Automation Setup

**11.1. Document OpenClaw browser setup**
```markdown
1. Get browser profile path: openclaw directory
2. Profile location: <workspace>/.openclaw/browser_profile
3. LinkedIn/Facebook login once manually
4. Cookies persist in profile
```

**11.2. Create linkedin_open_draft.py**
```python
import subprocess, pyperclip

# Read pending LinkedIn approval
approval = get_next_linkedin_approval()

# Copy message to clipboard
pyperclip.copy(approval['message'])

# Open LinkedIn message composer
url = f"https://www.linkedin.com/messaging/thread/{approval['target']}/"
subprocess.run(['openclaw', 'browser', 'open', url])

print("✅ LinkedIn opened. Paste message (Cmd+V) and click Send manually.")
print(f"Then run: python3 mark_sent_manual.py {approval['id']}")
```

**11.3. Create facebook_open_draft.py**
```python
# Similar to LinkedIn, but for Facebook Messenger
# URL: https://www.facebook.com/messages/t/{target_id}
```

**11.4. Update events.csv tracking**
```python
# Log browser_opened event
log_event('browser_opened', channel='linkedin', approval_id=approval['id'],
         metadata={'url': url, 'action': 'manual_send_required'})
```

---

### Step 12: Manual Send Confirmation

**12.1. Create manual_sends_pending.csv**
```csv
approval_id,channel,target,opened_at,marked_sent_at
```

**12.2. Update mark_sent_manual.py**
```python
# Usage: python3 mark_sent_manual.py <approval_id>
# Move from approvals.csv to approvals_archive.csv
# Update status='sent_manual'
# Log event
```

**12.3. Add /mark_sent WebChat command**
```python
# In OpenClaw WebChat handler
if command == '/mark_sent':
    approval_id = args[0]
    mark_sent_manual(approval_id)
    return f"✅ Marked {approval_id} as sent"
```

**12.4. Add alert for pending manual sends**
```python
# In alerts.py
pending_manual = count_rows('manual_sends_pending.csv')
if pending_manual > 10:
    send_alert(f"⚠️ {pending_manual} manual sends pending (LinkedIn/Facebook)")
```

**12.5. Document limitation in README**
```markdown
## Known Limitations

### LinkedIn & Facebook Semi-Auto
- Cannot fully automate due to CAPTCHA and ToS restrictions
- Our approach:
  1. Script opens browser to correct page
  2. Message copied to clipboard
  3. You paste and click Send manually
  4. You confirm send via /mark_sent command
- Average time: 10-15 seconds per message
- Recommendation: Batch process 5-10 at a time
```

---

## PHASE 5: DOCUMENTATION & TESTING (P1)
**Prerequisites:** Complete Phase 1-4  
**Completion Criteria:** Complete documentation and passing test suite

### Step 13: Complete README.md

**13.1. Section 0: Safety & Secrets** (enhance existing)
- Add: Never commit .env files
- Add: Rotate SpaceEmail password every 90 days
- Add: Use OpenClaw pairing for WhatsApp/Telegram security

**13.2. Section 2: Folder Structure & CSV Schemas** (NEW)
```markdown
## Folder Structure

```
$WORKSPACE/realestate-engine/
├── data/
│   ├── leads.csv
│   ├── approvals.csv
│   ├── events.csv
│   ├── contacts.csv
│   ├── dnc.csv
│   ├── failed_sends.csv
│   ├── dead_letter.csv
│   ├── send_window.csv
│   ├── ... (12 more CSVs documented)
├── config/
│   ├── rate_limits.json
│   └── alert_thresholds.json
├── scripts/
│   ├── utils/
│   │   ├── check_dnc.py
│   │   ├── log_event.py
│   │   └── rate_limiter.py
│   ├── send_approved_router.py
│   ├── retry_failed_sends.py
│   ├── metrics.py
│   ├── alerts.py
│   └── ... (20+ scripts)
├── tests/
│   ├── test_scripts.py
│   ├── test_csvs.py
│   ├── test_dnc_enforcement.py
│   └── test_rate_limits.py
└── backups/
```

### CSV Schemas
[Create table for each CSV with columns, types, and descriptions]
```

**13.3. Section 4: Scripts Reference** (NEW)
```markdown
## Scripts Reference

### Core Scripts (Must Run)
| Script | Purpose | Frequency | Depends On |
|--------|---------|-----------|------------|
| send_approved_router.py | Send approved messages | Every 5 min (cron) | rate_limiter, check_dnc |
| retry_failed_sends.py | Retry failed messages | Every 15 min (cron) | log_event |
| metrics.py | Generate daily stats | Daily 11pm (cron) | events.csv |

[Continue for all 20+ scripts]
```

**13.4. Section 6: Observability & Metrics** (NEW)
- Document event types and what triggers them
- Explain metrics.json format
- Show example metrics queries
- Document alert thresholds and how to adjust

**13.5. Section 8: Error Handling & Troubleshooting** (NEW)
[See Step 16 below]

---

### Step 14: Cron Jobs Master Reference

**14.1. Create install_crons.sh**
```bash
#!/bin/bash
# Install all REengine cron jobs at once

WORKSPACE=$(openclaw directory)

echo "Installing REengine cron jobs..."

# 1. Draft generation
openclaw cron add 'daily-drafts' '0 8 * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 generate_daily_drafts.py"

# 2. Approval processor (THE SENDER)
openclaw cron add 'process-approvals' '*/5 * * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 send_approved_router.py"

# 3. Retry failed sends
openclaw cron add 'retry-failed' '*/15 * * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 retry_failed_sends.py"

# 4-6. Poll replies
openclaw cron add 'poll-imap' '*/15 * * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 poll_imap_replies.py"

openclaw cron add 'poll-whatsapp' '*/15 * * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 poll_whatsapp.py"

openclaw cron add 'poll-telegram' '*/15 * * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 poll_telegram.py"

# 7. Daily metrics
openclaw cron add 'daily-metrics' '0 23 * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 metrics.py"

# 8. Hourly alerts
openclaw cron add 'hourly-alerts' '0 * * * *'     "cd $WORKSPACE/realestate-engine/scripts && python3 alerts.py"

# 9. Daily backup
openclaw cron add 'daily-backup' '0 2 * * *'     "cd $WORKSPACE/realestate-engine && bash scripts/backup_csvs.sh"

# 10. Weekly DNC reconcile
openclaw cron add 'weekly-dnc-reconcile' '0 3 * * 0'     "cd $WORKSPACE/realestate-engine/scripts && python3 dnc_reconcile.py"

echo "✅ All 10 cron jobs installed"
echo "Verify with: openclaw cron list"
```

**14.2. Add to README Section 5**
```markdown
## Cron Jobs

### Quick Install (All at Once)
```bash
bash $WORKSPACE/realestate-engine/scripts/install_crons.sh
```

### Cron Job Reference Table
| Name | Frequency | Script | Purpose | Dependencies |
|------|-----------|--------|---------|--------------|
| daily-drafts | Daily 8am | generate_daily_drafts.py | Create 150 drafts | check_dnc |
| process-approvals | Every 5 min | send_approved_router.py | **THE SENDER** | rate_limiter, log_event |
| retry-failed | Every 15 min | retry_failed_sends.py | Retry failed sends | log_event |
| poll-imap | Every 15 min | poll_imap_replies.py | Check email replies | opt_out_handler |
| poll-whatsapp | Every 15 min | poll_whatsapp.py | Check WA replies | opt_out_handler |
| poll-telegram | Every 15 min | poll_telegram.py | Check TG replies | opt_out_handler |
| daily-metrics | Daily 11pm | metrics.py | Generate stats | events.csv |
| hourly-alerts | Every hour | alerts.py | Check thresholds | metrics |
| daily-backup | Daily 2am | backup_csvs.sh | Backup all CSVs | - |
| weekly-dnc-reconcile | Sunday 3am | dnc_reconcile.py | Clean DNC list | - |

### Cron Dependency Graph
```
daily-drafts (8am)
    ↓
process-approvals (every 5min) ← retry-failed (every 15min)
    ↓
daily-metrics (11pm)
    ↓
hourly-alerts (every hour)

poll-* (every 15min) → hot_reply_drafts → process-approvals

daily-backup (2am)
weekly-dnc-reconcile (Sun 3am)
```

### Management Commands
```bash
# List all crons
openclaw cron list

# Remove a cron
openclaw cron remove <cron-name>

# Remove all REengine crons
openclaw cron list | grep -E 'daily-drafts|process-approvals|retry-failed|poll-imap|poll-whatsapp|poll-telegram|daily-metrics|hourly-alerts|daily-backup|weekly-dnc-reconcile' | awk '{print $1}' | xargs -I {} openclaw cron remove {}

# Reinstall all
bash $WORKSPACE/realestate-engine/scripts/install_crons.sh
```
```

---

### Step 15: Testing & Validation Suite

**15.1. Create tests/test_scripts.py**
```python
#!/usr/bin/env python3
"""Test that all scripts can be imported without errors"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../scripts'))

def test_import_utils():
    from utils.check_dnc import is_dnc, add_to_dnc
    from utils.log_event import log_event
    from utils.rate_limiter import can_send, record_send
    print("✅ Utils imports successful")

def test_import_core_scripts():
    # Test that core scripts have valid syntax
    scripts = [
        'send_approved_router',
        'retry_failed_sends',
        'metrics',
        'alerts',
        'opt_out_handler'
    ]
    for script in scripts:
        __import__(script)
    print("✅ Core scripts import successful")

if __name__ == '__main__':
    test_import_utils()
    test_import_core_scripts()
    print("\n✅ All import tests passed")
```

**15.2. Create tests/test_csvs.py**
```python
#!/usr/bin/env python3
"""Test CSV schema integrity"""
import csv, os
from pathlib import Path

WORKSPACE = Path(os.environ.get('WORKSPACE', '~/.openclaw')) / 'realestate-engine'

SCHEMAS = {
    'dnc.csv': ['phone', 'email', 'reason', 'added_by', 'added_at', 'source', 'notes'],
    'events.csv': ['event_id', 'timestamp', 'event_type', 'channel', 'lead_id', 
                   'approval_id', 'status', 'metadata_json', 'user_id'],
    'failed_sends.csv': ['id', 'original_approval_id', 'channel', 'target', 'message',
                        'error_code', 'error_msg', 'retry_count', 'max_retries',
                        'next_retry_at', 'failed_at'],
    # ... add all 15+ CSVs
}

def test_csv_schemas():
    for filename, expected_cols in SCHEMAS.items():
        filepath = WORKSPACE / 'data' / filename
        if not filepath.exists():
            print(f"⚠️  {filename} does not exist (create it first)")
            continue

        with open(filepath, 'r') as f:
            reader = csv.reader(f)
            actual_cols = next(reader)

        if actual_cols != expected_cols:
            print(f"❌ {filename} schema mismatch")
            print(f"   Expected: {expected_cols}")
            print(f"   Actual:   {actual_cols}")
        else:
            print(f"✅ {filename} schema valid")

if __name__ == '__main__':
    test_csv_schemas()
```

**15.3. Create tests/test_dnc_enforcement.py**
```python
#!/usr/bin/env python3
"""Test that DNC blocking works"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../scripts'))

from utils.check_dnc import is_dnc, add_to_dnc

def test_dnc_enforcement():
    # Add test contact to DNC
    test_email = "test_dnc@example.com"
    add_to_dnc(test_email, "Test", "test_script", "manual", "Test entry")

    # Verify it's blocked
    blocked, reason = is_dnc(test_email)
    assert blocked == True, "DNC check failed"
    print(f"✅ DNC enforcement working: {test_email} blocked")

    # Test non-DNC contact
    ok_email = "not_on_dnc@example.com"
    blocked, reason = is_dnc(ok_email)
    assert blocked == False, "False positive on DNC check"
    print(f"✅ Non-DNC contact allowed: {ok_email}")

if __name__ == '__main__':
    test_dnc_enforcement()
    print("\n✅ All DNC tests passed")
```

**15.4. Create tests/test_rate_limits.py**
```python
#!/usr/bin/env python3
"""Test rate limiting logic"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../scripts'))

from utils.rate_limiter import can_send, record_send, load_rate_limits

def test_rate_limits():
    # Test that limits are loaded
    limits = load_rate_limits()
    assert 'whatsapp' in limits, "Rate limits config not loaded"
    print(f"✅ Rate limits loaded: {limits['whatsapp']}")

    # Test can_send
    can, reason = can_send('whatsapp')
    print(f"✅ can_send('whatsapp'): {can} {reason or ''}")

    # Simulate sends up to limit
    # ... test logic here

if __name__ == '__main__':
    test_rate_limits()
    print("\n✅ All rate limit tests passed")
```

**15.5. Create run_all_tests.sh**
```bash
#!/bin/bash
echo "Running REengine test suite..."
echo ""

python3 tests/test_scripts.py
python3 tests/test_csvs.py
python3 tests/test_dnc_enforcement.py
python3 tests/test_rate_limits.py

echo ""
echo "✅ All tests complete"
```

---

### Step 16: Troubleshooting Guide

**Add to README Section 8:**

```markdown
## Troubleshooting Guide

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ModuleNotFoundError: No module named 'utils'` | Python path not set | Add `sys.path.insert(0, script_dir)` at top of script |
| `FileNotFoundError: dnc.csv` | CSV files not created | Run `bash scripts/create_csv_files.sh` |
| `openclaw: command not found` | OpenClaw not installed | Run `npm install -g openclaw@latest` |
| `Rate limit exceeded` | Sending too fast | Wait for next time window, check rate_limits.json |
| `DNC violation detected` | Trying to send to blocked contact | Contact is on DNC list, cannot send |
| `Approval stuck in pending` | Never approved | Check approvals.csv, approve via WebChat |

### Debugging Checklist

**1. Is OpenClaw running?**
```bash
ps aux | grep openclaw
openclaw status
```

**2. Are cron jobs running?**
```bash
openclaw cron list
# Check last run time for each cron
```

**3. Check recent events**
```bash
tail -n 50 $WORKSPACE/realestate-engine/data/events.csv
```

**4. Check failed sends**
```bash
cat $WORKSPACE/realestate-engine/data/failed_sends.csv | wc -l
```

**5. Check rate limit status**
```bash
python3 -c "from utils.rate_limiter import can_send; print(can_send('whatsapp'))"
```

### Manual Operations

**Manually trigger a script**
```bash
cd $WORKSPACE/realestate-engine/scripts
python3 send_approved_router.py
```

**Manually approve all pending**
```bash
# WARNING: Approves everything
python3 scripts/approve_all_pending.py  # Create this script if needed
```

**Manually add to DNC**
```bash
python3 scripts/utils/check_dnc.py add email@example.com "Manual addition"
```

**Check CSV row counts**
```bash
for csv in $WORKSPACE/realestate-engine/data/*.csv; do
    echo "$(wc -l < $csv) rows: $(basename $csv)"
done
```

### Emergency Procedures

**Emergency Stop (Disable all sending)**
```bash
bash $WORKSPACE/realestate-engine/scripts/emergency_stop.sh
```

Emergency stop script:
```bash
#!/bin/bash
echo "🚨 EMERGENCY STOP - Disabling all sending crons"
openclaw cron remove 'process-approvals'
openclaw cron remove 'retry-failed'
echo "✅ Sending disabled"
echo "To re-enable: bash scripts/install_crons.sh"
```

**Recover from corrupted CSV**
```bash
# Restore from last backup
ls -t $WORKSPACE/realestate-engine/backups/*.tar.gz | head -1
bash scripts/restore_from_backup.sh <backup_file>
```

**Reset everything (DESTRUCTIVE)**
```bash
# Remove all CSVs and start fresh
rm $WORKSPACE/realestate-engine/data/*.csv
bash scripts/create_csv_files.sh
```
```

---

## EXECUTION CHECKLIST

Use this checklist to track your progress:

```
## Phase 1: Critical Infrastructure
- [ ] Step 1: Error Handling & Retry Logic
  - [ ] Create failed_sends.csv
  - [ ] Create retry_failed_sends.py
  - [ ] Create dead_letter.csv
  - [ ] Update send_approved_router.py with try/catch
  - [ ] Add retry cron job

- [ ] Step 2: Rate Limiting & Throttling
  - [ ] Create config/rate_limits.json
  - [ ] Create send_window.csv
  - [ ] Create utils/rate_limiter.py
  - [ ] Update send_approved_router.py with rate checks

- [ ] Step 3: DNC Enforcement
  - [ ] Expand dnc.csv schema
  - [ ] Create utils/check_dnc.py
  - [ ] Update ALL draft scripts with DNC checks
  - [ ] Create dnc_reconcile.py
  - [ ] Add DNC reconciliation cron

## Phase 2: Observability & Metrics
- [ ] Step 4: Events Schema & Logging
  - [ ] Finalize events.csv schema
  - [ ] Create utils/log_event.py
  - [ ] Create events_daily_summary.csv

- [ ] Step 5: Metrics Dashboard Data
  - [ ] Create metrics.py
  - [ ] Create metrics_history.csv
  - [ ] Add metrics cron

- [ ] Step 6: Alerting System
  - [ ] Create alerts.py
  - [ ] Create alerts_log.csv
  - [ ] Create config/alert_thresholds.json
  - [ ] Add alerts cron

## Phase 3: Compliance & Audit Trail
- [ ] Step 7: Approval Audit Trail
  - [ ] Add audit columns to approvals.csv
  - [ ] Create approvals_archive.csv
  - [ ] Create approval_changes.csv
  - [ ] Create audit_report.py

- [ ] Step 8: Data Retention & Backup
  - [ ] Create backup_csvs.sh
  - [ ] Create restore_from_backup.sh
  - [ ] Add backup cron

- [ ] Step 9: Opt-Out/Unsubscribe Flow
  - [ ] Update email templates with unsubscribe links
  - [ ] Create opt_out_handler.py
  - [ ] Create opt_out_log.csv
  - [ ] Update poll scripts with keyword detection
  - [ ] Add /optout WebChat command

- [ ] Step 10: GDPR/CCPA Compliance Tools
  - [ ] Create data_export.py
  - [ ] Create data_delete.py
  - [ ] Create consent_log.csv
  - [ ] Create compliance_report.py

## Phase 4: LinkedIn/Facebook Semi-Auto
- [ ] Step 11: Browser Automation Setup
  - [ ] Document OpenClaw browser setup
  - [ ] Create linkedin_open_draft.py
  - [ ] Create facebook_open_draft.py
  - [ ] Add browser tracking to events

- [ ] Step 12: Manual Send Confirmation
  - [ ] Create manual_sends_pending.csv
  - [ ] Update mark_sent_manual.py
  - [ ] Add /mark_sent WebChat command
  - [ ] Add alert for pending manual sends
  - [ ] Document limitation in README

## Phase 5: Documentation & Testing
- [ ] Step 13: Complete README.md
  - [ ] Section 0: Safety & Secrets (enhance)
  - [ ] Section 2: Folder Structure & CSV Schemas (NEW)
  - [ ] Section 4: Scripts Reference (NEW)
  - [ ] Section 6: Observability & Metrics (NEW)
  - [ ] Section 8: Error Handling & Troubleshooting (NEW)

- [ ] Step 14: Cron Jobs Master Reference
  - [ ] Create install_crons.sh
  - [ ] Document all 10 crons in README Section 5
  - [ ] Create cron dependency graph

- [ ] Step 15: Testing & Validation Suite
  - [ ] Create tests/test_scripts.py
  - [ ] Create tests/test_csvs.py
  - [ ] Create tests/test_dnc_enforcement.py
  - [ ] Create tests/test_rate_limits.py
  - [ ] Create run_all_tests.sh

- [ ] Step 16: Troubleshooting Guide
  - [ ] Add to README Section 8
  - [ ] Document common errors
  - [ ] Document debugging checklist
  - [ ] Document manual operations
  - [ ] Create emergency_stop.sh

## Final Validation
- [ ] Run full test suite: bash run_all_tests.sh
- [ ] Install all crons: bash install_crons.sh
- [ ] Verify all crons running: openclaw cron list
- [ ] Send test message through full pipeline
- [ ] Test DNC blocking
- [ ] Test rate limiting
- [ ] Test opt-out flow
- [ ] Test backup and restore
- [ ] Review README completeness
```

---

## Quick Start Summary

**For someone starting from scratch:**

1. Complete Phase 1 (Steps 1-3) first - this makes the system safe
2. Complete Phase 2 (Steps 4-6) next - this gives you visibility
3. Complete Phase 3 (Steps 7-10) before production - this ensures compliance
4. Complete Phase 4 (Steps 11-12) optionally - this is LinkedIn/FB
5. Complete Phase 5 (Steps 13-16) always - documentation is critical

**Estimated effort:**
- Phase 1: 8-12 hours
- Phase 2: 6-8 hours
- Phase 3: 10-14 hours
- Phase 4: 3-5 hours
- Phase 5: 8-10 hours

**Total: 35-49 hours of focused development work**

