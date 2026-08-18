import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  Plus,
  Filter,
  Download,
  Code2,
  Copy,
  Check,
  Search,
  Sliders,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  RotateCcw,
  Zap,
  Info,
  Key,
  Calendar,
  Hash,
  Type,
  Maximize2,
  X,
  ArrowRight,
  Activity,
  FileCheck,
} from 'lucide-react';
import Papa from 'papaparse';
import { Dataset, ColumnMetadata } from '../../types/dataset';
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

interface DataValidationProps {
  dataset: Dataset;
  onUpdateDataset: (updatedDataset: Dataset) => void;
  onNavigateToCleaning?: () => void;
}

export const DataValidation: React.FC<DataValidationProps> = ({
  dataset,
  onUpdateDataset,
  onNavigateToCleaning,
}) => {
  // Rules state
  const [rules, setRules] = React.useState<ValidationRule[]>(() => {
    return inferValidationRulesFromDataset(dataset);
  });

  // Re-infer if dataset columns changed significantly
  React.useEffect(() => {
    if (rules.length === 0 && dataset.rows.length > 0) {
      setRules(inferValidationRulesFromDataset(dataset));
    }
  }, [dataset.columns.length, dataset.name]);

  // Report state
  const report = React.useMemo<ValidationSuiteReport>(() => {
    return executeValidationSuite(rules, dataset);
  }, [rules, dataset]);

  // UI state
  const [selectedCategory, setSelectedCategory] = React.useState<ValidationCategory | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = React.useState<ValidationSeverity | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [expandedRuleId, setExpandedRuleId] = React.useState<string | null>(null);

  // Modals state
  const [showAddRuleModal, setShowAddRuleModal] = React.useState<boolean>(false);
  const [showExportModal, setShowExportModal] = React.useState<boolean>(false);
  const [exportFormat, setExportFormat] = React.useState<'ge' | 'python' | 'dbt' | 'json'>('ge');
  const [copiedCode, setCopiedCode] = React.useState<boolean>(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Drilldown failure modal
  const [inspectingResult, setInspectingResult] = React.useState<ValidationResult | null>(null);

  // Custom rule form state
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle rule
  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Delete rule
  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    showToast('Validation rule removed from suite.');
  };

  // Re-infer all rules with AI
  const handleReInferRules = () => {
    const freshRules = inferValidationRulesFromDataset(dataset);
    setRules(freshRules);
    showToast(`AI Inferred ${freshRules.length} comprehensive data validation rules!`);
  };

  // Quarantine Failing Rows
  const handleQuarantineFailingRows = () => {
    const failingIndices = new Set(report.failingRowIndices);
    if (failingIndices.size === 0) {
      showToast('No failing rows detected. All dataset rows are 100% compliant!');
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

    // Update dataset with clean certified rows
    const updatedDataset: Dataset = {
      ...dataset,
      rows: compliantRows,
    };
    onUpdateDataset(updatedDataset);
    showToast(`Quarantined ${quarantinedRows.length} invalid rows! Dataset is now 100% compliant.`);
  };

  // Auto fix rule violation
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

  // Save new custom rule
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

  // Export code generation
  const generatedCode = React.useMemo(() => {
    if (exportFormat === 'ge') {
      return exportAsGreatExpectationsJSON(rules, report);
    }
    if (exportFormat === 'python') {
      return exportAsPythonPydanticScript(rules, dataset.name);
    }
    if (exportFormat === 'dbt') {
      return exportAsDbtYamlTests(rules, dataset.name);
    }
    return JSON.stringify(report, null, 2);
  }, [exportFormat, rules, report, dataset.name]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    showToast('Copied validation contract to clipboard!');
  };

  // Filtered results
  const filteredResults = React.useMemo(() => {
    return report.results.filter((res) => {
      // Category filter
      if (selectedCategory !== 'ALL' && res.category !== selectedCategory) return false;
      // Severity filter
      if (selectedSeverity !== 'ALL' && res.severity !== selectedSeverity) return false;
      // Status filter
      if (statusFilter === 'PASSED' && res.status !== 'PASSED') return false;
      if (statusFilter === 'FAILED' && res.status !== 'FAILED') return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          res.ruleName.toLowerCase().includes(q) ||
          res.targetColumn.toLowerCase().includes(q) ||
          res.description.toLowerCase().includes(q) ||
          res.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [report.results, selectedCategory, selectedSeverity, statusFilter, searchQuery]);

  const categoryLabels: Record<ValidationCategory, { label: string; icon: React.ElementType }> = {
    completeness: { label: 'Completeness & Nulls', icon: CheckCircle2 },
    uniqueness: { label: 'Uniqueness & Keys', icon: Key },
    type_schema: { label: 'Type & Schema Contracts', icon: Type },
    range_boundary: { label: 'Range & Boundary Guardrails', icon: Hash },
    allowed_values: { label: 'Allowed Enum Whitelists', icon: Filter },
    pattern_regex: { label: 'Pattern & Regex Formats', icon: Sparkles },
    cross_column: { label: 'Cross-Column & Logical', icon: Layers },
    distribution_statistical: { label: 'Statistical Outliers', icon: Activity },
    custom_expression: { label: 'Custom Expressions', icon: Code2 },
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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

      {/* Top Banner: Executive Compliance & Integrity Scorecard */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Compliance Status Badge */}
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  report.complianceStatus === 'COMPLIANT'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : report.complianceStatus === 'NEEDS_ATTENTION'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {report.complianceStatus === 'COMPLIANT' ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                )}
                <span>Data Contract: {report.complianceStatus.replace('_', ' ')}</span>
              </span>

              <span className="text-xs text-slate-500 font-medium">
                Evaluated at {report.timestamp} • {report.totalRows} Total Records
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              Comprehensive Data Validation & Integrity Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Automated validation contracts checking schema conformity, completeness, entity uniqueness, mathematical ranges, regex formats, cross-column logic, and statistical distributions.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleReInferRules}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-xs"
              title="Re-scan dataset with AI to infer optimal validation contracts"
            >
              <Sparkles className="h-4 w-4 text-cyan-600" />
              <span>AI Infer Rules</span>
            </button>

            <button
              onClick={() => setShowAddRuleModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-xs"
            >
              <Plus className="h-4 w-4 text-indigo-600" />
              <span>+ Custom Rule</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-xs"
            >
              <Code2 className="h-4 w-4 text-amber-600" />
              <span>Export Code / dbt</span>
            </button>

            <button
              onClick={handleQuarantineFailingRows}
              disabled={report.failingRowCount === 0}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-40"
              title="Isolates failing rows and produces certified 100% compliant dataset"
            >
              <FileCheck className="h-4 w-4" />
              <span>Quarantine Invalid ({report.failingRowCount})</span>
            </button>
          </div>
        </div>

        {/* 4 Score Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliance Score</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${
                report.overallScore >= 90
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : report.overallScore >= 70
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {report.overallScore}%
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Weighted Quality</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passed Rules</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {report.passedRules}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">/ {report.totalRules} assertions</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical Failures</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${
                report.criticalFailures > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
              }`}>
                {report.criticalFailures}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Must resolve</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliant Records</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                {report.compliantRowCount}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ({report.totalRows > 0 ? Math.round((report.compliantRowCount / report.totalRows) * 100) : 100}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>All Assertions ({report.results.length})</span>
        </button>

        {(Object.keys(categoryLabels) as ValidationCategory[]).map((cat) => {
          const catInfo = categoryLabels[cat];
          const Icon = catInfo.icon;
          const score = report.categoryScores[cat];
          if (!score || score.total === 0) return null;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{catInfo.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                selectedCategory === cat
                  ? 'bg-cyan-700 text-white'
                  : score.failed > 0
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {score.passed}/{score.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules by column, name or reason..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-4 py-2 text-xs text-slate-900 dark:text-white"
          />
          <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Statuses ({report.results.length})</option>
            <option value="FAILED">Failed Only ({report.failedRules})</option>
            <option value="PASSED">Passed Only ({report.passedRules})</option>
          </select>
        </div>
      </div>

      {/* Validation Rules Grid / List */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching validation rules found.</p>
            <p className="text-xs text-slate-500">Try adjusting your category, severity, or search filters.</p>
          </div>
        ) : (
          filteredResults.map((result) => {
            const rule = rules.find((r) => r.id === result.ruleId);
            const isExpanded = expandedRuleId === result.ruleId;
            const CategoryIcon = categoryLabels[result.category]?.icon || ShieldCheck;

            return (
              <div
                key={result.ruleId}
                className={`rounded-2xl border transition-all ${
                  result.status === 'PASSED'
                    ? 'border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 hover:border-emerald-300 dark:hover:border-emerald-800'
                    : result.severity === 'CRITICAL'
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
                    : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20'
                } p-4 shadow-xs`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Left: Status, Icon, Name, Target Column */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {result.status === 'PASSED' ? (
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className={`p-1.5 rounded-lg ${
                          result.severity === 'CRITICAL'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                        }`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {result.ruleName}
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                          Column: <strong className="text-slate-900 dark:text-white">{result.targetColumn}</strong>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          result.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : result.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {result.severity}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {result.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Pass Rate, Failing Count, Expand / Auto-Fix Controls */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {/* Pass Rate Bar */}
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end text-xs font-mono font-bold">
                        <span className={result.passRate === 100 ? 'text-emerald-600' : 'text-rose-600'}>
                          {result.passRate}% Pass
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({result.passedCount}/{result.totalEvaluated})
                        </span>
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            result.passRate === 100
                              ? 'bg-emerald-500'
                              : result.passRate >= 80
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${result.passRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Auto Fix Button if Failed */}
                    {result.status === 'FAILED' && (
                      <button
                        onClick={() => handleAutoFixRule(result)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold shadow-xs transition-all"
                        title="Automatically remediates cells violating this rule"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Auto-Fix</span>
                      </button>
                    )}

                    {/* Failing Drilldown Inspector */}
                    {result.status === 'FAILED' && (
                      <button
                        onClick={() => setInspectingResult(result)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold transition-all"
                        title="Inspect individual failing records"
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Inspect ({result.failedCount})</span>
                      </button>
                    )}

                    {/* Toggle rule on/off */}
                    <button
                      onClick={() => handleToggleRule(result.ruleId)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        rule?.enabled
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-slate-200 text-slate-400 dark:bg-slate-900'
                      }`}
                    >
                      {rule?.enabled ? 'ACTIVE' : 'MUTED'}
                    </button>

                    {/* Delete if custom */}
                    {rule?.isCustom && (
                      <button
                        onClick={() => handleDeleteRule(result.ruleId)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
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

      {/* INSPECT FAILING ROWS MODAL */}
      <AnimatePresence>
        {inspectingResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Failing Rows Inspector
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {inspectingResult.ruleName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Showing {inspectingResult.sampleFailures.length} of {inspectingResult.failedCount} failing records on column <strong className="text-slate-800 dark:text-slate-200">{inspectingResult.targetColumn}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setInspectingResult(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Table Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Suggested Remediation:</strong> {inspectingResult.suggestedRemediation}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 px-3">Row #</th>
                        <th className="py-2.5 px-3">Actual Value</th>
                        <th className="py-2.5 px-3">Expected Constraint</th>
                        <th className="py-2.5 px-4 font-sans">Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                      {inspectingResult.sampleFailures.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                            #{item.rowIndex}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-bold bg-rose-50/30 dark:bg-rose-950/20">
                            {String(item.actualValue ?? 'null')}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">
                            {item.expectedCondition}
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-300 text-xs">
                            {item.failureReason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                {onNavigateToCleaning && (
                  <button
                    onClick={() => {
                      setInspectingResult(null);
                      onNavigateToCleaning();
                    }}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-500 flex items-center gap-1.5"
                  >
                    <span>Open Data Cleaning Engine</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {inspectingResult.category === 'range_boundary' ? (
                    <>
                      <button
                        onClick={() => {
                          handleAutoFixRule(inspectingResult, 'abs_value');
                          setInspectingResult(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all"
                        title="Converts negative values to positive magnitude (|x|)"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Fix to Absolute Value (|x|)</span>
                      </button>
                      <button
                        onClick={() => {
                          handleAutoFixRule(inspectingResult, 'cap_bounds');
                          setInspectingResult(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                      >
                        <span>Clamp to Bounds</span>
                      </button>
                      <button
                        onClick={() => {
                          handleAutoFixRule(inspectingResult, 'impute_median');
                          setInspectingResult(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                      >
                        <span>Impute Median</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        handleAutoFixRule(inspectingResult);
                        setInspectingResult(null);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all"
                    >
                      <Zap className="h-4 w-4" />
                      <span>Apply Auto-Fix ({inspectingResult.autoFixType || 'Default'})</span>
                    </button>
                  )}
                  <button
                    onClick={() => setInspectingResult(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD CUSTOM RULE MODAL */}
      <AnimatePresence>
        {showAddRuleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Plus className="h-5 w-5 text-indigo-600" />
                    Create Custom Data Validation Rule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define custom assertions, domain boundaries, enum whitelists, or cross-column expressions.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {/* Rule Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rule Name</label>
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="e.g. Unit Price must be between $1 and $5000"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Category & Severity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Validation Category</label>
                    <select
                      value={newRuleCategory}
                      onChange={(e) => setNewRuleCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="range_boundary">Range & Boundary Limits</option>
                      <option value="allowed_values">Allowed Enum Whitelist</option>
                      <option value="pattern_regex">Pattern / Regex Format</option>
                      <option value="cross_column">Cross-Column Comparison</option>
                      <option value="custom_expression">Custom JS/SQL Expression</option>
                      <option value="completeness">Completeness (Not Null)</option>
                      <option value="uniqueness">Uniqueness (No Duplicates)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Column</label>
                    <select
                      value={newRuleColumn}
                      onChange={(e) => setNewRuleColumn(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                    >
                      {dataset.columns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dynamic Category Form Fields */}
                {newRuleCategory === 'range_boundary' && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Min Bound</label>
                      <input
                        type="number"
                        value={newRuleMin}
                        onChange={(e) => setNewRuleMin(e.target.value)}
                        placeholder="e.g. 0"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Max Bound</label>
                      <input
                        type="number"
                        value={newRuleMax}
                        onChange={(e) => setNewRuleMax(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs"
                      />
                    </div>
                  </div>
                )}

                {newRuleCategory === 'allowed_values' && (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Allowed Values (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newRuleAllowedValues}
                      onChange={(e) => setNewRuleAllowedValues(e.target.value)}
                      placeholder="e.g. Active, Pending, Cancelled, Completed"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs"
                    />
                  </div>
                )}

                {newRuleCategory === 'pattern_regex' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pattern Preset</label>
                      <select
                        value={newRulePatternType}
                        onChange={(e) => setNewRulePatternType(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs"
                      >
                        <option value="email">Email Address</option>
                        <option value="phone">Phone Number</option>
                        <option value="url">Web URL</option>
                        <option value="date_iso">ISO Date (YYYY-MM-DD)</option>
                        <option value="zip_code">Postal / Zip Code</option>
                        <option value="uuid">UUID (v1-v5)</option>
                        <option value="alphanumeric">Alphanumeric Key</option>
                        <option value="custom_regex">Custom Regular Expression</option>
                      </select>
                    </div>

                    {newRulePatternType === 'custom_regex' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Regex</label>
                        <input
                          type="text"
                          value={newRuleCustomRegex}
                          onChange={(e) => setNewRuleCustomRegex(e.target.value)}
                          placeholder="e.g. ^[A-Z]{3}-[0-9]{4}$"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}

                {newRuleCategory === 'cross_column' && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operator</label>
                      <select
                        value={newRuleOperator}
                        onChange={(e) => setNewRuleOperator(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-mono"
                      >
                        <option value=">=">&gt;= (Greater Than or Equal)</option>
                        <option value="<=">&lt;= (Less Than or Equal)</option>
                        <option value=">">&gt; (Strictly Greater Than)</option>
                        <option value="<">&lt; (Strictly Less Than)</option>
                        <option value="==">== (Exact Match)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reference Column</label>
                      <select
                        value={newRuleSecondaryCol}
                        onChange={(e) => setNewRuleSecondaryCol(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-mono"
                      >
                        {dataset.columns.map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {newRuleCategory === 'custom_expression' && (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      JavaScript Boolean Assertion (access columns via <code className="text-cyan-600 font-mono">row['ColName']</code>)
                    </label>
                    <textarea
                      rows={3}
                      value={newRuleExpression}
                      onChange={(e) => setNewRuleExpression(e.target.value)}
                      placeholder="e.g. row['Revenue'] > 0 && row['Cost'] <= row['Revenue']"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Severity Level</label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="CRITICAL">CRITICAL (Blocks pipeline, decreases compliance heavily)</option>
                    <option value="WARNING">WARNING (Alert notification, audit review)</option>
                    <option value="INFO">INFO (Informational tracker)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomRule}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20"
                >
                  Add Validation Rule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPORT CODE & DBT TEST SUITE MODAL */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-amber-500" />
                    Export Validation Contracts & Code
                  </h3>
                  <p className="text-xs text-slate-500">
                    Export your validation rule suite into Great Expectations JSON, Python Pydantic, dbt Tests, or JSON Schema.
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Format Switcher */}
              <div className="px-6 pt-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  onClick={() => setExportFormat('ge')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    exportFormat === 'ge'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Great Expectations JSON
                </button>
                <button
                  onClick={() => setExportFormat('python')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    exportFormat === 'python'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Python (Pydantic / Pandas)
                </button>
                <button
                  onClick={() => setExportFormat('dbt')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    exportFormat === 'dbt'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  dbt Schema Tests (YAML)
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    exportFormat === 'json'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Full Report JSON
                </button>
              </div>

              {/* Code Display */}
              <div className="flex-1 overflow-y-auto p-6">
                <pre className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                  <code>{generatedCode}</code>
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-xs text-slate-400">
                  Ready to paste into your data pipeline, CI/CD pipeline, or dbt repository.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
                  >
                    {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
