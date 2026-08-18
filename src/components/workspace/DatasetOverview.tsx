import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Database, 
  RefreshCw,
  Wand2,
  Table2,
  BarChart3,
  MessageSquareCode,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  AlertCircle
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
  const health = dataset.health;
  const summary = dataset.summary;

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome & AI Status Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#27345A] bg-[#10162B]/95 p-6 sm:p-8 text-[#F8FAFC] shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#00E5FF]/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-12 h-48 w-48 rounded-full bg-[#7C3AED]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#00E5FF]/15 px-3 py-1 text-xs font-semibold text-[#00E5FF] border border-[#00E5FF]/30">
              <Sparkles className="h-3.5 w-3.5 text-[#00E5FF] animate-pulse" />
              <span>Smart AI Intelligence & Autonomous Thinking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
              {dataset.name}
            </h1>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              {dataset.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRefreshAIAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-xl bg-[#151B35] hover:bg-[#1E293B] text-[#F8FAFC] px-4 py-2.5 text-xs font-bold border border-[#27345A] transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-[#00E5FF] ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Thinking...' : 'Refresh AI Analysis'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('cleaning')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#3B82F6] hover:brightness-110 text-[#050816] px-4 py-2.5 text-xs font-extrabold shadow-lg shadow-[#00E5FF]/20 transition-all active:scale-95"
            >
              <Wand2 className="h-4 w-4 text-[#050816]" />
              <span>1-Click Clean & Fix</span>
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
            color: 'text-[#00E5FF]',
            bgColor: 'bg-[#00E5FF]/10 border border-[#00E5FF]/20',
          },
          {
            title: 'Data Health Score',
            value: `${health.score}/100`,
            sub: `Status: ${health.status}`,
            icon: ShieldCheck,
            color: health.score >= 80 ? 'text-[#22C55E]' : 'text-[#FACC15]',
            bgColor: health.score >= 80 ? 'bg-[#22C55E]/10 border border-[#22C55E]/20' : 'bg-[#FACC15]/10 border border-[#FACC15]/20',
          },
          {
            title: 'Analysis Readiness',
            value: dataset.profile ? `${dataset.profile.analysisReadiness.score}%` : '100%',
            sub: dataset.profile ? `${dataset.profile.analysisReadiness.status}` : 'READY',
            icon: Zap,
            color: 'text-[#8B5CF6]',
            bgColor: 'bg-[#8B5CF6]/10 border border-[#8B5CF6]/20',
          },
          {
            title: 'Missingness Rate',
            value: `${health.missingnessRate}%`,
            sub: `${health.duplicateRows} duplicates found`,
            icon: Activity,
            color: 'text-[#EC4899]',
            bgColor: 'bg-[#EC4899]/10 border border-[#EC4899]/20',
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-[#27345A] bg-[#10162B] p-5 shadow-lg transition-all hover:border-[#00E5FF]/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#94A3B8]">
                  {kpi.title}
                </span>
                <div className={`rounded-xl p-2 ${kpi.bgColor} ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
                  {kpi.value}
                </span>
                <p className="mt-1 text-[11px] text-[#94A3B8] font-mono">
                  {kpi.sub}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Simple 1-Click Action Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: '1-Click Clean & Fix',
            desc: 'Auto-fix missing data, types & dates',
            icon: Wand2,
            tab: 'cleaning' as TabType,
            btnText: 'Run Auto-Clean',
            accent: 'hover:border-[#00E5FF] text-[#00E5FF]',
          },
          {
            title: 'Explore Data Rows',
            desc: 'Search, filter, edit & export data',
            icon: Table2,
            tab: 'table' as TabType,
            btnText: 'Open Table',
            accent: 'hover:border-[#3B82F6] text-[#3B82F6]',
          },
          {
            title: 'Create Easy Charts',
            desc: 'Visualize trends & correlations',
            icon: BarChart3,
            tab: 'charts' as TabType,
            btnText: 'Build Charts',
            accent: 'hover:border-[#7C3AED] text-[#8B5CF6]',
          },
          {
            title: 'Ask AI Analyst',
            desc: 'Natural language questions & queries',
            icon: MessageSquareCode,
            tab: 'chat' as TabType,
            btnText: 'Start Chat',
            accent: 'hover:border-[#EC4899] text-[#EC4899]',
          },
        ].map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              onClick={() => onNavigateTab(act.tab)}
              className={`p-4 rounded-2xl border border-[#27345A] bg-[#10162B] text-left transition-all hover:scale-[1.02] shadow-md group ${act.accent}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#151B35] border border-[#27345A] text-[#F8FAFC]">
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-[#94A3B8] group-hover:text-[#00E5FF] group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xs font-bold text-[#F8FAFC]">
                {act.title}
              </h3>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                {act.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* AI Analytical Thinking & Key Insights Preview */}
      <div className="rounded-3xl border border-[#27345A] bg-[#10162B] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#27345A] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#F8FAFC]">
                AI Reasoning & Strategic Diagnosis
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                Automated statistical hypothesis and business implications
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('chat')}
            className="text-xs font-semibold text-[#00E5FF] hover:underline flex items-center gap-1 font-bold"
          >
            <span>Ask Follow-up</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {summary?.executiveSummary && (
          <p className="text-xs text-[#CBD5E1] leading-relaxed p-4 rounded-2xl bg-[#0B1024] border border-[#27345A]">
            {summary.executiveSummary}
          </p>
        )}

        {/* Thinking Stages */}
        {summary?.thinkingProcess && summary.thinkingProcess.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {summary.thinkingProcess.map((st) => (
              <div
                key={st.step}
                className="p-3.5 rounded-2xl border border-[#27345A] bg-[#0B1024]/80 space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#F8FAFC]">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00E5FF] text-[#050816] text-[9px] font-extrabold">
                    {st.step}
                  </span>
                  <span>{st.phase}</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed pl-6">
                  {st.reasoning}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
