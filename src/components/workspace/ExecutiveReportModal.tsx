import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle,
  BrainCircuit
} from 'lucide-react';
import { Dataset } from '../../types/dataset';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset?: Dataset;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  dataset,
}) => {
  if (!isOpen || !dataset) return null;

  const summary = dataset.summary;
  const health = dataset.health;
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[90vh] my-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-850">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-600 p-2 text-white shadow-md shadow-cyan-600/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Executive Analytical Report
                </h2>
                <p className="text-xs text-slate-400">
                  Formatted for C-Suite Presentation & Board Review
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-xs font-bold transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Save PDF</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Printable Report Body */}
          <div className="p-8 overflow-y-auto space-y-8 print:p-0 print:space-y-6">
            
            {/* Title Section */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  Smart Data Analysis Briefing
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {dataset.name}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Generated on {currentDate} • Scope: {dataset.rows.length} Records, {dataset.columns.length} Variables
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">Overall Data Health</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {health.score} / 100
                </p>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Status: {health.status}
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Executive Summary & Diagnosis
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 font-medium">
                {summary?.executiveSummary}
              </p>
            </div>

            {/* AI Analytical Thinking & Reasoning Stages */}
            {summary?.thinkingProcess && summary.thinkingProcess.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 bg-cyan-100/90 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800 px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                    <BrainCircuit className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    2. AI Analytical Thinking & Scientific Rationale
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.thinkingProcess.map((step) => (
                    <div
                      key={step.step}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 space-y-1 text-xs"
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-white text-[10px]">
                          {step.step}
                        </span>
                        <span>{step.phase}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-7">
                        {step.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Takeaways with Vibrant Color Signature */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-100/90 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800 px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
                  3. Key Strategic Observations
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary?.keyTakeaways.map((takeaway, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-cyan-200/80 dark:border-cyan-900/60 bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-cyan-500/10 dark:from-cyan-950/40 dark:via-teal-950/20 dark:to-cyan-950/30 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        {takeaway.title}
                      </span>
                      <span className="text-[10px] font-extrabold text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded-md uppercase">
                        {takeaway.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {takeaway.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action Roadmap */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Recommended Executive Action Roadmap
              </h3>
              <div className="space-y-2">
                {summary?.recommendedActions.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Priority {act.priority}: {act.action}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Expected Outcome: {act.expectedOutcome}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dataset Column Metadata Inventory */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Variable Profile Inventory
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-4">Variable</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Missing %</th>
                      <th className="py-2.5 px-4">Unique Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {dataset.columns.map((c, idx) => (
                      <tr key={`report-col-${c.name}-${idx}`}>
                        <td className="py-2 px-4 font-bold text-slate-800 dark:text-slate-200">{c.name}</td>
                        <td className="py-2 px-4 text-slate-500 uppercase">{c.type}</td>
                        <td className="py-2 px-4 text-slate-500">{c.missingPercentage}%</td>
                        <td className="py-2 px-4 text-slate-500">{c.uniqueCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
              Confidential • Generated by SDA — Smart Data Analysis Assistant Platform
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
