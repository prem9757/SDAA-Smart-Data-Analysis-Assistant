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

export type ValidationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'WARNING' | 'INFO';

export type ValidationStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

export type QualityGateLabel = 'CLEAN' | 'CLEAN WITH REVIEW REQUIRED' | 'NOT READY FOR ANALYSIS';

export interface QualityScoreDimensions {
  completeness: number; // 0 - 100
  validity: number;     // 0 - 100
  consistency: number;  // 0 - 100
  uniqueness: number;   // 0 - 100
  accuracy: number;     // 0 - 100
  integrity: number;    // 0 - 100
  overallScore: number; // 0 - 100
}

export interface QualityScoreComparison {
  before: QualityScoreDimensions;
  after: QualityScoreDimensions;
  gain: number;
}

export interface CategoryNormalizationItem {
  originalValue: string;
  normalizedValue: string;
  recordCount: number;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  strategy: 'EXACT' | 'CASE' | 'WHITESPACE' | 'TOKEN' | 'SEMANTIC_SIMILARITY' | 'FREQUENCY' | 'CONTEXT';
}

export interface CategoryNormalizationReport {
  column: string;
  totalCategoriesBefore: number;
  totalCategoriesAfter: number;
  mergedCount: number;
  items: CategoryNormalizationItem[];
}

export type CrossColumnMatchStatus = 'MATCH' | 'ROUNDING_DIFFERENCE' | 'MINOR DIFFERENCE' | 'SUSPICIOUS' | 'INVALID';

export interface CrossColumnMathItem {
  row: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  expectedRevenue: number;
  actualRevenue: number;
  absoluteDifference: number;
  percentageDifference: number;
  status: CrossColumnMatchStatus;
  explanation: string;
}

export interface CrossColumnValidationReport {
  ruleName: string;
  columnsInvolved: string[];
  totalEvaluated: number;
  matches: number;
  roundingDifferences: number;
  minorDifferences: number;
  suspiciousCount: number;
  invalidCount: number;
  toleranceAbsolute: number;
  tolerancePercentage: number;
  sampleItems: CrossColumnMathItem[];
}

export type IdentifierIssueType =
  | 'MISSING'
  | 'BLANK'
  | 'DUPLICATE'
  | 'DUPLICATE_KEY_CONFLICT'
  | 'INVALID_FORMAT'
  | 'MALFORMED'
  | 'UNEXPECTED_CHARS'
  | 'INCORRECT_LENGTH'
  | 'UNEXPECTED_PREFIX'
  | 'SEQUENCE_GAP';

export interface IdentifierIssueItem {
  column: string;
  row: number;
  value: any;
  issueType: IdentifierIssueType;
  expectedPattern?: string;
  explanation: string;
  recommendedAction: string;
  isAutoGeneratable: boolean;
  generationRule?: string;
  isExactRowDuplicate?: boolean;
}

export interface IdentifierAuditReport {
  column: string;
  detectedPrefix?: string;
  expectedLength?: number;
  expectedPattern?: string;
  isSequential: boolean;
  totalRecords: number;
  validCount: number;
  invalidCount: number;
  missingCount: number;
  duplicateCount: number;
  malformedCount: number;
  issues: IdentifierIssueItem[];
}

export type EmailValidationClass = 'VALID' | 'INVALID' | 'MISSING' | 'SUSPICIOUS';

export interface EmailAuditItem {
  row: number;
  email: string;
  status: EmailValidationClass;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FinalDataTypeAuditItem {
  column: string;
  currentType: string;
  inferredPhysical: string;
  recommendedType: string;
  isCompliant: boolean;
  reason: string;
}

export type OutlierClassificationType =
  | 'LEGITIMATE OUTLIER'
  | 'POSSIBLE DATA ERROR'
  | 'DATA ERROR'
  | 'EXTREME OUTLIER'
  | 'BUSINESSALLY VALID HIGH-VALUE RECORD';

export interface OutlierValidationItem {
  row: number;
  column: string;
  value: number;
  classification: OutlierClassificationType;
  method: string;
  zScore?: number;
  iqrDistance?: number;
  crossColumnExplanation?: string;
  recommendation: string;
}

export interface UnresolvedIssueItem {
  id: string;
  issue: string;
  column: string;
  rowsAffected: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: string;
  requiresHumanReview: boolean;
}

export interface SelfTestResult {
  testCode: string; // e.g. 'TEST-01', 'TEST-02', ..., 'TEST-14'
  testNumber: number;
  name: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
}

export interface WhatEngineMissedItem {
  id: string;
  issue: string;
  phaseDetected: 'INITIAL_SCAN' | 'POST_VALIDATION_PASS_2' | 'HUMAN_REVIEW_QUEUE';
  classificationIssue?: string;
  rootCause: string;
}

export interface RecommendedEngineImprovement {
  id: string;
  problem: string;
  rootCause: string;
  newRule: string;
  expectedImprovement: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CleaningPipelinePass {
  passNumber: number;
  stage: 'PROFILE' | 'DETECT' | 'PLAN' | 'CLEAN' | 'VALIDATE' | 'RE-CLEAN' | 'RE-VALIDATE' | 'FINAL_SCORE';
  actionSummary: string;
  issuesFound: number;
  issuesResolved: number;
  qualityScore: number;
  timestamp: string;
}

export interface LineageStep {
  step: number;
  name: string;
  description: string;
  rowCount: number;
  colCount: number;
  score: number;
  timestamp: string;
}

export interface ComprehensiveIterativeCleaningReport {
  id: string;
  datasetName: string;
  executedPasses: CleaningPipelinePass[];
  totalIterations: number;
  stoppedEarly: boolean;
  qualityGate: QualityGateLabel;
  qualityGateReason: string;
  qualityScores: QualityScoreComparison;
  finalDataTypeAudit: FinalDataTypeAuditItem[];
  identifierAudits: IdentifierAuditReport[];
  categoryNormalizationReports: CategoryNormalizationReport[];
  crossColumnReports: CrossColumnValidationReport[];
  outlierValidations: OutlierValidationItem[];
  emailAudits: EmailAuditItem[];
  unresolvedIssues: UnresolvedIssueItem[];
  selfTests: SelfTestResult[];
  whatEngineMissed: WhatEngineMissedItem[];
  recommendedImprovements: RecommendedEngineImprovement[];
  lineage: LineageStep[];
  // Final Patch Executive Summary Metrics
  initialQualityScore: number;
  finalQualityScore: number;
  issuesFixed: number;
  issuesRemaining: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  manualReviewCount: number;
  businessRuleViolations: number;
  finalDatasetStatus: QualityGateLabel;
  timestamp: string;
}

export interface ValidationRuleParameters {
  min?: number;
  max?: number;
  allowedValues?: string[];
  pattern?: string;
  patternType?: 'email' | 'phone' | 'url' | 'date_iso' | 'zip_code' | 'uuid' | 'currency' | 'alphanumeric' | 'custom_regex';
  expectedType?: 'number' | 'string' | 'boolean' | 'date' | 'integer';
  allowNull?: boolean;
  nullThresholdPct?: number;
  operator?: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  referenceColumn?: string;
  differenceThreshold?: number;
  expression?: string;
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

