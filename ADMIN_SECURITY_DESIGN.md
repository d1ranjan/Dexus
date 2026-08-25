# Dexus Admin Security and Product Design

## Security model

Dexus retains the existing **user** and **admin** roles. Role values are read only from the authenticated server-side user record; no client request, local state, route parameter, or app preference can grant a role. The owner identity already receives the administrative role through server-side user upsert. The dashboard does not implement a super-admin or user-editable role change surface.

| Actor | Permitted scope | Explicitly not permitted |
|---|---|---|
| User | Their own workspace, settings, assistant, documents, and data. | Admin procedures, another user’s metadata or content, role changes, audit logs. |
| Admin | Operational metrics; metadata-only user management; controlled, reasoned access to a specified user’s requested content; soft account-state changes; audit review. | Raw SQL, secrets, passwords, authentication tokens, silent content access, permanent routine deletion, role escalation. |

Account status is server-side: `active`, `suspended`, or `deactivated`. Application-level user procedures require an active account. Administrative procedures can manage status but cannot grant roles. A suspended or deactivated account’s personal data remains present for support and audit purposes but is unavailable through normal-user procedures.

## Controlled access and auditability

The admin user detail screen defaults to metadata, aggregate usage, and activity timestamps. It never loads private content automatically. To inspect tasks, goals, notes, knowledge, people, follow-ups, brain dumps, timeline, or document metadata, an administrator must open **Access user content**, select requested resource types, and provide a reason of at least ten characters. The server writes the audit event before returning any sensitive content.

Every sensitive action is written to the append-only `adminAuditLogs` table with the administrator, target user when applicable, action, resource, required reason, request identifier, and timestamp. The Dexus application has no update or delete procedure for audit records. Administrative exports, content deletion requests, status changes, and content access use the same reason-and-log pattern. The dashboard deliberately does not expose prompt bodies, document contents, database credentials, API keys, session tokens, or raw stack traces.

## Monitoring and privacy

Operational telemetry records metadata only. AI telemetry records request type, outcome, latency, token counts when available, error category, owner user ID, and timestamp—not raw prompts or extracted personal content. Error records store a redacted safe message, severity, feature, request identifier, optional user ID, and resolution state. Storage metrics use Dexus document metadata and known file sizes; the interface labels orphan detection as unavailable when the storage provider does not provide an inventory API.

## Mobile admin experience

The admin section keeps the Dexus indigo identity but uses an operational visual language: compact metric cards, explicit warning colours, high-contrast health states, and confirmation sheets for sensitive operations. On phones, **Admin** opens an overview screen. A navigation list routes to Users, Activity, Storage, AI Monitoring, Database, Errors, Audit Logs, and Admin Settings. Metadata-first user detail screens use safe summaries; the sensitive-content access sheet sits behind an explicit action with clear disclosure.

| Screen | Primary information and action |
|---|---|
| Overview | User, activity, health, storage, and recent operational signal cards. |
| Users | Search and filter account metadata; open profile; suspend, reactivate, or deactivate with a reason. |
| User detail | Metadata, usage counts, account activity, and an explicit content-access action. |
| Controlled content | Chosen resources only after confirmation and a logged reason. |
| Audit logs | Filtered immutable record of sensitive access and administrative changes. |
| Storage | Document count, bytes, type distribution, largest known uploads, and metadata. |
| AI monitoring | Request outcomes, response times, extraction failures, and redacted error categories. |
| Database and errors | Migration/schema health, API/storage/auth state, and sanitized operational errors. |

## Test requirements

Integration tests must prove that normal users are rejected from every admin procedure; administrators can access aggregate metadata; sensitive content requires a reason and generates an audit record; account state changes generate an audit record; and a regular user cannot modify another user’s data or audit trail. Existing Dexus tests for normal user isolation and Brain Dump persistence remain mandatory regression coverage.
