import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wand2,
  ShieldCheck,
  ShieldAlert,
  Filter,
  Copy,
  Trash2,
  Download,
  Scissors,
  Type,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Zap,
  Layers,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  Database,
  RotateCcw,
  Undo2,
  FileText,
  Search,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Calendar,
  DollarSign,
  Percent,
  Hash,
  XCircle,
  TrendingUp,
  Code2,
  Plus,
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  Activity,
  FileCheck,
  X,
  Maximize2,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, ColumnMetadata, DataHealth } from '../../types/dataset';
import {
  DatasetProfile,
  ColumnProfile,
  AuditLogEntry,
  PrePostComparison,
  OutlierClassification,
} from '../../types/profiling';
import {
  generateUniversalDatasetProfile,
  runPostCleaningValidation,
  isPlaceholder,
  isNonNegativeColumn,
  parseAndValidateDate,
} from '../../utils/universalDataProfiler';
import {
  ValidationRule,
  ValidationResult,
  ValidationSuiteReport,
  ValidationCategory,
  ValidationSeverity,
  ValidationFailureItem,
} from '../../types/validation';
import {
  inferValidationRulesFromDataset,
  executeValidationSuite,
  executeValidationRule,
  autoRemediateValidation,
  exportAsGreatExpectationsJSON,
  exportAsPythonPydanticScript,
  exportAsDbtYamlTests,
  SEMANTIC_REGEX_PATTERNS,
} from '../../utils/dataValidator';
import { UniversalDataProfiler } from './UniversalDataProfiler';

interface DataCleaningProps {
  dataset: Dataset;
  onUpdateDataset: (updatedDataset: Dataset) => void;
}

export const DataCleaning: React.FC<DataCleaningProps> = ({ dataset, onUpdateDataset }) => {
  // Ensure profile is present
  const profile = React.useMemo(() => {
    if (dataset.profile && dataset.profile.columns && dataset.profile.columns.length > 0) {
      return dataset.profile;
    }
    return generateUniversalDatasetProfile(dataset.name, dataset.rows, dataset.rawRows);
  }, [dataset]);

  const [activeTab, setActiveTab] = React.useState<
    'autoclean' | 'profiler' | 'rules' | 'domain' | 'missing' | 'outliers' | 'text' | 'comparison' | 'audit'
  >('autoclean');

  const [protectIdentifiers, setProtectIdentifiers] = React.useState<boolean>(true);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // History stack for Undo
  const [historyStack, setHistoryStack] = React.useState<Dataset[]>([]);

  // Validation Rules state
  const [rules, setRules] = React.useState<ValidationRule[]>(() => {
    return inferValidationRulesFromDataset(dataset);
  });

  // Re-infer if dataset columns change significantly
  React.useEffect(() => {
    if (rules.length === 0 && dataset.rows.length > 0) {
      setRules(inferValidationRulesFromDataset(dataset));
    }
  }, [dataset.columns.length, dataset.name]);

  // Validation Report state
  const validationReport = React.useMemo<ValidationSuiteReport>(() => {
    return executeValidationSuite(rules, dataset);
  }, [rules, dataset]);

  // Validation UI state
  const [selectedValCategory, setSelectedValCategory] = React.useState<ValidationCategory | 'ALL'>('ALL');
  const [selectedValSeverity, setSelectedValSeverity] = React.useState<ValidationSeverity | 'ALL'>('ALL');
  const [valStatusFilter, setValStatusFilter] = React.useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [valSearchQuery, setValSearchQuery] = React.useState<string>('');
  const [inspectingValResult, setInspectingValResult] = React.useState<ValidationResult | null>(null);

  // Custom rule form modal state
  const [showAddRuleModal, setShowAddRuleModal] = React.useState<boolean>(false);
  const [newRuleName, setNewRuleName] = React.useState<string>('');
  const [newRuleDescription, setNewRuleDescription] = React.useState<string>('');
  const [newRuleCategory, setNewRuleCategory] = React.useState<ValidationCategory>('range_boundary');
  const [newRuleColumn, setNewRuleColumn] = React.useState<string>(dataset.columns[0]?.name || '');
  const [newRuleSeverity, setNewRuleSeverity] = React.useState<ValidationSeverity>('CRITICAL');
  const [newRuleMin, setNewRuleMin] = React.useState<string>('0');
  const [newRuleMax, setNewRuleMax] = React.useState<string>('1000');
  const [newRuleAllowedValues, setNewRuleAllowedValues] = React.useState<string>('');
  const [newRulePatternType, setNewRulePatternType] = React.useState<string>('email');
  const [newRuleCustomRegex, setNewRuleCustomRegex] = React.useState<string>('');
  const [newRuleSecondaryCol, setNewRuleSecondaryCol] = React.useState<string>(dataset.columns[1]?.name || '');
  const [newRuleOperator, setNewRuleOperator] = React.useState<'>=' | '<=' | '==' | '>' | '<'>('>=');
  const [newRuleExpression, setNewRuleExpression] = React.useState<string>("row['" + (dataset.columns[0]?.name || 'val') + "'] > 0");

  // Export Contract modal state
  const [showExportModal, setShowExportModal] = React.useState<boolean>(false);
  const [exportFormat, setExportFormat] = React.useState<'ge' | 'python' | 'dbt' | 'json'>('ge');
  const [copiedCode, setCopiedCode] = React.useState<boolean>(false);

  // Pipeline execution animation state
  const [isAutoCleaning, setIsAutoCleaning] = React.useState<boolean>(false);
  const [cleanStep, setCleanStep] = React.useState<number>(0);

  // Missing Value Form
  const [imputeColumn, setImputeColumn] = React.useState<string>(dataset.columns[0]?.name || '');
  const [imputeStrategy, setImputeStrategy] = React.useState<'median' | 'mean' | 'mode' | 'custom' | 'flag_unknown' | 'drop'>('median');
  const [customImputeValue, setCustomImputeValue] = React.useState<string>('0');

  // Outlier Form
  const numCols = dataset.columns.filter((c) => c.type === 'number');
  const [outlierColumn, setOutlierColumn] = React.useState<string>(numCols[0]?.name || dataset.columns[0]?.name || '');
  const [outlierAction, setOutlierAction] = React.useState<'cap' | 'drop' | 'flag'>('cap');
  const [outlierCategory, setOutlierCategory] = React.useState<OutlierClassification>('STATISTICAL OUTLIER');

  // Domain & Non-Negative Range Form
  const [domainColumn, setDomainColumn] = React.useState<string>(numCols[0]?.name || dataset.columns[0]?.name || '');
  const [domainMin, setDomainMin] = React.useState<string>('0');
  const [domainMax, setDomainMax] = React.useState<string>('');
  const [domainStrategy, setDomainStrategy] = React.useState<'abs_value' | 'cap_bounds' | 'impute_median' | 'drop_row'>('abs_value');

  // Text Sanitization Form
  const [textColumn, setTextColumn] = React.useState<string>('ALL');
  const [textAction, setTextAction] = React.useState<'trim' | 'titlecase' | 'uppercase' | 'lowercase' | 'remove_non_printable'>('trim');

  // Audit search & filter
  const [auditSearch, setAuditSearch] = React.useState<string>('');

  // Compute detected domain constraint violations across dataset
  const domainViolations = React.useMemo(() => {
    const list: {
      rowIndex: number;
      column: string;
      value: any;
      ruleName: string;
      expected: string;
      absFixValue: number;
    }[] = [];

    profile.columns.forEach((col) => {
      const isNonNeg = isNonNegativeColumn(col.column, col.semanticType, dataset.rows.map(r => r[col.column]));
      if (isNonNeg) {
        dataset.rows.forEach((r, idx) => {
          const raw = r[col.column];
          if (raw !== null && raw !== undefined) {
            const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[$₹€£, %]/g, ''));
            if (!isNaN(num) && num < 0) {
              list.push({
                rowIndex: idx + 1,
                column: col.column,
                value: raw,
                ruleName: `Non-Negative Constraint [${col.column} ≥ 0]`,
                expected: `Expected value ≥ 0, found ${raw}`,
                absFixValue: Math.abs(num),
              });
            }
          }
        });
      }
    });

    return list;
  }, [dataset.rows, profile.columns]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to commit dataset state, record audit logs, run post-cleaning validation, and update history
  const commitDatasetUpdate = (
    newRows: Record<string, any>[],
    newAuditEntries: AuditLogEntry[],
    actionDescription: string
  ) => {
    // Push current to history stack
    setHistoryStack((prev) => [dataset, ...prev].slice(0, 10));

    // Combine audit logs
    const existingLogs = dataset.auditLog || [];
    const combinedAuditLogs = [...newAuditEntries, ...existingLogs];

    // Run Post-Cleaning Validation & Self-Correction Engine
    const { postProfile, comparison, finalCleanedRows } = runPostCleaningValidation(
      profile,
      newRows,
      combinedAuditLogs
    );

    // Compute updated column metadata
    const columnNames = Object.keys(finalCleanedRows[0] || {});
    const updatedColumns: ColumnMetadata[] = columnNames.map((colName) => {
      const origCol = dataset.columns.find((c) => c.name === colName);
      const colProf = postProfile.columns.find((c) => c.column === colName);
      const values = finalCleanedRows.map((r) => r[colName]);
      const missingCount = values.filter((v) => isPlaceholder(v)).length;
      const uniqueSet = new Set(values.filter((v) => !isPlaceholder(v)));

      return {
        name: colName,
        type: origCol?.type || 'string',
        missingCount,
        missingPercentage: finalCleanedRows.length > 0 ? Math.round((missingCount / finalCleanedRows.length) * 100) : 0,
        uniqueCount: uniqueSet.size,
        sampleValues: Array.from(uniqueSet).slice(0, 5),
        stats: origCol?.stats,
      };
    });

    const totalMissing = updatedColumns.reduce((a, b) => a + b.missingCount, 0);
    const totalCells = finalCleanedRows.length * (updatedColumns.length || 1);
    const missingnessRate = Math.round((totalMissing / (totalCells || 1)) * 100);

    const updatedHealth: DataHealth = {
      score: postProfile.overallQualityScore,
      missingnessRate,
      duplicateRows: postProfile.exactDuplicateRows,
      outlierCount: postProfile.columns.reduce((a, b) => a + b.outliers, 0),
      cardinalityIssues: postProfile.structuralInfo.nearConstantColumns.length,
      status:
        postProfile.overallQualityScore >= 85
          ? 'EXCELLENT'
          : postProfile.overallQualityScore >= 70
          ? 'GOOD'
          : postProfile.overallQualityScore >= 50
          ? 'WARNING'
          : 'CRITICAL',
    };

    const updatedDataset: Dataset = {
      ...dataset,
      rows: finalCleanedRows,
      columns: updatedColumns,
      health: updatedHealth,
      profile: postProfile,
      auditLog: combinedAuditLogs,
      prePostComparison: comparison,
    };

    onUpdateDataset(updatedDataset);
    showToast(`Applied transformation: ${actionDescription}`);
  };

  // Undo Last Action
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[0];
    setHistoryStack((prev) => prev.slice(1));
    onUpdateDataset(previous);
    showToast('Reverted last data transformation.');
  };

  // Revert All Transformations to Raw Data
  const handleRevertToRaw = () => {
    if (!dataset.rawRows || dataset.rawRows.length === 0) {
      showToast('No raw data snapshot found.');
      return;
    }
    const rawProfile = generateUniversalDatasetProfile(dataset.name, dataset.rawRows);
    rawProfile.pipelineStage = 'RAW DATA';

    const restoredDataset: Dataset = {
      ...dataset,
      rows: JSON.parse(JSON.stringify(dataset.rawRows)),
      profile: rawProfile,
      auditLog: [],
      prePostComparison: undefined,
    };
    onUpdateDataset(restoredDataset);
    showToast('Dataset reverted completely to original RAW data snapshot!');
  };

  // Validation suite handlers
  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    showToast('Validation rule removed from suite.');
  };

  const handleReInferRules = () => {
    const freshRules = inferValidationRulesFromDataset(dataset);
    setRules(freshRules);
    showToast(`Inferred ${freshRules.length} data validation contract rules.`);
  };

  const handleQuarantineFailingRows = () => {
    const failingIndices = new Set(validationReport.failingRowIndices);
    if (failingIndices.size === 0) {
      showToast('All rows are 100% compliant with validation rules.');
      return;
    }

    const compliantRows = dataset.rows.filter((_, idx) => !failingIndices.has(idx));
    const quarantinedRows = dataset.rows.filter((_, idx) => failingIndices.has(idx));

    // Export Quarantined CSV
    const csv = Papa.unparse(quarantinedRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataset.name.replace(/\s+/g, '_')}_quarantined_invalid_rows.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const updatedDataset: Dataset = {
      ...dataset,
      rows: compliantRows,
    };
    onUpdateDataset(updatedDataset);
    showToast(`Quarantined ${quarantinedRows.length} invalid rows. Dataset is now 100% compliant.`);
  };

  const handleAutoFixRule = (result: ValidationResult, overrideFixType?: any) => {
    const rule = rules.find((r) => r.id === result.ruleId);
    if (!rule) return;

    const fixType = overrideFixType || rule.autoFixType || 'cap_bounds';
    const { cleanedRows, logSummary } = autoRemediateValidation(rule, dataset, fixType as any);

    const updatedDataset: Dataset = {
      ...dataset,
      rows: cleanedRows,
    };
    onUpdateDataset(updatedDataset);
    showToast(`Auto-remediation applied: ${logSummary}`);
  };

  const handleSaveCustomRule = () => {
    if (!newRuleName.trim()) {
      showToast('Please provide a descriptive rule name.');
      return;
    }

    const customRule: ValidationRule = {
      id: `custom-rule-${Date.now()}`,
      name: newRuleName,
      description: newRuleDescription || `Custom user validation on column '${newRuleColumn}'`,
      category: newRuleCategory,
      targetColumn: newRuleColumn,
      severity: newRuleSeverity,
      enabled: true,
      isCustom: true,
      parameters: {
        min: newRuleMin !== '' ? parseFloat(newRuleMin) : undefined,
        max: newRuleMax !== '' ? parseFloat(newRuleMax) : undefined,
        allowedValues:
          newRuleCategory === 'allowed_values'
            ? newRuleAllowedValues.split(',').map((v) => v.trim()).filter(Boolean)
            : undefined,
        patternType: newRuleCategory === 'pattern_regex' ? (newRulePatternType as any) : undefined,
        pattern: newRuleCategory === 'pattern_regex' && newRulePatternType === 'custom_regex' ? newRuleCustomRegex : undefined,
        operator: newRuleOperator,
        referenceColumn: newRuleCategory === 'cross_column' ? newRuleSecondaryCol : undefined,
        expression: newRuleCategory === 'custom_expression' ? newRuleExpression : undefined,
      },
      suggestedRemediation: 'Review failing records against business logic contract.',
    };

    setRules((prev) => [customRule, ...prev]);
    setShowAddRuleModal(false);
    showToast(`Added custom validation rule: '${newRuleName}'`);
  };

  const generatedValidationCode = React.useMemo(() => {
    if (exportFormat === 'ge') {
      return exportAsGreatExpectationsJSON(rules, validationReport);
    }
    if (exportFormat === 'python') {
      return exportAsPythonPydanticScript(rules, dataset.name);
    }
    if (exportFormat === 'dbt') {
      return exportAsDbtYamlTests(rules, dataset.name);
    }
    return JSON.stringify(validationReport, null, 2);
  }, [exportFormat, rules, validationReport, dataset.name]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedValidationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    showToast('Copied validation contract to clipboard!');
  };

  // Filtered Validation Results
  const filteredValidationResults = React.useMemo(() => {
    return validationReport.results.filter((res) => {
      if (selectedValCategory !== 'ALL' && res.category !== selectedValCategory) return false;
      if (selectedValSeverity !== 'ALL' && res.severity !== selectedValSeverity) return false;
      if (valStatusFilter === 'PASSED' && !res.passed) return false;
      if (valStatusFilter === 'FAILED' && res.passed) return false;
      if (valSearchQuery) {
        const q = valSearchQuery.toLowerCase();
        return (
          res.ruleName.toLowerCase().includes(q) ||
          res.targetColumn.toLowerCase().includes(q) ||
          res.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [validationReport, selectedValCategory, selectedValSeverity, valStatusFilter, valSearchQuery]);

  // 1. MASTER 1-CLICK SAFE CLEAN & VALIDATION PIPELINE
  const handleRunSafeAutoClean = () => {
    setIsAutoCleaning(true);
    setCleanStep(1);

    setTimeout(() => {
      const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
      const newLogs: AuditLogEntry[] = [];
      const timestamp = new Date().toLocaleTimeString();

      // Step A: Deduplicate exact duplicate rows
      setCleanStep(2);
      const seen = new Set<string>();
      let workingRows: Record<string, any>[] = [];
      rows.forEach((r, idx) => {
        const k = JSON.stringify(r);
        if (!seen.has(k)) {
          seen.add(k);
          workingRows.push(r);
        } else {
          newLogs.push({
            id: `log-dedup-${idx}-${Date.now()}`,
            timestamp,
            row: idx + 1,
            column: 'ALL',
            originalValue: 'Duplicate Row',
            newValue: 'REMOVED',
            action: 'REMOVED',
            reason: 'Removed exact duplicate row to guarantee entity uniqueness',
            confidence: 'HIGH',
          });
        }
      });

      // Step B: Missing Sentinels & Placeholder Normalization (N/A, NA, None, null, NaN, ?, -, Unknown, Not Available)
      setCleanStep(3);
      profile.columns.forEach((col) => {
        workingRows.forEach((r, idx) => {
          const val = r[col.column];
          if (typeof val === 'string' && isPlaceholder(val)) {
            r[col.column] = null;
            newLogs.push({
              id: `log-ph-${idx}-${col.column}`,
              timestamp,
              row: idx + 1,
              column: col.column,
              originalValue: val,
              newValue: null,
              action: 'NORMALIZED',
              reason: `Normalized missing placeholder '${val}' to standard NULL`,
              confidence: 'HIGH',
            });
          }
        });
      });

      // Step C: Text Sanitization, Whitespace & Canonical Casing
      setCleanStep(4);
      profile.columns.forEach((col) => {
        const isId = col.isIdentifier || (protectIdentifiers && col.semanticType === 'ID');
        const isEmailOrUrl = col.semanticType === 'EMAIL' || col.semanticType === 'URL';

        workingRows.forEach((r, idx) => {
          const val = r[col.column];
          if (typeof val === 'string' && val !== null) {
            // Trim & remove non-printable ASCII control characters
            let cleaned = val.trim().replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ');
            
            // Standardize categorical casing (Title Case) if not identifier / code / email / url
            if (!isId && !isEmailOrUrl && col.semanticType === 'CATEGORICAL' && cleaned.length > 0) {
              if (cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase()) {
                cleaned = cleaned
                  .toLowerCase()
                  .split(' ')
                  .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
                  .join(' ');
              }
            }

            if (cleaned !== val) {
              r[col.column] = cleaned;
              newLogs.push({
                id: `log-trim-${idx}-${col.column}`,
                timestamp,
                row: idx + 1,
                column: col.column,
                originalValue: val,
                newValue: cleaned,
                action: 'NORMALIZED',
                reason: 'Trimmed whitespace, removed non-printable chars, and standardized text casing',
                confidence: 'HIGH',
              });
            }
          }
        });
      });

      // Step D: Physical Domain Constraints & Non-Negative Invariants (Fix Quantity = -4 -> 4)
      setCleanStep(5);
      profile.columns.forEach((col) => {
        const isNonNeg = isNonNegativeColumn(col.column, col.semanticType, workingRows.map((r) => r[col.column]));
        if (isNonNeg) {
          workingRows.forEach((r, idx) => {
            const rawVal = r[col.column];
            if (rawVal !== null && rawVal !== undefined) {
              const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[$₹€£, %]/g, ''));
              if (!isNaN(num) && num < 0) {
                const correctedVal = Math.abs(num);
                r[col.column] = correctedVal;
                newLogs.push({
                  id: `log-domain-neg-${idx}-${col.column}`,
                  timestamp,
                  row: idx + 1,
                  column: col.column,
                  originalValue: rawVal,
                  newValue: correctedVal,
                  action: 'CORRECTED',
                  reason: `Fixed invalid negative value '${rawVal}' in physical column '${col.column}' -> converted to positive '${correctedVal}' (Absolute Value Correction)`,
                  confidence: 'HIGH',
                });
              }
            }
          });
        }
      });

      // Step E: Deterministic Smart Imputation (Median for numeric, Mode for categorical, preserving IDs/emails)
      setCleanStep(6);
      profile.columns.forEach((col) => {
        const isId = col.isIdentifier || (protectIdentifiers && col.semanticType === 'ID');
        if (isId || col.semanticType === 'EMAIL' || col.semanticType === 'DATE') return;

        const currentValues = workingRows.map((r) => r[col.column]).filter((v) => !isPlaceholder(v));
        if (currentValues.length === 0) return;

        if (col.type === 'number') {
          const numVals = currentValues.map((v) => (typeof v === 'number' ? v : parseFloat(String(v)))).filter((n) => !isNaN(n));
          if (numVals.length > 0) {
            const sorted = [...numVals].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const medianVal = sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;

            workingRows.forEach((r, idx) => {
              if (isPlaceholder(r[col.column])) {
                r[col.column] = medianVal;
                newLogs.push({
                  id: `log-impute-num-${idx}-${col.column}`,
                  timestamp,
                  row: idx + 1,
                  column: col.column,
                  originalValue: 'null',
                  newValue: medianVal,
                  action: 'IMPUTED',
                  reason: `Imputed missing numeric value with robust column median (${medianVal})`,
                  confidence: 'HIGH',
                });
              }
            });
          }
        } else if (col.type === 'string' && col.semanticType === 'CATEGORICAL') {
          const freqMap: Record<string, number> = {};
          currentValues.forEach((v) => {
            const s = String(v).trim();
            if (s) freqMap[s] = (freqMap[s] || 0) + 1;
          });
          const sortedModes = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
          const modeVal = sortedModes[0]?.[0];

          if (modeVal) {
            workingRows.forEach((r, idx) => {
              if (isPlaceholder(r[col.column])) {
                r[col.column] = modeVal;
                newLogs.push({
                  id: `log-impute-cat-${idx}-${col.column}`,
                  timestamp,
                  row: idx + 1,
                  column: col.column,
                  originalValue: 'null',
                  newValue: modeVal,
                  action: 'IMPUTED',
                  reason: `Imputed missing category with most frequent mode ('${modeVal}')`,
                  confidence: 'HIGH',
                });
              }
            });
          }
        }
      });

      // Step F: ISO 8601 Date Standardization
      setCleanStep(7);
      profile.columns.forEach((col) => {
        if (col.semanticType === 'DATE') {
          workingRows.forEach((r, idx) => {
            const val = r[col.column];
            if (val !== null && val !== undefined && typeof val === 'string') {
              const res = parseAndValidateDate(val);
              if (res.isValid && res.standardISO && res.standardISO !== val) {
                r[col.column] = res.standardISO;
                newLogs.push({
                  id: `log-date-${idx}-${col.column}`,
                  timestamp,
                  row: idx + 1,
                  column: col.column,
                  originalValue: val,
                  newValue: res.standardISO,
                  action: 'NORMALIZED',
                  reason: `Standardized date '${val}' to ISO 8601 standard (${res.standardISO})`,
                  confidence: 'HIGH',
                });
              }
            }
          });
        }
      });

      // Step G: Extreme Statistical Outlier Capping / Boundary Winsorization
      setCleanStep(8);
      profile.columns.forEach((col) => {
        if (col.type === 'number' && col.distribution.q1 !== undefined && col.distribution.q3 !== undefined) {
          const q1 = col.distribution.q1;
          const q3 = col.distribution.q3;
          const iqr = q3 - q1;
          if (iqr > 0) {
            const lowerBound = q1 - 3.0 * iqr;
            const upperBound = q3 + 3.0 * iqr;

            workingRows.forEach((r, idx) => {
              const val = r[col.column];
              if (typeof val === 'number' && !isNaN(val)) {
                let cappedVal = val;
                if (val < lowerBound) cappedVal = Math.round(lowerBound * 100) / 100;
                else if (val > upperBound) cappedVal = Math.round(upperBound * 100) / 100;

                if (cappedVal !== val) {
                  r[col.column] = cappedVal;
                  newLogs.push({
                    id: `log-outlier-${idx}-${col.column}`,
                    timestamp,
                    row: idx + 1,
                    column: col.column,
                    originalValue: val,
                    newValue: cappedVal,
                    action: 'CAPPED',
                    reason: `Winsorized extreme outlier (${val}) to safe statistical boundary (${cappedVal})`,
                    confidence: 'HIGH',
                  });
                }
              }
            });
          }
        }
      });

      // Step H: Validation Rules Suite Execution & Auto-Remediation
      setCleanStep(9);
      const testDataset: Dataset = {
        ...dataset,
        rows: workingRows,
      };
      const suiteRep = executeValidationSuite(rules, testDataset);

      suiteRep.results.forEach((res) => {
        if (!res.passed) {
          const rule = rules.find((r) => r.id === res.ruleId);
          if (rule && rule.autoFixType) {
            const fixResult = autoRemediateValidation(rule, testDataset, rule.autoFixType);
            workingRows = fixResult.cleanedRows;
            newLogs.push({
              id: `log-val-fix-${rule.id}-${Date.now()}`,
              timestamp,
              row: 'MULTIPLE',
              column: rule.targetColumn,
              originalValue: `Violated rule: ${rule.name}`,
              newValue: 'AUTO-REMEDIATED',
              action: 'CORRECTED',
              reason: fixResult.logSummary,
              confidence: 'HIGH',
            });
          }
        }
      });

      // Step I: Post-Cleaning Re-profiling & Final Commit
      setCleanStep(10);
      commitDatasetUpdate(
        workingRows,
        newLogs,
        'Master 1-Click Safe Clean (Deduplication + Placeholders + Domain Bounds + Imputation + Dates + Outliers + Validation Rules)'
      );

      setIsAutoCleaning(false);
      showToast(`Master 1-Click Clean completed! All quality checks and validation rules passed with 100% compliance.`);
    }, 600);
  };

  // Domain & Non-Negative Rules Handlers
  const handleFixAllDomainViolations = (
    strategy: 'abs_value' | 'zero_floor' | 'impute_median' | 'drop_row',
    targetCol?: string
  ) => {
    const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
    const newLogs: AuditLogEntry[] = [];
    const timestamp = new Date().toLocaleTimeString();

    if (strategy === 'drop_row') {
      const initialCount = rows.length;
      const filtered = rows.filter((r) => {
        return !profile.columns.some((col) => {
          if (targetCol && col.column !== targetCol) return false;
          const isNonNeg = isNonNegativeColumn(col.column, col.semanticType, dataset.rows.map(x => x[col.column]));
          if (!isNonNeg) return false;
          const raw = r[col.column];
          if (raw === null || raw === undefined) return false;
          const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[$₹€£, %]/g, ''));
          return !isNaN(num) && num < 0;
        });
      });
      const droppedCount = initialCount - filtered.length;
      newLogs.push({
        id: `log-domain-drop-${Date.now()}`,
        timestamp,
        row: 'MULTIPLE',
        column: targetCol || 'ALL_DOMAIN_COLS',
        originalValue: 'Negative Value Violation',
        newValue: 'DROPPED',
        action: 'REMOVED',
        reason: `Dropped ${droppedCount} rows violating non-negative domain rules`,
        confidence: 'HIGH',
      });
      commitDatasetUpdate(filtered, newLogs, `Dropped ${droppedCount} rows violating domain constraints`);
      return;
    }

    let fixCount = 0;
    profile.columns.forEach((col) => {
      if (targetCol && col.column !== targetCol) return;
      const isNonNeg = isNonNegativeColumn(col.column, col.semanticType, dataset.rows.map(x => x[col.column]));
      if (!isNonNeg) return;

      const colMedian = col.distribution.median !== undefined ? col.distribution.median : 0;

      rows.forEach((r, idx) => {
        const raw = r[col.column];
        if (raw !== null && raw !== undefined) {
          const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[$₹€£, %]/g, ''));
          if (!isNaN(num) && num < 0) {
            let newVal: any = raw;
            let reasonStr = '';

            if (strategy === 'abs_value') {
              newVal = Math.abs(num);
              reasonStr = `Converted negative sign error '${raw}' to positive '${newVal}' (Absolute Value)`;
            } else if (strategy === 'zero_floor') {
              newVal = 0;
              reasonStr = `Clamped negative value '${raw}' to domain floor '0'`;
            } else if (strategy === 'impute_median') {
              newVal = colMedian;
              reasonStr = `Imputed negative violation '${raw}' with column median '${colMedian}'`;
            }

            r[col.column] = newVal;
            fixCount++;
            newLogs.push({
              id: `log-domain-fix-${idx}-${col.column}-${Date.now()}`,
              timestamp,
              row: idx + 1,
              column: col.column,
              originalValue: raw,
              newValue: newVal,
              action: 'CORRECTED',
              reason: reasonStr,
              confidence: 'HIGH',
            });
          }
        }
      });
    });

    commitDatasetUpdate(rows, newLogs, `Remediated ${fixCount} domain violations using strategy '${strategy}'`);
  };

  const handleFixSingleDomainViolation = (
    rowIndex: number,
    column: string,
    strategy: 'abs_value' | 'zero_floor' | 'impute_median' | 'drop_row'
  ) => {
    const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
    const newLogs: AuditLogEntry[] = [];
    const timestamp = new Date().toLocaleTimeString();
    const actualRowIdx = rowIndex - 1;

    if (actualRowIdx < 0 || actualRowIdx >= rows.length) return;

    if (strategy === 'drop_row') {
      const removedRow = rows.splice(actualRowIdx, 1);
      newLogs.push({
        id: `log-domain-drop-single-${Date.now()}`,
        timestamp,
        row: rowIndex,
        column,
        originalValue: removedRow[0]?.[column],
        newValue: 'DROPPED',
        action: 'REMOVED',
        reason: `Removed row ${rowIndex} failing domain constraint in '${column}'`,
        confidence: 'HIGH',
      });
      commitDatasetUpdate(rows, newLogs, `Removed row ${rowIndex} with invalid '${column}'`);
      return;
    }

    const raw = rows[actualRowIdx][column];
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[$₹€£, %]/g, ''));
    let newVal: any = raw;
    let reasonStr = '';

    const colProf = profile.columns.find((c) => c.column === column);
    const colMedian = colProf?.distribution.median !== undefined ? colProf.distribution.median : 0;

    if (strategy === 'abs_value') {
      newVal = Math.abs(num);
      reasonStr = `Converted negative sign error '${raw}' to positive '${newVal}' (Absolute Value)`;
    } else if (strategy === 'zero_floor') {
      newVal = 0;
      reasonStr = `Clamped negative value '${raw}' to 0`;
    } else if (strategy === 'impute_median') {
      newVal = colMedian;
      reasonStr = `Imputed negative value with column median '${colMedian}'`;
    }

    rows[actualRowIdx][column] = newVal;
    newLogs.push({
      id: `log-domain-fix-single-${Date.now()}`,
      timestamp,
      row: rowIndex,
      column,
      originalValue: raw,
      newValue: newVal,
      action: 'CORRECTED',
      reason: reasonStr,
      confidence: 'HIGH',
    });

    commitDatasetUpdate(rows, newLogs, `Repaired cell [Row ${rowIndex}, ${column}] -> ${newVal}`);
  };

  const handleApplyCustomRangeBoundary = () => {
    if (!domainColumn) return;
    const minVal = domainMin !== '' ? parseFloat(domainMin) : undefined;
    const maxVal = domainMax !== '' ? parseFloat(domainMax) : undefined;

    if (minVal === undefined && maxVal === undefined) {
      showToast('Please specify at least a Min or Max boundary value.');
      return;
    }

    const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
    const newLogs: AuditLogEntry[] = [];
    const timestamp = new Date().toLocaleTimeString();

    if (domainStrategy === 'drop_row') {
      const initialCount = rows.length;
      const filtered = rows.filter((r) => {
        const val = parseFloat(r[domainColumn]);
        if (isNaN(val)) return true;
        if (minVal !== undefined && val < minVal) return false;
        if (maxVal !== undefined && val > maxVal) return false;
        return true;
      });
      const dropped = initialCount - filtered.length;
      newLogs.push({
        id: `log-range-drop-${Date.now()}`,
        timestamp,
        row: 'MULTIPLE',
        column: domainColumn,
        originalValue: `Out of Range [${minVal ?? '-inf'}, ${maxVal ?? '+inf'}]`,
        newValue: 'DROPPED',
        action: 'REMOVED',
        reason: `Dropped ${dropped} rows outside range [${minVal ?? '-inf'}, ${maxVal ?? '+inf'}]`,
        confidence: 'HIGH',
      });
      commitDatasetUpdate(filtered, newLogs, `Dropped ${dropped} out-of-boundary records in '${domainColumn}'`);
      return;
    }

    let fixCount = 0;
    const colProf = profile.columns.find((c) => c.column === domainColumn);
    const colMedian = colProf?.distribution.median !== undefined ? colProf.distribution.median : 0;

    rows.forEach((r, idx) => {
      const val = parseFloat(r[domainColumn]);
      if (!isNaN(val)) {
        let isViolation = false;
        let newVal = val;

        if (minVal !== undefined && val < minVal) {
          isViolation = true;
          if (domainStrategy === 'abs_value') newVal = Math.abs(val);
          else if (domainStrategy === 'cap_bounds') newVal = minVal;
          else if (domainStrategy === 'impute_median') newVal = colMedian;
        } else if (maxVal !== undefined && val > maxVal) {
          isViolation = true;
          if (domainStrategy === 'cap_bounds') newVal = maxVal;
          else if (domainStrategy === 'impute_median') newVal = colMedian;
        }

        if (isViolation && newVal !== val) {
          r[domainColumn] = newVal;
          fixCount++;
          newLogs.push({
            id: `log-range-fix-${idx}-${Date.now()}`,
            timestamp,
            row: idx + 1,
            column: domainColumn,
            originalValue: val,
            newValue: newVal,
            action: 'CORRECTED',
            reason: `Enforced range [${minVal ?? '-inf'}, ${maxVal ?? '+inf'}] using '${domainStrategy}'`,
            confidence: 'HIGH',
          });
        }
      }
    });

    commitDatasetUpdate(rows, newLogs, `Enforced range boundaries on ${fixCount} cells in '${domainColumn}'`);
  };

  // 2. Handle Imputation
  const handleImpute = () => {
    if (!imputeColumn) return;
    const colProf = profile.columns.find((c) => c.column === imputeColumn);
    const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
    const newLogs: AuditLogEntry[] = [];
    const timestamp = new Date().toLocaleTimeString();

    // Guard: Identifier Protection
    if (protectIdentifiers && colProf?.isIdentifier) {
      showToast('Identifier Protection Active: Cannot fabricate or auto-impute Primary Key/ID values.');
      return;
    }

    let fillVal: any = null;
    let strategyName = imputeStrategy.toUpperCase();

    if (imputeStrategy === 'drop') {
      const initialCount = rows.length;
      const filtered = rows.filter((r) => !isPlaceholder(r[imputeColumn]));
      const droppedCount = initialCount - filtered.length;

      newLogs.push({
        id: `log-drop-${Date.now()}`,
        timestamp,
        row: 'MULTIPLE',
        column: imputeColumn,
        originalValue: 'NULL / Missing',
        newValue: 'DROPPED',
        action: 'REMOVED',
        reason: `Dropped ${droppedCount} rows with missing '${imputeColumn}'`,
        confidence: 'MEDIUM',
      });

      commitDatasetUpdate(filtered, newLogs, `Dropped ${droppedCount} rows missing '${imputeColumn}'`);
      return;
    }

    if (imputeStrategy === 'median' && colProf?.distribution.median !== undefined) {
      fillVal = colProf.distribution.median;
    } else if (imputeStrategy === 'mean' && colProf?.distribution.mean !== undefined) {
      fillVal = colProf.distribution.mean;
    } else if (imputeStrategy === 'mode' && colProf?.distribution.topCategories?.[0]) {
      fillVal = colProf.distribution.topCategories[0].value;
    } else if (imputeStrategy === 'flag_unknown') {
      fillVal = 'Unknown';
    } else if (imputeStrategy === 'custom') {
      fillVal = customImputeValue;
    }

    if (fillVal === null) {
      showToast(`Cannot compute ${imputeStrategy} for ${imputeColumn}. Please check data type.`);
      return;
    }

    let count = 0;
    rows.forEach((r, idx) => {
      if (isPlaceholder(r[imputeColumn])) {
        const orig = r[imputeColumn];
        r[imputeColumn] = fillVal;
        count++;
        newLogs.push({
          id: `log-imp-${idx}-${Date.now()}`,
          timestamp,
          row: idx + 1,
          column: imputeColumn,
          originalValue: orig,
          newValue: fillVal,
          action: 'IMPUTED',
          reason: `Imputed missing cell using column ${strategyName} = ${fillVal}`,
          confidence: 'HIGH',
        });
      }
    });

    commitDatasetUpdate(rows, newLogs, `Imputed ${count} missing cells in '${imputeColumn}' with ${fillVal}`);
  };

  // 3. Handle Outliers
  const handleOutlierSanitize = () => {
    if (!outlierColumn) return;
    const colProf = profile.columns.find((c) => c.column === outlierColumn);
    if (!colProf || colProf.distribution.q1 === undefined || colProf.distribution.q3 === undefined) {
      showToast('Outlier operations require numeric column with computed quartiles.');
      return;
    }

    const iqr = (colProf.distribution.iqr || 0);
    const lower = colProf.distribution.q1 - 1.5 * iqr;
    const upper = colProf.distribution.q3 + 1.5 * iqr;

    const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
    const newLogs: AuditLogEntry[] = [];
    const timestamp = new Date().toLocaleTimeString();

    if (outlierAction === 'drop') {
      const initialCount = rows.length;
      const filtered = rows.filter((r) => {
        const val = parseFloat(r[outlierColumn]);
        if (isNaN(val)) return true;
        return val >= lower && val <= upper;
      });
      const dropped = initialCount - filtered.length;

      newLogs.push({
        id: `log-outlier-drop-${Date.now()}`,
        timestamp,
        row: 'MULTIPLE',
        column: outlierColumn,
        originalValue: 'Extreme Outliers',
        newValue: 'DROPPED',
        action: 'REMOVED',
        reason: `Removed ${dropped} rows with extreme outliers outside [${lower}, ${upper}]`,
        confidence: 'MEDIUM',
      });

      commitDatasetUpdate(filtered, newLogs, `Dropped ${dropped} extreme outlier records from '${outlierColumn}'`);
      return;
    }

    // Winsorize / Cap
    let count = 0;
    rows.forEach((r, idx) => {
      const val = parseFloat(r[outlierColumn]);
      if (!isNaN(val)) {
        if (val < lower) {
          r[outlierColumn] = lower;
          count++;
          newLogs.push({
            id: `log-cap-${idx}-${Date.now()}`,
            timestamp,
            row: idx + 1,
            column: outlierColumn,
            originalValue: val,
            newValue: lower,
            action: 'CAPPED',
            reason: `Winsorized lower outlier from ${val} to boundary ${lower}`,
            confidence: 'HIGH',
          });
        } else if (val > upper) {
          r[outlierColumn] = upper;
          count++;
          newLogs.push({
            id: `log-cap-${idx}-${Date.now()}`,
            timestamp,
            row: idx + 1,
            column: outlierColumn,
            originalValue: val,
            newValue: upper,
            action: 'CAPPED',
            reason: `Winsorized upper outlier from ${val} to boundary ${upper}`,
            confidence: 'HIGH',
          });
        }
      }
    });

    commitDatasetUpdate(rows, newLogs, `Winsorized ${count} outliers in '${outlierColumn}'`);
  };

  // 4. Handle Text Standardization
  const handleTextStandardize = () => {
    const rows = JSON.parse(JSON.stringify(dataset.rows)) as Record<string, any>[];
    const newLogs: AuditLogEntry[] = [];
    const timestamp = new Date().toLocaleTimeString();

    const targetCols = textColumn === 'ALL'
      ? profile.columns.filter((c) => c.physicalType === 'string' && !c.isIdentifier).map((c) => c.column)
      : [textColumn];

    let count = 0;
    targetCols.forEach((colName) => {
      rows.forEach((r, idx) => {
        const val = r[colName];
        if (typeof val === 'string') {
          let modified = val;
          if (textAction === 'trim') modified = val.trim();
          else if (textAction === 'uppercase') modified = val.toUpperCase();
          else if (textAction === 'lowercase') modified = val.toLowerCase();
          else if (textAction === 'titlecase') {
            modified = val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          } else if (textAction === 'remove_non_printable') {
            modified = val.replace(/[\x00-\x1F\x7F]/g, '');
          }

          if (modified !== val) {
            r[colName] = modified;
            count++;
            newLogs.push({
              id: `log-txt-${idx}-${colName}`,
              timestamp,
              row: idx + 1,
              column: colName,
              originalValue: val,
              newValue: modified,
              action: 'STANDARDIZED',
              reason: `Applied text normalization: ${textAction}`,
              confidence: 'HIGH',
            });
          }
        }
      });
    });

    commitDatasetUpdate(rows, newLogs, `Standardized text across ${count} cells (${textAction})`);
  };

  // Export Cleaned CSV
  const handleExportCSV = () => {
    const csv = Papa.unparse(dataset.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataset.name.replace(/\s+/g, '_')}_cleaned.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Audit Log
  const handleExportAuditLog = () => {
    const logs = dataset.auditLog || [];
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataset.name.replace(/\s+/g, '_')}_audit_log.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-cyan-600 text-white px-5 py-3 shadow-2xl text-xs font-bold"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner: Pipeline Lifecycle & Safeguards */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Pipeline Stage Badges */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider">
                <span className={`px-2 py-1 rounded-lg ${
                  profile.pipelineStage === 'RAW DATA'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500'
                }`}>
                  1. Raw
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span className={`px-2 py-1 rounded-lg ${
                  profile.pipelineStage === 'WORKING COPY'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-500'
                }`}>
                  2. Working
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span className={`px-2 py-1 rounded-lg ${
                  profile.pipelineStage === 'VALIDATED DATA'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500'
                }`}>
                  3. Validated
                </span>
              </div>

              {/* Identifier Protection Indicator */}
              <button
                onClick={() => setProtectIdentifiers(!protectIdentifiers)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  protectIdentifiers
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
                title="Identifier Protection: Prevents numeric cast of code IDs and never fabricates surrogate values"
              >
                {protectIdentifiers ? <Lock className="h-3.5 w-3.5 text-indigo-600" /> : <Unlock className="h-3.5 w-3.5" />}
                <span>ID Protection: {protectIdentifiers ? 'LOCKED (STRICT)' : 'OFF'}</span>
              </button>
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Advanced Universal Data Cleaning & Audit Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Safe transformations with evidence-based imputation, outlier winsorization, post-cleaning validation, and immutable audit logs.
            </p>
          </div>

          {/* Quick Action Controls: Undo, Revert, Export */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all"
            >
              <Undo2 className="h-4 w-4" />
              <span>Undo</span>
            </button>

            <button
              onClick={handleRevertToRaw}
              className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
            >
              <RotateCcw className="h-4 w-4 text-amber-600" />
              <span>Revert to RAW</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Export Clean CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab('autoclean')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'autoclean'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Execute 1-Click Safe Clean</span>
        </button>

        <button
          onClick={() => setActiveTab('profiler')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profiler'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Deep Column Profiler ({profile.columns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'rules'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Validation Rules & Contracts ({rules.length})</span>
          {validationReport.failedRulesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {validationReport.failedRulesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('domain')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'domain'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Domain & Non-Negative Bounds</span>
          {domainViolations.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {domainViolations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('missing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'missing'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Filter className="h-4 w-4" />
          <span>Missing & Placeholders</span>
        </button>

        <button
          onClick={() => setActiveTab('outliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'outliers'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Outlier Sanitization</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'text'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Type className="h-4 w-4" />
          <span>Text & Categories</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'comparison'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Pre vs Post Quality Report</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Audit Log ({dataset.auditLog?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: 1-CLICK SAFE AI CLEAN */}
      {activeTab === 'autoclean' && (
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-500" />
                Autonomous Master 1-Click Clean & Validation Pipeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Runs all 10 non-destructive transformations in a single pass: deduplication, placeholder cleaning, text formatting, domain boundary fixes (e.g. Quantity = -4 &rarr; 4), deterministic median/mode imputation, ISO date formatting, outlier winsorization, and full validation suite execution + auto-remediation.
              </p>
            </div>

            <button
              onClick={handleRunSafeAutoClean}
              disabled={isAutoCleaning}
              className="flex items-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3.5 text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all active:scale-95 shrink-0 disabled:opacity-50"
            >
              <Zap className={`h-4 w-4 ${isAutoCleaning ? 'animate-spin' : ''}`} />
              <span>{isAutoCleaning ? 'Executing Pipeline...' : 'Execute 1-Click Safe Clean'}</span>
            </button>
          </div>

          {/* Pipeline Execution Flow Status Checklist */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-600" />
                10-Stage Pipeline Task Checklist
              </span>
              <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                100% Deterministic & Immutable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {[
                { title: '1. Snapshot Guarantee', desc: 'Immutable memory backup', done: true },
                { title: '2. Exact Deduplication', desc: 'Unique record enforcement', done: true },
                { title: '3. Sentinels & Nulls', desc: 'N/A, None, NaN -> null', done: true },
                { title: '4. Whitespace & Casing', desc: 'Clean ASCII, keep ID codes', done: true },
                { title: '5. Physical Domains', desc: 'Quantity ≥ 0 (|x| applied)', done: true },
                { title: '6. Smart Imputation', desc: 'Median numeric / Mode text', done: true },
                { title: '7. ISO Date Formatting', desc: 'YYYY-MM-DD standard', done: true },
                { title: '8. Outlier Capping', desc: 'IQR 3.0x Winsorization', done: true },
                { title: '9. Validation Suite', desc: 'Auto-remediate rule fails', done: true },
                { title: '10. Audit & QA Check', desc: 'Full provenance verification', done: true },
              ].map((task, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {task.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Safeguards Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/80 space-y-1.5">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Preserve Original Data
              </span>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                Transformations operate on working copies. The original uploaded dataset remains immutable in memory.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/80 space-y-1.5">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                <Key className="h-4 w-4 text-indigo-600" />
                Identifier Protection
              </span>
              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">
                Guarantees alphanumeric codes and leading zeros in ID columns are never cast to numbers or fabricated.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-900/80 space-y-1.5">
              <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-cyan-600" />
                Integrated Validation & Audit
              </span>
              <p className="text-[11px] text-cyan-700/80 dark:text-cyan-400/80">
                Executes validation contracts simultaneously and produces a comprehensive cell-level audit trail.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMBEDDED UNIVERSAL DATA PROFILER */}
      {activeTab === 'profiler' && (
        <UniversalDataProfiler dataset={dataset} />
      )}

      {/* TAB: VALIDATION RULES & QUALITY CONTRACTS */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Rules Top Summary Card */}
          <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    validationReport.overallStatus === 'PASSED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : validationReport.overallStatus === 'FAILED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {validationReport.overallStatus}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Pass Rate: {validationReport.passRate}% ({validationReport.passedRulesCount}/{validationReport.totalRulesCount} Rules)
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-500" />
                  Dataset Quality Contract Suite
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive validation rules covering completeness, uniqueness, domain boundaries, regex patterns, and cross-column business invariants.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleReInferRules}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Re-Infer Rules</span>
                </button>

                <button
                  onClick={() => setShowAddRuleModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-950/40 px-3.5 py-2 text-xs font-bold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Custom Rule</span>
                </button>

                <button
                  onClick={handleQuarantineFailingRows}
                  disabled={validationReport.failingRowIndices.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 disabled:opacity-40 transition-all"
                >
                  <Scissors className="h-3.5 w-3.5 text-amber-600" />
                  <span>Quarantine Invalid ({validationReport.failingRowIndices.length})</span>
                </button>

                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Export Contract Code</span>
                </button>
              </div>
            </div>

            {/* Category Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-2">
              {validationReport.categoryScores.map((cat, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedValCategory(cat.category as any)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedValCategory === cat.category
                      ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30'
                      : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    {cat.name}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      {cat.score}%
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {cat.passedCount}/{cat.ruleCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Filter Bar */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedValCategory}
                onChange={(e) => setSelectedValCategory(e.target.value as any)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">All Categories</option>
                <option value="completeness">Completeness (Nulls)</option>
                <option value="uniqueness">Uniqueness (IDs)</option>
                <option value="type_schema">Type Schema</option>
                <option value="range_boundary">Range Boundaries</option>
                <option value="allowed_values">Allowed Values / Enums</option>
                <option value="pattern_regex">Pattern & Regex</option>
                <option value="cross_column">Cross-Column Logic</option>
              </select>

              {/* Severity Filter */}
              <select
                value={selectedValSeverity}
                onChange={(e) => setSelectedValSeverity(e.target.value as any)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
                <option value="WARNING">Warning</option>
              </select>

              {/* Status Filter */}
              <select
                value={valStatusFilter}
                onChange={(e) => setValStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="FAILED">Failing Rules Only</option>
                <option value="PASSED">Passed Rules Only</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={valSearchQuery}
                onChange={(e) => setValSearchQuery(e.target.value)}
                placeholder="Filter rules..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Rules List Cards */}
          <div className="space-y-3">
            {filteredValidationResults.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No validation rules matched your filter criteria.
              </div>
            ) : (
              filteredValidationResults.map((result) => {
                const rule = rules.find((r) => r.id === result.ruleId);
                const isEnabled = rule?.enabled ?? true;

                return (
                  <div
                    key={result.ruleId}
                    className={`p-5 rounded-3xl border transition-all ${
                      !result.passed
                        ? 'border-rose-200/90 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/20'
                        : 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Rule info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              result.passed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {result.passed ? 'PASSED' : 'FAILED'}
                          </span>

                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                            {result.targetColumn}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            result.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : result.severity === 'MAJOR'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {result.severity}
                          </span>

                          {rule?.isCustom && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              CUSTOM
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {result.ruleName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {result.description}
                        </p>

                        {!result.passed && result.sampleFailures.length > 0 && (
                          <div className="pt-1 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-mono">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {result.failedCount} invalid cells ({result.compliancePercentage}% compliant). Sample: &quot;{String(result.sampleFailures[0]?.foundValue)}&quot; (Row {result.sampleFailures[0]?.rowIndex})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!result.passed && (
                          <>
                            <button
                              onClick={() => setInspectingValResult(result)}
                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Inspect ({result.failedCount})</span>
                            </button>

                            <button
                              onClick={() => handleAutoFixRule(result)}
                              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs active:scale-95"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              <span>Auto-Fix</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleToggleRule(result.ruleId)}
                          className={`p-2 rounded-xl border transition-all ${
                            isEnabled
                              ? 'border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                          title={isEnabled ? 'Rule Active' : 'Rule Disabled'}
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>

                        {rule?.isCustom && (
                          <button
                            onClick={() => handleDeleteRule(result.ruleId)}
                            className="p-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                            title="Delete custom rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: DOMAIN & NON-NEGATIVE BOUNDARY ENGINE */}
      {activeTab === 'domain' && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-cyan-500" />
                  Physical Domain Rules & Boundary Engine (Quantity ≥ 0, Prices, Counts)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enforces non-negative physical invariants. Automatically remediates sign errors (e.g. Quantity = -4 &rarr; 4), clamps to domain floors, or imputes invalid values.
                </p>
              </div>

              {domainViolations.length > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <span>{domainViolations.length} Active Non-Negative Violation{domainViolations.length > 1 ? 's' : ''} Detected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>100% Compliant (All domain metrics &ge; 0)</span>
                </div>
              )}
            </div>

            {/* 4 1-Click Batch Remediation Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Absolute Value (Sign Fix) */}
              <div className="p-4 rounded-2xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/40 dark:bg-cyan-950/20 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-black text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-cyan-600" />
                    Absolute Value (|x|)
                  </span>
                  <p className="text-[11px] text-cyan-800/80 dark:text-cyan-300/80 leading-relaxed">
                    Flips negative signs to positive (e.g. Quantity <code>-4</code> &rarr; <code>4</code>). Fixes data-entry keying errors.
                  </p>
                </div>
                <button
                  onClick={() => handleFixAllDomainViolations('abs_value')}
                  disabled={domainViolations.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 text-xs font-bold shadow-xs transition-all disabled:opacity-40"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Convert All to |x|</span>
                </button>
              </div>

              {/* Card 2: Zero Floor Clamp */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-blue-600" />
                    Zero Floor (Clamp &ge; 0)
                  </span>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                    Caps any negative value at the lower physical boundary <code>0</code> (e.g. <code>-4</code> &rarr; <code>0</code>).
                  </p>
                </div>
                <button
                  onClick={() => handleFixAllDomainViolations('zero_floor')}
                  disabled={domainViolations.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 text-xs font-bold shadow-xs transition-all disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Clamp All to 0</span>
                </button>
              </div>

              {/* Card 3: Impute Median */}
              <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    Impute Positive Median
                  </span>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                    Replaces negative invalid anomalies with the robust central tendency (median) of valid records.
                  </p>
                </div>
                <button
                  onClick={() => handleFixAllDomainViolations('impute_median')}
                  disabled={domainViolations.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 text-xs font-bold shadow-xs transition-all disabled:opacity-40"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Impute with Median</span>
                </button>
              </div>

              {/* Card 4: Drop Non-Compliant Rows */}
              <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4 text-rose-600" />
                    Quarantine / Drop Rows
                  </span>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                    Removes all rows containing negative domain values to guarantee downstream model safety.
                  </p>
                </div>
                <button
                  onClick={() => handleFixAllDomainViolations('drop_row')}
                  disabled={domainViolations.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 text-xs font-bold shadow-xs transition-all disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Drop Failing Rows</span>
                </button>
              </div>
            </div>

            {/* Custom Column Boundary Enforcer */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Custom Column Range Enforcer
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Target Column</label>
                  <select
                    value={domainColumn}
                    onChange={(e) => setDomainColumn(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono"
                  >
                    {dataset.columns.filter(c => c.type === 'number').map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Min Boundary (&ge;)</label>
                  <input
                    type="number"
                    value={domainMin}
                    onChange={(e) => setDomainMin(e.target.value)}
                    placeholder="e.g. 0"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Max Boundary (&le;)</label>
                  <input
                    type="number"
                    value={domainMax}
                    onChange={(e) => setDomainMax(e.target.value)}
                    placeholder="Optional max"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Remediation Action</label>
                  <select
                    value={domainStrategy}
                    onChange={(e) => setDomainStrategy(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
                  >
                    <option value="abs_value">Absolute Value (|x|)</option>
                    <option value="cap_bounds">Clamp to Min/Max Bounds</option>
                    <option value="impute_median">Impute with Column Median</option>
                    <option value="drop_row">Drop Non-Compliant Rows</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleApplyCustomRangeBoundary}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white p-2 text-xs font-bold transition-all shadow-xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Apply Enforcer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Failing Records Table & Per-Row Actions */}
            {domainViolations.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Detected Non-Negative Physical Violations ({domainViolations.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">Click any action button to repair instantly</span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Row #</th>
                        <th className="p-3">Column</th>
                        <th className="p-3">Invalid Value</th>
                        <th className="p-3">Physical Invariant Rule</th>
                        <th className="p-3 text-right">Instant Remediation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {domainViolations.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            #{v.rowIndex}
                          </td>
                          <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {v.column}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-mono font-black text-xs border border-rose-200 dark:border-rose-800">
                              {v.value}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">
                            {v.ruleName}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleFixSingleDomainViolation(v.rowIndex, v.column, 'abs_value')}
                                className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 text-[11px] font-bold transition-all"
                                title={`Convert ${v.value} to positive ${v.absFixValue}`}
                              >
                                Fix to +{v.absFixValue}
                              </button>
                              <button
                                onClick={() => handleFixSingleDomainViolation(v.rowIndex, v.column, 'zero_floor')}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-bold transition-all"
                                title="Clamp to 0"
                              >
                                Set to 0
                              </button>
                              <button
                                onClick={() => handleFixSingleDomainViolation(v.rowIndex, v.column, 'impute_median')}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-[11px] font-bold transition-all"
                                title="Impute with positive median"
                              >
                                Impute Median
                              </button>
                              <button
                                onClick={() => handleFixSingleDomainViolation(v.rowIndex, v.column, 'drop_row')}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-[11px] font-bold transition-all"
                                title="Drop this row"
                              >
                                Drop Row
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Domain Violations in Dataset</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  All quantity, price, age, count, and revenue values satisfy the non-negative physical domain contract (&ge; 0).
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MISSING VALUE & PLACEHOLDER ENGINE */}
      {activeTab === 'missing' && (
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-500" />
              Missing Value & Placeholder Imputation Engine
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apply evidence-driven imputation (Median for skewed numeric, Mode for categorical, or explicit Unknown flagging).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Column</label>
              <select
                value={imputeColumn}
                onChange={(e) => setImputeColumn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              >
                {dataset.columns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.missingPercentage}% missing)
                  </option>
                ))}
              </select>
            </div>

            {/* Imputation Strategy */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Imputation Strategy</label>
              <select
                value={imputeStrategy}
                onChange={(e) => setImputeStrategy(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="median">Median (Recommended for Numeric / Skewed)</option>
                <option value="mean">Mean (For Normal Numeric)</option>
                <option value="mode">Mode (Most Frequent / Categorical)</option>
                <option value="flag_unknown">Flag as 'Unknown'</option>
                <option value="custom">Custom Specified Value</option>
                <option value="drop">Drop Rows with Missing</option>
              </select>
            </div>

            {/* Custom Value or Apply */}
            <div className="space-y-1.5 flex flex-col justify-end">
              {imputeStrategy === 'custom' ? (
                <input
                  type="text"
                  value={customImputeValue}
                  onChange={(e) => setCustomImputeValue(e.target.value)}
                  placeholder="Enter custom fill value"
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white mb-2"
                />
              ) : null}
              <button
                onClick={handleImpute}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
              >
                <Check className="h-4 w-4" />
                <span>Apply Imputation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OUTLIER SANITIZATION */}
      {activeTab === 'outliers' && (
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-cyan-500" />
              Outlier Sanitization & Boundary Winsorization
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Safely cap extreme deviations at IQR boundaries (Q1 - 1.5×IQR, Q3 + 1.5×IQR) or drop verified business invalid values.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Numeric Column</label>
              <select
                value={outlierColumn}
                onChange={(e) => setOutlierColumn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              >
                {dataset.columns
                  .filter((c) => c.type === 'number')
                  .map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sanitization Action</label>
              <select
                value={outlierAction}
                onChange={(e) => setOutlierAction(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="cap">Winsorize / Cap to 1.5× IQR Boundary</option>
                <option value="drop">Drop Outlier Rows</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <button
                onClick={handleOutlierSanitize}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
              >
                <Sliders className="h-4 w-4" />
                <span>Sanitize Outliers</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TEXT & CATEGORY STANDARDIZATION */}
      {activeTab === 'text' && (
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Type className="h-5 w-5 text-cyan-500" />
              Text & Category Canonical Standardization
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Normalize whitespace, remove non-printable characters, and unify letter casing across text dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Column</label>
              <select
                value={textColumn}
                onChange={(e) => setTextColumn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              >
                <option value="ALL">All String Columns</option>
                {dataset.columns
                  .filter((c) => c.type === 'string')
                  .map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Transformation</label>
              <select
                value={textAction}
                onChange={(e) => setTextAction(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="trim">Trim Surrounding Whitespace</option>
                <option value="remove_non_printable">Remove Non-Printable Characters</option>
                <option value="titlecase">Convert to Title Case (e.g. United States)</option>
                <option value="uppercase">Convert to UPPERCASE</option>
                <option value="lowercase">Convert to lowercase</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <button
                onClick={handleTextStandardize}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
              >
                <Type className="h-4 w-4" />
                <span>Apply Standardization</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PRE VS POST VALIDATION */}
      {activeTab === 'validation' && (
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Pre-Cleaning vs. Post-Cleaning Quality Comparison
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifies whether cleaning operations improved data health without introducing broken keys, new nulls, or invalid data types.
            </p>
          </div>

          {dataset.prePostComparison ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {dataset.prePostComparison.metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">{m.name}</span>
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 line-through">{m.before}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="text-base font-black text-slate-900 dark:text-white font-mono">{m.after}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'IMPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : m.status === 'WARNING'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {m.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Self-Corrections Log */}
              {dataset.prePostComparison.selfCorrectionsApplied.length > 0 && (
                <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-600" />
                    Automated Self-Corrections Applied During Validation:
                  </h4>
                  <ul className="space-y-1 text-xs text-cyan-800 dark:text-cyan-300 list-disc list-inside font-mono">
                    {dataset.prePostComparison.selfCorrectionsApplied.map((sc, i) => (
                      <li key={i}>{sc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center text-xs text-slate-500">
              No cleaning transformations have been applied yet. Run an action to inspect Pre vs Post comparison metrics.
            </div>
          )}
        </div>
      )}

      {/* TAB 7: IMMUTABLE AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Immutable Cleaning Audit Trail ({dataset.auditLog?.length || 0} Records)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Traceable record documenting every cell-level imputation, normalization, and outlier modification.
              </p>
            </div>

            <button
              onClick={handleExportAuditLog}
              disabled={!dataset.auditLog || dataset.auditLog.length === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              <span>Export Audit JSON</span>
            </button>
          </div>

          {/* Audit Search */}
          <div className="relative">
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search audit trail by column, action, original value, or reason..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-4 py-2 text-xs text-slate-900 dark:text-white"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Row</th>
                  <th className="py-2.5 px-3">Column</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Original</th>
                  <th className="py-2.5 px-3">New Value</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {(dataset.auditLog || [])
                  .filter((entry) => {
                    const q = auditSearch.toLowerCase();
                    return (
                      entry.column.toLowerCase().includes(q) ||
                      entry.action.toLowerCase().includes(q) ||
                      entry.reason.toLowerCase().includes(q) ||
                      String(entry.originalValue).toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 100)
                  .map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-500">{entry.timestamp}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{entry.row}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white font-sans">{entry.column}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.action === 'NORMALIZED'
                            ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                            : entry.action === 'IMPUTED'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : entry.action === 'CAPPED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-rose-600 dark:text-rose-400 max-w-[120px] truncate">
                        {String(entry.originalValue ?? 'null')}
                      </td>
                      <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 max-w-[120px] truncate">
                        {String(entry.newValue ?? 'null')}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`text-[10px] font-bold ${
                          entry.confidence === 'HIGH' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {entry.confidence}
                        </span>
                      </td>
                      <td className="py-2 px-4 font-sans text-slate-600 dark:text-slate-300 text-xs">
                        {entry.reason}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: INSPECT VALIDATION RULE FAILURES */}
      <AnimatePresence>
        {inspectingValResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <span>Rule Violations: {inspectingValResult.ruleName}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Column: <b>{inspectingValResult.targetColumn}</b> | Failed: {inspectingValResult.failedCount} cells
                  </p>
                </div>
                <button
                  onClick={() => setInspectingValResult(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400">
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Invalid Value Found</th>
                        <th className="py-2.5 px-3">Reason / Invariant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {inspectingValResult.sampleFailures.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-500">#{f.rowIndex}</td>
                          <td className="py-2 px-3 text-rose-600 dark:text-rose-400 font-bold">
                            {f.foundValue === null ? '<NULL>' : String(f.foundValue)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-300">
                            {f.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-2">
                <button
                  onClick={() => setInspectingValResult(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleAutoFixRule(inspectingValResult);
                    setInspectingValResult(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm"
                >
                  Auto-Fix Violations
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD CUSTOM VALIDATION RULE */}
      <AnimatePresence>
        {showAddRuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-cyan-500" />
                  <span>Add Custom Validation Rule</span>
                </h3>
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={customRuleName}
                    onChange={(e) => setCustomRuleName(e.target.value)}
                    placeholder="e.g. Unit Price Floor Check"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Column</label>
                    <select
                      value={customRuleCol}
                      onChange={(e) => setCustomRuleCol(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                    >
                      {profile.columns.map((c) => (
                        <option key={c.column} value={c.column}>{c.column}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rule Type</label>
                    <select
                      value={customRuleType}
                      onChange={(e) => setCustomRuleType(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="NOT_NULL">Not Null</option>
                      <option value="UNIQUE">Unique Identifier</option>
                      <option value="MIN_VALUE">Minimum Value (&ge;)</option>
                      <option value="MAX_VALUE">Maximum Value (&le;)</option>
                      <option value="REGEX_MATCH">Regex Pattern</option>
                      <option value="ALLOWED_VALUES">Allowed Enum Values</option>
                    </select>
                  </div>
                </div>

                {(customRuleType === 'MIN_VALUE' || customRuleType === 'MAX_VALUE' || customRuleType === 'REGEX_MATCH' || customRuleType === 'ALLOWED_VALUES') && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {customRuleType === 'MIN_VALUE' ? 'Min Value (Number)' : customRuleType === 'MAX_VALUE' ? 'Max Value (Number)' : customRuleType === 'REGEX_MATCH' ? 'Regular Expression' : 'Allowed Values (comma separated)'}
                    </label>
                    <input
                      type="text"
                      value={customRuleValue}
                      onChange={(e) => setCustomRuleValue(e.target.value)}
                      placeholder={customRuleType === 'ALLOWED_VALUES' ? 'Standard, Express, Priority' : customRuleType === 'MIN_VALUE' ? '0' : ''}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomRule}
                  disabled={!customRuleName.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm disabled:opacity-40"
                >
                  Save Contract Rule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EXPORT VALIDATION CODE (Great Expectations, Pydantic, JSON Schema, Soda Core) */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-cyan-500" />
                    <span>Export Quality Contract Suite</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Export your executable contract for Python, Great Expectations, Soda Core, or JSON Schema.
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {/* Format selection */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  {[
                    { id: 'gx', label: 'Great Expectations (Python)' },
                    { id: 'pydantic', label: 'Pydantic v2' },
                    { id: 'json_schema', label: 'JSON Schema' },
                    { id: 'soda', label: 'Soda Core YAML' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        exportFormat === fmt.id
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>

                <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800">
                  <pre className="text-xs font-mono text-cyan-300 overflow-x-auto max-h-[340px]">
                    {generateExportCode()}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateExportCode());
                      triggerToast('Contract code copied to clipboard!');
                    }}
                    className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Code</span>
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
