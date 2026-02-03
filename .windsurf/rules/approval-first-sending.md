# Approval-First Sending (Always On)

- Never send any outbound message (email/whatsapp/telegram/social) unless the approval record status is exactly `approved`.
- If status is `pending`, `rejected`, `failed`, `approved_opened`, or missing: do not send.
- All sends must append an event row with outcome.
