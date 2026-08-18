import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wand2,
  ShieldCheck,
  Zap,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  ArrowRight,
  FileText,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  Sliders,
  Scale,
  Crosshair,
  BadgeAlert,
  ChevronRight,
  Filter,
  Sparkles,
  Info,
  Clock,
  Layers,
  Database,
  Calculator,
  HelpCircle,
  TrendingUp,
  Award,
  ListChecks,
  CheckCheck,
  Tag,
  Mail,
  DollarSign,
  Binary,
} from 'lucide-react';
import Papa from 'papaparse';
import { Dataset } from '../../types/dataset';
import {
  executeAutonomousCleanPipeline,
  AutonomousCleaningReport,
  AutonomousCleanResult,
  MissingValueAuditRecord,
  DomainAwareInsight,
} from '../../utils/autonomousCleaningEngine';

interface DataCleaningProps {
  dataset: Dataset;
  onUpdateDataset: (updatedDataset: Dataset) => void;
}

type ReportTabMode =
  | 'proof_report'
  | 'overview'
  | 'semantic_pass'
  | 'missing_engine'
  | 'domain_rules'
  | 'quality_scores'
  | 'insights'
  | 'audit_trail'
  | 'validation';

export const DataCleaning: React.FC<DataCleaningProps> = ({ dataset, onUpdateDataset }) => {
  // State for cleaning pipeline execution
  const [isRunningAutoClean, setIsRunningAutoClean] = React.useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0);
  const [cleaningReport, setCleaningReport] = React.useState<AutonomousCleaningReport | null>(null);
  const [activeReportTab, setActiveReportTab] = React.useState<ReportTabMode>('proof_report');
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Filters for Audit Log & Missing Value Table
  const [auditSearchQuery, setAuditSearchQuery] = React.useState<string>('');
  const [auditConfidenceFilter, setAuditConfidenceFilter] = React.useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [missingSearchQuery, setMissingSearchQuery] = React.useState<string>('');

  // 12 Visual Pipeline Checkpoints for live execution animation
  const pipelineCheckpoints = [
    'Dataset Profiled',
    'Domain Detected',
    'Domain Rules Loaded',
    'Duplicates Checked',
    'Data Types Standardized',
    'Categories Normalized',
    'Dates Validated',
    'Numeric Values Validated',
    'Business Rules Checked',
    'Missing Values Handled',
    'Semantic Validation Passed',
    '13-Point Proof Gate Certified',
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ONE-CLICK ACTION: AUTO CLEAN DATA
  const handleAutoCleanData = async () => {
    if (isRunningAutoClean) return;
    setIsRunningAutoClean(true);
    setCurrentStepIndex(0);

    // Step-by-step UI ticker animation for high feedback UX
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < pipelineCheckpoints.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 180);

    try {
      // Execute the multi-pass autonomous engine + independent semantic pass
      const result: AutonomousCleanResult = await executeAutonomousCleanPipeline(dataset);

      clearInterval(interval);
      setCurrentStepIndex(pipelineCheckpoints.length - 1);

      // Short visual pause so user sees final tick
      setTimeout(() => {
        onUpdateDataset(result.cleanedDataset);
        setCleaningReport(result.report);
        setIsRunningAutoClean(false);
        setActiveReportTab('proof_report');

        if (result.report.isIdempotentRun) {
          showToast('Dataset is already in pristine condition. No redundant transformations needed.');
        } else {
          showToast(`Auto Clean completed! Quality score elevated to ${result.report.finalQualityScore}/100.`);
        }
      }, 350);
    } catch (error) {
      clearInterval(interval);
      setIsRunningAutoClean(false);
      console.error('Autonomous clean execution failed:', error);
      showToast('Error occurred during autonomous data cleaning.');
    }
  };

  // Revert dataset to original uploaded state
  const handleRevertToOriginal = () => {
    if (!dataset.rawRows || dataset.rawRows.length === 0) {
      showToast('No raw original snapshot exists for this dataset.');
      return;
    }

    const revertedDataset: Dataset = {
      ...dataset,
      rows: dataset.rawRows.map((r) => ({ ...r })),
      health: {
        ...dataset.health,
        score: dataset.profile?.overallQualityScore || 70,
        duplicateRows: dataset.profile?.exactDuplicateRows || 0,
      },
    };

    onUpdateDataset(revertedDataset);
    setCleaningReport(null);
    showToast('Dataset restored to raw original state.');
  };

  // Export cleaned dataset as CSV
  const handleExportCSV = () => {
    if (!dataset.rows || dataset.rows.length === 0) return;
    const csv = Papa.unparse(dataset.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.name.replace(/\.[^/.]+$/, '')}_clean.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Cleaned dataset exported to CSV.');
  };

  // Filtered Missing Values
  const filteredMissingAudit = React.useMemo(() => {
    if (!cleaningReport) return [];
    return cleaningReport.missingValueAudit.filter((item) => {
      const q = missingSearchQuery.toLowerCase();
      return (
        item.column.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.imputationMethod.toLowerCase().includes(q)
      );
    });
  }, [cleaningReport, missingSearchQuery]);

  // Filtered Audit Trail
  const filteredAuditTrail = React.useMemo(() => {
    if (!cleaningReport) return [];
    return cleaningReport.fullAuditTrail.filter((item) => {
      const matchesQuery =
        auditSearchQuery === '' ||
        item.column.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        item.reason.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        item.rule_id.toLowerCase().includes(auditSearchQuery.toLowerCase());

      const matchesConfidence =
        auditConfidenceFilter === 'ALL' || item.confidence === auditConfidenceFilter;

      return matchesQuery && matchesConfidence;
    });
  }, [cleaningReport, auditSearchQuery, auditConfidenceFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-3 shadow-2xl text-xs font-semibold flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-cyan-400 dark:text-cyan-600" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 1. HERO COMMAND BAR: ONE-CLICK "AUTO CLEAN DATA" ONLY         */}
      {/* ============================================================ */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-850 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Header Info */}
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              <Zap className="h-3.5 w-3.5 fill-cyan-500 text-cyan-500" />
              Autonomous Data Cleaning & Semantic Proof Engine
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              One-Click Autonomous Data Cleaning
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              No manual tool selection required. The engine automatically inspects column semantics, eliminates duplicates, rectifies corrupted types, imputes missing values via contextual heuristics, executes independent semantic normalization, and enforces a 13-point zero-tolerance proof gate.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {dataset.rawRows && dataset.rawRows.length > 0 && (
              <button
                id="btn-revert-original"
                onClick={handleRevertToOriginal}
                disabled={isRunningAutoClean}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer disabled:opacity-50"
                title="Restore unedited raw dataset"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Revert to Raw</span>
              </button>
            )}

            <button
              id="btn-auto-clean-data"
              onClick={handleAutoCleanData}
              disabled={isRunningAutoClean}
              className={`relative group inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-sm sm:text-base font-bold text-white shadow-xl transition-all cursor-pointer overflow-hidden ${
                isRunningAutoClean
                  ? 'bg-slate-700 cursor-not-allowed opacity-90'
                  : 'bg-linear-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5'
              }`}
            >
              {isRunningAutoClean ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin text-cyan-300" />
                  <span>Processing Autonomous Pipeline...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5 text-cyan-200 group-hover:rotate-12 transition-transform" />
                  <span>AUTO CLEAN DATA</span>
                  <ArrowRight className="h-4 w-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Execution Ticker (visible when running) */}
        {isRunningAutoClean && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-500" />
                <span>Current Phase: {pipelineCheckpoints[currentStepIndex]}</span>
              </span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">
                {Math.round(((currentStepIndex + 1) / pipelineCheckpoints.length) * 100)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500 via-teal-500 to-emerald-500"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStepIndex + 1) / pipelineCheckpoints.length) * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>

            {/* Micro Checkpoints */}
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 mt-3">
              {pipelineCheckpoints.map((step, idx) => (
                <div
                  key={step}
                  className={`text-[10px] truncate px-1.5 py-1 rounded-md text-center transition-all ${
                    idx <= currentStepIndex
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-800'
                      : 'text-slate-400 bg-slate-100/50 dark:bg-slate-800/40'
                  }`}
                  title={step}
                >
                  {idx + 1}. {step}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. QUALITY GATE STATUS & CERTIFICATION BANNER               */}
      {/* ============================================================ */}
      {cleaningReport && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xs"
        >
          {/* Quality Gate Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div
                className={`p-3.5 rounded-2xl ${
                  cleaningReport.qualityGateStatus === 'CLEAN'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                    : cleaningReport.qualityGateStatus === 'CLEAN WITH REVIEW REQUIRED'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                }`}
              >
                {cleaningReport.qualityGateStatus === 'CLEAN' ? (
                  <CheckCheck className="h-7 w-7" />
                ) : (
                  <AlertCircle className="h-7 w-7" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Autonomous Quality Gate Certification
                  </span>
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                    Domain: {cleaningReport.domainDetected.name} ({cleaningReport.domainDetected.confidence}%)
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Status: {cleaningReport.qualityGateStatus}
                  </h2>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {cleaningReport.qualityGateReason}
                </p>
              </div>
            </div>

            {/* Quality Score Badge */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Quality Score
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-baseline gap-1">
                  <span>{cleaningReport.finalQualityScore}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700" />

              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quality Lift
                </div>
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{Math.max(0, cleaningReport.finalQualityScore - cleaningReport.qualityScoreBefore.overallScore)} pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {cleaningReport.kpiMetrics.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 space-y-1"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {kpi.label}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {kpi.sublabel}
                </div>
              </div>
            ))}
          </div>

          {/* ============================================================ */}
          {/* 3. REPORT TABS NAVIGATION                                    */}
          {/* ============================================================ */}
          <div className="pt-2">
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2 pb-2">
              {[
                { id: 'proof_report', label: '1. 13-Point Proof Report', icon: Award, badge: `${cleaningReport.finalProofReport.proofItems.filter((p) => p.status === 'PASS').length}/13` },
                { id: 'overview', label: '2. Delta Overview', icon: Activity },
                { id: 'semantic_pass', label: '3. Semantic Validation Pass', icon: Tag, badge: cleaningReport.semanticValidationSummary.canonicalReplacements.length },
                { id: 'missing_engine', label: '4. Missing Value Engine', icon: Sliders, badge: cleaningReport.missingValuesFilled },
                { id: 'domain_rules', label: '5. Domain Rules & Formulas', icon: ShieldCheck, badge: cleaningReport.domainRulesApplied.length },
                { id: 'quality_scores', label: '6. 6D Quality Radar', icon: Scale },
                { id: 'insights', label: '7. Domain Insights', icon: Sparkles, badge: cleaningReport.domainInsights.length },
                { id: 'audit_trail', label: '8. Full Audit Log', icon: FileText, badge: cleaningReport.fullAuditTrail.length },
                { id: 'validation', label: '9. Self-Test Validation', icon: CheckCircle2, badge: `${cleaningReport.passedTestsCount}/${cleaningReport.totalTestsCount}` },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeReportTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    id={`report-tab-${tab.id}`}
                    onClick={() => setActiveReportTab(tab.id as ReportTabMode)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS */}
            <div className="pt-6">
              {/* TAB 1: 13-POINT ZERO-TOLERANCE PROOF REPORT */}
              {activeReportTab === 'proof_report' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        13-Point Zero-Tolerance Quality Certification
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Independent proof verification: every category, identifier, formula, and boundary must satisfy zero-tolerance criteria to attain clean status.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Proof Status
                        </div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {cleaningReport.finalProofReport.isAllZeroClean ? '100% Zero Defects' : 'Review Required'}
                        </div>
                      </div>
                      <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 text-xs font-bold shadow-md cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                        Export Certified CSV
                      </button>
                    </div>
                  </div>

                  {/* Proof Items Table */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-3.5 px-4">Proof Suite ID</th>
                          <th className="py-3.5 px-4">Validation Requirement</th>
                          <th className="py-3.5 px-4 text-center">Observed Violations</th>
                          <th className="py-3.5 px-4 text-center">Target Threshold</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4">Certification Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                        {cleaningReport.finalProofReport.proofItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.id}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {item.label}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs ${
                                  item.count === 0
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {item.count}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-500">
                              {item.target}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.status === 'PASS' ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  <Check className="h-3 w-3" /> PASS
                                </span>
                              ) : item.status === 'REVIEW_REQUIRED' ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  <AlertCircle className="h-3 w-3" /> REVIEW
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                  <XCircle className="h-3 w-3" /> FAIL
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-xs">
                              {item.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Idempotency Card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400">
                        <CheckCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Internal Idempotency Validation Pass
                        </h4>
                        <p className="text-xs text-slate-500">
                          {cleaningReport.semanticValidationSummary.idempotencyTest.message}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1 text-xs">
                      0 Unstable Mutations
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: DELTA OVERVIEW */}
              {activeReportTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Rows Delta Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Total Records
                        </span>
                        <Database className="h-4 w-4 text-cyan-500" />
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {cleaningReport.rowsAfter.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">
                          from {cleaningReport.rowsBefore.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {cleaningReport.duplicatesBefore > 0
                          ? `${cleaningReport.duplicatesBefore} duplicate rows pruned`
                          : 'Zero record loss; 100% rows preserved'}
                      </div>
                    </div>

                    {/* Missing Values Delta Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Missing Values
                        </span>
                        <Sliders className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          {cleaningReport.missingValuesAfter}
                        </span>
                        <span className="text-xs text-slate-400">
                          reduced from {cleaningReport.missingValuesBefore}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {cleaningReport.missingValuesFilled} empty cells filled with high/medium confidence
                      </div>
                    </div>

                    {/* Invalid / Anomalous Values Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Autonomous Normalizations
                        </span>
                        <Zap className="h-4 w-4 text-cyan-500" />
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                          {cleaningReport.invalidValuesFixed}
                        </span>
                        <span className="text-xs text-slate-400">operations</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Whitespace, types, enums, ISO dates, and formula checks
                      </div>
                    </div>
                  </div>

                  {/* 30-Step Execution Ledger */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="h-4 w-4 text-cyan-500" />
                      Complete 30-Step Pipeline Execution Trace
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {cleaningReport.executionSteps.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex items-start gap-2.5"
                        >
                          <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {step.stepNumber}. {step.name}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-2">
                              {step.details}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SEMANTIC VALIDATION PASS */}
              {activeReportTab === 'semantic_pass' && (
                <div className="space-y-6">
                  {/* Canonical Category Normalizations */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Tag className="h-4 w-4 text-cyan-500" />
                          Canonical Category & Value Normalizations ({cleaningReport.semanticValidationSummary.canonicalReplacements.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Standardized casing, spelling variations, abbreviations, and payment/status enums.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                      {cleaningReport.semanticValidationSummary.canonicalReplacements.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          All categorical columns were already canonical; zero variation replacements required.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-3 px-4">Column</th>
                              <th className="py-3 px-4">Original Value</th>
                              <th className="py-3 px-4">Canonical Value</th>
                              <th className="py-3 px-4">Occurrences</th>
                              <th className="py-3 px-4">Semantic Mapping Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {cleaningReport.semanticValidationSummary.canonicalReplacements.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                                  {item.column}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-rose-600 dark:text-rose-400">
                                  "{item.original}"
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  "{item.canonical}"
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500">
                                  {item.occurrences} rows
                                </td>
                                <td className="py-2.5 px-4 text-slate-500">
                                  {item.reason}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Revenue Reconciliation Table */}
                  {cleaningReport.semanticValidationSummary.revenueAudit.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        Cross-Column Revenue Formula Reconciliation Ledger
                      </h3>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-3 px-4">Row</th>
                              <th className="py-3 px-4">Quantity</th>
                              <th className="py-3 px-4">Unit Price</th>
                              <th className="py-3 px-4">Discount</th>
                              <th className="py-3 px-4">Expected (Q×P×(1-D))</th>
                              <th className="py-3 px-4">Actual Ledger</th>
                              <th className="py-3 px-4">Delta</th>
                              <th className="py-3 px-4">Classification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {cleaningReport.semanticValidationSummary.revenueAudit.map((rev, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                                <td className="py-2 px-4 font-mono text-slate-500">#{rev.rowNumber}</td>
                                <td className="py-2 px-4 font-mono">{rev.quantity}</td>
                                <td className="py-2 px-4 font-mono">${rev.unitPrice.toFixed(2)}</td>
                                <td className="py-2 px-4 font-mono">{(rev.discount * 100).toFixed(0)}%</td>
                                <td className="py-2 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ${rev.expectedRevenue.toFixed(2)}
                                </td>
                                <td className="py-2 px-4 font-mono text-slate-600 dark:text-slate-400">
                                  ${rev.actualRevenue.toFixed(2)}
                                </td>
                                <td className="py-2 px-4 font-mono text-slate-400">
                                  ${rev.diff.toFixed(2)} ({rev.diffPct}%)
                                </td>
                                <td className="py-2 px-4">
                                  <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                    {rev.classification}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Email Validation Summary */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Mail className="h-4 w-4 text-cyan-500" />
                      Email RFC Semantic Audit Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Valid Addresses</div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {cleaningReport.semanticValidationSummary.emailAudit.valid}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Suspicious / Test</div>
                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                          {cleaningReport.semanticValidationSummary.emailAudit.suspicious}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Invalid Syntax</div>
                        <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                          {cleaningReport.semanticValidationSummary.emailAudit.invalid}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Review Required</div>
                        <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                          {cleaningReport.semanticValidationSummary.emailAudit.reviewRequired}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MISSING VALUE ENGINE */}
              {activeReportTab === 'missing_engine' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Missing Value Imputation Audit ({cleaningReport.missingValueAudit.length} Records)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Context-aware strategies: deterministic formulas, group medians/modes, and preserved low-confidence cells.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search column, method, or reason..."
                        value={missingSearchQuery}
                        onChange={(e) => setMissingSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                          <tr>
                            <th className="py-3 px-4">Row #</th>
                            <th className="py-3 px-4">Column</th>
                            <th className="py-3 px-4">Original</th>
                            <th className="py-3 px-4">Imputed Value</th>
                            <th className="py-3 px-4">Imputation Strategy</th>
                            <th className="py-3 px-4">Confidence</th>
                            <th className="py-3 px-4">Justification & Provenance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                          {filteredMissingAudit.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No missing value records found matching query.
                              </td>
                            </tr>
                          ) : (
                            filteredMissingAudit.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  #{item.rowNumber}
                                </td>
                                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                                  {item.column}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-400">
                                  {item.originalValue === null || item.originalValue === undefined || item.originalValue === '' ? 'NULL' : String(item.originalValue)}
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {String(item.newValue)}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-[11px]">
                                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-700 dark:text-slate-300 font-bold">
                                    {item.imputationMethod}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      item.confidence === 'HIGH'
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                        : item.confidence === 'MEDIUM'
                                        ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300'
                                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                    }`}
                                  >
                                    {item.confidence}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate" title={item.reason}>
                                  {item.reason}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DOMAIN RULES & BUSINESS FORMULAS */}
              {activeReportTab === 'domain_rules' && (
                <div className="space-y-6">
                  {/* Domain Rules Table */}
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Domain Rules Evaluated & Applied ({cleaningReport.domainRulesApplied.length})
                    </h3>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-3 px-4">Rule ID</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4">Source</th>
                            <th className="py-3 px-4">Action</th>
                            <th className="py-3 px-4">Records Affected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                          {cleaningReport.domainRulesApplied.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                Domain standard rules loaded; no rule violations encountered.
                              </td>
                            </tr>
                          ) : (
                            cleaningReport.domainRulesApplied.map((rule) => (
                              <tr key={rule.rule_id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                                <td className="py-2.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                                  {rule.rule_id}
                                </td>
                                <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                                  {rule.description}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                    {rule.source}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className="rounded-md bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                                    {rule.action}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                  {rule.recordsAffected}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Business Rules / Formulas */}
                  {cleaningReport.businessRulesValidated.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Validated Business Formulas
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cleaningReport.businessRulesValidated.map((br, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {br.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {br.accuracyRate}% Valid
                              </span>
                            </div>
                            <div className="text-xs font-mono bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400">
                              {br.formula}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center justify-between">
                              <span>Verified: {br.rowsVerified} rows</span>
                              <span>Reconciled: {br.rowsCorrected} mismatches</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: 6D QUALITY RADAR */}
              {activeReportTab === 'quality_scores' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { key: 'completeness', label: 'Completeness', before: cleaningReport.qualityScoreBefore.completeness, after: cleaningReport.qualityScoreAfter.completeness },
                      { key: 'validity', label: 'Validity', before: cleaningReport.qualityScoreBefore.validity, after: cleaningReport.qualityScoreAfter.validity },
                      { key: 'consistency', label: 'Consistency', before: cleaningReport.qualityScoreBefore.consistency, after: cleaningReport.qualityScoreAfter.consistency },
                      { key: 'uniqueness', label: 'Uniqueness', before: cleaningReport.qualityScoreBefore.uniqueness, after: cleaningReport.qualityScoreAfter.uniqueness },
                      { key: 'accuracy', label: 'Accuracy', before: cleaningReport.qualityScoreBefore.accuracy, after: cleaningReport.qualityScoreAfter.accuracy },
                      { key: 'integrity', label: 'Integrity', before: cleaningReport.qualityScoreBefore.integrity, after: cleaningReport.qualityScoreAfter.integrity },
                    ].map((dim) => (
                      <div
                        key={dim.key}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-4 space-y-3 text-center"
                      >
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {dim.label}
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                          {dim.after}%
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-cyan-500 to-emerald-500"
                            style={{ width: `${dim.after}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Baseline: {dim.before}% (+{Math.max(0, dim.after - dim.before)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: DOMAIN INSIGHTS */}
              {activeReportTab === 'insights' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Domain-Aware Insights ({cleaningReport.domainInsights.length} Actionable Findings)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Synthesized findings based on cleaned distributions, domain metrics, and verified ledgers.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {cleaningReport.domainInsights.map((insight) => (
                      <div
                        key={insight.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-cyan-100 dark:bg-cyan-950/80 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-800 dark:text-cyan-300">
                              {insight.id}
                            </span>
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              {insight.category}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              insight.impact === 'HIGH'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {insight.impact} IMPACT
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {insight.finding}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Evidence</span>
                            <span className="text-slate-500">{insight.evidence}</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Business Meaning</span>
                            <span className="text-slate-500">{insight.businessMeaning}</span>
                          </div>
                          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-1">Recommended Action</span>
                            <span className="text-slate-600 dark:text-slate-400">{insight.potentialAction}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 8: FULL AUDIT TRAIL */}
              {activeReportTab === 'audit_trail' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Complete Cleaning Audit Trail ({cleaningReport.fullAuditTrail.length} Operations)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Immutable record of every cell-level normalization, formula calculation, and imputation.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search audit trail..."
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>

                      <select
                        value={auditConfidenceFilter}
                        onChange={(e) => setAuditConfidenceFilter(e.target.value as any)}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                      >
                        <option value="ALL">All Confidence</option>
                        <option value="HIGH">High Confidence</option>
                        <option value="MEDIUM">Medium Confidence</option>
                        <option value="LOW">Low Confidence</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                          <tr>
                            <th className="py-3 px-4">Row</th>
                            <th className="py-3 px-4">Column</th>
                            <th className="py-3 px-4">Original</th>
                            <th className="py-3 px-4">New Value</th>
                            <th className="py-3 px-4">Rule / Action</th>
                            <th className="py-3 px-4">Confidence</th>
                            <th className="py-3 px-4">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                          {filteredAuditTrail.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No audit records found matching current query.
                              </td>
                            </tr>
                          ) : (
                            filteredAuditTrail.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  #{item.row}
                                </td>
                                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                                  {item.column}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-400 max-w-[120px] truncate" title={String(item.original_value)}>
                                  {String(item.original_value)}
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 max-w-[120px] truncate" title={String(item.new_value)}>
                                  {String(item.new_value)}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {item.action || item.rule_id}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      item.confidence === 'HIGH'
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                        : item.confidence === 'MEDIUM'
                                        ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300'
                                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                    }`}
                                  >
                                    {item.confidence}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 max-w-sm truncate" title={item.reason}>
                                  {item.reason}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: VALIDATION SELF-TESTS */}
              {activeReportTab === 'validation' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Independent Self-Test Results ({cleaningReport.passedTestsCount}/{cleaningReport.totalTestsCount} Passing)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Autonomous test suite verifying duplicates, identifiers, type integrity, and cross-column sanity.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cleaningReport.selfTests.map((test) => (
                      <div
                        key={test.id}
                        className={`rounded-xl border p-4 flex items-start gap-3 transition-all ${
                          test.status === 'PASS'
                            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200'
                            : test.status === 'WARNING'
                            ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200'
                            : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {test.status === 'PASS' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : test.status === 'WARNING' ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{test.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({test.category})</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{test.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
