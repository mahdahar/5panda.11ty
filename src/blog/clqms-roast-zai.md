---
title: "Database Design Roast"
description: "A legendary roast of the CLQMS database schema, highlighting the architectural hazards and data hell."
date: 2026-01-07
order: 7
tags:
  - posts
  - clqms
layout: clqms-post.njk
---

# The Database Design from Hell: A Comprehensive Roast
## *Or: Why your current project makes you want to quit.*

You are right to be sick of this. This document is a masterclass in how **not** to design a database. It takes simple concepts and wraps them in layers of unnecessary, redundant, and contradictory complexity.

Here is the systematic destruction of every data relation and design choice that is causing you pain.

---

## 1. The "Value Set" Disaster (The God Table)

**The Design:**
Storing every single enumeration (Dropdown list, Flag, Reference Text, Status) in one giant generic table (`ValueSet` / `codedtxtfld`).

**The Roast:**
*   **No Identity:** You mentioned "don't have an easy identifier." This is because they likely didn't use a Surrogate Key (an auto-incrementing ID). They probably used the `Code` (e.g., "M" for Male) as the Primary Key.
    *   *Why it sucks:* If you ever need to change "M" to "Male", you break every single Foreign Key in the database that points to it. You can't update a key that is being used elsewhere. Your data is frozen in time forever.
*   **Performance Killer:** Imagine loading a dropdown for "Gender." The database has to scan a table containing 10,000 rows (all flags, all statuses, all colors, all text results) just to find "M" and "F".
*   **Zero Integrity:** Because it's a generic table, you can't enforce specific rules. You can accidentally delete a value used for "Critical Patient Status" because the table thinks it's just a generic string. There is no referential integrity. It's the Wild West.

---

## 2. The "Organization" Nightmare

**The Design:**
Attempting to model a global conglomerate structure of Accounts, Sites, Disciplines, Departments, Workstations, and Parent-Child hierarchies.

**The Roast:**
*   **Over-Engineering:** You are building a database for a Laboratory, not the United Nations. Why does a lab system need a recursive `Account` structure that handles "Parent/Child" relationships for companies?
*   **The Blob:** `Account` comes from CRM, but `Site` comes from CRM, yet `Discipline` is internal. You are mixing external business logic (Sales) with internal operational logic (Lab Science).
*   **Identity Confusion:** Is a "Department" a physical place? A group of people? Or a billing category? In this design, it's all three simultaneously. This makes generating a simple report like "Who works in Hematology?" a complex query involving `Organization`, `Personnel`, and `Location`.

---

## 3. The "Location" & "LocationAddress" Split

**The Design:**
Separating the Location definition (Name, Type) from its Address (Street, City) into two different tables linked 1-to-1.

**The Roast:**
*   **The "Why?" Factor:** Why? Is a Bed (Location) going to have multiple addresses? No. Is a Building going to have multiple addresses? No.
*   **Performance Tax:** Every single time you need to print a label or show where a sample is, you **must** perform a `JOIN`.
    *   *Bad Design:* `SELECT * FROM Location l JOIN LocationAddress a ON l.id = a.id`
*   **The Null Nightmare:** For mobile locations (Home Care), the address is vital. For static locations (Bed 1), the address is meaningless (it's just coordinates relative to the room). By forcing a split, you either have empty rows in `LocationAddress` or you have to invent fake addresses for beds. It's pointless normalization.

---

## 4. The "HostApp" Table

**The Design:**
A specific table dedicated to defining external applications (`HostApp`) that integrate with the system.

**The Roast:**
*   **The Myth of Modularity:** This table pretends the system is "plug-and-play" with other apps. But look at the Appendices: "Calibration Results SQL Scripts." That's hard-coded SQL, not a dynamic plugin.
*   **Maintenance Hell:** This table implies you need to map every single field from every external app.
    *   *Scenario:* Hospital A uses HIS "MediTech". Hospital B uses HIS "CarePoint".
    *   *Result:* You need a `HostApp` row for MediTech and one for CarePoint. Then you need mapping tables for Patient, Order, Result, etc. You are building an ETL (Extract, Transform, Load) tool inside a Lab database. It's out of scope.

---

## 5. The "Doctor" vs "Contact" Loop

**The Design:**
A `Contact` table that stores generic people, and a `Doctor` table that... also stores people? Or does it reference Contact?

**The Roast:**
*   **The Infinite Join:** To get a Doctor's name, do you query `Doctor` or `Contact`?
    *   If `Doctor` extends `Contact` (1-to-1), you have to join every time.
    *   If `Doctor` is just a row in `Contact` with a `Type='Doctor'`, why does the `Doctor` table exist?
*   **Semantic Mess:** A "Contact" usually implies "How to reach." A "Doctor" implies "Medical License."
*   **The Failure:** If Dr. Smith retires, do you delete the `Doctor` record? Yes. But then you delete his `Contact` info, so you lose his phone number for historical records. This design doesn't separate the *Role* (Doctor) from the *Entity* (Person). It's a data integrity nightmare.

---

## 6. Patient Data: The Actual Hell

**The Design:**
Storing Patients, Non-Patients (Blood bags), External QC, and linking/unlinking them all in one messy structure.

**The Roast:**
*   **Blood Bags are not Humans:**
    *   The document explicitly says "mengelola non-patient entity... blood bag."
    *   *Result:* Your `Patient` table has `DateOfBirth` (Required) and `BloodType` (Required). For a Blood Bag, DOB is NULL. For a Human, BloodType might be NULL.
    *   You have created a "Sparse Table" (50% NULLs). It's impossible to index effectively. It breaks the very definition of what a "Patient" is.
*   **The "Link/Unlink" Suicide Pact:**
    *   "Menghubungkan (link)/mengurai(unlink) data pasien."
    *   *Audit Trail Death:* If I link "John Doe" from Site A to "John Doe" from Site B, and then later "Unlink" them, the database loses the history of that decision. Why did we unlink them? Was it a mistake? The design doesn't track the *decision*, it just changes the data.
*   **Confusion:** `Patient Registration` vs `Patient Admission`. Why are these two different giant workflows? In every other system on earth, you Register (create ID) and Admit (start visit). This document treats them like they require NASA-level calculations.

---

## 7. Patient Admission: Revenue Cycle Virulence

**The Design:**
Admission is tightly coupled with "Pihak yang menanggung biaya" (Payer) and "Tarif" (Price).

**The Roast:**
*   **It's a Billing System, not a Lab System:** This section reads like an Accounting module. The Lab database should not care if the patient pays with BlueCross or Cash.
*   **The Logic Trap:** If the Admission fails because the "Tarif" (Price) is missing, does the Lab stop processing the blood sample?
    *   *According to this design:* Probably yes.
    *   *In reality:* The patient could be dying. Clinical safety should never be blocked by administrative billing data. Mixing these concerns is dangerous.

---

## 8. Test Data: The Maze of Redundancy

**The Design:**
`testdef`, `testdefsite`, `testdeftech`, `testgrp`, `refnum`, `reftxt`, `fixpanel`.

**The Roast:**
*   **Definition Explosion:**
    *   `testdefsite`: Defines "Glucose" for Site A.
    *   `testdeftech`: Defines "Glucose" for Machine B.
    *   *Reality:* Glucose is Glucose. The chemical reaction doesn't change because the building is different.
    *   *Cost:* You have to update the Reference Range for Glucose in 50 different places if the lab director decides to change it.
*   **The "Group" Soup:**
    *   `Profile` (One tube), `Functional Procedure` (Time series), `Superset` (Billing).
    *   These are stored in `testgrp` as if they are the same thing.
    *   *Failure:** You can't enforce logic. The system allows you to add a "2-Hour Post-Prandial" (Time-based) to a "Lipid Panel" (One-tube) because to the database, they are just "Tests in a Group."
*   **`refnum` vs `reftxt`:**
    *   Why split them? A Reference Range is data. Whether it's "10-20" (Numeric) or "Positive/Negative" (Text) is just a formatting rule. Splitting them into two tables doubles your JOINs and complicates the query logic for no reason.

---

## 9. BONUS: Other Disasters I Found

### A. Equipment & The "Mousepad" Tracking
**The Roast:**
The document defines Equipment as: "termasuk UPS, AVR, printer, PC... mouse, keyboard."
*   **The Trap:** Do you really need a depreciation schedule and maintenance log for a mouse? By lumping "IVD Analyzers" (Critical Medical Devices) with "Computer Mice" (Office Supplies), you clutter the Equipment table with garbage data.
*   **Fix:** Separate `CapitalAsset` (Machines) from `InventoryItem` (Supplies).

### B. Specimen: The "Parent" Trap
**The Roast:**
Secondary Specimen has a `ParentID` pointing to Primary Specimen.
*   **The Void:** There is no tracking of volume. If Tube A (Parent) has 5ml, and you create Tube B (Child/Aliquot) with 1ml, the database does not know that Tube A now only has 4ml left.
*   **The Consequence:** You cannot do automated inventory. You can't alert the user "Running low on sample!" because the database thinks the sample is infinite.

### C. The "Red Font" Encryption
**The Roast:**
"Encrypted = Red Font."
*   **The Joke:** This is technically illiterate. A database stores bytes. It does not store "Red Font."
*   **The Risk:** If they literally store `<b><span color='red'>PatientName</span></b>` in the database, you have corrupted your data.
*   **The Reality:** If it's just a UI setting, why is it in the database requirements section? It proves the writer doesn't know the difference between Data Storage and Data Presentation.

---

## Summary: Why you want to vomit

This document is a "Jack of All Trades, Master of None."
It tries to be:
1.  **CRM** (Contact/Account mgmt)
2.  **ERP** (Inventory/Asset mgmt)
3.  **Billing System** (Admission/Tariff)
4.  **Laboratory Information System** (The actual work)

By trying to do all of this in a single, poorly normalized schema, it creates a **Data Hell** where nothing is reliable, nothing is fast, and changing one thing breaks three others.

**Do not build this "as is."** If you do, you will spend the next 5 years writing `SQL Scripts` to patch the holes in this sinking ship.