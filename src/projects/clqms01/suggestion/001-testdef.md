---
layout: clqms-post.njk
tags: clqms
title: "Proposal: Test Definition Architecture Overhaul"
description: "Remove magic numbers and enforce type safety using PHP Enums and Svelte stores"
date: 2026-01-09
order: 1
---

# 🚀 Proposal: Test Definition Architecture Overhaul by Gemini 3

**Target:** `testdef` Module  
**Objective:** Simplify database schema, improve query performance, and reduce code complexity.

---

## 1. The Problem: "The Shredded Document" 🧩

**Current Status:**
Defining a single Lab Test currently requires joining 4-5 rigid tables:
- `testdefsite` (General Info)
- `testdeftech` (Technical Details)
- `testdefcal` (Calculations)
- `testdefgrp` (Grouping)

**Why it hurts:**
- **Complex Queries:** To get a full test definition, we write massive SQL joins.
- **Rigid Schema:** Adding a new technical attribute requires altering table schemas and updating multiple DAO files.
- **Maintenance Nightmare:** Logic is scattered. To understand a test, you have to look in five places.

---

## 2. The Solution: JSON Configuration 📄

**Strategy:** Treat a Test Definition as a **Document**.

We will consolidate the variable details (Technique, Calculations, Reference Ranges) into a structured `JSON` column within a single table.

### Schema Change
Old 5 tables → **1 Main Table**.

```sql
CREATE TABLE LabTestDefinitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,  -- e.g., "GLUC"
    name VARCHAR(100) NOT NULL,        -- e.g., "Fasting Glucose"
    active BOOLEAN DEFAULT TRUE,
    
    -- 🌟 The Solution: All variable logic lives here
    configuration JSON NOT NULL 
);
```

### The Configuration Structure (JSON)

Instead of columns for every possible biological variable, we store a flexible document:

```json
{
  "technique": "Photometry",
  "specimen": "Serum",
  "result_type": "NUMERIC",
  "units": "mg/dL",
  "reference_ranges": [
    { "sex": "M", "min": 70, "max": 100 },
    { "sex": "F", "min": 60, "max": 90 }
  ]
}
```

---

## 3. How to Query (The Magic) 🪄

This is where the new design shines. No more joins.

### A. Fetching a Test (The Usual Way)

Just select the row. The application gets the full definition instantly.

```sql
SELECT * FROM LabTestDefinitions WHERE code = 'GLUC';
```

### B. Searching Inside JSON (The Cool Way)

Need to find all tests that use "Serum"? Use the JSON arrow operator (`->>`).

**MySQL / MariaDB:**
```sql
SELECT code, name 
FROM LabTestDefinitions 
WHERE configuration->>'$.specimen' = 'Serum';
```

**PostgreSQL:**
```sql
SELECT code, name 
FROM LabTestDefinitions 
WHERE configuration->>'specimen' = 'Serum';
```

### C. Performance Optimization 🏎️

If we search by "Technique" often, we don't index the JSON string. We add a Generated Column.

```sql
ALTER TABLE LabTestDefinitions
ADD COLUMN technique_virtual VARCHAR(50) 
GENERATED ALWAYS AS (configuration->>'$.technique') VIRTUAL;

CREATE INDEX idx_technique ON LabTestDefinitions(technique_virtual);
```

**Result:** Querying the JSON is now as fast as a normal column.

---

## 4. The Benefits 🏆

| Feature | Old Way (Relational) | New Way (JSON Document) |
| :--- | :--- | :--- |
| **Fetch Speed** | Slow (4+ Joins) | Instant (1 Row Select) |
| **Flexibility** | Requires `ALTER TABLE` | Edit JSON & Save |
| **Search** | Complex SQL | Fast JSON Operators |
| **Code Logic** | Mapping 5 SQL results | `json_decode()` → Object |

---

## Next Steps

1. Create migration for `LabTestDefinitions` table.
2. Port 5 sample tests from the old structure to JSON format for verification.