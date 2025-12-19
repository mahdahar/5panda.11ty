---
title: "Project Pandaria: Next-Gen LIS Architecture"
description: "An offline-first, event-driven architecture concept for the CLQMS."
date: 2025-12-19
order: 6
tags:
  - posts
  - clqms
layout: clqms-post.njk
---

## 1. 💀 Pain vs. 🛡️ Solution

### 🚩 Problem 1: "The Server is Dead!"
> **The Pain:** When the internet cuts or the server crashes, the entire lab stops. Patients wait, doctors get angry.

**🛡️ The Solution: "Offline-First Mode"**
The workstation keeps working 100% offline. It has a local brain (database). Patients never know the internet is down.

---

### 🚩 Problem 2: "Data Vanished?"
> **The Pain:** We pushed data, the network blinked, and the sample disappeared. We have to re-scan manually.

**🛡️ The Solution: "The Outbox Guarantee"**
Data is treated like Registered Mail. It stays in a safe SQL "Outbox" until the workstation signs a receipt (ACK) confirming it is saved.

---

### 🚩 Problem 3: "Spaghetti Code"
> **The Pain:** Adding a new machine (like Mindray) means hacking the core LIS code with endless `if-else` statements.

**🛡️ The Solution: "Universal Adapters"**
Every machine gets a simple plugin (Driver). The Core System stays clean, modular, and untouched.

---

### 🚩 Problem 4: "Inconsistent Results"
> **The Pain:** One machine says `WBC`, another says `Leukocytes`. The Database is a mess of different codes.

**🛡️ The Solution: "The Translator"**
A built-in dictionary auto-translates everything to Standard English (e.g., `WBC`) before it ever touches the database.

---

## 2. 🏗️ System Architecture: The "Edge" Concept

We are moving from a **Dependent** model (dumb terminal) to an **Empowered** model (Edge Computing).

### The "Core" (Central Server)
*   **Role:** The "Hippocampus" (Long-term Memory).
*   **Stack:** CodeIgniter 4 + MySQL.
*   **Responsibilities:** 
    *   Billing & Financials (Single Source of Truth).
    *   Permanent Patient History.
    *   API Gateway for external apps (Mobile, Website).
    *   Administrator Dashboard.

### The "Edge" (Smart Workstation)
*   **Role:** The "Cortex" (Immediate Processing).
*   **Stack:** Node.js (Electron) + SQLite.
*   **Responsibilities:**
    *   **Hardware I/O:** Speaking directly to RS232/TCP ports.
    *   **Hot Caching:** Keeping the last 7 days of active orders locally.
    *   **Logic Engine:** Validating results against reference ranges *before* syncing.

> **Key Difference:** The Workstation no longer asks "Can I work?" It assumes it can work. It treats the server as a "Sync Partner," not a "Master." If the internet dies, the Edge keeps processing samples, printing labels, and validating results without a hiccup.

---

## 3. 🔌 The "Universal Adapter" (Hardware Layer)

We use the **Adapter Design Pattern** to isolate hardware chaos from our clean business logic.

### The Problem: "The Tower of Babel"
Every manufacturer speaks a proprietary dialect. 
*   **Sysmex:** Uses ASTM protocols with checksums.
*   **Roche:** Uses custom HL7 variants.
*   **Mindray:** Often uses raw hex streams.

### The Fix: "Drivers as Plugins"
The Workstation loads a specific `.js` file (The Driver) for each connected machine. This driver has one job: **Normalization.**

#### Example: ASTM to JSON
**Raw Input (Alien Language):**
`P|1||12345||Smith^John||19800101|M|||||`
`R|1|^^^WBC|10.5|10^3/uL|4.0-11.0|N||F||`

**Normalized Output (clean JSON):**
```json
{
  "test_code": "WBC",
  "value": 10.5,
  "unit": "10^3/uL",
  "flag": "Normal",
  "timestamp": "2025-12-19T10:00:00Z"
}
```

### Benefit: "Hot-Swappable Labs"
Buying a new machine? You don't need to obscurely patch the `LISSender.exe`. You just drop in `driver-sysmex-xn1000.js` into the `plugins/` folder, and the Edge Workstation instantly learns how to speak Sysmex.

---

## 4. 🗣️ The "Translator" (Data Mapping)

Machines are stubborn. They send whatever test codes they want (`WBC`, `Leukocytes`, `W.B.C`, `White_Cells`). If we save these directly, our database becomes a swamp.

### The Solution: "Local Dictionary & Rules Engine"
Before data is saved to SQLite, it passes through the **Translator**.

1.  **Alias Matching:** 
    *   The dictionary knows that `W.B.C` coming from *Machine A* actually means `WBC_TOTAL`.
    *   It renames the key instantly.

2.  **Unit Conversion (Math Layer):**
    *   *Machine A* sends Hemoglobin in `g/dL` (e.g., 14.5).
    *   *Our Standard* is `g/L` (e.g., 145).
    *   **The Rule:** `Apply: Value * 10`. 
    *   The translator automatically mathematical normalized the result.

This ensures that our Analytics Dashboard sees **clean, comparable data** regardless of whether it came from a 10-year-old machine or a brand new one.

---

## 5. 📨 The "Registered Mail" Sync (Redis + Outbox)

We are banning the word "Polling" (checking every 5 seconds). It's inefficient and scary. We are switching to **Events** using **Redis**.

### 🤔 What is Redis?
Think of **MySQL** as a filing cabinet (safe, permanent, but slow to open).
Think of **Redis** as a **loudspeaker system** (instant, in-memory, very fast).

We use Redis specifically for its **Pub/Sub (Publish/Subscribe)** feature. It lets us "broadcast" a message to all connected workstations instantly without writing to a disk.

### 🔄 How the Flow Works:

1.  **👨‍⚕️ Order Created:** The Doctor saves an order on the Server.
2.  **📮 The Outbox:** The server puts a copy of the order in a special SQL table called `outbox_queue`.
3.  **🔔 The Bell (Redis):** The server "shouts" into the Redis loudspeaker: *"New mail for Lab 1!"*.
4.  **📥 Delivery:** The Workstation (listening to Redis) hears the shout instantly. It then goes to the SQL Outbox to download the actual heavy data.
5.  **✍️ The Signature (ACK):** The Workstation sends a digital signature back: *"I have received and saved Order #123."*
6.  **✅ Done:** Only *then* does the server delete the message from the Outbox.

**Safety Net & Self-Healing:** 
*   **Redis is just the doorbell:** If the workstation is offline and misses the shout, it doesn't matter.
*   **SQL is the mailbox:** The message sits safely in the `outbox_queue` table indefinitely.
*   **Recovery:** When the Workstation turns back on, it automatically asks: *"Did I miss anything?"* and downloads all pending items from the SQL Outbox. **Zero data loss, even if the notification is lost.**

---

## 6. 🏆 Summary: Why We Win

*   **Reliability:** 🛡️ 100% Uptime for the Lab.
*   **Speed:** ⚡ Instant response times (Local Database is faster than Cloud).
*   **Sanity:** 🧘 No more panic attacks when the internet provider fails.
*   **Future Proof:** 🚀 Ready for any new machine connection in the future.
