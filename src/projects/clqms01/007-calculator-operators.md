---
layout: clqms-post.njk
tags: clqms
title: "Calculator Service Operators Reference"
description: "Complete reference for mathematical operators, functions, and constants available in the CalculatorService."
date: 2026-03-16
order: 7
---

# Calculator Service Operators Reference

## Overview

The `CalculatorService` (`app/Services/CalculatorService.php`) uses the [mossadal/math-parser](https://github.com/mossadal/math-parser) library to safely evaluate mathematical expressions. This document lists all available operators, functions, and constants.

---

## Supported Operators

### Arithmetic Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `5 + 3` | `8` |
| `-` | Subtraction | `10 - 4` | `6` |
| `*` | Multiplication | `6 * 7` | `42` |
| `/` | Division | `20 / 4` | `5` |
| `^` | Exponentiation (power) | `2 ^ 3` | `8` |
| `!` | Factorial | `5!` | `120` |
| `!!` | Semi-factorial (double factorial) | `5!!` | `15` |

### Parentheses

Use parentheses to control operation precedence:

```
(2 + 3) * 4   // Result: 20
2 + 3 * 4     // Result: 14
```

---

## Mathematical Functions

### Rounding Functions

| Function | Description | Example |
|----------|-------------|---------|
| `sqrt(x)` | Square root | `sqrt(16)` → `4` |
| `round(x)` | Round to nearest integer | `round(3.7)` → `4` |
| `ceil(x)` | Round up to integer | `ceil(3.2)` → `4` |
| `floor(x)` | Round down to integer | `floor(3.9)` → `3` |
| `abs(x)` | Absolute value | `abs(-5)` → `5` |
| `sgn(x)` | Sign function | `sgn(-10)` → `-1` |

### Trigonometric Functions (Radians)

| Function | Description | Example |
|----------|-------------|---------|
| `sin(x)` | Sine | `sin(pi/2)` → `1` |
| `cos(x)` | Cosine | `cos(0)` → `1` |
| `tan(x)` | Tangent | `tan(pi/4)` → `1` |
| `cot(x)` | Cotangent | `cot(pi/4)` → `1` |

### Trigonometric Functions (Degrees)

| Function | Description | Example |
|----------|-------------|---------|
| `sind(x)` | Sine (degrees) | `sind(90)` → `1` |
| `cosd(x)` | Cosine (degrees) | `cosd(0)` → `1` |
| `tand(x)` | Tangent (degrees) | `tand(45)` → `1` |
| `cotd(x)` | Cotangent (degrees) | `cotd(45)` → `1` |

### Hyperbolic Functions

| Function | Description | Example |
|----------|-------------|---------|
| `sinh(x)` | Hyperbolic sine | `sinh(1)` → `1.175...` |
| `cosh(x)` | Hyperbolic cosine | `cosh(1)` → `1.543...` |
| `tanh(x)` | Hyperbolic tangent | `tanh(1)` → `0.761...` |
| `coth(x)` | Hyperbolic cotangent | `coth(2)` → `1.037...` |

### Inverse Trigonometric Functions

| Function | Aliases | Description | Example |
|----------|---------|-------------|---------|
| `arcsin(x)` | `asin(x)` | Inverse sine | `arcsin(0.5)` → `0.523...` |
| `arccos(x)` | `acos(x)` | Inverse cosine | `arccos(0.5)` → `1.047...` |
| `arctan(x)` | `atan(x)` | Inverse tangent | `arctan(1)` → `0.785...` |
| `arccot(x)` | `acot(x)` | Inverse cotangent | `arccot(1)` → `0.785...` |

### Inverse Hyperbolic Functions

| Function | Aliases | Description | Example |
|----------|---------|-------------|---------|
| `arsinh(x)` | `asinh(x)`, `arcsinh(x)` | Inverse hyperbolic sine | `arsinh(1)` → `0.881...` |
| `arcosh(x)` | `acosh(x)`, `arccosh(x)` | Inverse hyperbolic cosine | `arcosh(2)` → `1.316...` |
| `artanh(x)` | `atanh(x)`, `arctanh(x)` | Inverse hyperbolic tangent | `artanh(0.5)` → `0.549...` |
| `arcoth(x)` | `acoth(x)`, `arccoth(x)` | Inverse hyperbolic cotangent | `arcoth(2)` → `0.549...` |

### Logarithmic & Exponential Functions

| Function | Aliases | Description | Example |
|----------|---------|-------------|---------|
| `exp(x)` | - | Exponential (e^x) | `exp(2)` → `7.389...` |
| `log(x)` | `ln(x)` | Natural logarithm (base e) | `log(e)` → `1` |
| `log10(x)` | `lg(x)` | Logarithm base 10 | `log10(100)` → `2` |

---

## Constants

| Constant | Value | Description | Example |
|----------|-------|-------------|---------|
| `pi` | 3.14159265... | Ratio of circle circumference to diameter | `pi * r ^ 2` |
| `e` | 2.71828182... | Euler's number | `e ^ x` |
| `NAN` | Not a Number | Invalid mathematical result | - |
| `INF` | Infinity | Positive infinity | - |

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

The parser supports implicit multiplication (no explicit `*` operator needed):

| Expression | Parsed As | Result (x=2, y=3) |
|------------|-----------|-------------------|
| `2x` | `2 * x` | `4` |
| `x sin(x)` | `x * sin(x)` | `1.818...` |
| `2xy` | `2 * x * y` | `12` |
| `x^2y` | `x^2 * y` | `12` |

**Note:** Implicit multiplication has the same precedence as explicit multiplication. `xy^2z` is parsed as `x*y^2*z`, NOT as `x*y^(2*z)`.

---

## Usage Examples

### Basic Calculation

```php
use App\Services\CalculatorService;

$calculator = new CalculatorService();

// Simple arithmetic
$result = $calculator->calculate("5 + 3 * 2");
// Result: 11

// Using functions
$result = $calculator->calculate("sqrt(16) + abs(-5)");
// Result: 9

// Using constants
$result = $calculator->calculate("2 * pi * r", ['r' => 5]);
// Result: 31.415...
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
$formula = "{weight} / ({height} ^ 2)";
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
// Pythagorean theorem with rounding
$formula = "round(sqrt({a} ^ 2 + {b} ^ 2))";
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

- [math-parser GitHub](https://github.com/mossadal/math-parser)
- [math-parser Documentation](http://mossadal.github.io/math-parser/)
- `app/Services/CalculatorService.php`
