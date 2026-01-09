---
layout: clqms-post.njk
tags: clqms
title: "Proposal: Valueset Replacement"
description: "Remove magic numbers and enforce type safety using PHP Enums and Svelte stores"
date: 2026-01-09
order: 2
---

# 🚀 Proposal: Valueset ("God Table") Replacement by Gemini 3


**Target:** `valueset` / `valuesetdef` Tables  
**Objective:** Remove "Magic Numbers," enforce Type Safety, and optimize Frontend performance.

---

## 1. The Problem: "Magic Number Soup" 🥣

**Current Status:**  
We store disparate system logic (Gender, Test Status, Colors, Payment Types) in a single massive table called `valueset`.
* **Code relies on IDs:** `if ($status == 1045) ...`
* **Frontend Overload:** Frontend makes frequent DB calls just to populate simple dropdowns.
* **No Type Safety:** Nothing stops a developer from assigning a "Payment Status" ID to a "Gender" column.

---

## 2. The Solution: Enums & API Store 🛠️

**Strategy:** Split "System Logic" from the Database.  
Use **PHP 8.1 Native Enums** for business rules and serve them via a cached API to Svelte.

### Step A: The Backend (PHP Enums)
We delete the rows from the database and define them in code where they belong.

**File:** `App/Enums/TestStatus.php`
```php
enum TestStatus: string {
    case PENDING = 'PENDING';
    case VERIFIED = 'VERIFIED';
    case REJECTED = 'REJECTED';

    // Helper for Frontend Labels
    public function label(): string {
        return match($this) {
            self::PENDING => 'Waiting for Results',
            self::VERIFIED => 'Verified & Signed',
            self::REJECTED => 'Sample Rejected',
        };
    }
}
```

### Step B: The API Contract

**GET `/api/config/valueset`**  
Instead of 20 small network requests for 20 dropdowns, the Frontend requests the entire dictionary once on load.

**Response:**
```json
{
  "test_status": [
    { "value": "PENDING", "label": "Waiting for Results" },
    { "value": "VERIFIED", "label": "Verified & Signed" }
  ],
  "gender": [
    { "value": "M", "label": "Male" },
    { "value": "F", "label": "Female" }
  ]
}
```

### Step C: The Frontend (Svelte Store)

We use a Svelte Store to cache this data globally. No more SQL queries for dropdowns.

**Component Usage:**
```svelte
{% raw %}
<script>
  import { config } from '../stores/configStore';
</script>

<label>Status:</label>
<select bind:value={status}>
    {#each $config.test_status as option}
        <option value={option.value}>{option.label}</option>
    {/each}
</select>
{% endraw %}
```

---

## 3. The Benefits 🏆

| Feature | Old Way (valueset Table) | New Way (Enums + Store) |
| :--- | :--- | :--- |
| **Performance** | DB Query per dropdown | Zero DB Hits (Cached) |
| **Code Quality** | `if ($id == 505)` | `if ($s == Status::PENDING)` |
| **Reliability** | IDs can change/break | Code is immutable |
| **Network** | "Chatty" (Many requests) | Efficient (One request) |

---

### Next Steps 🗒️

- [ ] Define `TestStatus` and `TestType` Enums in PHP.
- [ ] Create the `/api/config/valueset` endpoint.
- [ ] Update one Svelte form to use the new Store instead of an API fetch.

---
_Last updated: 2026-01-09 08:40:21_