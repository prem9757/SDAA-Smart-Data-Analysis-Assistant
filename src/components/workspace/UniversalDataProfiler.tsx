import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Key,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  Calendar,
  DollarSign,
  Percent,
  Hash,
  Mail,
  FileText,
  AlertOctagon,
  ArrowUpDown,
  Zap,
  Info,
  Sliders,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Dataset } from '../../types/dataset';
import {
  ColumnProfile,
  ColumnStatus,
  SemanticDataType,
  ColumnRole,
  PrimaryCandidate,
  CrossColumnIssue,
  RedundantColumnPair,
} from '../../types/profiling';
import { generateUniversalDatasetProfile } from '../../utils/universalDataProfiler';

interface UniversalDataProfilerProps {
  dataset: Dataset;
  onNavigateToCleaning?: () => void;
}

export const UniversalDataProfiler: React.FC<UniversalDataProfilerProps> = ({
  dataset,
  onNavigateToCleaning,
}) => {
  // Ensure we have a complete profile
  const profile = React.useMemo(() => {
    if (dataset.profile && dataset.profile.columns && dataset.profile.columns.length > 0) {
      return dataset.profile;
    }
    return generateUniversalDatasetProfile(dataset.name, dataset.rows, dataset.rawRows);
  }, [dataset]);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');
  const [expandedColumn, setExpandedColumn] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'columns' | 'keys' | 'correlations'>('columns');

  // Filter columns
  const filteredColumns = React.useMemo(() => {
    return profile.columns.filter((c) => {
      const matchSearch =
        c.column.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.semanticType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchRole = roleFilter === 'ALL' || c.role === roleFilter;
      return matchSearch && matchStatus && matchRole;
    });
  }, [profile.columns, searchQuery, statusFilter, roleFilter]);

  const getStatusBadge = (status: ColumnStatus) => {
    switch (status) {
      case 'EXCELLENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> EXCELLENT
          </span>
        );
      case 'GOOD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> GOOD
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" /> WARNING
          </span>
        );
      case 'POOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            <AlertOctagon className="h-3.5 w-3.5" /> POOR
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="h-3.5 w-3.5" /> CRITICAL
          </span>
        );
      default:
        return null;
    }
  };

  const getSemanticIcon = (type: SemanticDataType) => {
    switch (type) {
      case 'ID':
        return <Key className="h-3.5 w-3.5 text-indigo-500" />;
      case 'Date':
      case 'Timestamp':
      case 'Time':
        return <Calendar className="h-3.5 w-3.5 text-amber-500" />;
      case 'Currency':
        return <DollarSign className="h-3.5 w-3.5 text-emerald-500" />;
      case 'Percentage':
        return <Percent className="h-3.5 w-3.5 text-purple-500" />;
      case 'Quantity':
      case 'Measure':
        return <Hash className="h-3.5 w-3.5 text-cyan-500" />;
      case 'Email':
        return <Mail className="h-3.5 w-3.5 text-sky-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Analysis Readiness & Quality Overview */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                {profile.pipelineStage}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Estimated Domain: <strong className="text-slate-900 dark:text-white">{profile.estimatedDomain}</strong> ({profile.domainConfidence}% confidence)
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Universal Dataset Profiling & Column Quality Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Rigorous profiling across physical types, semantic roles, completeness, validity, integrity, candidate keys, and relational constraints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Analysis Readiness Pill */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-3.5 border border-slate-200/60 dark:border-slate-700/60">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-black text-base shadow-sm ${
                profile.analysisReadiness.score >= 85
                  ? 'bg-emerald-600'
                  : profile.analysisReadiness.score >= 65
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}>
                {profile.analysisReadiness.score}%
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Analysis Readiness</span>
                <span className={`text-xs font-black ${
                  profile.analysisReadiness.status === 'READY'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : profile.analysisReadiness.status === 'MOSTLY READY'
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : profile.analysisReadiness.status === 'NEEDS REVIEW'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {profile.analysisReadiness.status}
                </span>
              </div>
            </div>

            {/* Overall Quality Score */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-3.5 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600 text-white font-black text-base shadow-sm">
                {profile.overallQualityScore}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Avg Quality Score</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {profile.columns.length} Columns Profiled
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToCleaning && (
                <button
                  onClick={onNavigateToCleaning}
                  className="flex items-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-3.5 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
                >
                  <Zap className="h-4 w-4" />
                  <span>Execute 1-Click Clean & Validation</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Readiness Blockers / Strengths Summary */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Readiness Diagnostics:</span>
          {profile.analysisReadiness.blockers.map((b, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-medium border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="h-3 w-3 shrink-0" /> {b}
            </span>
          ))}
          {profile.analysisReadiness.strengths.map((s, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-900">
              <Check className="h-3 w-3 shrink-0" /> {s}
            </span>
          ))}
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('columns')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'columns'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Column Quality Table ({profile.columns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'keys'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>Candidate Primary Keys ({profile.structuralInfo.potentialPrimaryKeys.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('correlations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'correlations'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Correlations & Redundancy ({profile.redundantColumns.length + profile.correlationMatrix.length})</span>
          </button>
        </div>

        {activeTab === 'columns' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search columns, types, roles..."
                className="w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="EXCELLENT">EXCELLENT</option>
              <option value="GOOD">GOOD</option>
              <option value="WARNING">WARNING</option>
              <option value="POOR">POOR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: 15-COLUMN QUALITY TABLE */}
      {activeTab === 'columns' && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Column Name</th>
                  <th className="py-3 px-3">Data Type</th>
                  <th className="py-3 px-3">Semantic Type</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-right">Rows</th>
                  <th className="py-3 px-3 text-right">Non-Null</th>
                  <th className="py-3 px-3 text-right">Missing</th>
                  <th className="py-3 px-3 text-right">Missing %</th>
                  <th className="py-3 px-3 text-right">Unique</th>
                  <th className="py-3 px-3 text-right">Unique %</th>
                  <th className="py-3 px-3 text-right">Duplicates</th>
                  <th className="py-3 px-3 text-right">Invalid</th>
                  <th className="py-3 px-3 text-right">Outliers</th>
                  <th className="py-3 px-3 text-center">Quality Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredColumns.map((col) => {
                  const isExpanded = expandedColumn === col.column;

                  return (
                    <React.Fragment key={col.column}>
                      <tr
                        onClick={() => setExpandedColumn(isExpanded ? null : col.column)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-cyan-50/60 dark:bg-cyan-950/20'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* 1. Column Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-cyan-600" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {col.column}
                            </span>
                            {col.isIdentifier && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                                ID
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Physical Data Type */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {col.physicalType}
                        </td>

                        {/* 3. Semantic Type */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            {getSemanticIcon(col.semanticType)}
                            <span>{col.semanticType}</span>
                          </div>
                        </td>

                        {/* 4. Role */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            col.role === 'Primary Key'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : col.role === 'Identifier'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : col.role === 'Measure'
                              ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                              : col.role === 'Target'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {col.role}
                          </span>
                        </td>

                        {/* 5. Rows */}
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400 font-mono">
                          {col.rows}
                        </td>

                        {/* 6. Non-Null */}
                        <td className="py-3 px-3 text-right text-slate-800 dark:text-slate-200 font-mono font-bold">
                          {col.nonNull}
                        </td>

                        {/* 7. Missing */}
                        <td className="py-3 px-3 text-right font-mono">
                          <span className={col.missing > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}>
                            {col.missing}
                          </span>
                        </td>

                        {/* 8. Missing % */}
                        <td className="py-3 px-3 text-right font-mono">
                          <span className={col.missingPercentage > 10 ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                            {col.missingPercentage}%
                          </span>
                        </td>

                        {/* 9. Unique */}
                        <td className="py-3 px-3 text-right text-slate-800 dark:text-slate-200 font-mono">
                          {col.unique}
                        </td>

                        {/* 10. Unique % */}
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400 font-mono">
                          {col.uniquePercentage}%
                        </td>

                        {/* 11. Duplicates */}
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {col.duplicates}
                        </td>

                        {/* 12. Invalid */}
                        <td className="py-3 px-3 text-right font-mono">
                          {col.invalid > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold">
                              {col.invalid}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* 13. Outliers */}
                        <td className="py-3 px-3 text-right font-mono">
                          {col.outliers > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold">
                              {col.outliers}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* 14. Quality Score */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 font-mono font-black text-xs">
                            <span className={`px-2 py-0.5 rounded-lg ${
                              col.qualityScore.overallScore >= 90
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : col.qualityScore.overallScore >= 75
                                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                                : col.qualityScore.overallScore >= 50
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {col.qualityScore.overallScore}
                            </span>
                          </div>
                        </td>

                        {/* 15. Status */}
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(col.status)}
                        </td>
                      </tr>

                      {/* Expandable Drill-Down Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-850/90 border-y border-slate-200 dark:border-slate-800">
                          <td colSpan={15} className="p-5">
                            <div className="space-y-4">
                              {/* Score Breakdown Bar */}
                              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-cyan-500" />
                                    Quality Score Component Breakdown
                                  </h4>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    Overall: <strong>{col.qualityScore.overallScore}/100</strong>
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Completeness</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{col.qualityScore.completeness}%</span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Validity</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{col.qualityScore.validity}%</span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Consistency</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{col.qualityScore.consistency}%</span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Uniqueness</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{col.qualityScore.uniqueness}%</span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Integrity</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{col.qualityScore.integrity}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Statistical Distribution & Outliers Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Distribution Metrics */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                                    Distribution & Statistics
                                  </h5>
                                  {col.distribution.mean !== undefined ? (
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                        <span className="text-[10px] text-slate-400 block">Min / Max</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{col.distribution.min} / {col.distribution.max}</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                        <span className="text-[10px] text-slate-400 block">Mean / Median</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{col.distribution.mean} / {col.distribution.median}</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                        <span className="text-[10px] text-slate-400 block">Q1 / Q3 / IQR</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{col.distribution.q1} / {col.distribution.q3} ({col.distribution.iqr})</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                        <span className="text-[10px] text-slate-400 block">Std Deviation</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{col.distribution.stdDev}</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                        <span className="text-[10px] text-slate-400 block">Skewness</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{col.distribution.skewness}</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                                        <span className="text-[10px] text-slate-400 block">Kurtosis</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{col.distribution.kurtosis}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5 text-xs">
                                      <span className="text-[11px] font-semibold text-slate-500">Top Categories:</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {col.distribution.topCategories?.map((cat, i) => (
                                          <span key={i} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                                            {cat.value}: <strong>{cat.count}</strong> ({cat.percentage}%)
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Outlier & Type Validation Recommendations */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                    Type Validation & Recommended Action
                                  </h5>
                                  <div className="space-y-2 text-xs">
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                                      <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Type Confidence</span>
                                        <span className="font-bold text-cyan-600 dark:text-cyan-400">{col.typeValidation.typeConfidence} CONFIDENCE</span>
                                      </div>
                                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {col.typeValidation.recommendedAction}
                                      </span>
                                    </div>

                                    {col.outlierDetails.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                          {col.outlierDetails.length} Outlier(s) Detected:
                                        </span>
                                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px]">
                                          {col.outlierDetails.slice(0, 3).map((outlier, i) => (
                                            <div key={i} className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 flex items-center justify-between">
                                              <span>Row {outlier.row}: <strong>{outlier.value}</strong> ({outlier.classification})</span>
                                              <span className="text-[10px] font-mono text-amber-600">{outlier.detectionMethod}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CANDIDATE PRIMARY KEYS */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-500" />
              Candidate Primary Key Detection & Ranking
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluates columns for uniqueness, completeness (0% missing), and stable identifier patterns.
            </p>

            {profile.structuralInfo.potentialPrimaryKeys.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center text-xs text-slate-500">
                No single column meets the strict 100% uniqueness criteria for a natural primary key. Composite key or synthetic index suggested.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {profile.structuralInfo.potentialPrimaryKeys.map((pk) => (
                  <div
                    key={pk.columnName}
                    className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/80 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
                          #{pk.rank}
                        </span>
                        <h4 className="font-mono font-bold text-sm text-indigo-900 dark:text-indigo-200">
                          {pk.columnName}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pk.confidence === 'High'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {pk.confidence} Confidence
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Uniqueness</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{pk.uniqueness}%</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Missing</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{pk.missingPercentage}%</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Pattern Match</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{pk.patternConsistency}%</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">{pk.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CORRELATIONS & REDUNDANCY */}
      {activeTab === 'correlations' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-500" />
              Redundant Column Pairs & Statistical Correlations
            </h3>

            {/* Redundancy Warnings */}
            {profile.redundantColumns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  Redundancy / Near-Duplicate Columns
                </h4>
                {profile.redundantColumns.map((red, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <div>
                      <strong>{red.columnA}</strong> & <strong>{red.columnB}</strong> ({red.similarityScore}% identical values)
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">{red.explanation}</p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200">{red.recommendation}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pearson Correlations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Numeric Linear Correlations (Pearson r)
              </h4>
              {profile.correlationMatrix.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                  Not enough numeric columns to compute linear correlations.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {profile.correlationMatrix.map((pair, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {pair.colA} & {pair.colB}
                        </span>
                        <span className={`font-mono font-black ${
                          Math.abs(pair.pearson) >= 0.7
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          r = {pair.pearson}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">{pair.relationship}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
