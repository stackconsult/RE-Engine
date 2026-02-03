# RE Engine — Data Model (Canonical)

Phase 1 (CSV): strict headers, atomic writes.

## leads.csv
`lead_id,first_name,last_name,email,phone_e164,city,province,source,tags,status,created_at`

## approvals.csv
`approval_id,ts_created,lead_id,channel,action_type,draft_subject,draft_text,draft_to,status,approved_by,approved_at,notes`

## events.csv
`event_id,ts,lead_id,channel,event_type,campaign,message_id,meta_json`

## contacts.csv
`lead_id,channel,external_id`

## dnc.csv
`value,reason,ts_added`
