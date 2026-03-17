---
layout: clqms-post.njk
tags: clqms
title: "Calculator Service Operators Reference"
description: "Operators, functions, constants, and API usage for the calc engine"
date: 2026-03-17
order: 7
---

# Calculator Service Operators Reference

## Overview

The `CalculatorService` (`app/Services/CalculatorService.php`) evaluates formulas with Symfony's `ExpressionLanguage`. This document lists the operators, functions, and constants that are available in the current implementation.

---

## API Endpoints

All endpoints live under `/api` and accept JSON. Responses use the standard `{ status, message, data }` envelope unless stated otherwise.

### Calculate By Test Site

Uses the `testdefcal` definition for a test site. The incoming body supplies the variables required by the formula.

```http
POST /api/calc/testsite/123
Content-Type: application/json

{
  "result": 85,
  "gender": "female",
  "age": 30
}
```

Response:

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

### Calculate By Code Or Name

Evaluates a configured calculation by `TestSiteCode` or `TestSiteName`. Returns a compact map with a single key/value or `{}` on failure.

```http
POST /api/calc/testcode/GLU
Content-Type: application/json

{
  "result": 110,
  "factor": 1.1
}
```

Response:

```json
{
  "GLU": 121
}
```

---

## Supported Operators

### Arithmetic Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `5 + 3` | `8` |
| `-` | Subtraction | `10 - 4` | `6` |
| `*` | Multiplication | `6 * 7` | `42` |
| `/` | Division | `20 / 4` | `5` |
| `%` | Modulo | `20 % 6` | `2` |
| `**` | Exponentiation (power) | `2 ** 3` | `8` |

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal | `{result} == 10` |
| `!=` | Not equal | `{result} != 10` |
| `<` | Less than | `{result} < 10` |
| `<=` | Less than or equal | `{result} <= 10` |
| `>` | Greater than | `{result} > 10` |
| `>=` | Greater than or equal | `{result} >= 10` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `and` / `&&` | Logical AND | `{result} > 0 and {factor} > 0` |
| `or` / `||` | Logical OR | `{gender} == 1 or {gender} == 2` |
| `!` / `not` | Logical NOT | `not ({result} > 0)` |

### Conditional Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `?:` | Ternary | `{result} > 10 ? {result} : 10` |
| `??` | Null coalescing | `{result} ?? 0` |

### Parentheses

Use parentheses to control operation precedence:

```
(2 + 3) * 4   // Result: 20
2 + 3 * 4     // Result: 14
```

### Notes

- `^` is bitwise XOR (not exponentiation). Use `**` for powers.
- Variables must be numeric after normalization (gender is mapped to 0/1/2).

---

## Functions

Only the default ExpressionLanguage functions are available:

| Function | Description | Example |
|----------|-------------|---------|
| `min(a, b, ...)` | Minimum value | `min({result}, 10)` |
| `max(a, b, ...)` | Maximum value | `max({result}, 10)` |
| `constant(name)` | PHP constant by name | `constant("PHP_INT_MAX")` |
| `enum(name)` | PHP enum case by name | `enum("App\\Enum\\Status::Active")` |

---

## Constants

ExpressionLanguage recognizes boolean and null literals:

| Constant | Value | Description |
|----------|-------|-------------|
| `true` | `true` | Boolean true |
| `false` | `false` | Boolean false |
| `null` | `null` | Null value |

---

## Variables in CalculatorService

When using `calculateFromDefinition()`, the following variables are automatically available:

| Variable | Description | Type |
|----------|-------------|------|
| `{result}` | The test result value | Float |
| `{factor}` | Calculation factor (default: 1) | Float |
| `{gender}` | Gender value (0=Unknown, 1=Female, 2=Male) | Integer |
| `{age}` | Patient age | Float |
| `{ref_low}` | Reference range low value | Float |
| `{ref_high}` | Reference range high value | Float |

### Gender Mapping

The `gender` variable accepts the following values:

| Value | Description |
|-------|-------------|
| `0` | Unknown |
| `1` | Female |
| `2` | Male |

Or use string values: `'unknown'`, `'female'`, `'male'`

---

## Implicit Multiplication

Implicit multiplication is not supported. Always use `*` between values:

| Expression | Use Instead |
|------------|-------------|
| `2x` | `2 * x` |
| `{result}{factor}` | `{result} * {factor}` |

---

## Usage Examples

### Basic Calculation

```php
use App\Services\CalculatorService;

$calculator = new CalculatorService();

// Simple arithmetic
$result = $calculator->calculate("5 + 3 * 2");
// Result: 11

// Using min/max
$result = $calculator->calculate("max({result}, 10)", ['result' => 7]);
// Result: 10
```

### With Variables

```php
$formula = "{result} * {factor} + 10";
$variables = [
    'result' => 5.2,
    'factor' => 2
];

$result = $calculator->calculate($formula, $variables);
// Result: 20.4
```

### BMI Calculation

```php
$formula = "{weight} / ({height} ** 2)";
$variables = [
    'weight' => 70,   // kg
    'height' => 1.75  // meters
];

$result = $calculator->calculate($formula, $variables);
// Result: 22.86
```

### Gender-Based Calculation

```php
// Apply different multipliers based on gender
$formula = "{result} * (1 + 0.1 * {gender})";
$variables = [
    'result' => 100,
    'gender' => 1  // Female = 1
];

$result = $calculator->calculate($formula, $variables);
// Result: 110
```

### Complex Formula

```php
// Pythagorean theorem
$formula = "(({a} ** 2 + {b} ** 2) ** 0.5)";
$variables = [
    'a' => 3,
    'b' => 4
];

$result = $calculator->calculate($formula, $variables);
// Result: 5
```

### Using calculateFromDefinition

```php
$calcDef = [
    'FormulaCode' => '{result} * {factor} + {gender}',
    'Factor' => 2
];

$testValues = [
    'result' => 10,
    'gender' => 1  // Female
];

$result = $calculator->calculateFromDefinition($calcDef, $testValues);
// Result: 21 (10 * 2 + 1)
```

---

## Formula Validation

Validate formulas before storing them:

```php
$validation = $calculator->validate("{result} / {factor}");
// Returns: ['valid' => true, 'error' => null]

$validation = $calculator->validate("{result} /");
// Returns: ['valid' => false, 'error' => 'Error message']
```

### Extract Variables

Get a list of variables used in a formula:

```php
$variables = $calculator->extractVariables("{result} * {factor} + {age}");
// Returns: ['result', 'factor', 'age']
```

---

## Error Handling

The service throws exceptions for invalid formulas or missing variables:

```php
try {
    $result = $calculator->calculate("{result} / 0");
} catch (\Exception $e) {
    // Handle division by zero or other errors
    log_message('error', $e->getMessage());
}
```

Common errors:

- **Invalid formula syntax**: Malformed expressions
- **Missing variable**: Variable placeholder not provided in data array
- **Non-numeric value**: Variables must be numeric
- **Division by zero**: Mathematical error

---

## Best Practices

1. **Always validate formulas** before storing in database
2. **Use placeholder syntax** `{variable_name}` for clarity
3. **Handle exceptions** in production code
4. **Test edge cases** like zero values and boundary conditions
5. **Document formulas** with comments in your code

---

## References

- [Symfony ExpressionLanguage](https://symfony.com/doc/current/components/expression_language.html)
- `app/Services/CalculatorService.php`
