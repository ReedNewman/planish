# DataVault API Guide

**Version 1.0** | Integration Reference

---

## Introduction

The DataVault API provides secure, RESTful access to your organization's data storage and retrieval infrastructure. This guide covers authentication, core endpoints, error handling, and best practices for integrating with the DataVault platform.

### Base URL

All API requests should be made to:

```
https://api.datavault.example.com/v1
```

### Content Type

All requests and responses use JSON format:

```http
Content-Type: application/json
Accept: application/json
```

## Authentication

DataVault uses OAuth 2.0 Bearer tokens for authentication. Include the token in the `Authorization` header of every request.

### Obtaining a Token

Send a `POST` request to the token endpoint with your client credentials:

```http
POST /auth/token
Content-Type: application/json

{
  "client_id": "your-client-id",
  "client_secret": "your-client-secret",
  "grant_type": "client_credentials"
}
```

#### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

### Token Lifecycle

| Phase | Duration | Action |
|-------|----------|--------|
| Active | 0–55 min | Use normally |
| Refresh Window | 55–60 min | Refresh proactively |
| Expired | 60+ min | Must re-authenticate |

> **Important:** Tokens should be refreshed before expiration. The API returns `401 Unauthorized` for expired tokens with no grace period.

## Vaults

Vaults are the primary organizational unit in DataVault. Each vault contains collections of documents with configurable access controls and retention policies.

### Create a Vault

```http
POST /vaults
Authorization: Bearer {token}

{
  "name": "Project Alpha",
  "description": "Engineering documents for Project Alpha",
  "retention_days": 365,
  "encryption": "AES-256-GCM",
  "tags": ["engineering", "project-alpha"]
}
```

#### Response

```json
{
  "id": "vault_8f3a2b1c",
  "name": "Project Alpha",
  "description": "Engineering documents for Project Alpha",
  "created_at": "2026-01-15T10:30:00Z",
  "status": "active",
  "document_count": 0,
  "storage_used_bytes": 0
}
```

### List Vaults

```http
GET /vaults?page=1&limit=25&sort=created_at&order=desc
Authorization: Bearer {token}
```

### Vault Permissions

| Role | Read | Write | Delete | Admin |
|------|------|-------|--------|-------|
| Viewer | Yes | No | No | No |
| Editor | Yes | Yes | No | No |
| Manager | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes |

## Documents

Documents are the core data objects stored within vaults.

### Upload a Document

```http
POST /vaults/{vault_id}/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "file": "<binary data>",
  "metadata": {
    "title": "Q4 Financial Report",
    "author": "Jane Smith",
    "department": "Finance",
    "classification": "internal"
  }
}
```

### Search Documents

The search endpoint supports full-text search with filters:

```http
POST /vaults/{vault_id}/documents/search
Authorization: Bearer {token}

{
  "query": "quarterly report",
  "filters": {
    "department": "Finance",
    "created_after": "2026-01-01T00:00:00Z",
    "classification": ["internal", "confidential"]
  },
  "sort": { "field": "relevance", "order": "desc" },
  "pagination": { "page": 1, "limit": 50 }
}
```

#### Search Response

```json
{
  "total": 142,
  "page": 1,
  "limit": 50,
  "results": [
    {
      "id": "doc_9e4f3a2b",
      "title": "Q4 Financial Report",
      "vault_id": "vault_8f3a2b1c",
      "relevance_score": 0.95,
      "snippet": "...quarterly report shows a 12% increase in...",
      "created_at": "2026-03-10T14:22:00Z"
    }
  ]
}
```

### Document Lifecycle States

Documents progress through these states:

| State | Description | Transitions |
|-------|-------------|-------------|
| `draft` | Initial upload, not yet published | `published`, `archived` |
| `published` | Available for search and access | `archived`, `draft` |
| `archived` | Retained but hidden from search | `published`, `deleted` |
| `deleted` | Soft-deleted, recoverable for 30 days | `archived` (restore) |
| `purged` | Permanently removed | Terminal state |

## Webhooks

DataVault can send real-time notifications to your systems when events occur.

### Configuring a Webhook

```http
POST /webhooks
Authorization: Bearer {token}

{
  "url": "https://your-app.example.com/webhooks/datavault",
  "events": ["document.created", "document.updated", "vault.permission_changed"],
  "secret": "whsec_your-signing-secret",
  "active": true
}
```

### Webhook Payload

```json
{
  "id": "evt_1a2b3c4d",
  "type": "document.created",
  "timestamp": "2026-04-01T09:15:00Z",
  "data": {
    "document_id": "doc_9e4f3a2b",
    "vault_id": "vault_8f3a2b1c",
    "title": "New Engineering Spec",
    "created_by": "user_abc123"
  }
}
```

### Verifying Webhook Signatures

All webhook payloads include an `X-DataVault-Signature` header. Verify it using HMAC-SHA256:

```bash
echo -n "$payload" | openssl dgst -sha256 -hmac "$webhook_secret"
```

> **Security Note:** Always verify webhook signatures before processing the payload. Unverified webhooks should be rejected with a `401` response.

## Error Handling

The API uses standard HTTP status codes and returns structured error responses.

### Error Response Format

```json
{
  "error": {
    "code": "VAULT_NOT_FOUND",
    "message": "The requested vault does not exist or you lack permission to access it.",
    "request_id": "req_7f8e9d0c",
    "documentation_url": "https://docs.datavault.example.com/errors/VAULT_NOT_FOUND"
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request body or missing required fields |
| 401 | `UNAUTHORIZED` | Missing or expired authentication token |
| 403 | `FORBIDDEN` | Valid token but insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists or state conflict |
| 429 | `RATE_LIMITED` | Too many requests; retry after `Retry-After` header |
| 500 | `INTERNAL_ERROR` | Server error; contact support with `request_id` |

## Rate Limits

API requests are rate-limited per client. Current limits:

| Tier | Requests/min | Burst | Storage |
|------|-------------|-------|---------|
| Free | 60 | 10 | 1 GB |
| Professional | 600 | 50 | 100 GB |
| Enterprise | 6,000 | 200 | Unlimited |

##### Rate Limit Headers

Every response includes these headers:

- `X-RateLimit-Limit` — Maximum requests per window
- `X-RateLimit-Remaining` — Requests remaining in current window
- `X-RateLimit-Reset` — Unix timestamp when the window resets

## SDK Examples

### Python

```python
import datavault

client = datavault.Client(
    client_id="your-client-id",
    client_secret="your-client-secret"
)

# Create a vault
vault = client.vaults.create(
    name="Analytics Data",
    retention_days=90
)

# Upload a document
doc = vault.documents.upload(
    file_path="/path/to/report.pdf",
    metadata={"department": "Analytics"}
)

print(f"Document uploaded: {doc.id}")
```

### JavaScript

```javascript
const DataVault = require('@acme/datavault-sdk');

const client = new DataVault({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// Search documents
const results = await client.documents.search('vault_8f3a2b1c', {
  query: 'quarterly report',
  filters: { department: 'Finance' },
});

console.log(`Found ${results.total} documents`);
```

## Appendix

### Supported File Types

| Category | Extensions | Max Size |
|----------|-----------|----------|
| Documents | `.pdf`, `.docx`, `.xlsx`, `.pptx` | 100 MB |
| Images | `.png`, `.jpg`, `.gif`, `.svg` | 50 MB |
| Archives | `.zip`, `.tar.gz` | 500 MB |
| Text | `.txt`, `.csv`, `.json`, `.xml` | 25 MB |
| Code | `.py`, `.js`, `.kt`, `.java` | 10 MB |

### Glossary

- **Vault** — A secure container for organizing related documents with shared access controls.
- **Document** — A file stored in a vault along with its metadata and version history.
- **Collection** — A logical grouping of documents within a vault, similar to folders.
- **Retention Policy** — Rules governing how long documents are kept before automatic archival or deletion.
- **Webhook** — An HTTP callback triggered by events in your DataVault account.
