---
layout: clqms-post.njk
tags: clqms
title: "Audit Logging"
description: "Audit logging concept and example API contracts for CLQMS"
date: 2026-03-17
order: 9
---

# Audit Logging: Concept and Example API Contract

## Concept

CLQMS uses four audit tables so domain activity is separated but consistent:

- `logpatient` - patient, identity, consent, insurance, and visit/ADT activity
- `logorder` - orders, specimens, results, and QC activity
- `logmaster` - configuration and master data changes
- `logsystem` - sessions, security, integration jobs, and system operations

The goal is traceability: who did what, when, where, and why.

### Shared Audit Fields

All log records should carry the same core metadata:

- identity: `UserID`, `SessionID`, `SiteID`
- event classification: `EventID`, `ActivityID`
- change details: `TblName`, `RecID`, `FldName`, `FldValuePrev`, `FldValueNew`
- time/context: `LogDate`, optional `Context` JSON, optional `IpAddress`

### Category Reference (Simplified)

- **Patient (`logpatient`)**: register/update/merge, consent/insurance changes, ADT events
- **Order (`logorder`)**: create/cancel/reopen, specimen lifecycle, result verify/amend/release,
  QC record/override
- **Master (`logmaster`)**: test definitions, reference ranges, analyzer/integration config,
  user/role/permission changes
- **System (`logsystem`)**: login/logout/failures, token lifecycle, import/export jobs,
  background process events

Recommended `ActivityID` values:
`CREATE`, `UPDATE`, `DELETE`, `READ`, `MERGE`, `SPLIT`, `CANCEL`, `REOPEN`, `VERIFY`,
`AMEND`, `RETRACT`, `RELEASE`, `IMPORT`, `EXPORT`, `LOGIN`, `LOGOUT`.

---

## Example API Contract (Reference Pattern)

These contracts are a reference pattern for standardizing audit capture and reporting.

### 1) Write Audit Event

```http
POST /api/audit/log
Content-Type: application/json
```

Purpose: write one normalized audit event, then route it to the correct log table.

Request example:

```json
{
  "domain": "order",
  "TblName": "patres",
  "RecID": "12345",
  "FldName": "Result",
  "FldValuePrev": "1.0",
  "FldValueNew": "1.2",
  "EventID": "RESULT_VERIFIED",
  "ActivityID": "VERIFY",
  "Reason": "Auto verification rule passed",
  "UserID": "u001",
  "SiteID": "s01",
  "SessionID": "sess-8f31",
  "LogDate": "2026-03-17T10:21:33Z",
  "Context": {
    "order_id": "OID-7788",
    "test_code": "GLU",
    "request_id": "req-2a9"
  },
  "IpAddress": "10.2.4.8"
}
```

Success response example:

```json
{
  "status": "success",
  "message": "Audit event stored",
  "data": {
    "table": "logorder",
    "logId": 556901
  }
}
```

Error response example:

```json
{
  "status": "error",
  "message": "Missing required field: EventID",
  "data": null
}
```

### 2) Query Audit Logs

```http
GET /api/audit/logs?domain=order&recId=12345&eventId=RESULT_VERIFIED&from=2026-03-01&to=2026-03-31
```

Purpose: retrieve normalized audit history with filters for investigation and compliance.

Success response example:

```json
{
  "status": "success",
  "data": [
    {
      "logId": 556901,
      "table": "logorder",
      "EventID": "RESULT_VERIFIED",
      "ActivityID": "VERIFY",
      "TblName": "patres",
      "RecID": "12345",
      "FldName": "Result",
      "FldValuePrev": "1.0",
      "FldValueNew": "1.2",
      "UserID": "u001",
      "SiteID": "s01",
      "LogDate": "2026-03-17T10:21:33Z"
    }
  ]
}
```

---

## Capture Rules (Short)

- Always include `UserID`, `SessionID`, `SiteID`, `EventID`, `ActivityID`, and `LogDate`.
- For multi-field updates, keep `FldName` null and store the diff in `Context`.
- Do not log secrets/tokens; mask sensitive values in payloads.
- For system-driven actions, use `UserID = SYSTEM` (or null) and explain in `Context`.
