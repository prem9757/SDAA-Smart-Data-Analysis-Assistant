export type DomainId =
  | 'ecommerce'
  | 'finance'
  | 'healthcare'
  | 'saas'
  | 'hr'
  | 'logistics'
  | 'marketing'
  | 'manufacturing'
  | 'education'
  | 'real_estate'
  | 'generic';

export type RuleSource =
  | 'ORGANIZATION'
  | 'DOMAIN_STANDARD'
  | 'USER_APPROVED'
  | 'DATASET_CUSTOM'
  | 'AI_PROPOSED'
  | 'GENERIC_CLEANING';

export type RuleStatus =
  | 'ACTIVE'
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'DEPRECATED';

export type RuleSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RuleConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type RuleAction =
  | 'CORRECT'
  | 'FLAG'
  | 'NORMALIZE'
  | 'CAP'
  | 'IMPUTE'
  | 'REJECT'
  | 'CALCULATE';

export interface ColumnSemanticDefinition {
  name: string;
  aliases: string[];
  expected_type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'id';
  valid_range?: [number, number];
  allowed_values?: string[];
  is_identifier?: boolean;
  format_pattern?: string;
  description: string;
}

export interface DomainKPIDefinition {
  name: string;
  formula: string;
  description: string;
  unit?: string;
}

export interface DomainRule {
  rule_id: string;
  domain: DomainId | string;
  version: string;
  description: string;
  condition: string;
  action: RuleAction;
  severity: RuleSeverity;
  confidence: RuleConfidence;
  auto_fix_allowed: boolean;
  source: RuleSource;
  created_at: string;
  updated_at: string;
  status: RuleStatus;
  priority: number; // 1: User-approved, 2: Domain/Org, 3: Dataset-specific, 4: Generic, 5: AI-proposed
  target_columns: string[];
  valid_range?: [number, number];
  allowed_values?: string[];
  formula_expression?: string;
  parameters?: Record<string, any>;
  error_message?: string;
  conflict_ids?: string[];
}

export interface DomainDefinition {
  id: DomainId | string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  column_semantics: ColumnSemanticDefinition[];
  kpis: DomainKPIDefinition[];
  rules: DomainRule[];
  created_at: string;
  updated_at: string;
}

export interface SupportingEvidence {
  type: 'COLUMN_MATCH' | 'VALUE_PATTERN' | 'FORMULA_MATCH' | 'STATISTICAL_DISTRIBUTION';
  column?: string;
  description: string;
  weight: number;
}

export interface DomainDetectionResult {
  detectedDomain: string;
  domainId: DomainId | string;
  version: string;
  confidenceScore: number; // 0 - 100
  supportingEvidence: SupportingEvidence[];
  isUncertain: boolean;
  fallbackToGeneric: boolean;
  alternativeCandidates: Array<{ domain: string; domainId: string; confidence: number }>;
}

export interface AIRuleProposal {
  rule_id: string;
  detected_pattern: string;
  proposed_rule: DomainRule;
  evidence: string;
  affected_columns: string[];
  affected_rows: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  potential_false_positives: string;
  potential_business_impact: string;
  recommended_action: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_by?: string;
  rejected_reason?: string;
}

export interface HistoricalValidationResult {
  rule_id: string;
  rule_description: string;
  datasets_evaluated: number;
  rows_evaluated: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  precision: number; // 0 to 1
  recall: number; // 0 to 1
  false_positive_rate: number; // 0 to 1
  recommendation: 'SAFE_TO_ACTIVATE' | 'HIGH_RISK_FALSE_POSITIVES' | 'INSUFFICIENT_DATA';
  sample_flagged_rows: Array<{
    dataset_name: string;
    row_index: number;
    values: Record<string, any>;
    reason: string;
    is_true_positive: boolean;
  }>;
}

export interface RuleConflictReport {
  conflict_id: string;
  rule_a: DomainRule;
  rule_b: DomainRule;
  affected_columns: string[];
  conflict_type:
    | 'RANGE_CONTRADICTION'
    | 'FORMAT_AMBIGUITY'
    | 'MUTUALLY_EXCLUSIVE_ACTIONS'
    | 'FORMULA_DIVERGENCE';
  description: string;
  possible_interpretation: string;
  recommended_resolution: string;
  resolution_applied?: string;
}

export interface KnowledgeVersionRecord {
  id: string;
  version: string;
  domain: string;
  rule_id: string;
  previous_rule?: DomainRule;
  new_rule: DomainRule;
  reason_for_change: string;
  changed_by: string;
  timestamp: string;
  evidence: string;
}

export interface KnowledgeFeedbackReport {
  dataset_id: string;
  dataset_name: string;
  domain_id: string;
  domain_name: string;
  kb_version: string;
  rules_evaluated: number;
  rules_triggered: number;
  rules_data_changed: number;
  rules_failed: number;
  rules_false_positives_detected: number;
  rules_missed_issues: number;
  improvements: Array<{
    current_rule?: string;
    observed_problem: string;
    evidence: string;
    proposed_change: string;
    expected_benefit: string;
    risk: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  ai_proposals: AIRuleProposal[];
  conflicts_detected: RuleConflictReport[];
}

export interface KnowledgeAwareAuditEntry {
  dataset_id: string;
  rule_id: string;
  rule_version: string;
  column: string;
  row: number;
  original_value: any;
  new_value: any;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  action: RuleAction;
}
