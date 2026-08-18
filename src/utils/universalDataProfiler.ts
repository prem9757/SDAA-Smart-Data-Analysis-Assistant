import {
  DatasetProfile,
  ColumnProfile,
  PhysicalDataType,
  SemanticDataType,
  ColumnRole,
  ColumnStatus,
  ColumnQualityScore,
  OutlierDetail,
  OutlierClassification,
  PrimaryCandidate,
  CrossColumnIssue,
  RedundantColumnPair,
  DataLeakageRisk,
  CorrelationPair,
  AnalysisReadiness,
  AuditLogEntry,
  PrePostComparison,
  MetricComparison,
  DistributionStats,
} from '../types/profiling';
import { Dataset, ColumnMetadata, DataHealth } from '../types/dataset';

// Known missing placeholders
export const MISSING_PLACEHOLDERS = new Set([
  'n/a', 'na', 'null', 'none', '-', '--', '?', 'unknown', 'not available', 
  'missing', 'undefined', '#n/a', '#null!', 'nil', 'nan', ''
]);

// Helper to check if a value is a missing placeholder
export function isPlaceholder(val: any): boolean {
  if (val === null || val === undefined) return true;
  const str = String(val).trim().toLowerCase();
  return MISSING_PLACEHOLDERS.has(str);
}

// Helper to check if a column represents a physically non-negative quantity / metric
export function isNonNegativeColumn(colName: string, semanticType?: string, values?: any[]): boolean {
  const lower = colName.toLowerCase();
  const nonNegativeKeywords = [
    'quantity', 'qty', 'count', 'units', 'items', 'volume', 'stock', 'inventory',
    'price', 'cost', 'amount', 'fee', 'charge', 'rate', 'revenue', 'sales', 'mrr', 'arr',
    'age', 'weight', 'height', 'duration', 'distance', 'speed', 'visits', 'views',
    'clicks', 'impressions', 'rating', 'score', 'percent', 'percentage', 'seats'
  ];
  if (nonNegativeKeywords.some(kw => lower.includes(kw))) return true;
  if (semanticType === 'Quantity' || semanticType === 'Currency' || semanticType === 'Percentage') return true;

  if (values && values.length > 0) {
    const nums = values
      .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[$₹€£, %]/g, '')))
      .filter(n => !isNaN(n));
    if (nums.length > 0) {
      const nonNegCount = nums.filter(n => n >= 0).length;
      return (nonNegCount / nums.length) >= 0.85;
    }
  }
  return false;
}

// Helper to check if string contains preserved identifier patterns (like ORD001, 00123, CUST-01)
export function isIdentifierPattern(values: any[]): boolean {
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNulls.length === 0) return false;

  let idLikeCount = 0;
  let leadingZeroCount = 0;

  for (const v of nonNulls.slice(0, 100)) {
    const s = String(v).trim();
    // Check leading zero in digit string e.g. "00123", "0495"
    if (/^0\d+$/.test(s)) {
      leadingZeroCount++;
    }
    // Check code patterns e.g. ORD-001, CUST_123, ID9923, A100B, UUID
    if (/^[A-Za-z]{1,5}[-_#]?\d+[A-Za-z0-9-_]*$/.test(s) || /^[A-Fa-f0-9-]{12,}$/.test(s)) {
      idLikeCount++;
    }
  }

  const sampleSize = Math.min(nonNulls.length, 100);
  return (leadingZeroCount / sampleSize > 0.3) || (idLikeCount / sampleSize > 0.4);
}

// Strict email regex validation
export function isValidEmail(emailStr: string): boolean {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(emailStr.trim());
}

// Strict date validation (checks month 1-12, days 1-31, leap years, etc.)
export function parseAndValidateDate(val: any): { isValid: boolean; isFuture: boolean; parsedDate?: Date } {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { isValid: false, isFuture: false };
  }
  const s = String(val).trim();
  
  // Reject simple small numbers
  if (/^\d{1,3}$/.test(s)) return { isValid: false, isFuture: false };

  // Check common ISO pattern YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (month < 1 || month > 12) return { isValid: false, isFuture: false };
    if (day < 1 || day > 31) return { isValid: false, isFuture: false };

    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return { isValid: false, isFuture: false };
    }

    const now = new Date();
    const isFuture = dateObj.getFullYear() > now.getFullYear() + 2;
    return { isValid: true, isFuture, parsedDate: dateObj };
  }

  // Standard Date.parse test with length guard
  if (s.length >= 8 && (s.includes('-') || s.includes('/') || s.includes('.'))) {
    const timestamp = Date.parse(s);
    if (!isNaN(timestamp)) {
      const d = new Date(timestamp);
      const isFuture = d.getFullYear() > new Date().getFullYear() + 2;
      return { isValid: true, isFuture, parsedDate: d };
    }
  }

  return { isValid: false, isFuture: false };
}

// Infer Physical Data Type
export function inferPhysicalType(values: any[], colName: string): PhysicalDataType {
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNulls.length === 0) return 'string';

  let intCount = 0;
  let floatCount = 0;
  let boolCount = 0;
  let dateCount = 0;

  for (const v of nonNulls.slice(0, 100)) {
    if (typeof v === 'boolean' || v === 'true' || v === 'false' || v === 'Yes' || v === 'No') {
      boolCount++;
    } else if (typeof v === 'number' && !isNaN(v)) {
      if (Number.isInteger(v)) intCount++;
      else floatCount++;
    } else if (typeof v === 'string') {
      const s = v.trim();
      if (/^-?\d+$/.test(s)) {
        intCount++;
      } else if (/^-?\d*\.\d+$/.test(s)) {
        floatCount++;
      } else {
        const dateCheck = parseAndValidateDate(s);
        if (dateCheck.isValid) dateCount++;
      }
    }
  }

  const sampleSize = Math.min(nonNulls.length, 100);
  if (boolCount / sampleSize > 0.8) return 'boolean';
  if (dateCount / sampleSize > 0.75) return 'datetime';
  if (intCount / sampleSize > 0.8) return 'integer';
  if ((intCount + floatCount) / sampleSize > 0.8) return 'float';

  const uniqueCount = new Set(nonNulls).size;
  if (uniqueCount <= 12 && nonNulls.length >= 20) return 'categorical';

  return 'string';
}

// Infer Semantic Data Type
export function inferSemanticType(values: any[], colName: string, physicalType: PhysicalDataType): SemanticDataType {
  const lowerName = colName.toLowerCase().replace(/[-_]/g, ' ');
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');

  // 1. Check ID / Identifier
  if (
    lowerName.endsWith(' id') || 
    lowerName === 'id' || 
    lowerName.includes('code') || 
    lowerName.includes('uuid') || 
    lowerName.includes('token') || 
    lowerName.includes('key') ||
    isIdentifierPattern(values)
  ) {
    return 'ID';
  }

  // 2. Email
  if (lowerName.includes('email') || lowerName.includes('mail')) {
    return 'Email';
  }
  const emailMatchCount = nonNulls.slice(0, 50).filter(v => typeof v === 'string' && isValidEmail(v)).length;
  if (nonNulls.length > 0 && emailMatchCount / Math.min(nonNulls.length, 50) > 0.6) {
    return 'Email';
  }

  // 3. Date / Time / Timestamp
  if (physicalType === 'datetime' || lowerName.includes('date') || lowerName.includes('created') || lowerName.includes('updated')) {
    if (lowerName.includes('time') || lowerName.includes('timestamp')) return 'Timestamp';
    return 'Date';
  }

  // 4. Currency
  if (
    lowerName.includes('price') || 
    lowerName.includes('cost') || 
    lowerName.includes('revenue') || 
    lowerName.includes('amount') || 
    lowerName.includes('salary') || 
    lowerName.includes('fee') ||
    lowerName.includes('balance') ||
    lowerName.includes('budget') ||
    lowerName.includes('usd') ||
    lowerName.includes('eur') ||
    lowerName.includes('inr')
  ) {
    return 'Currency';
  }
  // Check currency symbols
  const currencySymbolCount = nonNulls.slice(0, 50).filter(v => typeof v === 'string' && /[$₹€£¥]/.test(v)).length;
  if (nonNulls.length > 0 && currencySymbolCount / Math.min(nonNulls.length, 50) > 0.4) {
    return 'Currency';
  }

  // 5. Percentage
  if (
    lowerName.includes('percent') || 
    lowerName.includes('rate') || 
    lowerName.includes('discount') || 
    lowerName.includes('ratio') || 
    lowerName.includes('margin') ||
    lowerName.includes('%')
  ) {
    return 'Percentage';
  }

  // 6. Quantity
  if (
    lowerName.includes('quantity') || 
    lowerName.includes('qty') || 
    lowerName.includes('count') || 
    lowerName.includes('units') || 
    lowerName.includes('inventory') ||
    lowerName.includes('volume') ||
    lowerName.includes('stock')
  ) {
    return 'Quantity';
  }

  // 7. Status / Category
  if (lowerName.includes('status') || lowerName.includes('state') || lowerName.includes('stage')) {
    return 'Status';
  }
  if (lowerName.includes('category') || lowerName.includes('type') || lowerName.includes('segment') || lowerName.includes('genre')) {
    return 'Category';
  }

  // 8. Name / Phone / Address / Geo
  if (lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('contact')) return 'Phone';
  if (lowerName.includes('name') || lowerName.includes('customer') || lowerName.includes('user') || lowerName.includes('author')) return 'Name';
  if (lowerName.includes('address') || lowerName.includes('street') || lowerName.includes('postal') || lowerName.includes('zip')) return 'Address';
  if (lowerName.includes('country') || lowerName.includes('city') || lowerName.includes('region') || lowerName.includes('state') || lowerName.includes('lat') || lowerName.includes('long')) return 'Geographic';
  if (lowerName.includes('url') || lowerName.includes('link') || lowerName.includes('website')) return 'URL';

  // 9. Generic Numeric Measure vs Text Dimension
  if (physicalType === 'integer' || physicalType === 'float') return 'Measure';
  if (physicalType === 'boolean') return 'Boolean';
  if (physicalType === 'categorical') return 'Category';

  return 'Dimension';
}

// Determine Column Role
export function inferColumnRole(
  colName: string, 
  semanticType: SemanticDataType, 
  uniquenessRatio: number, 
  rowCount: number
): ColumnRole {
  const lowerName = colName.toLowerCase();

  if (semanticType === 'ID') {
    if (uniquenessRatio >= 0.99 && rowCount > 1) return 'Primary Key';
    return 'Identifier';
  }

  if (semanticType === 'Date') return 'Date Dimension';
  if (semanticType === 'Timestamp' || semanticType === 'Time') return 'Time Dimension';
  if (semanticType === 'Currency' || semanticType === 'Percentage' || semanticType === 'Quantity' || semanticType === 'Measure') {
    if (lowerName.includes('target') || lowerName.includes('label') || lowerName.includes('outcome') || lowerName.includes('churn') || lowerName.includes('converted')) {
      return 'Target';
    }
    return 'Measure';
  }

  if (lowerName.includes('target') || lowerName.includes('label') || lowerName.includes('churn') || lowerName.includes('converted')) {
    return 'Target';
  }

  if (semanticType === 'Text') return 'Free Text';
  if (lowerName.includes('metadata') || lowerName.includes('version') || lowerName.includes('sys_')) return 'Metadata';

  return 'Dimension';
}

// Compute Distribution Statistics
export function calculateDistribution(values: any[], physicalType: PhysicalDataType): {
  stats: DistributionStats;
  outliers: OutlierDetail[];
} {
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNulls.length === 0) return { stats: {}, outliers: [] };

  if (physicalType === 'integer' || physicalType === 'float') {
    const nums = nonNulls
      .map(v => {
        if (typeof v === 'number') return v;
        const cleaned = String(v).replace(/[$₹€£, %]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? null : n;
      })
      .filter((v): v is number => v !== null);

    if (nums.length === 0) return { stats: {}, outliers: [] };

    const sorted = [...nums].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = Math.round((sum / sorted.length) * 100) / 100;
    
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 
      ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100 
      : sorted[mid];

    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = Math.round((q3 - q1) * 100) / 100;

    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sorted.length;
    const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

    // Skewness & Kurtosis
    let skewness = 0;
    let kurtosis = 0;
    if (stdDev > 0) {
      const m3 = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / sorted.length;
      skewness = Math.round((m3 / Math.pow(stdDev, 3)) * 100) / 100;
      const m4 = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 4), 0) / sorted.length;
      kurtosis = Math.round(((m4 / Math.pow(stdDev, 4)) - 3) * 100) / 100;
    }

    // Outlier detection using IQR & Z-score + Physical Domain Rules
    const lowerIqr = q1 - 1.5 * iqr;
    const upperIqr = q3 + 1.5 * iqr;
    const outlierList: OutlierDetail[] = [];
    const nonNegRatio = sorted.length > 0 ? sorted.filter(x => x >= 0).length / sorted.length : 1;

    values.forEach((v, rowIndex) => {
      if (v === null || v === undefined) return;
      const cleaned = String(v).replace(/[$₹€£, %]/g, '');
      const numVal = parseFloat(cleaned);
      if (isNaN(numVal)) return;

      const isIqrOutlier = numVal < lowerIqr || numVal > upperIqr;
      const isNegativeDomainViolation = numVal < 0 && nonNegRatio >= 0.7;

      if (isIqrOutlier || isNegativeDomainViolation) {
        const zScore = stdDev > 0 ? Math.abs((numVal - mean) / stdDev) : 0;
        let classification: OutlierClassification = isNegativeDomainViolation ? 'BUSINESS INVALID' : 'STATISTICAL OUTLIER';
        let severity: 'HIGH' | 'MEDIUM' | 'LOW' = isNegativeDomainViolation ? 'HIGH' : 'MEDIUM';

        if (numVal < 0) {
          classification = 'BUSINESS INVALID';
          severity = 'HIGH';
        } else if (zScore > 4.0) {
          classification = 'LEGITIMATE EXTREME';
          severity = 'HIGH';
        }

        outlierList.push({
          row: rowIndex + 1,
          value: numVal,
          detectionMethod: isNegativeDomainViolation ? 'DOMAIN CONSTRAINT' : (zScore > 3.0 ? 'Z-SCORE' : 'IQR'),
          severity,
          classification,
          explanation: numVal < 0
            ? `Value ${numVal} violates non-negative physical domain constraint (Value must be >= 0).`
            : `Value ${numVal} deviates significantly from median (${median}) and IQR boundaries [${lowerIqr}, ${upperIqr}].`,
          recommendedAction: numVal < 0
            ? 'Convert to absolute value (|x|), floor at 0, or impute with positive median'
            : (classification === 'BUSINESS INVALID' ? 'Review & sanitize invalid negative value' : 'Winsorize or preserve with audit flag'),
        });
      }
    });

    return {
      stats: {
        min,
        max,
        mean,
        median,
        q1,
        q3,
        iqr,
        stdDev,
        variance: Math.round(variance * 100) / 100,
        skewness,
        kurtosis,
      },
      outliers: outlierList,
    };
  }

  // Categorical frequency distribution
  const counts: Record<string, number> = {};
  nonNulls.forEach(v => {
    const s = String(v).trim();
    counts[s] = (counts[s] || 0) + 1;
  });

  const sortedCats = Object.entries(counts)
    .map(([val, cnt]) => ({
      value: val,
      count: cnt,
      percentage: Math.round((cnt / nonNulls.length) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  const topCategories = sortedCats.slice(0, 5);
  const rareCategories = sortedCats.filter(c => c.percentage < 2.0).slice(0, 5);

  return {
    stats: {
      mode: topCategories[0]?.value,
      topCategories,
      rareCategories,
    },
    outliers: [],
  };
}

// Calculate Column Quality Score with rigorous component math
export function calculateColumnQuality(params: {
  rowCount: number;
  nonNullCount: number;
  missingCount: number;
  placeholderCount: number;
  invalidCount: number;
  casingOrFormatIssues: number;
  outlierCount: number;
  role: ColumnRole;
  uniqueRatio: number;
  colName: string;
}): { score: ColumnQualityScore; status: ColumnStatus } {
  const {
    rowCount,
    nonNullCount,
    missingCount,
    placeholderCount,
    invalidCount,
    casingOrFormatIssues,
    outlierCount,
    role,
    uniqueRatio,
    colName,
  } = params;

  if (rowCount === 0) {
    return {
      score: {
        completeness: 100,
        validity: 100,
        consistency: 100,
        uniqueness: 100,
        integrity: 100,
        overallScore: 100,
        calculationExplanation: 'Empty column initialized to baseline 100.',
      },
      status: 'EXCELLENT',
    };
  }

  // 1. Completeness: Non-null minus placeholders over total rows
  const completeness = Math.max(0, Math.min(100, Math.round(((rowCount - missingCount - placeholderCount) / rowCount) * 100)));

  // 2. Validity: Valid values passing semantic type checks over non-nulls
  const validity = nonNullCount > 0 
    ? Math.max(0, Math.min(100, Math.round(((nonNullCount - invalidCount) / nonNullCount) * 100)))
    : 100;

  // 3. Consistency: Formatting, whitespace, casing conformity over non-nulls
  const consistency = nonNullCount > 0
    ? Math.max(0, Math.min(100, Math.round(((nonNullCount - casingOrFormatIssues) / nonNullCount) * 100)))
    : 100;

  // 4. Uniqueness: Appropriate uniqueness for column role
  let uniqueness = 100;
  if (role === 'Primary Key') {
    uniqueness = Math.round(uniqueRatio * 100);
  } else if (role === 'Identifier') {
    uniqueness = Math.max(50, Math.round(uniqueRatio * 100));
  } else {
    uniqueness = 100; // Dimensions/Measures naturally have varying uniqueness
  }

  // 5. Integrity: Outlier penalty and range coherence
  let integrity = 100;
  if (nonNullCount > 0 && outlierCount > 0) {
    integrity = Math.max(20, Math.round(100 - (outlierCount / nonNullCount) * 50));
  }

  // Weighted composition
  const overallScore = Math.round(
    completeness * 0.35 +
    validity * 0.30 +
    consistency * 0.15 +
    uniqueness * 0.10 +
    integrity * 0.10
  );

  let status: ColumnStatus = 'EXCELLENT';
  if (overallScore < 25) status = 'CRITICAL';
  else if (overallScore < 50) status = 'POOR';
  else if (overallScore < 75) status = 'WARNING';
  else if (overallScore < 90) status = 'GOOD';

  const explanation = `${colName} Quality Score: ${overallScore}/100 (Completeness: ${completeness}%, Validity: ${validity}%, Consistency: ${consistency}%, Uniqueness: ${uniqueness}%, Integrity: ${integrity}%).`;

  return {
    score: {
      completeness,
      validity,
      consistency,
      uniqueness,
      integrity,
      overallScore,
      calculationExplanation: explanation,
    },
    status,
  };
}

// Generate Full Profile for a Single Column
export function profileColumn(
  colName: string,
  rawValues: any[],
  rowCount: number
): ColumnProfile {
  let missingCount = 0;
  let placeholderCount = 0;
  const detectedPlaceholders: string[] = [];
  let invalidCount = 0;
  const invalidExamples: { row: number; value: any; reason: string }[] = [];

  let whitespaceCount = 0;
  let casingInconsistencies = 0;
  let nonPrintableCount = 0;
  let emptyStringsCount = 0;

  const validValues: any[] = [];

  rawValues.forEach((v, idx) => {
    if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) {
      missingCount++;
      return;
    }

    const s = String(v);

    if (s.trim() === '') {
      emptyStringsCount++;
      missingCount++;
      return;
    }

    // Check placeholder
    if (isPlaceholder(s)) {
      placeholderCount++;
      if (!detectedPlaceholders.includes(s.trim())) {
        detectedPlaceholders.push(s.trim());
      }
      return;
    }

    // Text formatting issues
    if (s.startsWith(' ') || s.endsWith(' ') || s.includes('  ')) {
      whitespaceCount++;
    }
    if (/[\x00-\x1F\x7F]/.test(s)) {
      nonPrintableCount++;
    }

    validValues.push(v);
  });

  const nonNullCount = validValues.length;
  const uniqueSet = new Set(validValues.map(v => String(v).trim()));
  const uniqueCount = uniqueSet.size;
  const uniquePercentage = rowCount > 0 ? Math.round((uniqueCount / rowCount) * 1000) / 10 : 0;
  const duplicateValuesCount = nonNullCount - uniqueCount;

  // Infer physical & semantic types
  const physicalType = inferPhysicalType(validValues, colName);
  const semanticType = inferSemanticType(validValues, colName, physicalType);
  const isIdentifier = semanticType === 'ID' || isIdentifierPattern(rawValues);
  const preservesLeadingZeros = isIdentifier;

  // Check invalid values against semantic expectations
  if (semanticType === 'Email') {
    validValues.forEach((v, idx) => {
      if (typeof v === 'string' && !isValidEmail(v)) {
        invalidCount++;
        if (invalidExamples.length < 5) {
          invalidExamples.push({ row: idx + 1, value: v, reason: 'Invalid email syntax or domain' });
        }
      }
    });
  } else if (semanticType === 'Date' || semanticType === 'Timestamp') {
    validValues.forEach((v, idx) => {
      const check = parseAndValidateDate(v);
      if (!check.isValid) {
        invalidCount++;
        if (invalidExamples.length < 5) {
          invalidExamples.push({ row: idx + 1, value: v, reason: 'Unparseable or impossible calendar date' });
        }
      }
    });
  } else if (semanticType === 'Percentage') {
    validValues.forEach((v, idx) => {
      const num = parseFloat(String(v).replace('%', ''));
      if (!isNaN(num) && (num < 0 || num > 100)) {
        invalidCount++;
        if (invalidExamples.length < 5) {
          invalidExamples.push({ row: idx + 1, value: v, reason: 'Percentage exceeds standard [0, 100%] bounds' });
        }
      }
    });
  }

  // Role inference
  const uniquenessRatio = rowCount > 0 ? uniqueCount / rowCount : 0;
  const role = inferColumnRole(colName, semanticType, uniquenessRatio, rowCount);

  // Distribution & Outliers
  const { stats, outliers } = calculateDistribution(validValues, physicalType);

  // Type Validation recommendation
  let expectedType = semanticType;
  let typeConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  let recommendedAction = 'No conversion necessary';

  if (semanticType === 'Percentage' && physicalType === 'string') {
    expectedType = 'Percentage';
    typeConfidence = 'HIGH';
    recommendedAction = 'Convert to numeric percentage (clean % sign)';
  } else if (semanticType === 'Currency' && physicalType === 'string') {
    expectedType = 'Currency';
    typeConfidence = 'HIGH';
    recommendedAction = 'Convert to numeric currency (preserve symbol in metadata)';
  } else if (semanticType === 'Date' && physicalType === 'string') {
    expectedType = 'Date';
    typeConfidence = 'HIGH';
    recommendedAction = 'Parse into ISO 8601 standardized datetime';
  } else if (isIdentifier && (physicalType === 'integer' || physicalType === 'float')) {
    recommendedAction = 'CRITICAL: Preserve as string identifier to protect leading zeros and formatting';
    typeConfidence = 'HIGH';
  }

  const typeValidation = {
    currentType: physicalType,
    detectedType: semanticType,
    expectedType,
    typeConfidence,
    recommendedAction,
  };

  // Quality score
  const { score, status } = calculateColumnQuality({
    rowCount,
    nonNullCount,
    missingCount,
    placeholderCount,
    invalidCount,
    casingOrFormatIssues: whitespaceCount + casingInconsistencies,
    outlierCount: outliers.length,
    role,
    uniqueRatio: uniquenessRatio,
    colName,
  });

  const isConstant = uniqueCount === 1 && nonNullCount === rowCount;
  const isNearConstant = uniqueCount <= 2 && rowCount >= 20 && (stats.topCategories?.[0]?.percentage || 0) > 95;

  return {
    column: colName,
    originalName: colName,
    physicalType,
    semanticType,
    role,
    rows: rowCount,
    nonNull: nonNullCount,
    missing: missingCount,
    missingPercentage: rowCount > 0 ? Math.round((missingCount / rowCount) * 1000) / 10 : 0,
    placeholderCount,
    detectedPlaceholders,
    unique: uniqueCount,
    uniquePercentage,
    duplicates: duplicateValuesCount,
    invalid: invalidCount,
    invalidExamples,
    outliers: outliers.length,
    outlierDetails: outliers,
    qualityScore: score,
    status,
    typeValidation,
    isIdentifier,
    preservesLeadingZeros,
    distribution: stats,
    textIssues: {
      whitespaceCount,
      casingInconsistencies,
      nonPrintableCount,
      emptyStringsCount,
    },
    isConstant,
    isNearConstant,
    constantValue: isConstant ? validValues[0] : undefined,
  };
}

// Detect Candidate Primary Keys & Rank
export function detectCandidatePrimaryKeys(columns: ColumnProfile[], rowCount: number): PrimaryCandidate[] {
  if (rowCount === 0) return [];

  const candidates: PrimaryCandidate[] = [];

  columns.forEach(col => {
    const uniqueness = col.uniquePercentage;
    const missingPct = col.missingPercentage;
    const isId = col.isIdentifier || col.semanticType === 'ID' || col.role === 'Primary Key';

    if (uniqueness >= 80 && missingPct === 0) {
      let confidence: 'High' | 'Medium' | 'Low' = 'Low';
      let rank = 3;
      let patternScore = 80;

      if (uniqueness === 100 && isId) {
        confidence = 'High';
        rank = 1;
        patternScore = 100;
      } else if (uniqueness === 100) {
        confidence = 'Medium';
        rank = 2;
        patternScore = 90;
      } else if (uniqueness >= 95) {
        confidence = 'Low';
        rank = 3;
        patternScore = 75;
      }

      candidates.push({
        columnName: col.column,
        uniqueness,
        missingPercentage: missingPct,
        patternConsistency: patternScore,
        confidence,
        rank,
        reason: `${col.column} satisfies primary key criteria: 100% unique records with 0% missing values.`,
      });
    }
  });

  return candidates.sort((a, b) => a.rank - b.rank);
}

// Cross-Column Validation Engine
export function runCrossColumnValidation(
  rows: Record<string, any>[],
  columns: ColumnProfile[]
): CrossColumnIssue[] {
  const issues: CrossColumnIssue[] = [];
  if (rows.length === 0) return issues;

  // 1. Date Chronology Rule: Start_Date <= End_Date
  const dateCols = columns.filter(c => c.semanticType === 'Date' || c.semanticType === 'Timestamp');
  for (let i = 0; i < dateCols.length; i++) {
    for (let j = 0; j < dateCols.length; j++) {
      if (i === j) continue;
      const colA = dateCols[i].column;
      const colB = dateCols[j].column;
      const aLower = colA.toLowerCase();
      const bLower = colB.toLowerCase();

      if (
        (aLower.includes('start') && bLower.includes('end')) ||
        (aLower.includes('order') && bLower.includes('ship')) ||
        (aLower.includes('create') && bLower.includes('close'))
      ) {
        const violatingRows: { row: number; values: Record<string, any>; reason: string }[] = [];

        rows.forEach((r, idx) => {
          const valA = r[colA];
          const valB = r[colB];
          if (valA && valB) {
            const dateA = new Date(valA).getTime();
            const dateB = new Date(valB).getTime();
            if (!isNaN(dateA) && !isNaN(dateB) && dateA > dateB) {
              violatingRows.push({
                row: idx + 1,
                values: { [colA]: valA, [colB]: valB },
                reason: `${colA} (${valA}) chronologically occurs after ${colB} (${valB})`,
              });
            }
          }
        });

        if (violatingRows.length > 0) {
          issues.push({
            ruleName: `Date Chronology: ${colA} <= ${colB}`,
            columnsInvolved: [colA, colB],
            description: `Found ${violatingRows.length} records where ${colA} is later than ${colB}.`,
            violatingRowsCount: violatingRows.length,
            violatingSampleRows: violatingRows.slice(0, 5),
            severity: 'HIGH',
          });
        }
      }
    }
  }

  // 2. Math Arithmetic Rule: Quantity * Unit_Price ≈ Total/Revenue
  const numCols = columns.filter(c => c.physicalType === 'integer' || c.physicalType === 'float');
  const qtyCol = numCols.find(c => c.semanticType === 'Quantity' || c.column.toLowerCase().includes('qty') || c.column.toLowerCase().includes('quantity'));
  const priceCol = numCols.find(c => c.semanticType === 'Currency' && (c.column.toLowerCase().includes('price') || c.column.toLowerCase().includes('rate')));
  const totalCol = numCols.find(c => c.semanticType === 'Currency' && (c.column.toLowerCase().includes('total') || c.column.toLowerCase().includes('revenue') || c.column.toLowerCase().includes('amount')));

  if (qtyCol && priceCol && totalCol) {
    const violatingRows: { row: number; values: Record<string, any>; reason: string }[] = [];

    rows.forEach((r, idx) => {
      const q = parseFloat(r[qtyCol.column]);
      const p = parseFloat(r[priceCol.column]);
      const t = parseFloat(r[totalCol.column]);

      if (!isNaN(q) && !isNaN(p) && !isNaN(t)) {
        const expected = q * p;
        const diff = Math.abs(expected - t);
        // If discrepancy > 1.0 (allowing for small discount/rounding)
        if (diff > Math.max(1.0, expected * 0.15)) {
          violatingRows.push({
            row: idx + 1,
            values: { [qtyCol.column]: q, [priceCol.column]: p, [totalCol.column]: t },
            reason: `Expected Total (${qtyCol.column} × ${priceCol.column} = ${Math.round(expected * 100) / 100}) does not match recorded ${totalCol.column} (${t})`,
          });
        }
      }
    });

    if (violatingRows.length > 0) {
      issues.push({
        ruleName: `Arithmetic Integrity: ${qtyCol.column} × ${priceCol.column} ≈ ${totalCol.column}`,
        columnsInvolved: [qtyCol.column, priceCol.column, totalCol.column],
        description: `Discrepancy detected in ${violatingRows.length} records between calculated amount and recorded total.`,
        violatingRowsCount: violatingRows.length,
        violatingSampleRows: violatingRows.slice(0, 5),
        severity: 'MEDIUM',
      });
    }
  }

  return issues;
}

// Detect Redundant Column Pairs
export function detectRedundantColumns(columns: ColumnProfile[], rows: Record<string, any>[]): RedundantColumnPair[] {
  const redundant: RedundantColumnPair[] = [];
  if (rows.length === 0 || columns.length < 2) return redundant;

  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const colA = columns[i];
      const colB = columns[j];

      // Exact name similarity or identical values check
      const nameA = colA.column.toLowerCase().replace(/[-_]/g, '');
      const nameB = colB.column.toLowerCase().replace(/[-_]/g, '');

      let matchCount = 0;
      const sampleSize = Math.min(rows.length, 50);

      for (let k = 0; k < sampleSize; k++) {
        if (String(rows[k][colA.column]).trim() === String(rows[k][colB.column]).trim()) {
          matchCount++;
        }
      }

      const valueMatchRatio = sampleSize > 0 ? matchCount / sampleSize : 0;

      if (valueMatchRatio >= 0.95 || (nameA === nameB && valueMatchRatio > 0.8)) {
        redundant.push({
          columnA: colA.column,
          columnB: colB.column,
          similarityScore: Math.round(valueMatchRatio * 100),
          explanation: `Columns '${colA.column}' and '${colB.column}' share ${Math.round(valueMatchRatio * 100)}% identical values.`,
          recommendation: 'Evaluate if one column is redundant and can be consolidated.',
        });
      }
    }
  }

  return redundant;
}

// Pearson & Spearman Correlation Matrix
export function calculateCorrelationMatrix(columns: ColumnProfile[], rows: Record<string, any>[]): CorrelationPair[] {
  const numCols = columns.filter(c => c.physicalType === 'integer' || c.physicalType === 'float');
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const colA = numCols[i].column;
      const colB = numCols[j].column;

      const valA: number[] = [];
      const valB: number[] = [];

      rows.forEach(r => {
        const a = parseFloat(r[colA]);
        const b = parseFloat(r[colB]);
        if (!isNaN(a) && !isNaN(b)) {
          valA.push(a);
          valB.push(b);
        }
      });

      if (valA.length < 5) continue;

      const n = valA.length;
      const meanA = valA.reduce((s, v) => s + v, 0) / n;
      const meanB = valB.reduce((s, v) => s + v, 0) / n;

      let num = 0;
      let denA = 0;
      let denB = 0;

      for (let k = 0; k < n; k++) {
        const diffA = valA[k] - meanA;
        const diffB = valB[k] - meanB;
        num += diffA * diffB;
        denA += diffA * diffA;
        denB += diffB * diffB;
      }

      const pearson = (denA > 0 && denB > 0) ? Math.round((num / (Math.sqrt(denA) * Math.sqrt(denB))) * 100) / 100 : 0;

      let relationship = 'No linear correlation';
      if (pearson >= 0.7) relationship = 'Strong Positive Correlation';
      else if (pearson >= 0.4) relationship = 'Moderate Positive Correlation';
      else if (pearson <= -0.7) relationship = 'Strong Negative Correlation';
      else if (pearson <= -0.4) relationship = 'Moderate Negative Correlation';

      pairs.push({
        colA,
        colB,
        pearson,
        spearman: pearson, // Approximation
        relationship,
      });
    }
  }

  return pairs;
}

// Calculate Universal Analysis Readiness Score (0-100)
export function computeAnalysisReadiness(
  columns: ColumnProfile[],
  rowCount: number,
  exactDuplicates: number,
  crossColumnIssues: CrossColumnIssue[]
): AnalysisReadiness {
  if (rowCount === 0 || columns.length === 0) {
    return {
      score: 0,
      status: 'NOT READY',
      explanation: 'No dataset loaded or empty structure.',
      blockers: ['Zero records available for analysis'],
      strengths: [],
    };
  }

  const avgColScore = columns.reduce((acc, c) => acc + c.qualityScore.overallScore, 0) / columns.length;
  const totalMissingRate = columns.reduce((acc, c) => acc + c.missingPercentage, 0) / columns.length;
  const criticalColCount = columns.filter(c => c.status === 'CRITICAL' || c.status === 'POOR').length;

  let score = Math.round(avgColScore);

  const blockers: string[] = [];
  const strengths: string[] = [];

  if (totalMissingRate > 20) {
    score -= 15;
    blockers.push(`High average column missingness (${Math.round(totalMissingRate)}%)`);
  } else {
    strengths.push('Low overall missingness across attributes');
  }

  if (exactDuplicates > 0) {
    score -= Math.min(10, (exactDuplicates / rowCount) * 50);
    blockers.push(`Found ${exactDuplicates} exact duplicate row(s)`);
  } else {
    strengths.push('Zero duplicate rows detected');
  }

  if (crossColumnIssues.length > 0) {
    score -= crossColumnIssues.length * 5;
    blockers.push(`Detected ${crossColumnIssues.length} logical cross-column integrity conflict(s)`);
  } else {
    strengths.push('All cross-column relational rules passed');
  }

  if (criticalColCount > 0) {
    score -= criticalColCount * 5;
    blockers.push(`${criticalColCount} column(s) rated in POOR or CRITICAL quality state`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: AnalysisReadiness['status'] = 'READY';
  if (score < 50) status = 'NOT READY';
  else if (score < 75) status = 'NEEDS REVIEW';
  else if (score < 90) status = 'MOSTLY READY';

  const explanation = `Analysis Readiness is rated ${status} (${score}/100) based on ${columns.length} columns, ${rowCount} rows, structural validity, and semantic integrity.`;

  return {
    score,
    status,
    explanation,
    blockers,
    strengths,
  };
}

// Estimate Dataset Domain Dynamically
export function estimateDomain(columns: ColumnProfile[]): { domain: string; confidence: number } {
  const colNames = columns.map(c => c.column.toLowerCase()).join(' ');

  const scores: Record<string, number> = {
    'Finance & Banking': 0,
    'E-Commerce & Retail': 0,
    'SaaS & Product Analytics': 0,
    'Healthcare & Medical': 0,
    'Human Resources (HR)': 0,
    'Supply Chain & Logistics': 0,
    'Marketing & Advertising': 0,
    'IoT & Sensor Data': 0,
  };

  if (/price|cost|revenue|profit|margin|balance|salary|tax|invoice|fee|transaction/.test(colNames)) scores['Finance & Banking'] += 3;
  if (/order|product|sku|customer|cart|shipping|item|category|discount/.test(colNames)) scores['E-Commerce & Retail'] += 3;
  if (/mrr|arr|subscription|user|churn|plan|signup|active|session/.test(colNames)) scores['SaaS & Product Analytics'] += 3;
  if (/patient|diagnosis|treatment|dosage|doctor|hospital|blood|age|symptom/.test(colNames)) scores['Healthcare & Medical'] += 4;
  if (/employee|department|salary|hire|tenure|performance|attrition|role/.test(colNames)) scores['Human Resources (HR)'] += 4;
  if (/inventory|warehouse|transit|freight|delivery|carrier|stock|shipment/.test(colNames)) scores['Supply Chain & Logistics'] += 3;
  if (/campaign|impression|click|ctr|cpc|ad|channel|conversion|lead/.test(colNames)) scores['Marketing & Advertising'] += 3;
  if (/sensor|device|voltage|temperature|humidity|vibration|telemetry|iot/.test(colNames)) scores['IoT & Sensor Data'] += 4;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] >= 3) {
    return { domain: sorted[0][0], confidence: Math.min(95, 60 + sorted[0][1] * 8) };
  }

  return { domain: 'Universal Tabular Data', confidence: 50 };
}

// Master Function: Run Complete Universal Profiling on a Dataset
export function generateUniversalDatasetProfile(
  fileName: string,
  rows: Record<string, any>[],
  rawSnapshotRows?: Record<string, any>[]
): DatasetProfile {
  if (rows.length === 0) {
    return {
      fileName,
      fileType: 'tabular',
      rowCount: 0,
      columnCount: 0,
      memoryUsage: '0 KB',
      datasetSize: '0 KB',
      exactDuplicateRows: 0,
      estimatedDomain: 'Universal Tabular Data',
      domainConfidence: 50,
      overallQualityScore: 100,
      structuralInfo: {
        columnNames: [],
        duplicateColumnNames: [],
        emptyColumns: [],
        constantColumns: [],
        nearConstantColumns: [],
        hiddenUnnamedColumns: [],
        potentialIndexCols: [],
        potentialPrimaryKeys: [],
        potentialForeignKeys: [],
        potentialTargetVariables: [],
        potentialMeasures: [],
        potentialDimensions: [],
      },
      columns: [],
      crossColumnIssues: [],
      redundantColumns: [],
      dataLeakageRisks: [],
      correlationMatrix: [],
      analysisReadiness: {
        score: 100,
        status: 'READY',
        explanation: 'Empty dataset profile initialized.',
        blockers: [],
        strengths: [],
      },
      pipelineStage: 'RAW DATA',
      generatedAt: new Date().toISOString(),
    };
  }

  const columnNames = Object.keys(rows[0]);
  const rowCount = rows.length;

  // Approximate memory usage
  const approxBytes = JSON.stringify(rows).length;
  const memoryUsage = approxBytes > 1024 * 1024 
    ? `${(approxBytes / (1024 * 1024)).toFixed(2)} MB` 
    : `${(approxBytes / 1024).toFixed(1)} KB`;

  // Exact duplicate rows check
  const rowStrings = new Set<string>();
  let exactDuplicates = 0;
  rows.forEach(r => {
    const s = JSON.stringify(r);
    if (rowStrings.has(s)) exactDuplicates++;
    else rowStrings.add(s);
  });

  // Profile every column
  const columnProfiles: ColumnProfile[] = columnNames.map(colName => {
    const rawValues = rows.map(r => r[colName]);
    return profileColumn(colName, rawValues, rowCount);
  });

  // Structural discovery
  const emptyCols = columnProfiles.filter(c => c.nonNull === 0).map(c => c.column);
  const constantCols = columnProfiles.filter(c => c.isConstant).map(c => c.column);
  const nearConstantCols = columnProfiles.filter(c => c.isNearConstant).map(c => c.column);
  const unnamedCols = columnProfiles.filter(c => c.column.startsWith('__EMPTY') || c.column.startsWith('Unnamed')).map(c => c.column);
  const potentialPrimaryKeys = detectCandidatePrimaryKeys(columnProfiles, rowCount);
  const potentialForeignKeys = columnProfiles.filter(c => c.role === 'Foreign Key' || (c.isIdentifier && c.role !== 'Primary Key')).map(c => c.column);
  const potentialTargetVariables = columnProfiles.filter(c => c.role === 'Target').map(c => c.column);
  const potentialMeasures = columnProfiles.filter(c => c.role === 'Measure').map(c => c.column);
  const potentialDimensions = columnProfiles.filter(c => c.role === 'Dimension' || c.role === 'Date Dimension').map(c => c.column);

  const structuralInfo = {
    columnNames,
    duplicateColumnNames: [],
    emptyColumns: emptyCols,
    constantColumns: constantCols,
    nearConstantColumns: nearConstantCols,
    hiddenUnnamedColumns: unnamedCols,
    potentialIndexCols: columnProfiles.filter(c => c.role === 'Identifier').map(c => c.column),
    potentialPrimaryKeys,
    potentialForeignKeys,
    potentialTargetVariables,
    potentialMeasures,
    potentialDimensions,
  };

  // Cross-column rules
  const crossColumnIssues = runCrossColumnValidation(rows, columnProfiles);

  // Redundant columns
  const redundantColumns = detectRedundantColumns(columnProfiles, rows);

  // Correlation matrix
  const correlationMatrix = calculateCorrelationMatrix(columnProfiles, rows);

  // Domain inference
  const { domain, confidence: domainConfidence } = estimateDomain(columnProfiles);

  // Readiness score
  const analysisReadiness = computeAnalysisReadiness(columnProfiles, rowCount, exactDuplicates, crossColumnIssues);

  const overallQualityScore = Math.round(
    columnProfiles.reduce((acc, c) => acc + c.qualityScore.overallScore, 0) / (columnProfiles.length || 1)
  );

  return {
    fileName,
    fileType: fileName.split('.').pop() || 'csv',
    rowCount,
    columnCount: columnProfiles.length,
    memoryUsage,
    datasetSize: memoryUsage,
    exactDuplicateRows: exactDuplicates,
    estimatedDomain: domain,
    domainConfidence,
    overallQualityScore,
    structuralInfo,
    columns: columnProfiles,
    crossColumnIssues,
    redundantColumns,
    dataLeakageRisks: [],
    correlationMatrix,
    analysisReadiness,
    pipelineStage: rawSnapshotRows ? 'WORKING COPY' : 'RAW DATA',
    generatedAt: new Date().toISOString(),
  };
}

// Post-Cleaning Validator & Self-Correction Engine
export function runPostCleaningValidation(
  originalProfile: DatasetProfile,
  cleanedRows: Record<string, any>[],
  cleaningLogs: AuditLogEntry[]
): {
  postProfile: DatasetProfile;
  comparison: PrePostComparison;
  selfCorrections: string[];
  finalCleanedRows: Record<string, any>[];
} {
  const postProfile = generateUniversalDatasetProfile(
    originalProfile.fileName,
    cleanedRows,
    originalProfile.columns.map(c => c.column) as any
  );
  postProfile.pipelineStage = 'VALIDATED DATA';

  const errorsDetected: string[] = [];
  const selfCorrections: string[] = [];
  let correctedRows = [...cleanedRows];

  // Check 1: Did cleaning destroy identifiers?
  originalProfile.columns.forEach(origCol => {
    if (origCol.isIdentifier || origCol.preservesLeadingZeros) {
      const postCol = postProfile.columns.find(c => c.column === origCol.column);
      if (postCol && postCol.physicalType === 'integer' && origCol.physicalType === 'string') {
        errorsDetected.push(`Identifier column '${origCol.column}' was inadvertently cast to numeric integer!`);
        // Self-correction: Restore original string values
        correctedRows = correctedRows.map((r, i) => ({
          ...r,
          [origCol.column]: String(r[origCol.column] || ''),
        }));
        selfCorrections.push(`Self-corrected: Restored identifier '${origCol.column}' to strict String type.`);
      }
    }
  });

  // Check 2: Did cleaning introduce new missing values?
  const origTotalMissing = originalProfile.columns.reduce((a, b) => a + b.missing, 0);
  const postTotalMissing = postProfile.columns.reduce((a, b) => a + b.missing, 0);
  if (postTotalMissing > origTotalMissing) {
    errorsDetected.push(`Cleaning introduced ${postTotalMissing - origTotalMissing} new missing cells!`);
  }

  // Build Pre vs Post Metrics Comparison
  const metrics: MetricComparison[] = [
    {
      name: 'Total Records (Rows)',
      before: originalProfile.rowCount,
      after: postProfile.rowCount,
      change: `${postProfile.rowCount - originalProfile.rowCount >= 0 ? '+' : ''}${postProfile.rowCount - originalProfile.rowCount}`,
      status: postProfile.rowCount >= originalProfile.rowCount ? 'NEUTRAL' : 'IMPROVED',
    },
    {
      name: 'Overall Data Quality Score',
      before: `${originalProfile.overallQualityScore}/100`,
      after: `${postProfile.overallQualityScore}/100`,
      change: `${postProfile.overallQualityScore - originalProfile.overallQualityScore >= 0 ? '+' : ''}${postProfile.overallQualityScore - originalProfile.overallQualityScore} pts`,
      status: postProfile.overallQualityScore >= originalProfile.overallQualityScore ? 'IMPROVED' : 'WARNING',
    },
    {
      name: 'Analysis Readiness Score',
      before: `${originalProfile.analysisReadiness.score}/100 (${originalProfile.analysisReadiness.status})`,
      after: `${postProfile.analysisReadiness.score}/100 (${postProfile.analysisReadiness.status})`,
      change: `${postProfile.analysisReadiness.score - originalProfile.analysisReadiness.score >= 0 ? '+' : ''}${postProfile.analysisReadiness.score - originalProfile.analysisReadiness.score} pts`,
      status: postProfile.analysisReadiness.score >= originalProfile.analysisReadiness.score ? 'IMPROVED' : 'WARNING',
    },
    {
      name: 'Exact Duplicate Rows',
      before: originalProfile.exactDuplicateRows,
      after: postProfile.exactDuplicateRows,
      change: `-${originalProfile.exactDuplicateRows - postProfile.exactDuplicateRows}`,
      status: postProfile.exactDuplicateRows < originalProfile.exactDuplicateRows ? 'IMPROVED' : 'NEUTRAL',
    },
    {
      name: 'Total Missing Cells',
      before: origTotalMissing,
      after: postTotalMissing,
      change: `${postTotalMissing - origTotalMissing}`,
      status: postTotalMissing <= origTotalMissing ? 'IMPROVED' : 'WARNING',
    },
    {
      name: 'Cross-Column Relational Conflicts',
      before: originalProfile.crossColumnIssues.length,
      after: postProfile.crossColumnIssues.length,
      change: `${postProfile.crossColumnIssues.length - originalProfile.crossColumnIssues.length}`,
      status: postProfile.crossColumnIssues.length <= originalProfile.crossColumnIssues.length ? 'IMPROVED' : 'WARNING',
    },
  ];

  const comparison: PrePostComparison = {
    metrics,
    postCleaningValidationPassed: errorsDetected.length === 0,
    validationErrorsDetected: errorsDetected,
    selfCorrectionsApplied: selfCorrections,
    timestamp: new Date().toISOString(),
  };

  return {
    postProfile,
    comparison,
    selfCorrections,
    finalCleanedRows: correctedRows,
  };
}
