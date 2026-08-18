import React from 'react';
import { motion } from 'motion/react';
import { 
  FileSearch, 
  Sparkles, 
  BarChart3, 
  Cpu, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Zap,
  Wand2
} from 'lucide-react';
import { TabType } from '../layout/Sidebar';

interface GuidedWorkflowBarProps {
  activeTab: TabType;
  onNavigateTab: (tab: TabType) => void;
  onOpenReportModal: () => void;
  datasetName: string;
  rowCount: number;
}

export interface WorkflowStage {
  id: number;
  tab: TabType | 'report';
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
}

export const GuidedWorkflowBar: React.FC<GuidedWorkflowBarProps> = ({
  activeTab,
  onNavigateTab,
  onOpenReportModal,
  datasetName,
  rowCount,
}) => {
  const workflowStages: WorkflowStage[] = [
    {
      id: 1,
      tab: 'overview',
      title: '1. Overview & Health',
      subtitle: 'Data Summary & Score',
      icon: FileSearch,
      description: 'Check missing values, data structure & health score.',
    },
    {
      id: 2,
      tab: 'cleaning',
      title: '2. Clean & Fix Data',
      subtitle: 'Fix Missing & Duplicates',
      icon: Wand2,
      description: 'Fill empty fields, remove duplicates, and fix text.',
    },
    {
      id: 3,
      tab: 'charts',
      title: '3. Create Easy Charts',
      subtitle: 'Graphs & Visuals',
      icon: BarChart3,
      description: 'Build simple bar charts, line graphs, and pie charts.',
    },
    {
      id: 4,
      tab: 'sql',
      title: '4. Ask & Predict',
      subtitle: 'Search & AI Predictions',
      icon: Cpu,
      description: 'Search data with simple questions & predict future trends.',
    },
    {
      id: 5,
      tab: 'report',
      title: '5. Executive Report',
      subtitle: 'Summary & PDF Download',
      icon: FileText,
      description: 'Generate an easy-to-read executive report with 1 click.',
    },
  ];

  // Determine current active stage index
  const activeStageIndex = React.useMemo(() => {
    switch (activeTab) {
      case 'overview':
      case 'table':
      case 'profiling':
        return 0;
      case 'validation':
      case 'cleaning':
        return 1;
      case 'charts':
        return 2;
      case 'sql':
      case 'automl':
        return 3;
      case 'chat':
        return 4;
      default:
        return 0;
    }
  }, [activeTab]);

  const handleStageClick = (stage: WorkflowStage) => {
    if (stage.tab === 'report') {
      onOpenReportModal();
    } else {
      onNavigateTab(stage.tab as TabType);
    }
  };

  return (
    <div className="mb-6 rounded-3xl border border-cyan-200/80 dark:border-cyan-900/60 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-5 shadow-xl text-white space-y-4">
      {/* Top Workflow Banner Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              Guided Analysis Workflow: <span className="text-cyan-300 font-mono">Overview → Clean → Charts → Predict → Report</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Active Dataset: <b className="text-white">{datasetName}</b> ({rowCount} records) • Step {activeStageIndex + 1} of 5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
            {Math.round(((activeStageIndex + 1) / 5) * 100)}% Complete
          </span>
          <button
            onClick={() => {
              const nextStage = workflowStages[(activeStageIndex + 1) % 5];
              handleStageClick(nextStage);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
          >
            <span>Next Step</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive 5-Stage Stepper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {workflowStages.map((stage, idx) => {
          const Icon = stage.icon;
          const isCurrent = activeStageIndex === idx;
          const isCompleted = activeStageIndex > idx;

          return (
            <button
              key={stage.id}
              onClick={() => handleStageClick(stage)}
              className={`relative flex flex-col text-left p-3 rounded-2xl border transition-all duration-200 group ${
                isCurrent
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-600/40 ring-2 ring-cyan-400/50'
                  : isCompleted
                  ? 'bg-slate-800/80 border-cyan-500/30 text-cyan-200 hover:bg-slate-800 hover:border-cyan-400/60'
                  : 'bg-slate-850/60 border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-1.5 rounded-xl ${isCurrent ? 'bg-white/20 text-white' : 'bg-white/10 text-cyan-300'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isCurrent ? (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">0{stage.id}</span>
                )}
              </div>

              <span className="font-extrabold text-xs tracking-tight truncate">
                {stage.title}
              </span>
              <span className={`text-[10px] truncate ${isCurrent ? 'text-cyan-100 font-medium' : 'text-slate-400'}`}>
                {stage.subtitle}
              </span>

              {/* Progress Indicator Line */}
              <div className="mt-2.5 h-1 w-full rounded-full bg-black/20 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCurrent ? 'bg-white' : isCompleted ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                  style={{ width: isCompleted ? '100%' : isCurrent ? '75%' : '20%' }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
