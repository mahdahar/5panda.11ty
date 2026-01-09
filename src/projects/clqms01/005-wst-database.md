---
layout: clqms-post.njk
tags: clqms
title: "Edge Workstation: SQLite Database Schema"
description: "SQL Schema for local edge databases, supporting sync queues and offline reliability."
date: 2025-12-07
order: 7
---

# Edge Workstation: SQLite Database Schema

Database design for the offline-first smart workstation.

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

┌───────────────┐     ┌───────────────┐
│  outbox_queue │     │  inbox_queue  │
└───────────────┘     └───────────────┘

┌───────────────┐     ┌───────────────┐
│   sync_log    │     │    config     │
└───────────────┘     └───────────────┘
```

---

## 🗂️ Table Definitions

### 1. `orders` — Cached Patient Orders

Orders downloaded from the Core Server. Keeps the **last 7 days** for offline processing.

### 2. `order_tests` — Requested Tests per Order

Each order can have multiple tests (CBC, Urinalysis, etc.)

### 3. `results` — Machine Output (Normalized)

Results from lab machines, **already translated** to standard format by The Translator.

### 4. `outbox_queue` — The Registered Mail 📮

Data waits here until the Core Server sends an **ACK (acknowledgment)**. This is the heart of our **zero data loss** guarantee.

### 5. `inbox_queue` — Messages from Server 📥

Incoming orders/updates from Core Server waiting to be processed locally.

### 6. `machines` — Connected Lab Equipment 🔌

Registry of all connected analyzers.

### 7. `test_dictionary` — The Translator 📖

Maps machine-specific codes to our standard codes (solves WBC vs Leukocytes problem).

---

## 🏆 Key Benefits

- **Offline-First** — Lab never stops, even without internet
- **Outbox Queue** — Zero data loss guarantee
- **Test Dictionary** — Clean, standardized data from any machine
- **Inbox Queue** — Never miss orders, even if offline
- **Sync Log** — Full audit trail for debugging
