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

Field usage rule:

- If exactly one field is updated, set `FldName` and use `FldValuePrev`/`FldValueNew`.
- If more than one field is updated, keep `FldName` null and store the full diff in `Context`.

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

Multi-field change example (`Context.diff`):

```json
{
  "request_id": "req_851637066fcce071",
  "route": "POST /api/patient",
  "timestamp_utc": "2026-04-01T08:41:17.347Z",
  "entity_type": "patient",
  "entity_version": 1,
  "diff": [
    {
      "field": "PatientID",
      "previous": null,
      "new": "SMAJ3"
    },
    {
      "field": "AlternatePID",
      "previous": null,
      "new": "ALTSMAJ3"
    },
    {
      "field": "NameFirst",
      "previous": null,
      "new": "CIOMY"
    },
    {
      "field": "Prefix",
      "previous": null,
      "new": "ALM"
    },
    {
      "field": "Sex",
      "previous": null,
      "new": "1"
    },
    {
      "field": "Religion",
      "previous": null,
      "new": "ISLAM"
    },
    {
      "field": "NameMiddle",
      "previous": null,
      "new": "MD"
    },
    {
      "field": "NameMaiden",
      "previous": null,
      "new": "MD"
    },
    {
      "field": "MaritalStatus",
      "previous": null,
      "new": "S"
    },
    {
      "field": "NameLast",
      "previous": null,
      "new": "CUANKI"
    },
    {
      "field": "Ethnic",
      "previous": null,
      "new": "PPMLN"
    },
    {
      "field": "PlaceOfBirth",
      "previous": null,
      "new": "JKT"
    },
    {
      "field": "Race",
      "previous": null,
      "new": "NTBOR"
    },
    {
      "field": "Birthdate",
      "previous": null,
      "new": "2026-03-01"
    },
    {
      "field": "Citizenship",
      "previous": null,
      "new": "WNI"
    },
    {
      "field": "Street_1",
      "previous": null,
      "new": "S1"
    },
    {
      "field": "City",
      "previous": null,
      "new": "189"
    },
    {
      "field": "Street_2",
      "previous": null,
      "new": "S2"
    },
    {
      "field": "Province",
      "previous": null,
      "new": "11"
    },
    {
      "field": "Street_3",
      "previous": null,
      "new": "S3"
    },
    {
      "field": "ZIP",
      "previous": null,
      "new": 12345
    },
    {
      "field": "Country",
      "previous": null,
      "new": "IDN"
    },
    {
      "field": "EmailAddress1",
      "previous": null,
      "new": "M11@GM.COM"
    },
    {
      "field": "Phone",
      "previous": null,
      "new": "08976746473"
    },
    {
      "field": "EmailAddress2",
      "previous": null,
      "new": "M22@GM.COM"
    },
    {
      "field": "MobilePhone",
      "previous": null,
      "new": "08975664747"
    },
    {
      "field": "DeathIndicator",
      "previous": null,
      "new": "N"
    },
    {
      "field": "LinkTo",
      "previous": null,
      "new": "2"
    },
    {
      "field": "Custodian",
      "previous": null,
      "new": 1
    }
  ],
  "patient_id": "SMAJ3",
  "validation_profile": "patient.create"
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
- For single-field updates, use `FldName` with `FldValuePrev` and `FldValueNew`.
- For multi-field updates, keep `FldName` null and store the diff in `Context`.
- Do not log secrets/tokens; mask sensitive values in payloads.
- For system-driven actions, use `UserID = SYSTEM` (or null) and explain in `Context`.
