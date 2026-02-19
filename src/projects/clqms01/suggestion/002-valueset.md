---
layout: clqms-post.njk
tags: clqms
title: "Proposal: Valueset Replacement"
description: "Remove magic numbers and enforce type safety using PHP Enums and Svelte stores"
date: 2026-01-09
order: 2
---

# 🚀 Proposal: Valueset ("God Table") Replacement

**Target:** `valueset` / `valuesetdef` Tables  
**Objective:** Eliminate "Magic Numbers," enforce Type Safety, and optimize Frontend performance by moving system logic into the codebase.

---

## 1. The Problem: "Magic Number Soup" 🥣

**Current Status:**  
We store disparate logic (Gender, Test Status, Specimen Types, Priority) in a single massive table called `valueset`.

*   **Code relies on IDs:** Developers must remember that `1045` means `VERIFIED`. `if ($status == 1045)` is unreadable.
*   **Frontend Overload:** The frontend makes frequent, redundant database calls just to populate simple dropdowns.
*   **No Type Safety:** Nothing prevents assigning a "Payment Status" ID to a "Gender" column.
*   **Invisible History:** Database changes are hard to track. Who changed "Verified" to "Authorized"? When? Why?

---

## 2. The Solution: Single Source of Truth (SSOT) 🛠️

**Strategy:** Move "System Logic" from the Database into the Code. This creates a "Single Source of Truth."

### Step A: The Backend Implementation

#### Option 1: The "God File" (Simple & Legacy Friendly)
**File:** `application/libraries/Valuesets.php`

This file holds every dropdown option in the system. Benefits include **Ctrl+Click** navigation and clear **Git History**.

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Valuesets {

    // 1. Gender Definitions
    const GENDER = [
        'M' => 'Male',
        'F' => 'Female',
        'U' => 'Unknown'
    ];

    // 2. Test Status
    const TEST_STATUS = [
        'PENDING'    => 'Waiting for Results',
        'IN_PROCESS' => 'Analyzing',
        'VERIFIED'   => 'Verified & Signed',
        'REJECTED'   => 'Sample Rejected'
    ];

    // 3. Sample Types
    const SPECIMEN_TYPE = [
        'SERUM' => 'Serum',
        'PLASMA' => 'Plasma',
        'URINE' => 'Urine',
        'WB'    => 'Whole Blood'
    ];

    // 4. Urgency
    const PRIORITY = [
        'ROUTINE' => 'Routine',
        'CITO'    => 'Cito (Urgent)',
        'STAT'    => 'Immediate (Life Threatening)'
    ];

    /**
     * Helper to get all constants as one big JSON object.
     * Useful for sending everything to Svelte in one go.
     */
    public static function getAll() {
        return [
            'gender'        => self::mapForFrontend(self::GENDER),
            'test_status'   => self::mapForFrontend(self::TEST_STATUS),
            'specimen_type' => self::mapForFrontend(self::SPECIMEN_TYPE),
            'priority'      => self::mapForFrontend(self::PRIORITY),
        ];
    }

    // Helper to format array like: [{value: 'M', label: 'Male'}, ...]
    private static function mapForFrontend($array) {
        $result = [];
        foreach ($array as $key => $label) {
            $result[] = ['value' => $key, 'label' => $label];
        }
        return $result;
    }
}
```

#### Option 2: PHP 8.1+ Enums (Modern Approach)
**File:** `App/Enums/TestStatus.php`

```php
enum TestStatus: string {
    case PENDING = 'PENDING';
    case VERIFIED = 'VERIFIED';
    case REJECTED = 'REJECTED';

    public function label(): string {
        return match($this) {
            self::PENDING => 'Waiting for Results',
            self::VERIFIED => 'Verified & Signed',
            self::REJECTED => 'Sample Rejected',
        };
    }
}
```

---

## 3. The "Aha!" Moment (Usage) 🔌

### 1. In PHP Logic
No more querying the DB to check if a status is valid. Logic is now instant and readable.

```php
// ❌ Old Way (Sick) 🤮
// $status = $this->db->get_where('valuesetdef', ['id' => 505])->row();
if ($status_id == 505) { ... }

// ✅ New Way (Clean) 😎
if ($input_status === 'VERIFIED') {
    // We know exactly what this string means.
    send_email_to_patient();
}

// Validation is instant
if (!array_key_exists($input_gender, Valuesets::GENDER)) {
    die("Invalid Gender!"); 
}
```

### 2. In Svelte (Frontend - Svelte 5 Runes)
We use a global state (rune) to store this configuration. The frontend engineers no longer need to check database IDs; they just use the human-readable keys.

```svelte
{% raw %}
<script>
  import { config } from '../stores/config.svelte';
</script>

<label>Specimen Type:</label>
<select bind:value={specimen}>
    {#each config.valueset.specimen_type as option}
        <option value={option.value}>{option.label}</option>
    {/each}
</select>
{% endraw %}
```

---

## 4. Why This is Better 🏆

| Feature | Old Way (`valueset` Table) | New Way (The God File) |
| :--- | :--- | :--- |
| **Performance** | DB Query per dropdown | **Millions of times faster** (Constant) |
| **Readability** | `if ($id == 505)` | `if ($status == 'REJECTED')` |
| **Navigation** | Search DB rows | **Ctrl+Click** in VS Code |
| **Git History** | Opaque/Invisible | **Transparent** (See who changed what) |
| **Reliability** | IDs can change/break | Constants are immutable |

---

## 5. Next Steps 🗒️

- [ ] Implement `Valuesets.php` in the libraries folder.
- [ ] Create a controller to expose `Valuesets::getAll()` as JSON.
- [ ] Update the Svelte `configStore` to fetch this dictionary on app load.
- [ ] Refactor the Patient Registration form to use the new constants.

---
_Last updated: 2026-01-09_
