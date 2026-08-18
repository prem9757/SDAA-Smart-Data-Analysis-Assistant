export type PhysicalDataType = 
  | 'integer' 
  | 'float' 
  | 'string' 
  | 'boolean' 
  | 'datetime' 
  | 'object' 
  | 'categorical';

export type SemanticDataType = 
  | 'ID' 
  | 'Date' 
  | 'Time' 
  | 'Timestamp' 
  | 'Currency' 
  | 'Percentage' 
  | 'Quantity' 
  | 'Name' 
  | 'Email' 
  | 'Phone' 
  | 'Address' 
  | 'Category' 
  | 'Status' 
  | 'Geographic' 
  | 'Text' 
  | 'URL' 
  | 'Measure' 
  | 'Dimension'
  | 'Boolean';

export type ColumnRole = 
  | 'Primary Key' 
  | 'Foreign Key' 
  | 'Identifier' 
  | 'Dimension' 
  | 'Measure' 
  | 'Date Dimension' 
  | 'Time Dimension' 
  | 'Target' 
  | 'Feature' 
  | 'Free Text' 
  | 'Metadata';

export type ColumnStatus = 
  | 'EXCELLENT' 
  | 'GOOD' 
  | 'WARNING' 
  | 'POOR' 
  | 'CRITICAL';

export interface ColumnQualityScore {
  completeness: number; // 0 - 100
  validity: number;     // 0 - 100
  consistency: number;  // 0 - 100
  uniqueness: number;   // 0 - 100
  integrity: number;    // 0 - 100
  overallScore: number; // 0 - 100
  calculationExplanation: string;
}

export type OutlierClassification = 
  | 'BUSINESS INVALID' 
  | 'STATISTICAL OUTLIER' 
  | 'LEGITIMATE EXTREME' 
  | 'UNKNOWN';

export interface OutlierDetail {
  row: number;
  value: any;
  detectionMethod: 'IQR' | 'Z-SCORE' | 'MODIFIED_Z_SCORE' | 'DOMAIN_RULE' | 'DOMAIN CONSTRAINT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  classification: OutlierClassification;
  explanation: string;
  recommendedAction: string;
}

export interface TypeValidationInfo {
  currentType: string;
  detectedType: string;
  expectedType: string;
  typeConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: string;
}

export interface DistributionStats {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  mode?: string | number;
  q1?: number;
  q3?: number;
  iqr?: number;
  stdDev?: number;
  variance?: number;
  skewness?: number;
  kurtosis?: number;
  topCategories?: { value: string; count: number; percentage: number }[];
  rareCategories?: { value: string; count: number; percentage: number }[];
}

export interface ColumnProfile {
  column: string;
  originalName: string;
  physicalType: PhysicalDataType;
  semanticType: SemanticDataType;
  role: ColumnRole;
  rows: number;
  nonNull: number;
  missing: number;
  missingPercentage: number;
  placeholderCount: number;
  detectedPlaceholders: string[];
  unique: number;
  uniquePercentage: number;
  duplicates: number;
  invalid: number;
  invalidExamples: { row: number; value: any; reason: string }[];
  outliers: number;
  outlierDetails: OutlierDetail[];
  qualityScore: ColumnQualityScore;
  status: ColumnStatus;
  typeValidation: TypeValidationInfo;
  isIdentifier: boolean;
  preservesLeadingZeros: boolean;
  distribution: DistributionStats;
  textIssues: {
    whitespaceCount: number;
    casingInconsistencies: number;
    nonPrintableCount: number;
    emptyStringsCount: number;
  };
  categoryMapping?: Record<string, string>;
  isConstant: boolean;
  isNearConstant: boolean;
  constantValue?: any;
}

export interface PrimaryCandidate {
  columnName: string;
  uniqueness: number; // 0 - 100
  missingPercentage: number;
  patternConsistency: number; // 0 - 100
  confidence: 'High' | 'Medium' | 'Low';
  rank: number;
  reason: string;
}

export interface CrossColumnIssue {
  ruleName: string;
  columnsInvolved: string[];
  description: string;
  violatingRowsCount: number;
  violatingSampleRows: { row: number; values: Record<string, any>; reason: string }[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RedundantColumnPair {
  columnA: string;
  columnB: string;
  similarityScore: number; // 0 - 100
  explanation: string;
  recommendation: string;
}

export interface DataLeakageRisk {
  columnName: string;
  riskType: 'Target Leakage' | 'Post-Outcome Variable' | 'Duplicate Target' | 'Future Timestamp';
  explanation: string;
  severity: 'HIGH' | 'MEDIUM';
}

export interface StructuralInfo {
  columnNames: string[];
  duplicateColumnNames: string[];
  emptyColumns: string[];
  constantColumns: string[];
  nearConstantColumns: string[];
  hiddenUnnamedColumns: string[];
  potentialIndexCols: string[];
  potentialPrimaryKeys: PrimaryCandidate[];
  potentialForeignKeys: string[];
  potentialTargetVariables: string[];
  potentialMeasures: string[];
  potentialDimensions: string[];
}

export interface AnalysisReadiness {
  score: number; // 0 - 100
  status: 'READY' | 'MOSTLY READY' | 'NEEDS REVIEW' | 'NOT READY';
  explanation: string;
  blockers: string[];
  strengths: string[];
}

export interface CorrelationPair {
  colA: string;
  colB: string;
  pearson: number;
  spearman: number;
  relationship: string;
}

export interface DatasetProfile {
  fileName: string;
  fileType: string;
  rowCount: number;
  columnCount: number;
  memoryUsage: string;
  datasetSize: string;
  exactDuplicateRows: number;
  estimatedDomain: string;
  domainConfidence: number; // 0 - 100
  overallQualityScore: number; // 0 - 100
  structuralInfo: StructuralInfo;
  columns: ColumnProfile[];
  crossColumnIssues: CrossColumnIssue[];
  redundantColumns: RedundantColumnPair[];
  dataLeakageRisks: DataLeakageRisk[];
  correlationMatrix: CorrelationPair[];
  analysisReadiness: AnalysisReadiness;
  pipelineStage: 'RAW DATA' | 'WORKING COPY' | 'CLEANED DATA' | 'VALIDATED DATA';
  generatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  row: number | string;
  column: string;
  originalValue: any;
  newValue: any;
  action: 'AUTO-FIXED' | 'NORMALIZED' | 'IMPUTED' | 'CAPPED' | 'REMOVED' | 'STANDARDIZED' | 'FLAGGED' | 'SELF-CORRECTED' | 'CORRECTED';
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MetricComparison {
  name: string;
  before: string | number;
  after: string | number;
  change: string;
  status: 'IMPROVED' | 'NEUTRAL' | 'WARNING';
}

export interface PrePostComparison {
  metrics: MetricComparison[];
  postCleaningValidationPassed: boolean;
  validationErrorsDetected: string[];
  selfCorrectionsApplied: string[];
  timestamp: string;
}
