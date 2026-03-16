---
layout: clqms-post.njk
tags: clqms
title: "Test Rule Engine Documentation"
description: "Comprehensive guide to the CLQMS Rule Engine DSL, syntax, and action definitions."
date: 2026-03-16
order: 8
---

# Test Rule Engine Documentation

## Overview

The CLQMS Rule Engine evaluates business rules that inspect orders, patients, and tests, then executes actions when the compiled condition matches.

Rules are authored using a domain specific language stored in `ruledef.ConditionExpr`. Before the platform executes any rule, the DSL must be compiled into JSON and stored in `ConditionExprCompiled`, and each rule must be linked to the tests it should influence via `testrule`.

### Execution Flow

1. Write or edit the DSL in `ConditionExpr`.
2. POST the expression to `POST /api/rule/compile` to validate syntax and produce compiled JSON.
3. Save the compiled payload into `ConditionExprCompiled` and persist the rule in `ruledef`.
4. Link the rule to one or more tests through `testrule.TestSiteID` (rules only run for linked tests).
5. When the configured event fires (`test_created` or `result_updated`), the engine evaluates `ConditionExprCompiled` and runs the resulting `then` or `else` actions.

> **Note:** The rule engine currently fires only for `test_created` and `result_updated`. Other event codes can exist in the database but are not triggered by the application unless additional `RuleEngineService::run(...)` calls are added.

## Event Triggers

| Event Code | Status | Trigger Point |
|------------|--------|----------------|
| `test_created` | Active | Fired after a new test row is persisted; the handler calls `RuleEngineService::run('test_created', ...)` to evaluate test-scoped rules |
| `result_updated` | Active | Fired whenever a test result is saved or updated so result-dependent rules run immediately |

Other event codes remain in the database for future workflows, but only `test_created` and `result_updated` are executed by the current application flow.

## Rule Structure

```
Rule
├── Event Trigger (when to run)
├── Conditions (when to match)
└── Actions (what to do)
```

The DSL expression lives in `ConditionExpr`. The compile endpoint (`/api/rule/compile`) renders the lifeblood of execution, producing `conditionExpr`, `valueExpr`, `then`, and `else` nodes that the engine consumes at runtime.

## Syntax Guide

### Basic Format

```
if(condition; then-action; else-action)
```

### Logical Operators

- Use `&&` for AND (all sub-conditions must match).
- Use `||` for OR (any matching branch satisfies the rule).
- Surround mixed logic with parentheses for clarity and precedence.

### Multi-Action Syntax

Actions within any branch are separated by `:` and evaluated in order. Every `then` and `else` branch must end with an action; use `nothing` when no further work is required.

```
if(sex('M'); result_set(0.5):test_insert('HBA1C'); nothing)
```

### Multiple Rules

Create each rule as its own `ruledef` row; do not chain expressions with commas. The `testrule` table manages rule-to-test mappings, so multiple rules can attach to the same test. Example:

1. Insert `RULE_MALE_RESULT` and `RULE_SENIOR_COMMENT` in `ruledef`.
2. Add two `testrule` rows linking each rule to the appropriate `TestSiteID`.

Each rule compiles and runs independently when its trigger fires and the test is linked.

## Available Functions

### Conditions

| Function | Description | Example |
|----------|-------------|---------|
| `sex('M'|'F')` | Match patient sex | `sex('M')` |
| `priority('R'|'S'|'U')` | Match order priority | `priority('S')` |
| `age > 18` | Numeric age comparisons (`>`, `<`, `>=`, `<=`) | `age >= 18 && age <= 65` |
| `requested('CODE')` | Check whether the order already requested a test (queries `patres`) | `requested('GLU')` |

### Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `&&` | AND (all truthy) | `sex('M') && age > 40` |
| `||` | OR (any truthy) | `sex('M') || age > 65` |
| `()` | Group expressions | `(sex('M') && age > 40) || priority('S')` |

## Actions

| Action | Description | Example |
|--------|-------------|---------|
| `result_set(value)` | (deprecated) Write to `patres.Result` for the current context test | `result_set(0.5)` |
| `result_set('CODE', value)` | Target a specific test by `TestSiteCode`, allowing multiple tests to be updated in one rule | `result_set('tesA', 0.5)` |
| `test_insert('CODE')` | Insert a test row by `TestSiteCode` if it doesn’t already exist for the order | `test_insert('HBA1C')` |
| `test_delete('CODE')` | Remove a previously requested test from the current order when the rule deems it unnecessary | `test_delete('INS')` |
| `comment_insert('text')` | Insert an order comment (`ordercom`) describing priority or clinical guidance | `comment_insert('Male patient - review')` |
| `nothing` | Explicit no-op to terminate an action chain | `nothing` |

> **Note:** `set_priority()` was removed. Use `comment_insert()` for priority notes without altering billing.

## Runtime Requirements

1. **Compiled expression required:** Rules without `ConditionExprCompiled` are ignored (see `RuleEngineService::run`).
2. **Order context:** `context.order.InternalOID` must exist for any action that writes to `patres` or `ordercom`.
3. **TestSiteID:** `result_set()` needs `testSiteID` (either provided in context or from `order.TestSiteID`). When you provide a `TestSiteCode` as the first argument (`result_set('tesA', value)`), the engine resolves that code before writing the result. `test_insert()` resolves a `TestSiteID` via the `TestSiteCode` in `TestDefSiteModel`, and `test_delete()` removes the matching `TestSiteID` rows when needed.
4. **Requested check:** `requested('CODE')` inspects `patres` rows for the same `OrderID` and `TestSiteCode`.

## Examples

```
if(sex('M'); result_set('tesA', 0.5):result_set('tesB', 1.2); result_set('tesA', 0.6):result_set('tesB', 1.0))
```
Sets both `tesA`/`tesB` results together per branch.

```
if(requested('GLU'); test_insert('HBA1C'):test_insert('INS'); nothing)
```
Adds new tests when glucose is already requested.

```
if(sex('M') && age > 40; result_set(1.2); result_set(1.0))
```

```
if((sex('M') && age > 40) || (sex('F') && age > 50); result_set(1.5); result_set(1.0))
```

```
if(priority('S'); result_set('URGENT'):test_insert('STAT_TEST'); result_set('NORMAL'))
```

```
if(sex('M') && age > 40; result_set(1.5):test_insert('EXTRA_TEST'):comment_insert('Male over 40'); nothing)
```

```
if(sex('F') && (age >= 18 && age <= 50) && priority('S'); result_set('HIGH_PRIO'):comment_insert('Female stat 18-50'); result_set('NORMAL'))
```

```
if(requested('GLU'); test_delete('INS'):comment_insert('Duplicate insulin request removed'); nothing)
```

## API Usage

### Compile DSL

Validates the DSL and returns a compiled JSON structure that should be persisted in `ConditionExprCompiled`.

```http
POST /api/rule/compile
Content-Type: application/json

{
  "expr": "if(sex('M'); result_set(0.5); result_set(0.6))"
}
```

The response contains `raw`, `compiled`, and `conditionExprCompiled` fields; store the JSON payload in `ConditionExprCompiled` before saving the rule.

### Evaluate Expression (Validation)

This endpoint simply evaluates an expression against a runtime context. It does not compile DSL or persist the result.

```http
POST /api/rule/validate
Content-Type: application/json

{
  "expr": "order[\"Age\"] > 18",
  "context": {
    "order": {
      "Age": 25
    }
  }
}
```

### Create Rule (example)

```http
POST /api/rule
Content-Type: application/json

{
  "RuleCode": "RULE_001",
  "RuleName": "Sex-based result",
  "EventCode": "test_created",
  "ConditionExpr": "if(sex('M'); result_set(0.5); result_set(0.6))",
  "ConditionExprCompiled": "<compiled JSON here>",
  "TestSiteIDs": [1, 2]
}
```

## Database Schema

### Tables

- **ruledef** – stores rule metadata, raw DSL, and compiled JSON.
- **testrule** – mapping table that links rules to tests via `TestSiteID`.
- **ruleaction** – deprecated. Actions are now embedded in `ConditionExprCompiled`.

### Key Columns

| Column | Table | Description |
|--------|-------|-------------|
| `EventCode` | ruledef | The trigger event (typically `test_created` or `result_updated`). |
| `ConditionExpr` | ruledef | Raw DSL expression (semicolon syntax). |
| `ConditionExprCompiled` | ruledef | JSON payload consumed at runtime (`then`, `else`, etc.). |
| `ActionType` / `ActionParams` | ruleaction | Deprecated; actions live in compiled JSON now. |

## Best Practices

1. Always run `POST /api/rule/compile` before persisting a rule so `ConditionExprCompiled` exists.
2. Link each rule to the relevant tests via `testrule.TestSiteID`—rules are scoped to linked tests.
3. Use multi-action (`:`) to bundle several actions in a single branch; finish the branch with `nothing` if no further work is needed.
4. Prefer `comment_insert()` over the removed `set_priority()` action when documenting priority decisions.
5. Group complex boolean logic with parentheses for clarity when mixing `&&` and `||`.
6. Use `requested('CODE')` responsibly; it performs a database lookup on `patres` so avoid invoking it in high-frequency loops without reason.

## Migration Guide

### Syntax Changes (v2.0)

The DSL moved from ternary (`condition ? action : action`) to semicolon syntax. Existing rules must be migrated via the provided script.

| Old Syntax | New Syntax |
|------------|------------|
| `if(condition ? action : action)` | `if(condition; action; action)` |

#### Migration Examples

```
# BEFORE
if(sex('M') ? result_set(0.5) : result_set(0.6))

# AFTER
if(sex('M'); result_set(0.5); result_set(0.6))
```

```
# BEFORE
if(sex('F') ? set_priority('S') : nothing)

# AFTER
if(sex('F'); comment_insert('Female patient - review priority'); nothing)
```

#### Migration Process

Run the migration which:

1. Converts ternary syntax to semicolon syntax.
2. Recompiles every expression into JSON so the engine consumes `ConditionExprCompiled` directly.
3. Eliminates reliance on the `ruleaction` table.

```bash
php spark migrate
```

## Troubleshooting

### Rule Not Executing

1. Ensure the rule has a compiled payload (`ConditionExprCompiled`).
2. Confirm the rule is linked to the relevant `TestSiteID` in `testrule`.
3. Verify the `EventCode` matches the currently triggered event (`test_created` or `result_updated`).
4. Check that `EndDate IS NULL` for both `ruledef` and `testrule` (soft deletes disable execution).
5. Use `/api/rule/compile` to validate the DSL and view errors.

### Invalid Expression

1. POST the expression to `/api/rule/compile` to get a detailed compilation error.
2. If using `/api/rule/validate`, supply the expected `context` payload; the endpoint simply evaluates the expression without saving it.

### Runtime Errors

- `RESULT_SET requires context.order.InternalOID` or `testSiteID`: include those fields in the context passed to `RuleEngineService::run()`.
- `TEST_INSERT` failures mean the provided `TestSiteCode` does not exist or the rule attempted to insert a duplicate test; check `testdefsite` and existing `patres` rows.
- `COMMENT_INSERT requires comment`: ensure the action provides text.
