export type ValidationCategory =
  | 'completeness'
  | 'uniqueness'
  | 'type_schema'
  | 'range_boundary'
  | 'allowed_values'
  | 'pattern_regex'
  | 'cross_column'
  | 'distribution_statistical'
  | 'custom_expression';

export type ValidationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type ValidationStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

export interface ValidationRuleParameters {
  min?: number;
  max?: number;
  allowedValues?: string[];
  pattern?: string;
  patternType?: 'email' | 'phone' | 'url' | 'date_iso' | 'zip_code' | 'uuid' | 'currency' | 'alphanumeric' | 'custom_regex';
  expectedType?: 'number' | 'string' | 'boolean' | 'date' | 'integer';
  allowNull?: boolean;
  nullThresholdPct?: number; // max allowed missing percentage (e.g. 0% for strict NOT NULL, 5% for lenient)
  operator?: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  referenceColumn?: string;
  differenceThreshold?: number;
  expression?: string; // Javascript expression evaluated on row, e.g. "row.Price * row.Quantity === row.Total"
  zScoreThreshold?: number;
  uniqueConstraint?: 'strict_unique' | 'composite';
  compositeColumns?: string[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: ValidationCategory;
  targetColumn: string;
  secondaryColumn?: string;
  severity: ValidationSeverity;
  enabled: boolean;
  parameters: ValidationRuleParameters;
  suggestedRemediation?: string;
  autoFixType?: 'trim' | 'impute_median' | 'impute_mode' | 'cap_bounds' | 'abs_value' | 'quarantine' | 'format_normalize' | 'drop_row';
  isCustom?: boolean;
}

export interface ValidationFailureItem {
  rowIndex: number;
  rowData: Record<string, any>;
  actualValue: any;
  expectedCondition: string;
  failureReason: string;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  description: string;
  category: ValidationCategory;
  targetColumn: string;
  severity: ValidationSeverity;
  status: ValidationStatus;
  totalEvaluated: number;
  passedCount: number;
  failedCount: number;
  passRate: number; // 0 to 100
  failedRowIndices: number[];
  sampleFailures: ValidationFailureItem[];
  executionTimeMs: number;
  suggestedRemediation: string;
  autoFixType?: 'trim' | 'impute_median' | 'impute_mode' | 'cap_bounds' | 'abs_value' | 'quarantine' | 'format_normalize' | 'drop_row';
}

export interface ValidationCategoryScore {
  total: number;
  passed: number;
  failed: number;
  score: number;
}

export interface ValidationSuiteReport {
  id: string;
  datasetName: string;
  timestamp: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  criticalFailures: number;
  overallScore: number; // 0 to 100
  complianceStatus: 'COMPLIANT' | 'NEEDS_ATTENTION' | 'NON_COMPLIANT';
  totalRows: number;
  compliantRowCount: number;
  failingRowCount: number;
  failingRowIndices: number[];
  results: ValidationResult[];
  categoryScores: Record<ValidationCategory, ValidationCategoryScore>;
}

export interface ValidationPresetSuite {
  id: string;
  name: string;
  description: string;
  iconName: string;
  targetDomain: string;
  rules: ValidationRule[];
}
