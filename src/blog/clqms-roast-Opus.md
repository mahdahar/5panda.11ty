---
title: "Database Design Roast: Claude Opus"
description: "A professional roast of the CLQMS database schema."
date: 2025-12-12
order: 6
tags:
  - posts
  - clqms
layout: clqms-post.njk
---

# 🔥 CLQMS Database Schema: A Professional Roast 🔥


> *"I've seen spaghetti code before, but this is spaghetti architecture."*

---

## Executive Summary

After reviewing the CLQMS (Clinical Laboratory Quality Management System) database schema, I regret to inform you that this is not a database design — it's a **crime scene**. Someone read *"Design Patterns for Dummies"* and decided to implement ALL of them. Simultaneously. Incorrectly.

Let me walk you through this masterpiece of over-engineering.

---

## 1. 🗑️ The ValueSet Anti-Pattern: Where Enums Go to Die

### What's Happening

```
valueset      → VID, SiteID, VSetID, VValue, VDesc, VCategory
valuesetdef   → VSetID, VSName, VSDesc
```

**Every. Single. Enum.** In the entire system is crammed into ONE table:
- Gender
- Country  
- Religion
- Ethnicity
- Marital Status
- Death Indicator
- Location Type
- Test Type
- Site Type
- Site Class
- And probably what you had for lunch

### Why This Is Catastrophic

1. **Zero Type Safety**
   ```sql
   -- This is totally valid and will execute without error:
   UPDATE patient SET Gender = 
     (SELECT VID FROM valueset WHERE VDesc = 'Hospital' AND VSetID = 'LocationType')
   ```
   Congratulations, your patient is now a hospital.

2. **The Join Apocalypse**
   Getting a single patient with readable values requires this:
   ```php
   ->join('valueset country', 'country.VID = patient.Country', 'left')
   ->join('valueset race', 'race.VID = patient.Race', 'left')
   ->join('valueset religion', 'religion.VID = patient.Religion', 'left')
   ->join('valueset ethnic', 'ethnic.VID = patient.Ethnic', 'left')
   ->join('valueset gender', 'gender.VID = patient.Gender', 'left')
   ->join('valueset deathindicator', 'deathindicator.VID = patient.DeathIndicator', 'left')
   ->join('valueset maritalstatus', 'maritalstatus.VID = patient.MaritalStatus', 'left')
   ```
   That's **7 joins to the same table** for ONE patient query. Your database server is crying.

3. **No Easy Identification**
   - Primary key is `VID` — an auto-increment integer
   - No natural key enforcement
   - You want "Male"? Good luck remembering if it's VID 47 or VID 174

4. **Maintenance Nightmare**
   - Adding a new Gender option? Better hope you remember the correct `VSetID`
   - Want to rename "Other" to "Non-Binary"? Hope you update it in the right row
   - Database constraints? What are those?

### What Sane People Do

```sql
-- Option A: Actual ENUMs (MySQL)
ALTER TABLE patient ADD COLUMN gender ENUM('M', 'F', 'O', 'U');

-- Option B: Dedicated lookup tables with meaningful constraints
CREATE TABLE gender (
    code VARCHAR(2) PRIMARY KEY,
    description VARCHAR(50) NOT NULL
);
ALTER TABLE patient ADD FOREIGN KEY (gender_code) REFERENCES gender(code);
```

---

## 2. 🪆 Organization: The Matryoshka Nightmare

### The Current "Architecture"

```
Account → has Parent (self-referencing)
    ↳ has Sites
        ↳ Site → has Parent (self-referencing)
            ↳ has SiteTypeID → valueset
            ↳ has SiteClassID → valueset
            ↳ has Departments
                ↳ Department → has DisciplineID
                    ↳ Discipline → has Parent (self-referencing)

Plus: Workstations exist somewhere in this chaos
```

### The Philosophical Question

**What IS an organization in this system?**

| Entity | Has Parent? | Has Site? | Has Account? | Is Self-Referencing? |
|--------|-------------|-----------|--------------|----------------------|
| Account | ✅ | ❌ | ❌ | ✅ |
| Site | ✅ | ❌ | ✅ | ✅ |
| Department | ❌ | ✅ | ❌ | ❌ |
| Discipline | ✅ | ✅ | ❌ | ✅ |

So to understand organizational hierarchy, you need to:
1. Traverse Account's parent chain
2. For each Account, get Sites
3. Traverse each Site's parent chain
4. For each Site, get Departments AND Disciplines
5. Traverse each Discipline's parent chain
6. Oh and don't forget Workstations

You basically need a graph database to query what should be a simple org chart.

### What Normal Systems Do

```sql
CREATE TABLE organization (
    id INT PRIMARY KEY,
    parent_id INT REFERENCES organization(id),
    type ENUM('company', 'site', 'department', 'discipline'),
    name VARCHAR(255),
    code VARCHAR(50)
);
```

**One table. One parent reference. Done.**

---

## 3. 📍 Location + LocationAddress: The Pointless Split

### The Crime

```
location        → LocationID, SiteID, LocCode, Parent, LocFull, LocType
locationaddress → LocationID, Street1, Street2, City, Province, PostCode, GeoLocation
```

**LocationAddress uses LocationID as both Primary Key AND Foreign Key.**

This means:
- Every location has **exactly one** address (1:1 relationship)
- You cannot have a location without an address
- You cannot have multiple addresses per location

### Evidence of the Crime

```php
public function saveLocation(array $data): array {
    $db->transBegin();
    try {
        if (!empty($data['LocationID'])) {
            $this->update($LocationID, $data);
            $modelAddress->update($LocationID, $data);  // <-- Always update BOTH
        } else {
            $LocationID = $this->insert($data, true);
            $modelAddress->insert($data);  // <-- Always insert BOTH
        }
        $db->transCommit();
    }
}
```

You **always** have to save both tables in a transaction. Because they are fundamentally **ONE entity**.

### The Verdict

If data is always created, updated, and deleted together — **IT BELONGS IN THE SAME TABLE**.

```sql
-- Just combine them:
CREATE TABLE location (
    location_id INT PRIMARY KEY,
    site_id INT,
    loc_code VARCHAR(50),
    loc_full VARCHAR(255),
    loc_type INT,
    street1 VARCHAR(255),
    street2 VARCHAR(255),
    city INT,
    province INT,
    post_code VARCHAR(20),
    geo_location_system VARCHAR(50),
    geo_location_data TEXT
);
```

You just saved yourself a transaction, a join, and 50% of the headache.

---

## 4. 👨‍⚕️ Contact vs Doctor: The Identity Crisis

### The Confusion

```
contact → ContactID, NameFirst, NameLast, Specialty, SubSpecialty, Phone...
contactdetail → ContactDetID, ContactID, SiteID, OccupationID, JobTitle, Department...
occupation → OccupationID, OccupationName...
```

### The Questions Nobody Can Answer

1. **Is a Contact a Doctor?**
   - Contact has `Specialty` and `SubSpecialty` fields (doctor-specific)
   - But also has generic `OccupationID` via ContactDetail
   - So a Contact is Maybe-A-Doctor™?

2. **What prevents non-doctors from being assigned as doctors?**
   
   In `patvisitadt`:
   ```php
   'AttDoc', 'RefDoc', 'AdmDoc', 'CnsDoc'  // Attending, Referring, Admitting, Consulting
   ```
   
   These store ContactIDs. But there's **zero validation** that these contacts are actually doctors. Your receptionist could be the Attending Physician and the database would happily accept it.

3. **Why does ContactDetail exist?**
   - It stores the same person's info **per site**
   - So one person can have different roles at different sites
   - But `Specialty` is on Contact (not ContactDetail), so a doctor has the same specialty everywhere?
   - Except `OccupationID` is on ContactDetail, so their occupation changes per site?

### The Solution

```sql
CREATE TABLE person (
    person_id INT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    -- ... basic personal info
);

CREATE TABLE doctor (
    doctor_id INT PRIMARY KEY REFERENCES person(person_id),
    specialty VARCHAR(100),
    subspecialty VARCHAR(100),
    license_number VARCHAR(50)
);

CREATE TABLE site_staff (
    person_id INT REFERENCES person(person_id),
    site_id INT REFERENCES site(site_id),
    role ENUM('doctor', 'nurse', 'technician', 'admin'),
    PRIMARY KEY (person_id, site_id)
);
```

Now you can actually **enforce** that only doctors are assigned to doctor fields.

---

## 5. 🏥 Patient Data: The Table Explosion

### The Current State

| Table | Purpose | Why It Exists |
|-------|---------|---------------|
| `patient` | Main patient (30+ columns) | Fair enough |
| `patidt` | Patient Identifiers | One identifier per patient |
| `patcom` | Patient Comments | ONE comment per patient (why a whole table?) |
| `patatt` | Patient "Attachments"... or Addresses? | Stores `Address` as a single string |

### The Crimes

#### Crime 1: Duplicate Address Storage

`patient` table already has:
```
Street_1, Street_2, Street_3, City, Province, ZIP
```

`patatt` table stores:
```
Address (as a single string)
```

**Why do we have both?** Nobody knows. Pick one and commit.

#### Crime 2: One Table for ONE Comment

```php
class PatComModel {
    protected $allowedFields = ['InternalPID', 'Comment', 'CreateDate', 'EndDate'];
    
    public function createPatCom(string $patcom, string $newInternalPID) {
        $this->insert(["InternalPID" => $newInternalPID, "Comment" => $patcom]);
    }
}
```

A whole table. Foreign key constraints. Model class. CRUD operations. **For one text field.**

Just add `comment TEXT` to the patient table.

#### Crime 3: CSV in a Relational Database

```php
$patient['LinkTo'] = '1,5,23,47';  // Comma-separated patient IDs
```

```php
private function getLinkedPatients(?string $linkTo): ?array {
    $ids = array_filter(explode(',', $linkTo));  // Oh no
    return $this->db->table('patient')->whereIn('InternalPID', $ids)->get();
}
```

**It's 2025.** Use a junction table:

```sql
CREATE TABLE patient_link (
    patient_id INT,
    linked_patient_id INT,
    link_type VARCHAR(50),
    PRIMARY KEY (patient_id, linked_patient_id)
);
```

---

## 6. 🤮 Patient Admission (ADT): Event Sourcing Gone Wrong

### The Pattern

```
patvisit     → InternalPVID, PVID, InternalPID (the visit)
patvisitadt  → PVADTID, InternalPVID, ADTCode, LocationID, AttDoc... (ADT events)
patdiag      → InternalPVID, DiagCode, Diagnosis
```

Instead of tracking patient status with simple fields, every Admission/Discharge/Transfer creates a **new row**.

### The Query From Hell

To get the current status of a patient visit:

```php
->join('(SELECT a1.*
    FROM patvisitadt a1
    INNER JOIN (
        SELECT InternalPVID, MAX(PVADTID) AS MaxID
        FROM patvisitadt
        GROUP BY InternalPVID
    ) a2 ON a1.InternalPVID = a2.InternalPVID AND a1.PVADTID = a2.MaxID
  ) AS patvisitadt',
  'patvisitadt.InternalPVID = patvisit.InternalPVID',
  'left')
```

Every. Single. Query. To get current patient status.

### The Performance Analysis

| Rows in patvisitadt | Query Complexity |
|---------------------|------------------|
| 1,000 | Meh, fine |
| 10,000 | Getting slow |
| 100,000 | Coffee break |
| 1,000,000 | Go home |

### What You Should Do

**Option A: Just use status fields**
```sql
ALTER TABLE patvisit ADD COLUMN current_status ENUM('admitted', 'discharged', 'transferred');
ALTER TABLE patvisit ADD COLUMN current_location_id INT;
ALTER TABLE patvisit ADD COLUMN current_attending_doctor_id INT;
```

**Option B: If you NEED history, use proper triggers**
```sql
CREATE TRIGGER update_current_status 
AFTER INSERT ON patvisitadt
FOR EACH ROW
UPDATE patvisit SET current_status = NEW.adt_code WHERE InternalPVID = NEW.InternalPVID;
```

---

## 7. 🧪 Test Definitions: The Abbreviation Cemetery

### The Tables

| Table | What Is This? | Fields |
|-------|---------------|--------|
| `testdefsite` | Test per Site | TestSiteID, TestSiteCode, TestSiteName, SeqScr, SeqRpt, VisibleScr, VisibleRpt... |
| `testdefgrp` | Test Groups | TestGrpID, TestSiteID, Member |
| `testdefcal` | Calculated Tests | TestCalID, TestSiteID, DisciplineID, DepartmentID... |
| `testdeftech` | Technical Details | TestTechID, TestSiteID, DisciplineID, DepartmentID... |
| `testmap` | ??? | TestMapID, TestSiteID... |
| `refnum` | Numeric Reference Ranges | RefNumID, TestSiteID, Sex, AgeStart, AgeEnd, Low, High... |
| `reftxt` | Text Reference Ranges | RefTxtID, TestSiteID, Sex, AgeStart, AgeEnd, RefTxt... |
| `refvset` | ValueSet Reference | RefVSetID, TestSiteID... |
| `refthold` | Thresholds | RefTHoldID... |

### The Abbreviation Apocalypse

| Abbreviation | Meaning | Guessability |
|--------------|---------|--------------|
| `SeqScr` | Sequence Screen | 2/10 |
| `SeqRpt` | Sequence Report | 3/10 |
| `SpcType` | Specimen Type | 4/10 |
| `VID` | ValueSet ID | 1/10 |
| `InternalPID` | Internal Patient ID | 5/10 |
| `InternalPVID` | Internal Patient Visit ID | 4/10 |
| `PVADTID` | Patient Visit ADT ID | 0/10 |
| `TestDefCal` | Test Definition Calculation | 3/10 |
| `RefTHold` | Reference Threshold | 1/10 |

**Pro tip:** If new developers need a glossary to understand your schema, you've failed.

### The Split Between RefNum and RefTxt

For numeric tests: use `refnum`
For text tests: use `reftxt`

Why not:
```sql
CREATE TABLE reference_range (
    id INT PRIMARY KEY,
    test_id INT,
    range_type ENUM('numeric', 'text'),
    low_value DECIMAL,
    high_value DECIMAL,
    text_value VARCHAR(255),
    -- ... other fields
);
```

One table. One query. One life.

---

## 8. 🎭 Bonus Round: Sins I Couldn't Ignore

### Sin #1: Inconsistent Soft Delete Field Names

| Table | Delete Field | Why Different? |
|-------|--------------|----------------|
| Most tables | `EndDate` | ??? |
| patient | `DelDate` | ??? |
| patatt | `DelDate` | ??? |
| patvisitadt | `EndDate` AND `ArchivedDate` AND `DelDate` | ¯\\\_(ツ)\_/¯ |

### Sin #2: Primary Key With a Trailing Space

In `PatComModel.php`:
```php
protected $primaryKey = 'PatComID ';  // <-- THERE IS A SPACE HERE
```

This has either:
- Never been tested
- Works by pure accident
- Will explode randomly one day

### Sin #3: Inconsistent ID Naming

| Column | Location |
|--------|----------|
| `InternalPID` | patient, patatt, patcom, patidt, patvisit... |
| `PatientID` | Also on patient table |
| `ContactID` | contact |
| `ContactDetID` | contactdetail |
| `VID` | valueset |
| `VSetID` | Also valueset and valuesetdef |
| `TestSiteID` | testdefsite |
| `TestGrpID` | testdefgrp |

Pick a convention. ANY convention. Please.

### Sin #4: Multiple Date Tracking Fields with Unclear Purposes

On `testdefsite`:
- `CreateDate` — when created
- `StartDate` — when... started? Different from created how?
- `EndDate` — when ended (soft delete)

### Sin #5: No Data Validation

The `patient` model has 30+ fields including:
- `Gender` (valueset VID — could be literally anything)
- `Religion` (valueset VID — could be a LocationType)
- `DeathIndicator` (valueset VID — could be a Gender)

Zero database-level constraints. Zero model-level validation. Pure vibes.

---

## 🏆 The Final Scorecard

| Category | Rating | Notes |
|----------|--------|-------|
| **Normalization** | 2/10 | Either over-normalized (LocationAddress) or under-normalized (CSV in columns) |
| **Consistency** | 1/10 | Every table is a unique snowflake |
| **Performance** | 3/10 | Those MAX subqueries and 7-way joins will age poorly |
| **Maintainability** | 1/10 | Good luck onboarding new developers |
| **Type Safety** | 0/10 | ValueSet is a type-safety black hole |
| **Naming** | 2/10 | Abbreviation chaos |
| **Scalability** | 2/10 | Event-sourcing-but-wrong will not scale |

**Overall: 1.5/10** — *"At least the tables exist"*

---

## 💡 Recommendations

If you want to fix this (and you should), here's the priority order:

1. **Eliminate the ValueSet monster** — Replace with proper ENUMs or dedicated lookup tables with foreign key constraints

2. **Combine 1:1 tables** — Location + LocationAddress, Patient + PatCom (if it's really just one comment)

3. **Fix Patient data model** — Proper junction tables for PatIdt, PatAtt, and LinkTo

4. **Add current status to PatVisit** — Denormalize the ADT current state

5. **Standardize naming** — Pick `*_id`, `*ID`, or `Id` and stick with it. Pick `end_date` or `del_date` for soft deletes.

6. **Add actual constraints** — Foreign keys that make sense. Check constraints. Not just vibes.

---

## 📜 Conclusion

This schema is what happens when someone:
- Prioritizes "flexibility" over usability
- Learns about normalization but not when to stop
- Discovers self-referencing tables and uses them everywhere
- Thinks abbreviations save storage space (they don't)
- Has never had to maintain their own code

The good news: it can be fixed.
The bad news: it should have been designed correctly the first time.

---

*Document prepared with 🔥 and ☕*

*May your database queries be fast and your schemas be sane.*
