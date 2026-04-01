---
layout: clqms-post.njk
tags: clqms
title: "Calculator Service Operators Reference"
description: "Concept, API contracts, and simplified operator reference for the calc engine"
date: 2026-03-17
order: 7
---

# Calculator Service: Concept and API Contract

## Concept

`CalculatorService` evaluates formulas for test results using runtime variables.

Use it when you need to:

- transform a raw result into a calculated result,
- apply factors or demographic values (age, gender),
- reuse formula logic from test configuration.

Two API patterns are used in practice:

1. **By Test Site ID** - uses the calculation definition configured for that test site.
2. **By Test Code/Name** - resolves by test code or test name and returns a compact result map.

Responses normally follow `{ status, message, data }`, except the compact test-code endpoint,
which returns a key/value map.

---

## Example API Contract

### 1) Calculate by Test Site

```http
POST /api/calc/testsite/{testSiteID}
Content-Type: application/json
```

Purpose: Evaluate the configured formula for a specific test site.

Request example:

```json
{
  "result": 85,
  "gender": "female",
  "age": 30
}
```

Success response example:

```json
{
  "status": "success",
  "data": {
    "result": 92.4,
    "testSiteID": 123,
    "formula": "{result} * {factor} + {age}",
    "variables": {
      "result": 85,
      "gender": "female",
      "age": 30
    }
  }
}
```

Error response example:

```json
{
  "status": "error",
  "message": "Missing variable: factor",
  "data": null
}
```

### 2) Calculate by Test Code or Name

```http
POST /api/calc/testcode/{testCodeOrName}
Content-Type: application/json
```

Purpose: Evaluate a calculation by test code/name and return a compact map.

Request example:

```json
{
  "result": 110,
  "factor": 1.1
}
```

Success response example:

```json
{
  "GLU": 121
}
```

Error response example:

```json
{}
```

---

## Formula Reference (Simplified)

### Arithmetic Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `+` | Add | `5 + 3` |
| `-` | Subtract | `10 - 4` |
| `*` | Multiply | `6 * 7` |
| `/` | Divide | `20 / 4` |
| `%` | Modulo | `20 % 6` |
| `**` | Power | `2 ** 3` |

### Comparison Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equal | `{result} == 10` |
| `!=` | Not equal | `{result} != 10` |
| `<` | Less than | `{result} < 10` |
| `<=` | Less than or equal | `{result} <= 10` |
| `>` | Greater than | `{result} > 10` |
| `>=` | Greater than or equal | `{result} >= 10` |

### Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `&&` (`and`) | Logical AND | `{result} > 0 && {factor} > 0` |
| `\|\|` (`or`) | Logical OR | `{gender} == 1 \|\| {gender} == 2` |
| `!` (`not`) | Logical NOT | `!({result} > 0)` |

### Conditional Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `?:` | Ternary | `{result} > 10 ? {result} : 10` |
| `??` | Null fallback | `{result} ?? 0` |

### Functions

| Function | Meaning | Example |
|----------|---------|---------|
| `min(a, b, ...)` | Lowest value | `min({result}, 10)` |
| `max(a, b, ...)` | Highest value | `max({result}, 10)` |
| `constant(name)` | PHP constant by name | `constant("PHP_INT_MAX")` |
| `enum(name)` | PHP enum case by name | `enum("App\\Enum\\Status::Active")` |

### Constants

| Constant | Meaning |
|----------|---------|
| `true` | Boolean true |
| `false` | Boolean false |
| `null` | Null |

### Variables Commonly Used

| Variable | Type | Meaning |
|----------|------|---------|
| `{result}` | Float | Input result value |
| `{factor}` | Float | Multiplier (default usually `1`) |
| `{gender}` | Integer | `0` unknown, `1` female, `2` male |
| `{age}` | Float | Patient age |
| `{ref_low}` | Float | Reference low |
| `{ref_high}` | Float | Reference high |

Gender can be passed as either numeric values (`0`, `1`, `2`) or strings
(`"unknown"`, `"female"`, `"male"`) and is normalized.

### Formula Notes

- Use parentheses for precedence: `(2 + 3) * 4`.
- Use `**` for exponentiation; `^` is XOR.
- Implicit multiplication is not supported (`2x` is invalid, use `2 * x`).

---

## Quick Usage Examples

```txt
{result} * {factor} + 10
{weight} / ({height} ** 2)
{result} * (1 + 0.1 * {gender})
```

---

## Validation and Errors

Validate formulas before saving.

Typical error cases:

- invalid syntax,
- missing variable,
- non-numeric value after normalization,
- division by zero.

Recommended flow: validate formula -> save formula -> evaluate with guarded error handling.
