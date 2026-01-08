---
layout: clqms-post.njk
tags: clqms
title: "Database Design Review: Claude Opus"
date: 2025-12-04
order: 4
---

# CLQMS Database Design Review Report

**Prepared by:** Claude OPUS
**Date:** December 12, 2025
**Subject:** Technical Assessment of Current Database Schema

---

## Executive Summary

This report presents a technical review of the CLQMS (Clinical Laboratory Quality Management System) database schema based on analysis of 16 migration files containing approximately 45+ tables. While the current design is functional, several critical issues have been identified that impact data integrity, development velocity, and long-term maintainability.

**Overall Assessment:** The application will function, but the design causes significant developer friction and will create increasing difficulties as the system scales.

---

## Critical Issues

### 1. Missing Foreign Key Constraints

**Severity:** 🔴 Critical

The database schema defines **zero foreign key constraints**. All relationships are implemented as integer columns without referential integrity.

| Impact | Description |
|--------|-------------|
| Data Integrity | Orphaned records when parent records are deleted |
| Data Corruption | Invalid references can be inserted without validation |
| Performance | Relationship logic must be enforced in application code |
| Debugging | Difficult to trace data lineage across tables |

**Example:** A patient can be deleted while their visits, orders, and results still reference the deleted `InternalPID`.

### 2. Test Definition Tables: Broken Relationships

**Severity:** 🔴 Critical — Impacts API Development

This issue directly blocks backend development. The test definition system spans **6 tables** with unclear and broken relationships:

- `testdef` → Master test catalog (company-wide definitions)
- `testdefsite` → Site-specific test configurations
- `testdeftech` → Technical settings (units, decimals, methods)
- `testdefcal` → Calculated test formulas
- `testgrp` → Test panel/profile groupings
- `testmap` → Host/Client analyzer code mappings

#### The Core Problem: Missing Link Between `testdef` and `testdefsite`

**`testdef` table structure:**
```
TestID (PK), Parent, TestCode, TestName, Description, DisciplineID, Method, ...
```

**`testdefsite` table structure:**
```
TestSiteID (PK), SiteID, TestSiteCode, TestSiteName, TestType, Description, ...
```

> **There is NO `TestID` column in `testdefsite`!**
> The relationship between master tests and site-specific configurations is undefined.

The assumed relationship appears to be matching `TestCode` = `TestSiteCode`, which is:

- **Fragile** — codes can change or differ
- **Non-performant** — string matching vs integer FK lookup
- **Undocumented** — developers must guess

---

## Recommendations

### Immediate (Sprint 1-2)

1. **Add `TestID` to `testdefsite`** — Unblocks API development
2. **Fix migration script bugs** — Correct table names in `down()` methods
3. **Document existing relationships** — Create ERD with assumed relationships

### Short-Term (Sprint 3-6)

1. **Add foreign key constraints** — Prioritize patient → visit → order → result chain
2. **Fix data type mismatches** — Create migration scripts for type alignment
3. **Standardize soft-delete** — Use `deleted_at` only, everywhere

---

*Report generated from migration file analysis in `app/Database/Migrations/`*
