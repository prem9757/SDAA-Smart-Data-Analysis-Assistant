import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Activity, 
  Database, 
  Layers, 
  FileText,
  BarChart3,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { Dataset } from '../../types/dataset';
import { TabType } from '../layout/Sidebar';

interface DatasetOverviewProps {
  dataset: Dataset;
  onNavigateTab: (tab: TabType) => void;
  onRefreshAIAnalysis: () => void;
  isAnalyzing: boolean;
}

export const DatasetOverview: React.FC<DatasetOverviewProps> = ({
  dataset,
  onNavigateTab,
  onRefreshAIAnalysis,
  isAnalyzing,
}) => {
  const summary = dataset.summary;
  const health = dataset.health;
  const numericCols = dataset.columns.filter(c => c.type === 'number');

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome & AI Status Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-200/80 dark:border-cyan-900/60 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-12 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-400/30">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300 animate-pulse" />
              <span>Autonomous AI Intelligence Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {dataset.name}
            </h1>
            <p className="text-sm text-cyan-100/80 leading-relaxed">
              {dataset.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRefreshAIAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-semibold backdrop-blur-md border border-white/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Re-run AI Analysis'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('chat')}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI Co-Pilot</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Records',
            value: dataset.rows.length.toLocaleString(),
            sub: `${dataset.columns.length} columns metadata`,
            icon: Database,
            color: 'text-cyan-500',
            bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
          },
          {
            title: 'Data Health Score',
            value: `${health.score}/100`,
            sub: `Status: ${health.status}`,
            icon: ShieldCheck,
            color: health.score >= 80 ? 'text-emerald-500' : 'text-amber-500',
            bgColor: health.score >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-amber-50 dark:bg-amber-950/50',
          },
          {
            title: 'Analysis Readiness',
            value: dataset.profile ? `${dataset.profile.analysisReadiness.score}%` : '100%',
            sub: dataset.profile ? `${dataset.profile.analysisReadiness.status}` : 'READY',
            icon: Zap,
            color: 'text-cyan-500',
            bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
          },
          {
            title: 'Missingness Rate',
            value: `${health.missingnessRate}%`,
            sub: `${health.duplicateRows} duplicates found`,
            icon: Activity,
            color: 'text-cyan-500',
            bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {kpi.title}
                </span>
                <div className={`rounded-xl p-2 ${kpi.bgColor} ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {kpi.value}
                </span>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {kpi.sub}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Executive Summary & Key Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: AI Narrative & Key Takeaways */}
        <div className="lg:col-span-2 space-y-6">
          {/* Executive Narrative Card */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-cyan-100 dark:bg-cyan-900/50 p-2 text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Executive Narrative & Key Insights
                  </h3>
                  <p className="text-xs text-slate-400">
                    Generated by Gemini 3.6 Flash Server Engine
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Verified AI Diagnosis
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {summary?.executiveSummary || 'Analyzing dataset structure and generating automated executive narrative...'}
            </p>

            {/* Strategic Observations Section with Vibrant Color Signature */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-100/90 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800 px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
                  Strategic Observations
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary?.keyTakeaways.map((takeaway, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-cyan-200/80 dark:border-cyan-900/60 bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-sky-500/10 dark:from-cyan-950/40 dark:via-teal-950/20 dark:to-sky-950/30 p-4 space-y-2 hover:border-cyan-400 dark:hover:border-cyan-700 transition-all shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        {takeaway.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                          takeaway.impact === 'HIGH'
                            ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
                            : 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                        }`}
                      >
                        {takeaway.impact} IMPACT
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {takeaway.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action Items */}
            <div className="pt-2 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recommended Decision Roadmap
              </h4>
              <div className="space-y-2">
                {summary?.recommendedActions.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/30 dark:bg-cyan-950/20 p-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        [{act.priority}] {act.action}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Expected Outcome: {act.expectedOutcome}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Key Driver Analysis & Quick Navigation */}
        <div className="space-y-6">
          {/* Key Driver Factors */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Key Driver & Correlations
              </h3>
            </div>

            <div className="space-y-3">
              {summary?.driverAnalysis.map((driver, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span>{driver.factor}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[11px]">
                      {driver.correlation}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {driver.insight}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Column Profile Summary List */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Column Profile Inspector ({dataset.columns.length})
              </h3>
              <button
                onClick={() => onNavigateTab('table')}
                className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1"
              >
                Full Grid <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {dataset.columns.map((col, idx) => (
                <div
                  key={`overview-col-${col.name}-${idx}`}
                  className="flex items-center justify-between rounded-xl p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                      {col.name}
                    </span>
                    <span className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[9px] uppercase font-mono text-slate-600 dark:text-slate-300">
                      {col.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {col.uniqueCount} uniques
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Module Shortcuts */}
          <div className="rounded-3xl border border-cyan-100 dark:border-cyan-900/50 bg-cyan-50/50 dark:bg-cyan-950/30 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
              Next Actions
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('profiling')}
                className="w-full flex items-center justify-between rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white p-3 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Inspect Deep Column Quality</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => onNavigateTab('charts')}
                className="w-full flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-300 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-500" />
                  <span>Build Dynamic Charts</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('sql')}
                className="w-full flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-300 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all"
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-500" />
                  <span>Execute SQL Queries</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('automl')}
                className="w-full flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-cyan-300 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-500" />
                  <span>Run Predictive AutoML Model</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
