---
layout: clqms-post.njk
tags: clqms
title: "Proposal: Test Definition Architecture Overhaul"
description: "Simplify database schema and improve query performance for test definitions"
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
* `testdefsite` (General Info)
* `testdeftech` (Technical Details)
* `testdefcal` (Calculations)
* `testdefgrp` (Grouping)

**Why it hurts:**
* **Complex Queries:** To get a full test definition, we write massive SQL joins.
* **Rigid Schema:** Adding a new technical attribute requires altering table schemas and updating multiple DAO files.
* **Maintenance Nightmare:** Logic is scattered. To understand a test, you have to look in five places.

---

## 2. The Solution: JSON Configuration 📄

**Strategy:** Treat a Test Definition as a **Document**.  
We will consolidate the variable details (Technique, Calculations, Reference Ranges) into a structured `JSON` column within a single table.

### Schema Change
Old 5 tables $\rightarrow$ **1 Main Table**.

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
  "formulas": {
    "calculation": "primary_result * dilution_factor"
  },
  "reference_ranges": [
    {
      "label": "Adult Male",
      "sex": "M",
      "min_age": 18,
      "max_age": 99,
      "min_val": 70,
      "max_val": 100
    },
    {
      "label": "Pediatric",
      "max_age": 18,
      "min_val": 60,
      "max_val": 90
    }
  ]
}
```

---

## 3. The Benefits 🏆

| Feature | Old Way (Relational) | New Way (JSON Document) |
| :--- | :--- | :--- |
| **Fetch Speed** | Slow (4+ Joins) | Instant (1 Row Select) |
| **Flexibility** | Requires ALTER TABLE | Edit JSON & Save |
| **Search** | Complex SQL | Fast JSON Indexing |
| **Code Logic** | Mapping 5 SQL results | `json_decode()` → Object |

---

### Next Steps 🗒️

- [ ] Create migration for `LabTestDefinitions` table.
- [ ] Port 5 sample tests from the old structure to JSON format for verification.

---
_Last updated: 2026-01-09 08:40:21_
