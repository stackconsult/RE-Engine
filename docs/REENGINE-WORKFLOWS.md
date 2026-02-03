# RE Engine — Workflows

## Outbound
1) Draft creation (pending approvals)
2) Human approval
3) Router sends approved only
4) Events recorded

## Inbound
- Email IMAP poll → map lead → classify → draft reply (pending)
- WA/TG scan → known contact only; unknown hot → contact capture
- Social snapshot ingest → inbox_items + optional hot draft

## Social (semi-auto)
- Router opens page
- Human clicks Send/Post
- Mark sent_manual
