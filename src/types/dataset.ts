import { DatasetProfile, AuditLogEntry, PrePostComparison } from './profiling';

export type DataType = 'number' | 'string' | 'boolean' | 'date';

export interface ColumnStats {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  skewness?: number;
}

export interface ColumnMetadata {
  name: string;
  type: DataType;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  sampleValues: any[];
  stats?: ColumnStats;
}

export interface DataHealth {
  score: number; // 0 - 100
  missingnessRate: number; // percentage
  duplicateRows: number;
  outlierCount: number;
  cardinalityIssues: number;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface AITakeaway {
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'REVENUE' | 'EFFICIENCY' | 'RISK' | 'GROWTH';
}

export interface AIDriverFactor {
  factor: string;
  correlation: string;
  insight: string;
}

export interface AIAnomaly {
  feature: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  value?: any;
  rowIndex?: number;
}

export interface AIAction {
  action: string;
  priority: 'P0' | 'P1' | 'P2';
  expectedOutcome: string;
}

export interface SuggestedChart {
  type: 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'donut' | 'heatmap' | 'radar' | 'combo' | 'boxplot' | 'treemap';
  title: string;
  xAxis: string;
  yAxis: string;
  reason: string;
}

export interface AISummary {
  executiveSummary: string;
  healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  keyTakeaways: AITakeaway[];
  driverAnalysis: AIDriverFactor[];
  anomaliesDetected: AIAnomaly[];
  recommendedActions: AIAction[];
  suggestedVisualizations: SuggestedChart[];
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  category: 'SaaS' | 'E-Commerce' | 'Finance' | 'Healthcare' | 'Custom';
  icon: string;
  rows: Record<string, any>[];
  rawRows?: Record<string, any>[]; // Immutable snapshot of original uploaded data
  columns: ColumnMetadata[];
  health: DataHealth;
  profile?: DatasetProfile; // Complete universal profiling profile
  auditLog?: AuditLogEntry[];
  prePostComparison?: PrePostComparison;
  summary: AISummary | null;
  createdAt: string;
  isSample?: boolean;
}

export type ChartType = 
  | 'clustered_column'
  | 'stacked_column'
  | 'percent_column'
  | 'clustered_bar'
  | 'stacked_bar'
  | 'percent_bar'
  | 'bar'
  | 'column'
  | 'line'
  | 'smooth_line'
  | 'stepped_line'
  | 'area'
  | 'stacked_area'
  | 'percent_area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'radar'
  | 'combo'
  | 'heatmap'
  | 'boxplot'
  | 'treemap';
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';
export type PaletteType = 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxis: string;
  yAxis: string;
  secondaryYAxis?: string;
  aggregation: AggregationType;
  groupBy?: string;
  colorPalette: PaletteType;
  filterField?: string;
  filterValue?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sqlQuery?: string;
  chartSuggestion?: ChartConfig;
  isStreaming?: boolean;
}

export interface SQLQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
  generatedSQL?: string;
  explanation?: string;
}

export type ProblemType = 'classification' | 'regression' | 'clustering' | 'time_series';

export interface AutoMLConfig {
  targetColumn: string;
  problemType: ProblemType;
  selectedFeatures: string[];
  algorithm: string;
  testRatio: number;
}

export interface AutoMLResult {
  modelName: string;
  problemType: ProblemType;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  r2Score?: number;
  rmse?: number;
  mae?: number;
  trainingTimeMs: number;
  featureImportance: { feature: string; score: number; reason?: string }[];
  confusionMatrix?: { actual: string; predicted: string; count: number }[];
  predictions: Record<string, any>[];
  recommendations: string[];
}
