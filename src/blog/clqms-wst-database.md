---
title: "Edge Workstation: SQLite Database Schema"
description: "Database design for the offline-first smart workstation."
date: 2025-12-19
order: 7
tags:
  - posts
  - clqms
  - database
layout: clqms-post.njk
---

## Overview

This document describes the **SQLite database schema** for the Edge Workstation — the local "brain" that enables **100% offline operation** for lab technicians.

> **Stack:** Node.js (Electron) + SQLite  
> **Role:** The "Cortex" — Immediate Processing

---

## 📊 Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│   orders    │────────<│  order_tests │
└─────────────┘         └──────────────┘
                               │
                               ▼
┌─────────────┐         ┌──────────────┐
│  machines   │────────<│   results    │
└─────────────┘         └──────────────┘
      │
      ▼
┌─────────────────┐
│ test_dictionary │  (The Translator)
└─────────────────┘

┌───────────────┐     ┌───────────────┐
│  outbox_queue │     │  inbox_queue  │
└───────────────┘     └───────────────┘
   (Push to Server)      (Pull from Server)

┌───────────────┐     ┌───────────────┐
│   sync_log    │     │    config     │
└───────────────┘     └───────────────┘
```

---

## 🗂️ Table Definitions

### 1. `orders` — Cached Patient Orders

Orders downloaded from the Core Server. Keeps the **last 7 days** for offline processing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (local) |
| `server_order_id` | TEXT | Original ID from Core Server |
| `patient_id` | TEXT | Patient identifier |
| `patient_name` | TEXT | Patient full name |
| `patient_dob` | DATE | Date of birth |
| `patient_gender` | TEXT | M, F, or O |
| `order_date` | DATETIME | When order was created |
| `priority` | TEXT | `stat`, `routine`, `urgent` |
| `status` | TEXT | `pending`, `in_progress`, `completed`, `cancelled` |
| `barcode` | TEXT | Sample barcode |
| `synced_at` | DATETIME | Last sync timestamp |

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_order_id TEXT UNIQUE NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_dob DATE,
    patient_gender TEXT CHECK(patient_gender IN ('M', 'F', 'O')),
    order_date DATETIME NOT NULL,
    priority TEXT DEFAULT 'routine' CHECK(priority IN ('stat', 'routine', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    barcode TEXT,
    notes TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. `order_tests` — Requested Tests per Order

Each order can have multiple tests (CBC, Urinalysis, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `order_id` | INTEGER | FK to orders |
| `test_code` | TEXT | Standardized code (e.g., `WBC_TOTAL`) |
| `test_name` | TEXT | Display name |
| `status` | TEXT | `pending`, `processing`, `completed`, `failed` |

```sql
CREATE TABLE order_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    test_code TEXT NOT NULL,
    test_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

---

### 3. `results` — Machine Output (Normalized)

Results from lab machines, **already translated** to standard format by The Translator.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `order_test_id` | INTEGER | FK to order_tests |
| `machine_id` | INTEGER | FK to machines |
| `test_code` | TEXT | Standardized test code |
| `value` | REAL | Numeric result |
| `unit` | TEXT | Standardized unit |
| `flag` | TEXT | `L`, `N`, `H`, `LL`, `HH`, `A` |
| `raw_value` | TEXT | Original value from machine |
| `raw_unit` | TEXT | Original unit from machine |
| `raw_test_code` | TEXT | Original code before translation |
| `validated` | BOOLEAN | Has been reviewed by tech? |

```sql
CREATE TABLE results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_test_id INTEGER,
    machine_id INTEGER,
    test_code TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    reference_low REAL,
    reference_high REAL,
    flag TEXT CHECK(flag IN ('L', 'N', 'H', 'LL', 'HH', 'A')),
    raw_value TEXT,
    raw_unit TEXT,
    raw_test_code TEXT,
    validated BOOLEAN DEFAULT 0,
    validated_by TEXT,
    validated_at DATETIME,
    machine_timestamp DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_test_id) REFERENCES order_tests(id),
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);
```

---

### 4. `outbox_queue` — The Registered Mail 📮

Data waits here until the Core Server sends an **ACK (acknowledgment)**. This is the heart of our **zero data loss** guarantee.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `event_type` | TEXT | `result_created`, `result_validated`, etc. |
| `payload` | TEXT | JSON data to sync |
| `target_entity` | TEXT | `results`, `orders`, etc. |
| `priority` | INTEGER | 1 = highest, 10 = lowest |
| `retry_count` | INTEGER | Number of failed attempts |
| `status` | TEXT | `pending`, `processing`, `sent`, `acked`, `failed` |
| `acked_at` | DATETIME | When server confirmed receipt |

```sql
CREATE TABLE outbox_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    target_entity TEXT,
    target_id INTEGER,
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    last_error TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    acked_at DATETIME
);
```

> **Flow:** Data enters as `pending` → moves to `sent` when transmitted → becomes `acked` when server confirms → deleted after cleanup.

---

### 5. `inbox_queue` — Messages from Server 📥

Incoming orders/updates from Core Server waiting to be processed locally.

```sql
CREATE TABLE inbox_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_message_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);
```

---

### 6. `machines` — Connected Lab Equipment 🔌

Registry of all connected analyzers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `name` | TEXT | "Sysmex XN-1000" |
| `driver_file` | TEXT | "driver-sysmex-xn1000.js" |
| `connection_type` | TEXT | `RS232`, `TCP`, `USB`, `FILE` |
| `connection_config` | TEXT | JSON config |

```sql
CREATE TABLE machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    driver_file TEXT NOT NULL,
    connection_type TEXT CHECK(connection_type IN ('RS232', 'TCP', 'USB', 'FILE')),
    connection_config TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_communication DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Example config:**
```json
{
  "port": "COM3",
  "baudRate": 9600,
  "dataBits": 8,
  "parity": "none"
}
```

---

### 7. `test_dictionary` — The Translator 📖

This table solves the **"WBC vs Leukocytes"** problem. It maps machine-specific codes to our standard codes.

| Column | Type | Description |
|--------|------|-------------|
| `machine_id` | INTEGER | FK to machines (NULL = universal) |
| `raw_code` | TEXT | What machine sends: `W.B.C`, `Leukocytes` |
| `standard_code` | TEXT | Our standard: `WBC_TOTAL` |
| `unit_conversion_factor` | REAL | Math conversion (e.g., 10 for g/dL → g/L) |

```sql
CREATE TABLE test_dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER,
    raw_code TEXT NOT NULL,
    standard_code TEXT NOT NULL,
    standard_name TEXT NOT NULL,
    unit_conversion_factor REAL DEFAULT 1.0,
    raw_unit TEXT,
    standard_unit TEXT,
    reference_low REAL,
    reference_high REAL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id),
    UNIQUE(machine_id, raw_code)
);
```

**Translation Example:**

| Machine | Raw Code | Standard Code | Conversion |
|---------|----------|---------------|------------|
| Sysmex | `WBC` | `WBC_TOTAL` | × 1.0 |
| Mindray | `Leukocytes` | `WBC_TOTAL` | × 1.0 |
| Sysmex | `HGB` (g/dL) | `HGB` (g/L) | × 10 |
| Universal | `W.B.C` | `WBC_TOTAL` | × 1.0 |

---

### 8. `sync_log` — Audit Trail 📜

Track all sync activities for debugging and recovery.

```sql
CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    direction TEXT CHECK(direction IN ('push', 'pull')),
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    server_response_code INTEGER,
    success BOOLEAN,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 9. `config` — Local Settings ⚙️

Key-value store for workstation-specific settings.

```sql
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Default values:**

| Key | Value | Description |
|-----|-------|-------------|
| `workstation_id` | `LAB-WS-001` | Unique identifier |
| `server_url` | `https://api.clqms.com` | Core Server endpoint |
| `cache_days` | `7` | Days to keep cached orders |
| `auto_validate` | `false` | Auto-validate normal results |

---

## 🔄 How the Sync Works

### Outbox Pattern (Push)

```
┌─────────────────┐
│   Lab Result    │
│   Generated     │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Save to SQLite │
│   + Outbox      │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Send to Server │────>│   Core Server   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ◄──── ACK ─────────┘
         ▼
┌─────────────────┐
│ Mark as 'acked' │
│   in Outbox     │
└─────────────────┘
```

### Self-Healing Recovery

If the workstation was offline and missed Redis notifications:

```javascript
// On startup, ask: "Did I miss anything?"
async function recoverMissedMessages() {
  const lastSync = await db.get("SELECT value FROM config WHERE key = 'last_sync'");
  const missed = await api.get(`/outbox/pending?since=${lastSync}`);
  
  for (const message of missed) {
    await inbox.insert(message);
  }
}
```

---

## 📋 Sample Data

### Sample Machine Registration

```sql
INSERT INTO machines (name, manufacturer, driver_file, connection_type, connection_config) 
VALUES ('Sysmex XN-1000', 'Sysmex', 'driver-sysmex-xn1000.js', 'RS232', 
        '{"port": "COM3", "baudRate": 9600}');
```

### Sample Dictionary Entry

```sql
-- Mindray calls WBC "Leukocytes" — we translate it!
INSERT INTO test_dictionary (machine_id, raw_code, standard_code, standard_name, raw_unit, standard_unit) 
VALUES (2, 'Leukocytes', 'WBC_TOTAL', 'White Blood Cell Count', 'x10^9/L', '10^3/uL');
```

### Sample Result with Translation

```sql
-- Machine sent: { code: "Leukocytes", value: 8.5, unit: "x10^9/L" }
-- After translation:
INSERT INTO results (test_code, value, unit, flag, raw_test_code, raw_value, raw_unit)
VALUES ('WBC_TOTAL', 8.5, '10^3/uL', 'N', 'Leukocytes', '8.5', 'x10^9/L');
```

---

## 🏆 Key Benefits

| Feature | Benefit |
|---------|---------|
| **Offline-First** | Lab never stops, even without internet |
| **Outbox Queue** | Zero data loss guarantee |
| **Test Dictionary** | Clean, standardized data from any machine |
| **Inbox Queue** | Never miss orders, even if offline |
| **Sync Log** | Full audit trail for debugging |

---

## 📁 Full SQL Migration

The complete SQL migration file is available at:  
📄 [`docs/examples/edge_workstation.sql`](/docs/examples/edge_workstation.sql)
