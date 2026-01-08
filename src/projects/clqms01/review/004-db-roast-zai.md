---
layout: clqms-post.njk
tags: clqms
title: "Database Design Roast: Zai"
date: 2025-12-09
order: 9
---

# The Database Design from Hell: A Comprehensive Roast

Or: Why your current project makes you want to quit.

## 1. The "Value Set" Disaster (The God Table)

Storing every enumeration in one giant generic table.

- **No Identity:** Can't change "M" to "Male" without breaking FKs
- **Performance Killer:** Scans 10,000 rows for simple dropdowns
- **Zero Integrity:** Can delete values used for Critical Status

## 2. The "Organization" Nightmare

Building a database for a Laboratory, not the United Nations. Mixing external business logic (Sales) with internal operational logic (Lab Science).

## 3. The "Location" & "LocationAddress" Split

Forcing a JOIN for every label. For mobile locations (Home Care), address is vital. For static locations (Bed 1), address is meaningless. **Pointless normalization.**

## 4. The "Doctor" vs "Contact" Loop

To get a Doctor's name, do you query Doctor or Contact? If Dr. Smith retires, do you delete the Doctor record? Then you lose his Contact info. **This design doesn't separate Role from Entity.**

## 5. Patient Data: The Actual Hell

- **Blood Bags are not Humans:** Patient table has DOB (Required) and BloodType (Required). Blood Bag has NULL DOB. Created a "Sparse Table."
- **The "Link/Unlink" Suicide Pact:** Database loses history of why patients were unlinked

## 6. Test Data: The Maze of Redundancy

testdef, testdefsite, testdeftech, testgrp, refnum, reftxt, fixpanel.

- Glucose defined in 50 different places
- Profile, Functional Procedure, Superset all stored as "Tests in a Group"
- refnum vs reftxt split doubles JOINs for no reason

---

## Summary

This document is a "Jack of All Trades, Master of None." CRM + ERP + Billing + Lab System in one poorly normalized schema. **Data Hell.**

---

*Do not build this "as is." You will spend 5 years writing SQL Scripts to patch the holes.*
