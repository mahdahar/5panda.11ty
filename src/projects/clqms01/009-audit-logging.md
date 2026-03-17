---
layout: clqms-post.njk
tags: clqms
title: "Audit Logging"
description: "Unified audit logging model, event catalog, and capture rules for CLQMS."
date: 2026-03-17
order: 9
---
# Audit Logging Strategy

## Overview

This document defines how CLQMS should capture audit and operational logs across four tables:

- `logpatient` — patient, visit, and ADT activity
- `logorder` — orders, tests, specimens, results, and QC
- `logmaster` — master data and configuration changes
- `logsystem` — sessions, security, import/export, and system operations

The intent is to audit all domains, including master data changes, and to standardize event capture so reporting and compliance are consistent.

## Table Ownership

| Event | Table |
| --- | --- |
| Patient registered/updated/merged | `logpatient` |
| Insurance/consent changed | `logpatient` |
| Patient visit (admit/transfer/discharge) | `logpatient` |
| Order created/cancelled | `logorder` |
| Sample received/rejected | `logorder` |
| Result entered/verified/amended | `logorder` |
| Result released/retracted/corrected | `logorder` |
| QC result recorded | `logorder` |
| Test panel added/removed | `logmaster` |
| Reference range changed | `logmaster` |
| Analyzer config updated | `logmaster` |
| User role changed | `logmaster` |
| User login/logout | `logsystem` |
| Import/export job start/end | `logsystem` |

## Standard Log Schema (Shared Columns)

Use a shared schema for all four tables to keep instrumentation and reporting consistent. The legacy names below match existing patterns and can be reused.

| Column | Description |
| --- | --- |
| `LogID` (PK) | Auto increment primary key per table (e.g., `LogPatientID`) |
| `TblName` | Source table name |
| `RecID` | Record ID of the entity |
| `FldName` | Field name that changed (nullable for bulk events) |
| `FldValuePrev` | Previous value (string or JSON) |
| `FldValueNew` | New value (string or JSON) |
| `UserID` | Acting user ID (nullable for system actions) |
| `SiteID` | Site context |
| `DIDType` | Device identifier type |
| `DID` | Device identifier |
| `MachineID` | Workstation or host identifier |
| `SessionID` | Session identifier |
| `AppID` | Client application ID |
| `ProcessID` | Process/workflow identifier |
| `WebPageID` | UI page/context (nullable) |
| `EventID` | Event code (see catalog) |
| `ActivityID` | Action code (create/update/delete/read/etc.) |
| `Reason` | User/system reason |
| `LogDate` | Timestamp of event |
| `Context` | JSON metadata (optional but recommended) |
| `IpAddress` | Remote IP (optional but recommended) |

Recommended: keep a JSON string in `Context` for extra details (e.g., route, request id, batch id, error message). Use size limits to avoid oversized rows.

## Event Catalog

### logpatient

**Patient core**

- Register patient
- Update demographics
- Merge/unmerge/split
- Identity changes (MRN, external identifiers)
- Consent grant/revoke/update
- Insurance add/update/remove
- Patient record view (if required by compliance)

**Visit/ADT**

- Admit, transfer, discharge
- Bed/ward/unit changes
- Visit status updates

**Other**

- Patient notes/attachments added/removed
- Patient alerts/flags changes

### logorder

**Orders/tests**

- Create/cancel/reopen order
- Add/remove tests
- Priority changes
- Order comments added/removed

**Specimen lifecycle**

- Collected, labeled, received, rejected
- Centrifuged, aliquoted, stored
- Disposed/expired

**Results**

- Result entered/updated
- Verified/amended
- Released/retracted/corrected
- Result comments/interpretation changes
- Auto-verification override

**QC**

- QC result recorded
- QC failure/override

### logmaster

**Value sets**

- Create/update/retire value set items

**Test definitions**

- Test definition updates (units, methods, ranges)
- Reference range changes
- Formula/delta check changes
- Test panel membership add/remove

**Infrastructure**

- Analyzer/instrument config changes
- Host app integration config
- Coding system changes

**Users/roles**

- User create/disable/reset
- Role changes
- Permission changes

**Sites/workstations**

- Site/location/workstation CRUD

### logsystem

**Sessions & security**

- Login/logout
- Failed login attempts
- Lockouts/password resets
- Token issue/refresh/revoke
- Authorization failures

**Import/export**

- Import/export job start/end
- Batch ID, source, record counts, status

**System operations**

- Background jobs start/end
- Integration sync runs
- System config changes
- Service errors that affect data integrity

## Activity & Event Codes

Use consistent `ActivityID` and `EventID` values. Recommended defaults:

- `ActivityID`: `CREATE`, `UPDATE`, `DELETE`, `READ`, `MERGE`, `SPLIT`, `CANCEL`, `REOPEN`, `VERIFY`, `AMEND`, `RETRACT`, `RELEASE`, `IMPORT`, `EXPORT`, `LOGIN`, `LOGOUT`
- `EventID`: domain-specific codes (e.g., `PATIENT_REGISTERED`, `ORDER_CREATED`, `RESULT_VERIFIED`, `QC_RECORDED`)

## Capture Guidelines

- Always capture `UserID`, `SessionID`, `SiteID`, and `LogDate` when available.
- If the action is system-driven, set `UserID` to `SYSTEM` (or null) and add context in `Context`.
- Store payload diffs in `FldValuePrev` and `FldValueNew` for single-field changes; for multi-field changes, put a JSON diff in `Context` and leave `FldName` null.
- For bulk operations, store batch metadata in `Context` (`batch_id`, `record_count`, `source`).
- Do not log secrets, tokens, or full PHI when not required. Mask or omit sensitive fields.

## Retention & Governance

- Define retention policy per table (e.g., 7 years for patient/order, 2 years for system).
- Archive before purge; record purge activity in `logsystem`.
- Restrict write/delete permissions to service accounts only.

## Implementation Checklist

1. Create the four tables with shared schema (or migrate existing log tables to match).
2. Add a single audit service with helpers to build a normalized payload.
3. Instrument controllers/services for each event category above.
4. Add automated tests for representative audit writes.
5. Document `EventID` codes used by each endpoint/service.
