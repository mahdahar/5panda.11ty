---
layout: clqms-post.njk
tags: clqms
title: "Project Pandaria: Next-Gen LIS Architecture"
description: "Offline-first, event-driven WST architecture for maximum laboratory reliability."
date: 2025-12-06
order: 6
---

# Project Pandaria: Next-Gen LIS Architecture

An offline-first, event-driven architecture concept for the CLQMS.

## 1. 💀 Pain vs. 🛡️ Solution

### 🚩 Problem 1: "The Server is Dead!"

**The Pain:** When the internet cuts or the server crashes, the entire lab stops. Patients wait, doctors get angry.

**🛡️ The Solution: "Offline-First Mode"** The workstation keeps working 100% offline. It has a local brain (database). Patients never know the internet is down.

### 🚩 Problem 2: "Data Vanished?"

**The Pain:** We pushed data, the network blinked, and the sample disappeared.

**🛡️ The Solution: "The Outbox Guarantee"** Data is treated like Registered Mail. It stays in a safe SQL "Outbox" until the workstation signs a receipt (ACK) confirming it is saved.

### 🚩 Problem 3: "Spaghetti Code"

**The Pain:** Adding a new machine (like Mindray) means hacking the core LIS code with endless `if-else` statements.

**🛡️ The Solution: "Universal Adapters"** Every machine gets a simple plugin (Driver). The Core System stays clean, modular, and untouched.

---

## 2. 🏗️ System Architecture: The "Edge" Concept

We are moving from a **Dependent** model (dumb terminal) to an **Empowered** model (Edge Computing).

### The "Core" (Central Server)

- **Role:** The "Hippocampus" (Long-term Memory)
- **Stack:** CodeIgniter 4 + MySQL
- **Responsibilities:** Billing & Financials, Permanent Patient History, API Gateway, Administrator Dashboard

### The "Edge" (Smart Workstation)

- **Role:** The "Cortex" (Immediate Processing)
- **Stack:** Node.js (Electron) + SQLite
- **Responsibilities:** Hardware I/O, Hot Caching (7 days), Logic Engine

---

## 3. 🔌 The "Universal Adapter" (Hardware Layer)

Every manufacturer speaks a proprietary dialect.

- **Sysmex:** Uses ASTM protocols with checksums
- **Roche:** Uses custom HL7 variants
- **Mindray:** Often uses raw hex streams

---

## 4. 🗣️ The "Translator" (Data Mapping)

Machines send different codes (WBC, Leukocytes, W.B.C). The Translator normalizes everything before saving.

---

## 5. 🏆 Summary: Why We Win

- **Reliability:** 🛡️ 100% Uptime for the Lab
- **Speed:** ⚡ Instant response times
- **Sanity:** 🧘 No more panic when internet fails
- **Future Proof:** 🚀 Ready for any new machine
