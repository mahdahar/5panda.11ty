---
layout: clqms-post.njk
tags: clqms
title: "CLQMS: Test Definition API Examples"
description: "Reference documentation for test maintenance API endpoints and data structures."
date: 2025-12-10
order: 10
---

# Test Definition API Examples

This document provides API examples for test-related endpoints in the CLQMS Backend.

```
Base URL: http://localhost:8080/v1/tests
```

---

## 1. testdefsite - Main Test Definitions

The main test definitions table. Test types include: TEST, PARAM, CALC, GROUP, TITLE.

### GET /v1/tests - List all tests

**Request:**
```bash
curl -X GET "http://localhost:8080/v1/tests" \
  -H "Cookie: token=<jwt_token>"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| SiteID | int | Filter by site |
| TestType | int | Filter by test type (valueset ID) |
| VisibleScr | int | Filter by screen visibility (0 or 1) |
| VisibleRpt | int | Filter by report visibility (0 or 1) |
| TestSiteName | string | Search keyword |

**Response (200):**
```json
{
  "status": "success",
  "message": "Data fetched successfully",
  "data": [
    {
      "TestSiteID": 1,
      "TestSiteCode": "GLU",
      "TestSiteName": "Glucose",
      "TestType": 27,
      "TypeCode": "TEST",
      "TypeName": "Test",
      "SeqScr": 1,
      "SeqRpt": 1,
      "VisibleScr": 1,
      "VisibleRpt": 1,
      "CountStat": 1,
      "StartDate": "2025-01-01 00:00:00",
      "EndDate": null
    }
  ]
}
```

---

### GET /v1/tests/{id} - Get single test with details

**Request:**
```bash
curl -X GET "/v1/tests/1" \
  -H "Cookie: token=<jwt_token>"
```

**Response (200) - TEST type with refnum:**
```json
{
  "status": "success",
  "message": "Data fetched successfully",
  "data": {
    "TestSiteID": 1,
    "TestSiteCode": "GLU",
    "TestSiteName": "Glucose",
    "TestType": 27,
    "TypeCode": "TEST",
    "TypeName": "Test",
    "Description": "Fasting blood glucose",
    "SeqScr": 1,
    "SeqRpt": 1,
    "VisibleScr": 1,
    "VisibleRpt": 1,
    "CountStat": 1,
    "StartDate": "2025-01-01 00:00:00",
    "EndDate": null,
    "testdeftech": [
      {
        "TestTechID": 1,
        "TestSiteID": 1,
        "DisciplineID": 1,
        "DisciplineName": "Chemistry",
        "DepartmentID": 1,
        "DepartmentName": "Laboratory",
        "ResultType": "NMRC",
        "RefType": 1,
        "VSet": null,
        "ReqQty": 1,
        "ReqQtyUnit": "mL",
        "Unit1": "mg/dL",
        "Factor": null,
        "Unit2": null,
        "Decimal": 0,
        "CollReq": "Fasting",
        "Method": "GOD-PAP",
        "ExpectedTAT": 24,
        "EndDate": null
      }
    ],
    "testmap": [],
    "refnum": [
      {
        "RefNumID": 1,
        "NumRefType": 1,
        "NumRefTypeVValue": "AB",
        "RangeType": 1,
        "RangeTypeVValue": "NORMAL",
        "Sex": 0,
        "SexVValue": null,
        "AgeStart": 0,
        "AgeEnd": 150,
        "LowSign": 1,
        "LowSignVValue": ">=",
        "Low": 70,
        "HighSign": 2,
        "HighSignVValue": "<=",
        "High": 100,
        "Flag": "N"
      }
    ],
    "refTypeOptions": [
      { "vid": 1, "vvalue": "NMRC", "vdesc": "Numeric" },
      { "vid": 2, "vvalue": "TEXT", "vdesc": "Text" }
    ],
    "sexOptions": [
      { "vid": 0, "vvalue": null, "vdesc": "All" },
      { "vid": 1, "vvalue": "M", "vdesc": "Male" },
      { "vid": 2, "vvalue": "F", "vdesc": "Female" }
    ],
    "mathSignOptions": [
      { "vid": 1, "vvalue": ">=", "vdesc": "Greater or Equal" },
      { "vid": 2, "vvalue": "<=", "vdesc": "Less or Equal" },
      { "vid": 3, "vvalue": ">", "vdesc": "Greater Than" },
      { "vid": 4, "vvalue": "<", "vdesc": "Less Than" }
    ],
    "numRefTypeOptions": [
      { "vid": 1, "vvalue": "AB", "vdesc": "Absolute" },
      { "vid": 2, "vvalue": "DIFF", "vdesc": "Differential" }
    ],
    "rangeTypeOptions": [
      { "vid": 1, "vvalue": "NORMAL", "vdesc": "Normal" },
      { "vid": 2, "vvalue": "PANIC", "vdesc": "Panic" },
      { "vid": 3, "vvalue": "DELTA", "vdesc": "Delta" }
    ]
  }
}
```

---

### POST /v1/tests - Create new test

**Request:**
```bash
curl -X POST "http://localhost:8080/v1/tests" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "SiteID": 1,
    "TestSiteCode": "HBA1C",
    "TestSiteName": "Hemoglobin A1c",
    "TestType": 27,
    "Description": "Glycated hemoglobin test",
    "SeqScr": 10,
    "SeqRpt": 10,
    "VisibleScr": 1,
    "VisibleRpt": 1,
    "CountStat": 1,
    "details": {
      "DisciplineID": 1,
      "DepartmentID": 1,
      "ResultType": "NMRC",
      "RefType": 1,
      "Unit1": "%",
      "Decimal": 1,
      "Method": "HPLC"
    },
    "refnum": [
      {
        "NumRefType": 1,
        "RangeType": 1,
        "Sex": 0,
        "AgeStart": 0,
        "AgeEnd": 150,
        "LowSign": 1,
        "Low": 4,
        "HighSign": 2,
        "High": 5.6,
        "Flag": "N"
      }
    ]
  }'
```

**Response (201):**
```json
{
  "status": "created",
  "message": "Test created successfully",
  "data": {
    "TestSiteId": 11
  }
}
```

---

### PUT/PATCH /v1/tests/{id} - Update test

```bash
curl -X PATCH "http://localhost:8080/v1/tests/11" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{
    "TestSiteName": "Hemoglobin A1c (Updated)",
    "SeqScr": 15
  }'
```

---

### DELETE /v1/tests/{id} - Soft delete test

```bash
curl -X DELETE "http://localhost:8080/v1/tests/11" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<jwt_token>" \
  -d '{"TestSiteID": 11}'
```

---

## 2. testdefcal - Calculation Test Details

Calculation tests (CALC type) have formula-based results.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| TestCalID | int | Primary key |
| TestSiteID | int | Foreign key to testdefsite |
| FormulaInput | string | Input parameters |
| FormulaCode | string | Formula identifier |
| Method | string | Calculation method |

---

## 3. testdefgrp - Group Test Members

Group tests (GROUP type) contain multiple member tests.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| TestGrpID | int | Primary key |
| TestSiteID | int | Parent test (the group) |
| Member | int | Foreign key to member test |
| MemberTypeCode | string | Member test type code |

---

## 4. refnum - Numeric Reference Ranges

Numeric reference ranges for NMRC type results.

**Valueset IDs:**

| Valueset | ID | Description |
|----------|-----|-------------|
| NumRefType | 46 | Numeric reference type |
| RangeType | 45 | Range type (NORMAL, PANIC, DELTA) |
| Sex | 3 | Gender values |
| MathSign | 41 | Mathematical signs (>=, <=, >, <) |

---

## Test Types Summary

| Type Code | Type Name | Related Table | Description |
|-----------|-----------|---------------|-------------|
| TEST | Test | testdeftech + refnum/reftxt | Standard test with numeric/text results |
| PARAM | Parameter | testdeftech + refnum/reftxt | Parameter test |
| CALC | Calculation | testdefcal | Formula-based calculated result |
| GROUP | Group | testdefgrp | Group of multiple tests |
| TITLE | Title | testmap only | Title/marker in reports |

---

## Common Valueset IDs

| ID | Name | Used For |
|----|------|----------|
| 3 | Sex | Gender selection |
| 27 | Test Type | testdefsite.TestType |
| 44 | Ref Type | testdeftech.RefType, testdefcal.RefType |
| 45 | Range Type | refnum.RangeType |
| 46 | Num Ref Type | refnum.NumRefType |
| 47 | Txt Ref Type | reftxt.TxtRefType |
| 41 | Math Sign | refnum.LowSign, refnum.HighSign |

---

## Authentication

All endpoints require JWT authentication via cookie:

```
-H "Cookie: token=<jwt_token>"
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "status": "error",
  "errors": {
    "TestSiteCode": "The TestSiteCode field is required.",
    "TestSiteName": "The TestSiteName field is required."
  }
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "error": "Test not found"
}
```

**500 Server Error:**
```json
{
  "status": "error",
  "error": "Something went wrong: <error message>"
}
```
