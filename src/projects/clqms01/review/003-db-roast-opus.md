---
layout: clqms-post.njk
tags: clqms
title: "Database Design Roast: Claude Opus"
date: 2025-12-08
order: 8
---

# 🔥 CLQMS Database Schema: A Professional Roast 🔥

"I've seen spaghetti code before, but this is spaghetti architecture."

## 1. 🗑️ The ValueSet Anti-Pattern

**What's Happening:** Every single enum in the entire system is crammed into ONE giant table.

- Zero Type Safety — You can accidentally set Gender = 'Hospital'
- The Join Apocalypse — 7 joins to the same table for ONE patient query
- No Easy Identification — "Male" is VID 47 or 174?

## 2. 🪆 Organization: The Matryoshka Nightmare

Account → Site → Department → Discipline, all self-referencing. You need a graph database to query what should be a simple org chart.

## 3. 📍 Location + LocationAddress: The Pointless Split

LocationAddress uses LocationID as both Primary Key AND Foreign Key. You always have to save both tables in a transaction. **If data is always created, updated, and deleted together — IT BELONGS IN THE SAME TABLE.**

## 4. 👨‍⚕️ Contact vs Doctor: The Identity Crisis

Contact has Specialty/SubSpecialty (doctor-specific) but also has OccupationID via ContactDetail. A Contact is Maybe-A-Doctor™. Zero validation that contacts are actually doctors.

## 5. 🏥 Patient Data: The Table Explosion

- **patcom** — ONE comment per patient (why a whole table?)
- **patatt** — Stores Address as a single string (duplicate of patient table)
- **CSV in database** — `LinkTo = '1,5,23,47'` — Use a junction table!

## 6. 🤮 Patient Admission (ADT): Event Sourcing Gone Wrong

Every Admission/Discharge/Transfer creates a new row. To get current status: MAX subquery with JOIN. Every single query.

## 7. 🧪 Test Definitions: The Abbreviation Cemetery

testdefsite, testdefgrp, testdefcal, testdeftech, testmap, refnum, reftxt, refvset, refthold — 9 tables for test definitions!

---

## 🏆 The Final Scorecard

| Category | Score |
|----------|-------|
| Normalization | 2/10 |
| Consistency | 1/10 |
| Performance | 3/10 |
| Maintainability | 1/10 |
| Type Safety | 0/10 |
| Naming | 2/10 |
| Scalability | 2/10 |

**Overall: 1.5/10** — "At least the tables exist"

---

*Document prepared with 🔥 and ☕*
