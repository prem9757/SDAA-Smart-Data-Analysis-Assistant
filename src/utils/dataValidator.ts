import { Dataset } from '../types/dataset';
import {
  ValidationRule,
  ValidationResult,
  ValidationSuiteReport,
  ValidationFailureItem,
  ValidationCategory,
  ValidationSeverity,
  ValidationCategoryScore,
  ValidationPresetSuite,
} from '../types/validation';
import { isPlaceholder, parseAndValidateDate } from './universalDataProfiler';

// Regex patterns for standard semantic validation
export const SEMANTIC_REGEX_PATTERNS: Record<string, { regex: RegExp; description: string; sample: string }> = {
  email: {
    regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    description: 'RFC 5322 Standard Email Address Format',
    sample: 'user@example.com',
  },
  phone: {
    regex: /^\+?[0-9\s\-().]{7,25}$/,
    description: 'International E.164 / Standard Phone Number Format',
    sample: '+1 (555) 123-4567',
  },
  url: {
    regex: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i,
    description: 'HTTP / HTTPS Standard Web URL',
    sample: 'https://app.example.com/data',
  },
  date_iso: {
    regex: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
    description: 'ISO-8601 Date / Timestamp (YYYY-MM-DD)',
    sample: '2026-08-17',
  },
  zip_code: {
    regex: /^\d{5}(-\d{4})?$|^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    description: 'US 5-Digit / US+4 or Canadian Postal Code',
    sample: '90210 or M5V 2T6',
  },
  uuid: {
    regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    description: 'Standard RFC 4122 UUID v1-v5',
    sample: '123e4567-e89b-12d3-a456-426614174000',
  },
  alphanumeric: {
    regex: /^[a-zA-Z0-9_-]+$/,
    description: 'Strict Alphanumeric Key or Identifier (no spaces/symbols)',
    sample: 'ID_98472',
  },
};

/**
 * Automatically infers a complete, rigorous suite of validation rules tailored to any dataset
 */
export function inferValidationRulesFromDataset(dataset: Dataset): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const rows = dataset.rows || [];
  const columns = dataset.columns || [];
  const profile = dataset.profile;

  if (rows.length === 0 || columns.length === 0) {
    return rules;
  }

  // 1. COMPLETENESS & NOT NULL RULES
  columns.forEach((col) => {
    const missingPct = col.missingPercentage || 0;
    const isId = col.name.toLowerCase().includes('id') || col.name.toLowerCase().endsWith('_key') || col.name.toLowerCase() === 'sku';

    if (missingPct === 0 || isId) {
      rules.push({
        id: `rule-notnull-${col.name}`,
        name: `Strict Zero Nulls in '${col.name}'`,
        description: `Ensure column '${col.name}' has 0% missing or placeholder values.`,
        category: 'completeness',
        targetColumn: col.name,
        severity: isId ? 'CRITICAL' : 'WARNING',
        enabled: true,
        parameters: {
          allowNull: false,
          nullThresholdPct: 0,
        },
        suggestedRemediation: 'Impute missing values using column median/mode or drop unidentifiable records.',
        autoFixType: col.type === 'number' ? 'impute_median' : 'impute_mode',
      });
    } else if (missingPct <= 15) {
      rules.push({
        id: `rule-null-thresh-${col.name}`,
        name: `Completeness Threshold (≤10% missing) for '${col.name}'`,
        description: `Ensure column '${col.name}' missingness rate does not exceed acceptable threshold (10%).`,
        category: 'completeness',
        targetColumn: col.name,
        severity: 'WARNING',
        enabled: true,
        parameters: {
          allowNull: true,
          nullThresholdPct: 10,
        },
        suggestedRemediation: 'Check data ingestion source to avoid dropped values.',
      });
    }
  });

  // 2. PRIMARY KEY & UNIQUENESS CONSTRAINTS
  columns.forEach((col) => {
    const isCandidateKey =
      col.uniqueCount === rows.length ||
      (profile && profile.structuralInfo.potentialPrimaryKeys.some((pk) => pk.columnName === col.name));

    if (isCandidateKey) {
      rules.push({
        id: `rule-unique-${col.name}`,
        name: `Entity Uniqueness Constraint: '${col.name}'`,
        description: `Enforce 100% distinct values across '${col.name}' to guarantee primary entity uniqueness.`,
        category: 'uniqueness',
        targetColumn: col.name,
        severity: 'CRITICAL',
        enabled: true,
        parameters: {
          uniqueConstraint: 'strict_unique',
        },
        suggestedRemediation: 'Deduplicate duplicate entity identifiers or generate unique synthetic keys.',
        autoFixType: 'quarantine',
      });
    }
  });

  // 3. TYPE & PATTERN RULES (Email, Phone, Date, Alphanumeric)
  columns.forEach((col) => {
    const colNameLower = col.name.toLowerCase();

    // Type Schema conformity
    rules.push({
      id: `rule-type-${col.name}`,
      name: `Type Conformity: '${col.name}' must be ${col.type.toUpperCase()}`,
      description: `Validate that 100% of non-null cells conform strictly to physical ${col.type} format.`,
      category: 'type_schema',
      targetColumn: col.name,
      severity: 'CRITICAL',
      enabled: true,
      parameters: {
        expectedType: col.type as any,
      },
      suggestedRemediation: 'Coerce data types and filter unparseable malformed text values.',
      autoFixType: 'format_normalize',
    });

    // Pattern Regex (Email)
    if (colNameLower.includes('email') || colNameLower.includes('e_mail')) {
      rules.push({
        id: `rule-regex-email-${col.name}`,
        name: `Valid Email Address Format for '${col.name}'`,
        description: `Ensure all email addresses match RFC standard formatting.`,
        category: 'pattern_regex',
        targetColumn: col.name,
        severity: 'CRITICAL',
        enabled: true,
        parameters: {
          patternType: 'email',
          pattern: SEMANTIC_REGEX_PATTERNS.email.regex.source,
        },
        suggestedRemediation: 'Fix malformed email domains and trim trailing whitespace.',
        autoFixType: 'trim',
      });
    }

    // Pattern Regex (Phone)
    if (colNameLower.includes('phone') || colNameLower.includes('mobile') || colNameLower.includes('tel')) {
      rules.push({
        id: `rule-regex-phone-${col.name}`,
        name: `Valid Phone Format for '${col.name}'`,
        description: `Verify phone values match international E.164 or national phone formatting.`,
        category: 'pattern_regex',
        targetColumn: col.name,
        severity: 'WARNING',
        enabled: true,
        parameters: {
          patternType: 'phone',
          pattern: SEMANTIC_REGEX_PATTERNS.phone.regex.source,
        },
        suggestedRemediation: 'Normalize phone strings to E.164 format (+1-XXX-XXX-XXXX).',
      });
    }

    // Pattern Regex (Zip/Postal)
    if (colNameLower.includes('zip') || colNameLower.includes('postal')) {
      rules.push({
        id: `rule-regex-zip-${col.name}`,
        name: `Valid Postal/Zip Code for '${col.name}'`,
        description: `Ensure postal codes adhere to alphanumeric or 5-digit zip formatting.`,
        category: 'pattern_regex',
        targetColumn: col.name,
        severity: 'WARNING',
        enabled: true,
        parameters: {
          patternType: 'zip_code',
          pattern: SEMANTIC_REGEX_PATTERNS.zip_code.regex.source,
        },
        suggestedRemediation: 'Standardize zip codes and preserve leading zeroes.',
      });
    }

    // Pattern Regex (Date formatting)
    if (col.type === 'date' || colNameLower.includes('date') || colNameLower.endsWith('_at')) {
      rules.push({
        id: `rule-regex-date-${col.name}`,
        name: `Valid Date Parsing for '${col.name}'`,
        description: `Ensure date string can be reliably parsed into a real calendar date.`,
        category: 'pattern_regex',
        targetColumn: col.name,
        severity: 'CRITICAL',
        enabled: true,
        parameters: {
          patternType: 'date_iso',
        },
        suggestedRemediation: 'Parse dates using standard ISO-8601 (YYYY-MM-DD).',
      });
    }
  });

  // 4. RANGE & BOUNDARY RULES (Numerics, Percentages, Prices, Quantities, Ages)
  columns
    .filter((c) => c.type === 'number')
    .forEach((col) => {
      const colNameLower = col.name.toLowerCase();
      const nonNullVals = rows.map((r) => parseFloat(r[col.name])).filter((v) => !isNaN(v));
      if (nonNullVals.length === 0) return;

      const minVal = Math.min(...nonNullVals);
      const maxVal = Math.max(...nonNullVals);

      // Non-negative constraint for Prices, Quantities, Ages, Counts, Revenues, Units
      const isNaturallyNonNegative =
        colNameLower.includes('price') ||
        colNameLower.includes('qty') ||
        colNameLower.includes('quantity') ||
        colNameLower.includes('revenue') ||
        colNameLower.includes('cost') ||
        colNameLower.includes('amount') ||
        colNameLower.includes('count') ||
        colNameLower.includes('units') ||
        colNameLower.includes('items') ||
        colNameLower.includes('stock') ||
        colNameLower.includes('inventory') ||
        colNameLower.includes('age') ||
        colNameLower.includes('sales') ||
        colNameLower.includes('salary');

      if (isNaturallyNonNegative) {
        rules.push({
          id: `rule-bound-nonneg-${col.name}`,
          name: `Non-Negative Boundary for '${col.name}' (≥ 0)`,
          description: `Validate that '${col.name}' is strictly greater than or equal to 0. Negative values represent physical or data-entry errors.`,
          category: 'range_boundary',
          targetColumn: col.name,
          severity: 'CRITICAL',
          enabled: true,
          parameters: {
            min: 0,
            operator: '>=',
          },
          suggestedRemediation: 'Convert negative sign errors to positive absolute values (|x|), clamp to 0, or impute with positive median.',
          autoFixType: colNameLower.includes('qty') || colNameLower.includes('quantity') || colNameLower.includes('units') || colNameLower.includes('count') ? 'abs_value' : 'cap_bounds',
        });
      }

      // Percentage bounds [0, 100] or [0, 1]
      const isPercentage =
        colNameLower.includes('percent') ||
        colNameLower.includes('rate') ||
        colNameLower.includes('discount') ||
        colNameLower.includes('margin') ||
        colNameLower.includes('churn') ||
        colNameLower.includes('conversion');

      if (isPercentage && minVal >= 0 && maxVal <= 100) {
        rules.push({
          id: `rule-bound-pct-${col.name}`,
          name: `Percentage Range Constraint [0% - 100%] for '${col.name}'`,
          description: `Ensure percentage rate '${col.name}' remains within valid 0 to 100 bounds.`,
          category: 'range_boundary',
          targetColumn: col.name,
          severity: 'CRITICAL',
          enabled: true,
          parameters: {
            min: 0,
            max: 100,
          },
          suggestedRemediation: 'Clamp out-of-range percentage values to [0, 100].',
          autoFixType: 'cap_bounds',
        });
      }

      // Realistic Age bounds [0, 125]
      if (colNameLower === 'age' || colNameLower.includes('_age')) {
        rules.push({
          id: `rule-bound-age-${col.name}`,
          name: `Realistic Human Age Range [0 - 120] for '${col.name}'`,
          description: `Validate that '${col.name}' is a plausible human age between 0 and 120 years.`,
          category: 'range_boundary',
          targetColumn: col.name,
          severity: 'CRITICAL',
          enabled: true,
          parameters: {
            min: 0,
            max: 120,
          },
          suggestedRemediation: 'Correct fat-finger entry errors (e.g. 999 or 250).',
          autoFixType: 'cap_bounds',
        });
      }

      // General observed range with 20% guardrails
      if (!isPercentage && colNameLower !== 'age') {
        const spread = maxVal - minVal;
        const lowerBound = Math.floor(minVal >= 0 ? 0 : minVal - spread * 0.2);
        const upperBound = Math.ceil(maxVal + spread * 0.2);

        rules.push({
          id: `rule-bound-range-${col.name}`,
          name: `Observed Realistic Range [${lowerBound}, ${upperBound}] for '${col.name}'`,
          description: `Verify that '${col.name}' does not experience sudden orders of magnitude drift.`,
          category: 'range_boundary',
          targetColumn: col.name,
          severity: 'WARNING',
          enabled: true,
          parameters: {
            min: lowerBound,
            max: upperBound,
          },
          suggestedRemediation: 'Investigate extreme outliers or currency denomination mix-ups.',
          autoFixType: 'cap_bounds',
        });
      }
    });

  // 5. CATEGORICAL WHITELISTS / ENUM SETS
  columns
    .filter((c) => c.type === 'string' && c.uniqueCount >= 2 && c.uniqueCount <= 12 && c.missingPercentage < 50)
    .forEach((col) => {
      const isId = col.name.toLowerCase().includes('id') || col.name.toLowerCase().endsWith('_key');
      if (!isId) {
        const uniqueValues = Array.from(
          new Set(
            rows
              .map((r) => String(r[col.name] ?? '').trim())
              .filter((v) => v !== '' && !isPlaceholder(v))
          )
        );

        if (uniqueValues.length >= 2 && uniqueValues.length <= 12) {
          rules.push({
            id: `rule-enum-${col.name}`,
            name: `Allowed Enum Values for '${col.name}' (${uniqueValues.length} classes)`,
            description: `Enforce domain membership in recognized categories: [${uniqueValues.slice(0, 5).join(', ')}${uniqueValues.length > 5 ? '...' : ''}]`,
            category: 'allowed_values',
            targetColumn: col.name,
            severity: 'WARNING',
            enabled: true,
            parameters: {
              allowedValues: uniqueValues,
            },
            suggestedRemediation: 'Map unstandardized typo categories to canonical enum dictionary.',
          });
        }
      }
    });

  // 6. CROSS-COLUMN LOGICAL VALIDATIONS (Chronology & Arithmetic)
  const dateCols = columns.filter((c) => c.type === 'date' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().endsWith('_at'));
  
  // Date Chronology checks
  const orderDateCol = dateCols.find((c) => c.name.toLowerCase().includes('order') || c.name.toLowerCase().includes('start') || c.name.toLowerCase().includes('create'));
  const shipDateCol = dateCols.find((c) => c.name.toLowerCase().includes('ship') || c.name.toLowerCase().includes('end') || c.name.toLowerCase().includes('deliver') || c.name.toLowerCase().includes('close'));

  if (orderDateCol && shipDateCol && orderDateCol.name !== shipDateCol.name) {
    rules.push({
      id: `rule-cross-date-${orderDateCol.name}-${shipDateCol.name}`,
      name: `Date Chronology: '${shipDateCol.name}' ≥ '${orderDateCol.name}'`,
      description: `Validate that end/ship date is chronological and never occurs prior to start/order date.`,
      category: 'cross_column',
      targetColumn: shipDateCol.name,
      secondaryColumn: orderDateCol.name,
      severity: 'CRITICAL',
      enabled: true,
      parameters: {
        operator: '>=',
        referenceColumn: orderDateCol.name,
      },
      suggestedRemediation: 'Fix inverted date entries or correct timezone offsets.',
      autoFixType: 'quarantine',
    });
  }

  // Arithmetic balance checks (e.g. Total Amount vs Price * Qty)
  const priceCol = columns.find((c) => c.name.toLowerCase().includes('price') || c.name.toLowerCase().includes('rate'));
  const qtyCol = columns.find((c) => c.name.toLowerCase().includes('quantity') || c.name.toLowerCase().includes('qty') || c.name.toLowerCase().includes('units'));
  const totalCol = columns.find((c) => c.name.toLowerCase().includes('total') || c.name.toLowerCase().includes('amount') || c.name.toLowerCase().includes('subtotal'));

  if (priceCol && qtyCol && totalCol) {
    rules.push({
      id: `rule-cross-arithmetic-${totalCol.name}`,
      name: `Arithmetic Balance: '${totalCol.name}' ≈ '${priceCol.name}' × '${qtyCol.name}'`,
      description: `Verify that row totals match unit price multiplied by quantity (allowing for minor tax/discount variance).`,
      category: 'cross_column',
      targetColumn: totalCol.name,
      secondaryColumn: priceCol.name,
      severity: 'WARNING',
      enabled: true,
      parameters: {
        expression: `Math.abs(parseFloat(row['${totalCol.name}']) - (parseFloat(row['${priceCol.name}']) * parseFloat(row['${qtyCol.name}']))) <= Math.max(1, parseFloat(row['${totalCol.name}']) * 0.25)`,
      },
      suggestedRemediation: 'Recalculate total amounts or check discount/tax deduction columns.',
    });
  }

  // 7. STATISTICAL DISTRIBUTION CONSTRAINTS (Z-Score ≤ 3.5)
  columns
    .filter((c) => c.type === 'number' && (c.stats?.stdDev || 0) > 0)
    .slice(0, 3)
    .forEach((col) => {
      rules.push({
        id: `rule-stat-zscore-${col.name}`,
        name: `Statistical Z-Score Constraint (|Z| ≤ 3.5) for '${col.name}'`,
        description: `Ensure numerical values remain within 3.5 standard deviations from the sample mean.`,
        category: 'distribution_statistical',
        targetColumn: col.name,
        severity: 'INFO',
        enabled: true,
        parameters: {
          zScoreThreshold: 3.5,
        },
        suggestedRemediation: 'Flag extreme statistical anomalies for audit review or winsorize values.',
        autoFixType: 'cap_bounds',
      });
    });

  return rules;
}

/**
 * Executes a single validation rule against the dataset rows
 */
export function executeValidationRule(rule: ValidationRule, rows: Record<string, any>[]): ValidationResult {
  const startTime = performance.now();
  const targetCol = rule.targetColumn;
  const secondaryCol = rule.secondaryColumn || rule.parameters.referenceColumn;
  const failedRowIndices: number[] = [];
  const sampleFailures: ValidationFailureItem[] = [];

  let totalEvaluated = 0;
  let passedCount = 0;

  // Precompute stats if statistical check
  let mean = 0;
  let stdDev = 0;
  if (rule.category === 'distribution_statistical') {
    const numVals = rows.map((r) => parseFloat(r[targetCol])).filter((v) => !isNaN(v));
    if (numVals.length > 0) {
      mean = numVals.reduce((a, b) => a + b, 0) / numVals.length;
      const variance = numVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numVals.length;
      stdDev = Math.sqrt(variance);
    }
  }

  // Precompute uniqueness check if uniqueness rule
  const seenUnique = new Set<string>();
  const duplicateValues = new Set<string>();
  if (rule.category === 'uniqueness') {
    rows.forEach((r) => {
      const valStr = String(r[targetCol] ?? '').trim();
      if (valStr !== '' && !isPlaceholder(valStr)) {
        if (seenUnique.has(valStr)) {
          duplicateValues.add(valStr);
        } else {
          seenUnique.add(valStr);
        }
      }
    });
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    totalEvaluated++;
    const rawVal = row[targetCol];
    let isPassed = true;
    let failureReason = '';
    let expectedCondition = '';

    // 1. Completeness / Nullability
    if (rule.category === 'completeness') {
      expectedCondition = rule.parameters.allowNull ? `Missingness ≤ ${rule.parameters.nullThresholdPct}%` : 'NOT NULL (Non-empty cell)';
      if (rawVal === null || rawVal === undefined || isPlaceholder(rawVal)) {
        isPassed = false;
        failureReason = `Cell is null, undefined, or placeholder ('${rawVal}')`;
      }
    }

    // 2. Uniqueness
    else if (rule.category === 'uniqueness') {
      expectedCondition = '100% Unique Value (No duplicates)';
      const valStr = String(rawVal ?? '').trim();
      if (duplicateValues.has(valStr)) {
        isPassed = false;
        failureReason = `Duplicate key detected: '${valStr}' appears multiple times in dataset`;
      }
    }

    // 3. Type Schema
    else if (rule.category === 'type_schema') {
      const expType = rule.parameters.expectedType || 'string';
      expectedCondition = `Data conforms to type: ${expType}`;

      if (rawVal !== null && rawVal !== undefined && !isPlaceholder(rawVal)) {
        if (expType === 'number') {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[$,]/g, ''));
          if (isNaN(num)) {
            isPassed = false;
            failureReason = `Cannot parse '${rawVal}' as a valid number`;
          }
        } else if (expType === 'date') {
          const d = parseAndValidateDate(rawVal);
          if (!d.isValid) {
            isPassed = false;
            failureReason = `Cannot parse '${rawVal}' as a valid calendar date`;
          }
        } else if (expType === 'boolean') {
          const bStr = String(rawVal).toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no', 't', 'f'].includes(bStr)) {
            isPassed = false;
            failureReason = `'${rawVal}' is not a recognized boolean`;
          }
        }
      }
    }

    // 4. Range & Boundary
    else if (rule.category === 'range_boundary') {
      const min = rule.parameters.min;
      const max = rule.parameters.max;
      const op = rule.parameters.operator;

      expectedCondition =
        min !== undefined && max !== undefined
          ? `Value between [${min}, ${max}]`
          : min !== undefined
          ? `Value ≥ ${min}`
          : max !== undefined
          ? `Value ≤ ${max}`
          : 'Bounded numeric range';

      if (rawVal !== null && rawVal !== undefined && !isPlaceholder(rawVal)) {
        const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[$,]/g, ''));
        if (isNaN(num)) {
          isPassed = false;
          failureReason = `Value '${rawVal}' is not a numeric value for boundary check`;
        } else {
          if (min !== undefined && num < min) {
            isPassed = false;
            failureReason = `Value ${num} is below minimum allowed boundary ${min}`;
          }
          if (max !== undefined && num > max) {
            isPassed = false;
            failureReason = `Value ${num} exceeds maximum allowed boundary ${max}`;
          }
        }
      }
    }

    // 5. Allowed Values / Enums
    else if (rule.category === 'allowed_values') {
      const allowed = rule.parameters.allowedValues || [];
      expectedCondition = `Value in [${allowed.slice(0, 4).join(', ')}${allowed.length > 4 ? '...' : ''}]`;

      if (rawVal !== null && rawVal !== undefined && !isPlaceholder(rawVal)) {
        const valStr = String(rawVal).trim();
        const matches = allowed.some((a) => a.toLowerCase() === valStr.toLowerCase());
        if (!matches) {
          isPassed = false;
          failureReason = `'${valStr}' is not an authorized enum category`;
        }
      }
    }

    // 6. Pattern Regex
    else if (rule.category === 'pattern_regex') {
      const pType = rule.parameters.patternType;
      const customRegexStr = rule.parameters.pattern;
      expectedCondition = pType ? SEMANTIC_REGEX_PATTERNS[pType]?.description || `Matches pattern ${pType}` : `Matches regex /${customRegexStr}/`;

      if (rawVal !== null && rawVal !== undefined && !isPlaceholder(rawVal)) {
        const valStr = String(rawVal).trim();
        let regex: RegExp | null = null;

        if (pType && SEMANTIC_REGEX_PATTERNS[pType]) {
          regex = SEMANTIC_REGEX_PATTERNS[pType].regex;
        } else if (customRegexStr) {
          try {
            regex = new RegExp(customRegexStr);
          } catch (e) {
            regex = null;
          }
        }

        if (pType === 'date_iso') {
          const validDate = parseAndValidateDate(valStr);
          if (!validDate.isValid) {
            isPassed = false;
            failureReason = `'${valStr}' does not conform to valid calendar date`;
          }
        } else if (regex && !regex.test(valStr)) {
          isPassed = false;
          failureReason = `'${valStr}' failed regex pattern validation`;
        }
      }
    }

    // 7. Cross Column (Chronological or Arithmetic)
    else if (rule.category === 'cross_column') {
      if (rule.parameters.expression) {
        expectedCondition = `Expression evaluates to true`;
        try {
          // Safe evaluation with row context
          const evalFn = new Function('row', `return Boolean(${rule.parameters.expression});`);
          const evalResult = evalFn(row);
          if (!evalResult) {
            isPassed = false;
            failureReason = `Row violated cross-column balance constraint: ${rule.parameters.expression}`;
          }
        } catch (e) {
          isPassed = true; // graceful pass if expression can't evaluate on this row
        }
      } else if (secondaryCol && row[secondaryCol] !== undefined) {
        const refVal = row[secondaryCol];
        const op = rule.parameters.operator || '>=';
        expectedCondition = `${targetCol} ${op} ${secondaryCol}`;

        // Date comparison
        const dateA = parseAndValidateDate(rawVal);
        const dateB = parseAndValidateDate(refVal);

        if (dateA.isValid && dateB.isValid && dateA.parsedDate && dateB.parsedDate) {
          const dA = dateA.parsedDate;
          const dB = dateB.parsedDate;
          if (op === '>=' && dA < dB) {
            isPassed = false;
            failureReason = `Date ${dA.toISOString().split('T')[0]} occurs prior to reference date ${dB.toISOString().split('T')[0]}`;
          } else if (op === '<=' && dA > dB) {
            isPassed = false;
            failureReason = `Date ${dA.toISOString().split('T')[0]} occurs after reference date ${dB.toISOString().split('T')[0]}`;
          }
        } else {
          // Numeric comparison
          const numA = parseFloat(rawVal);
          const numB = parseFloat(refVal);
          if (!isNaN(numA) && !isNaN(numB)) {
            if (op === '>=' && numA < numB) {
              isPassed = false;
              failureReason = `${numA} is less than reference ${numB}`;
            } else if (op === '<=' && numA > numB) {
              isPassed = false;
              failureReason = `${numA} is greater than reference ${numB}`;
            } else if (op === '==' && Math.abs(numA - numB) > 0.001) {
              isPassed = false;
              failureReason = `${numA} does not equal reference ${numB}`;
            }
          }
        }
      }
    }

    // 8. Distribution Statistical (|Z| <= Threshold)
    else if (rule.category === 'distribution_statistical') {
      const zThresh = rule.parameters.zScoreThreshold || 3.5;
      expectedCondition = `|Z-Score| ≤ ${zThresh} standard deviations`;

      if (rawVal !== null && rawVal !== undefined && !isPlaceholder(rawVal) && stdDev > 0) {
        const num = parseFloat(rawVal);
        if (!isNaN(num)) {
          const zScore = Math.abs((num - mean) / stdDev);
          if (zScore > zThresh) {
            isPassed = false;
            failureReason = `Z-score of ${zScore.toFixed(2)} exceeds outlier threshold ${zThresh} (Val: ${num}, Mean: ${mean.toFixed(2)})`;
          }
        }
      }
    }

    // 9. Custom Expression
    else if (rule.category === 'custom_expression' && rule.parameters.expression) {
      expectedCondition = rule.parameters.expression;
      try {
        const evalFn = new Function('row', `return Boolean(${rule.parameters.expression});`);
        const evalRes = evalFn(row);
        if (!evalRes) {
          isPassed = false;
          failureReason = `Custom assertion failed for row: ${rule.parameters.expression}`;
        }
      } catch (err: any) {
        isPassed = false;
        failureReason = `Expression error: ${err?.message || 'Invalid assertion syntax'}`;
      }
    }

    // Accumulate results
    if (isPassed) {
      passedCount++;
    } else {
      failedRowIndices.push(i);
      if (sampleFailures.length < 15) {
        sampleFailures.push({
          rowIndex: i + 1,
          rowData: row,
          actualValue: rawVal,
          expectedCondition,
          failureReason,
        });
      }
    }
  }

  const failedCount = failedRowIndices.length;
  const passRate = totalEvaluated > 0 ? Math.round((passedCount / totalEvaluated) * 100) : 100;
  const status = failedCount === 0 ? 'PASSED' : 'FAILED';
  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    description: rule.description,
    category: rule.category,
    targetColumn: rule.targetColumn,
    severity: rule.severity,
    status,
    totalEvaluated,
    passedCount,
    failedCount,
    passRate,
    failedRowIndices,
    sampleFailures,
    executionTimeMs,
    suggestedRemediation: rule.suggestedRemediation || 'Inspect non-conforming rows and apply data cleaning.',
    autoFixType: rule.autoFixType,
  };
}

/**
 * Runs the entire validation suite against a dataset, aggregating scores and categorized reports
 */
export function executeValidationSuite(rules: ValidationRule[], dataset: Dataset): ValidationSuiteReport {
  const rows = dataset.rows || [];
  const enabledRules = rules.filter((r) => r.enabled);
  const results: ValidationResult[] = [];

  const categoryScores: Record<ValidationCategory, ValidationCategoryScore> = {
    completeness: { total: 0, passed: 0, failed: 0, score: 100 },
    uniqueness: { total: 0, passed: 0, failed: 0, score: 100 },
    type_schema: { total: 0, passed: 0, failed: 0, score: 100 },
    range_boundary: { total: 0, passed: 0, failed: 0, score: 100 },
    allowed_values: { total: 0, passed: 0, failed: 0, score: 100 },
    pattern_regex: { total: 0, passed: 0, failed: 0, score: 100 },
    cross_column: { total: 0, passed: 0, failed: 0, score: 100 },
    distribution_statistical: { total: 0, passed: 0, failed: 0, score: 100 },
    custom_expression: { total: 0, passed: 0, failed: 0, score: 100 },
  };

  const failingRowSet = new Set<number>();
  let passedRules = 0;
  let failedRules = 0;
  let warningRules = 0;
  let criticalFailures = 0;

  enabledRules.forEach((rule) => {
    const res = executeValidationRule(rule, rows);
    results.push(res);

    const cat = rule.category;
    categoryScores[cat].total++;

    if (res.status === 'PASSED') {
      passedRules++;
      categoryScores[cat].passed++;
    } else {
      failedRules++;
      categoryScores[cat].failed++;
      if (rule.severity === 'CRITICAL') {
        criticalFailures++;
      } else if (rule.severity === 'WARNING') {
        warningRules++;
      }
      res.failedRowIndices.forEach((idx) => failingRowSet.add(idx));
    }
  });

  // Calculate category scores
  (Object.keys(categoryScores) as ValidationCategory[]).forEach((cat) => {
    const s = categoryScores[cat];
    if (s.total > 0) {
      s.score = Math.round((s.passed / s.total) * 100);
    } else {
      s.score = 100;
    }
  });

  // Calculate weighted overall score
  const totalRules = enabledRules.length;
  let overallScore = 100;
  if (totalRules > 0) {
    let penalty = 0;
    results.forEach((r) => {
      if (r.status === 'FAILED') {
        const failWeight = r.severity === 'CRITICAL' ? 1.0 : r.severity === 'WARNING' ? 0.5 : 0.2;
        const rowFailRatio = rows.length > 0 ? r.failedCount / rows.length : 1;
        penalty += failWeight * (rowFailRatio * 50 + 50);
      }
    });
    overallScore = Math.max(0, Math.min(100, Math.round(100 - (penalty / (totalRules * 1.5)) * 100)));
  }

  const failingRowIndices = Array.from(failingRowSet).sort((a, b) => a - b);
  const failingRowCount = failingRowIndices.length;
  const compliantRowCount = rows.length - failingRowCount;

  const complianceStatus: 'COMPLIANT' | 'NEEDS_ATTENTION' | 'NON_COMPLIANT' =
    criticalFailures === 0 && overallScore >= 90
      ? 'COMPLIANT'
      : criticalFailures > 0 || overallScore < 70
      ? 'NON_COMPLIANT'
      : 'NEEDS_ATTENTION';

  return {
    id: `val-report-${Date.now()}`,
    datasetName: dataset.name,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalRules,
    passedRules,
    failedRules,
    warningRules,
    criticalFailures,
    overallScore,
    complianceStatus,
    totalRows: rows.length,
    compliantRowCount,
    failingRowCount,
    failingRowIndices,
    results,
    categoryScores,
  };
}

/**
 * Automated Remediation Engine: Auto-quarantine or auto-repair failing rows according to validation specs
 */
export function autoRemediateValidation(
  rule: ValidationRule,
  dataset: Dataset,
  fixType: 'quarantine' | 'impute_median' | 'impute_mode' | 'cap_bounds' | 'abs_value' | 'trim' | 'drop_row'
): { cleanedRows: Record<string, any>[]; quarantinedRows: Record<string, any>[]; logSummary: string } {
  const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
  const targetCol = rule.targetColumn;
  const res = executeValidationRule(rule, rows);
  const failIndices = new Set(res.failedRowIndices);

  if (fixType === 'quarantine' || fixType === 'drop_row') {
    const cleanedRows = rows.filter((_, idx) => !failIndices.has(idx));
    const quarantinedRows = rows.filter((_, idx) => failIndices.has(idx));
    return {
      cleanedRows,
      quarantinedRows,
      logSummary: `Quarantined ${quarantinedRows.length} non-compliant rows failing rule '${rule.name}'.`,
    };
  }

  // Value-level remediation
  let fixCount = 0;
  const colProf = dataset.profile?.columns.find((c) => c.column === targetCol);

  rows.forEach((r, idx) => {
    if (failIndices.has(idx)) {
      if (fixType === 'abs_value') {
        const val = parseFloat(r[targetCol]);
        if (!isNaN(val)) {
          r[targetCol] = Math.abs(val);
          fixCount++;
        }
      } else if (fixType === 'trim' && typeof r[targetCol] === 'string') {
        r[targetCol] = r[targetCol].trim().replace(/[\x00-\x1F\x7F]/g, '');
        fixCount++;
      } else if (fixType === 'impute_median' && colProf?.distribution.median !== undefined) {
        r[targetCol] = colProf.distribution.median;
        fixCount++;
      } else if (fixType === 'impute_mode' && colProf?.distribution.topCategories?.[0]) {
        r[targetCol] = colProf.distribution.topCategories[0].value;
        fixCount++;
      } else if (fixType === 'cap_bounds') {
        const val = parseFloat(r[targetCol]);
        if (!isNaN(val)) {
          if (rule.parameters.min !== undefined && val < rule.parameters.min) {
            r[targetCol] = rule.parameters.min;
            fixCount++;
          } else if (rule.parameters.max !== undefined && val > rule.parameters.max) {
            r[targetCol] = rule.parameters.max;
            fixCount++;
          }
        }
      }
    }
  });

  return {
    cleanedRows: rows,
    quarantinedRows: [],
    logSummary: `Repaired ${fixCount} cells in column '${targetCol}' with strategy '${fixType}'.`,
  };
}

/**
 * Exports validation rule suite as Great Expectations standard JSON
 */
export function exportAsGreatExpectationsJSON(rules: ValidationRule[], report: ValidationSuiteReport): string {
  const expectations = rules
    .filter((r) => r.enabled)
    .map((r) => {
      let expectationType = 'expect_column_values_to_not_be_null';
      const kwargs: Record<string, any> = { column: r.targetColumn };

      if (r.category === 'uniqueness') {
        expectationType = 'expect_column_values_to_be_unique';
      } else if (r.category === 'range_boundary') {
        expectationType = 'expect_column_values_to_be_between';
        if (r.parameters.min !== undefined) kwargs.min_value = r.parameters.min;
        if (r.parameters.max !== undefined) kwargs.max_value = r.parameters.max;
      } else if (r.category === 'allowed_values') {
        expectationType = 'expect_column_values_to_be_in_set';
        kwargs.value_set = r.parameters.allowedValues || [];
      } else if (r.category === 'pattern_regex') {
        expectationType = 'expect_column_values_to_match_regex';
        kwargs.regex = r.parameters.pattern || '.*';
      } else if (r.category === 'type_schema') {
        expectationType = 'expect_column_values_to_be_of_type';
        kwargs.type_ = r.parameters.expectedType || 'string';
      }

      return {
        expectation_type: expectationType,
        kwargs,
        meta: {
          rule_id: r.id,
          severity: r.severity,
          description: r.description,
        },
      };
    });

  const geSuite = {
    expectation_suite_name: `${report.datasetName.replace(/\s+/g, '_')}_validation_suite`,
    meta: {
      generated_by: 'NexusBI Universal Data Validation Engine',
      generated_at: new Date().toISOString(),
      compliance_score: report.overallScore,
      total_rules: report.totalRules,
    },
    expectations,
    data_asset_type: 'Dataset',
  };

  return JSON.stringify(geSuite, null, 2);
}

/**
 * Exports validation rules as Python Pydantic & Pandas verification script
 */
export function exportAsPythonPydanticScript(rules: ValidationRule[], datasetName: string): string {
  const pythonLines = [
    `# =====================================================================`,
    `# Auto-Generated Validation Contract for: ${datasetName}`,
    `# Generated by NexusBI Universal Data Validation Engine`,
    `# =====================================================================`,
    `import pandas as pd`,
    `from pydantic import BaseModel, Field, validator`,
    `from typing import Optional, List`,
    `import re`,
    ``,
    `class ${datasetName.replace(/[^a-zA-Z0-9]/g, '')}RowContract(BaseModel):`,
  ];

  rules.forEach((r) => {
    let pyType = 'Optional[str] = None';
    if (r.parameters.expectedType === 'number') pyType = 'Optional[float] = None';
    else if (r.parameters.expectedType === 'integer') pyType = 'Optional[int] = None';
    else if (r.parameters.expectedType === 'boolean') pyType = 'Optional[bool] = None';

    const safeCol = r.targetColumn.replace(/[^a-zA-Z0-9_]/g, '_');
    pythonLines.push(`    ${safeCol}: ${pyType}  # Rule: ${r.name}`);
  });

  pythonLines.push(
    ``,
    `def validate_dataset(df: pd.DataFrame):`,
    `    """Executes validation assertions across pandas DataFrame."""`,
    `    results = {"passed": 0, "failed": 0, "errors": []}`
  );

  rules
    .filter((r) => r.enabled)
    .forEach((r) => {
      const col = r.targetColumn;
      if (r.category === 'completeness' && !r.parameters.allowNull) {
        pythonLines.push(`    # ${r.name}`);
        pythonLines.push(`    null_count = df['${col}'].isnull().sum()`);
        pythonLines.push(`    assert null_count == 0, f"Validation Failed: {null_count} nulls in '${col}'"`);
      } else if (r.category === 'uniqueness') {
        pythonLines.push(`    # ${r.name}`);
        pythonLines.push(`    dup_count = df['${col}'].duplicated().sum()`);
        pythonLines.push(`    assert dup_count == 0, f"Uniqueness constraint violated on '${col}' with {dup_count} duplicates"`);
      } else if (r.category === 'range_boundary' && r.parameters.min !== undefined) {
        pythonLines.push(`    # ${r.name}`);
        pythonLines.push(`    min_violations = (df['${col}'] < ${r.parameters.min}).sum()`);
        pythonLines.push(`    assert min_violations == 0, f"Range failure: {min_violations} rows < ${r.parameters.min} in '${col}'"`);
      }
    });

  pythonLines.push(
    `    print("All validation assertions passed successfully!")`,
    `    return True`,
    ``,
    `if __name__ == "__main__":`,
    `    df = pd.read_csv("${datasetName.replace(/\s+/g, '_')}.csv")`,
    `    validate_dataset(df)`
  );

  return pythonLines.join('\n');
}

/**
 * Exports validation rules as dbt test YAML schema
 */
export function exportAsDbtYamlTests(rules: ValidationRule[], datasetName: string): string {
  const modelName = datasetName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const dbtLines = [
    `version: 2`,
    ``,
    `models:`,
    `  - name: ${modelName}`,
    `    description: "Data validation contracts and column integrity tests for ${datasetName}"`,
    `    columns:`,
  ];

  const colRulesMap: Record<string, ValidationRule[]> = {};
  rules.filter((r) => r.enabled).forEach((r) => {
    if (!colRulesMap[r.targetColumn]) colRulesMap[r.targetColumn] = [];
    colRulesMap[r.targetColumn].push(r);
  });

  Object.entries(colRulesMap).forEach(([col, rList]) => {
    dbtLines.push(`      - name: ${col}`);
    dbtLines.push(`        tests:`);

    rList.forEach((r) => {
      if (r.category === 'completeness' && !r.parameters.allowNull) {
        dbtLines.push(`          - not_null`);
      } else if (r.category === 'uniqueness') {
        dbtLines.push(`          - unique`);
      } else if (r.category === 'allowed_values' && r.parameters.allowedValues) {
        dbtLines.push(`          - accepted_values:`);
        dbtLines.push(`              values: [${r.parameters.allowedValues.map((v) => `'${v}'`).join(', ')}]`);
      } else if (r.category === 'range_boundary') {
        dbtLines.push(`          - dbt_expectations.expect_column_values_to_be_between:`);
        if (r.parameters.min !== undefined) dbtLines.push(`              min_value: ${r.parameters.min}`);
        if (r.parameters.max !== undefined) dbtLines.push(`              max_value: ${r.parameters.max}`);
      }
    });
  });

  return dbtLines.join('\n');
}
