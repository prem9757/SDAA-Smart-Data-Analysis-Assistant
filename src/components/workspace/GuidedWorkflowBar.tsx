import React from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Sparkles, 
  BarChart3, 
  Brain, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Wand2,
  PieChart
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
  iconBg: string;
  iconColor: string;
  barColor: string;
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
      icon: Activity,
      iconBg: 'bg-[#00E5FF]/15',
      iconColor: 'text-[#00E5FF]',
      barColor: 'bg-[#00E5FF]',
    },
    {
      id: 2,
      tab: 'cleaning',
      title: '2. Clean & Fix Data',
      subtitle: 'Fix Missing & Duplicates',
      icon: Wand2,
      iconBg: 'bg-[#3B82F6]/15',
      iconColor: 'text-[#3B82F6]',
      barColor: 'bg-[#3B82F6]',
    },
    {
      id: 3,
      tab: 'charts',
      title: '3. Create Easy Charts',
      subtitle: 'Graphs & Visuals',
      icon: BarChart3,
      iconBg: 'bg-[#8B5CF6]/15',
      iconColor: 'text-[#8B5CF6]',
      barColor: 'bg-[#8B5CF6]',
    },
    {
      id: 4,
      tab: 'automl',
      title: '4. Ask & Predict',
      subtitle: 'Search & AI Predictions',
      icon: Brain,
      iconBg: 'bg-white/20',
      iconColor: 'text-white',
      barColor: 'bg-white',
    },
    {
      id: 5,
      tab: 'report',
      title: '5. Executive Report',
      subtitle: 'Summary & PDF Download',
      icon: FileText,
      iconBg: 'bg-[#F97316]/15',
      iconColor: 'text-[#F97316]',
      barColor: 'bg-[#F97316]',
    },
  ];

  // Determine current active stage index
  const activeStageIndex = React.useMemo(() => {
    switch (activeTab) {
      case 'overview':
      case 'table':
      case 'profiling':
        return 0;
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
        return 3;
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
    <div className="mb-6 rounded-3xl border border-[#27345A] bg-[#10162B] p-5 shadow-2xl text-[#F8FAFC] space-y-4">
      {/* Top Workflow Banner Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27345A]/70 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6] text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#F8FAFC] flex flex-wrap items-center gap-1.5">
              <span>Guided Analysis Workflow:</span>{' '}
              <span className="text-[#00E5FF]">Overview</span>
              <span className="text-[#00E5FF]">→</span>
              <span className="text-[#3B82F6]">Clean</span>
              <span className="text-[#3B82F6]">→</span>
              <span className="text-[#8B5CF6]">Charts</span>
              <span className="text-[#8B5CF6]">→</span>
              <span className="text-[#EC4899]">Predict</span>
              <span className="text-[#EC4899]">→</span>
              <span className="text-[#F97316]">Report</span>
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Active Dataset: <b className="text-[#F8FAFC]">{datasetName}</b> ({rowCount} records) • Step 4 of 5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold bg-[#064E3B]/80 text-[#22C55E] border border-[#22C55E]/30 px-3.5 py-1.5 rounded-full font-mono">
            80% COMPLETE
          </span>
          <button
            onClick={() => {
              const nextStage = workflowStages[(activeStageIndex + 1) % 5];
              handleStageClick(nextStage);
            }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:brightness-110 text-white px-4 py-1.5 text-xs font-bold shadow-lg shadow-[#9333EA]/30 transition-all active:scale-95"
          >
            <span>Next Step</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive 5-Stage Stepper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {workflowStages.map((stage, idx) => {
          const Icon = stage.icon;
          const isCurrent = activeStageIndex === idx;
          const isCompleted = activeStageIndex > idx;

          return (
            <button
              key={stage.id}
              onClick={() => handleStageClick(stage)}
              className={`relative flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 group overflow-hidden ${
                isCurrent
                  ? 'bg-gradient-to-r from-[#D946EF] via-[#EC4899] to-[#F97316] border-transparent text-white shadow-xl shadow-[#EC4899]/20'
                  : 'bg-[#0B1024] border-[#27345A] text-[#CBD5E1] hover:border-[#00E5FF]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  isCurrent ? 'bg-white/20 text-white' : `${stage.iconBg} ${stage.iconColor}`
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                {isCompleted ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-[#22C55E]" />
                ) : isCurrent ? (
                  <PieChart className="h-4.5 w-4.5 text-white/80" />
                ) : (
                  <span className="text-[11px] font-mono text-[#94A3B8]">0{stage.id}</span>
                )}
              </div>

              <span className={`font-bold text-xs tracking-tight truncate ${isCurrent ? 'text-white' : 'text-[#F8FAFC]'}`}>
                {stage.title}
              </span>
              <span className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-white/80' : 'text-[#94A3B8]'}`}>
                {stage.subtitle}
              </span>

              {/* Progress Indicator Line */}
              <div className={`mt-3 h-1.5 w-full rounded-full overflow-hidden ${
                isCurrent ? 'bg-black/20' : 'bg-[#050816] border border-[#27345A]/50'
              }`}>
                <div
                  className={`h-full transition-all duration-300 ${
                    isCurrent ? 'bg-white shadow-[0_0_8px_#FFFFFF]' : isCompleted ? stage.barColor : 'bg-transparent'
                  }`}
                  style={{ width: isCompleted ? '100%' : isCurrent ? '80%' : '0%' }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

