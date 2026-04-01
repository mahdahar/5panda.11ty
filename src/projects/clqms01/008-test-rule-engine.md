---
layout: clqms-post.njk
tags: clqms
title: "Test Rule Engine Documentation"
description: "Concept, catalog, and API contracts for the CLQMS Rule Engine"
date: 2026-03-16
order: 8
---

# Test Rule Engine: Concept and API Contract

## Concept

The CLQMS Rule Engine executes business rules when specific events occur.

Each rule follows this lifecycle:

1. Author DSL in `ConditionExpr`.
2. Compile DSL using `POST /api/rule/compile`.
3. Save compiled JSON in `ConditionExprCompiled`.
4. Link the rule to tests via `testrule.TestSiteID`.
5. On trigger (`test_created`, `result_updated`), execute `then` or `else` actions.

Rules without compiled JSON or without test links are not executed.

---

## Event Triggers

| Event Code | Status | Trigger Point |
|------------|--------|----------------|
| `test_created` | Active | Runs after a new test row is saved |
| `result_updated` | Active | Runs when a result is saved or edited |

Other event codes may exist in data, but these are the active runtime triggers.

---

## Rule Shape

```txt
Rule = Event + Condition + Actions
```

DSL format:

```txt
if(condition; then-action; else-action)
```

Multi-action branches use `:` and execute left to right:

```txt
if(sex('M'); result_set(0.5):test_insert('HBA1C'); nothing)
```

---

## Catalog (Simplified)

### Conditions

| Function / Pattern | Meaning | Example |
|--------------------|---------|---------|
| `sex('M'|'F')` | Match patient sex | `sex('M')` |
| `priority('R'|'S'|'U')` | Match order priority | `priority('S')` |
| `age` comparisons | Numeric age checks | `age >= 18 && age <= 65` |
| `requested('CODE')` | Checks if test code exists in order | `requested('GLU')` |

### Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `&&` | AND | `sex('M') && age > 40` |
| `\|\|` | OR | `sex('M') \|\| age > 65` |
| `!` | NOT | `!(sex('M'))` |
| `()` | Grouping | `(sex('M') && age > 40) \|\| priority('S')` |

### Actions

| Action | Meaning | Example |
|--------|---------|---------|
| `result_set(value)` | Set current-context result (deprecated style) | `result_set(0.5)` |
| `result_set('CODE', value)` | Set result for a specific test code | `result_set('tesA', 0.5)` |
| `test_insert('CODE')` | Insert test if missing | `test_insert('HBA1C')` |
| `test_delete('CODE')` | Remove test from order | `test_delete('INS')` |
| `comment_insert('text')` | Insert order comment | `comment_insert('Review required')` |
| `nothing` | No operation | `nothing` |

`set_priority()` is removed; use `comment_insert()` when you need to record priority notes.

---

## Example API Contract

### 1) Compile DSL

```http
POST /api/rule/compile
Content-Type: application/json
```

Purpose: Validate DSL and return compiled JSON for `ConditionExprCompiled`.

Request example:

```json
{
  "expr": "if(sex('M'); result_set(0.5); result_set(0.6))"
}
```

Success response example:

```json
{
  "status": "success",
  "data": {
    "raw": "if(sex('M'); result_set(0.5); result_set(0.6))",
    "compiled": {
      "conditionExpr": "sex('M')",
      "then": [{ "type": "result_set", "args": [0.5] }],
      "else": [{ "type": "result_set", "args": [0.6] }]
    },
    "conditionExprCompiled": "{...json string...}"
  }
}
```

Error response example:

```json
{
  "status": "error",
  "message": "Invalid expression near ';'",
  "data": null
}
```

### 2) Validate Expression Against Context

```http
POST /api/rule/validate
Content-Type: application/json
```

Purpose: Evaluate an expression with context only (no compile, no persistence).

Request example:

```json
{
  "expr": "order[\"Age\"] > 18",
  "context": {
    "order": {
      "Age": 25
    }
  }
}
```

Success response example:

```json
{
  "status": "success",
  "data": {
    "result": true
  }
}
```

### 3) Create Rule

```http
POST /api/rule
Content-Type: application/json
```

Purpose: Save rule metadata, DSL, compiled payload, and linked tests.

Request example:

```json
{
  "RuleCode": "RULE_001",
  "RuleName": "Sex-based result",
  "EventCode": "test_created",
  "ConditionExpr": "if(sex('M'); result_set(0.5); result_set(0.6))",
  "ConditionExprCompiled": "<compiled JSON here>",
  "TestSiteIDs": [1, 2]
}
```

Success response example:

```json
{
  "status": "success",
  "message": "Rule created",
  "data": {
    "RuleCode": "RULE_001"
  }
}
```

---

## Minimal End-to-End Flow

1. Compile DSL with `/api/rule/compile`.
2. Store returned `conditionExprCompiled` in `ruledef.ConditionExprCompiled`.
3. Create rule and link `TestSiteIDs` via `/api/rule`.
4. Trigger event (`test_created` or `result_updated`) and verify actions ran.

---

## Runtime Requirements (Quick Check)

1. `ConditionExprCompiled` must be present.
2. Rule must be linked to the target `TestSiteID`.
3. Trigger event must match `EventCode`.
4. Context must include required identifiers for write actions.
