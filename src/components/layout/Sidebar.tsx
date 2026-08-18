import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Wand2,
  Table2, 
  BarChart3, 
  Terminal, 
  Cpu, 
  MessageSquareCode, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  FileCheck
} from 'lucide-react';
import { Dataset } from '../../types/dataset';

export type TabType = 'overview' | 'profiling' | 'cleaning' | 'table' | 'charts' | 'sql' | 'automl' | 'chat';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  dataset?: Dataset;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  dataset,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Summary & Insights',
      icon: LayoutDashboard,
      description: 'Key takeaways & data health score',
      badge: 'AI Insights',
    },
    {
      id: 'profiling',
      label: 'Data Profiling & Quality',
      icon: ShieldCheck,
      description: '15-col profiling & candidate keys',
      badge: dataset?.profile ? `${dataset.profile.overallQualityScore}/100` : 'Engine',
    },
    {
      id: 'cleaning',
      label: 'Clean & Fix Data',
      icon: Wand2,
      description: 'Autonomous 1-click clean & validation',
      badge: dataset ? (dataset.health.missingnessRate > 0 ? `${dataset.health.missingnessRate}% missing` : 'Auto-Clean') : undefined,
    },
    {
      id: 'table',
      label: 'View Data Rows',
      icon: Table2,
      description: 'Browse, search & filter rows',
      badge: dataset ? `${dataset.rows.length} rows` : undefined,
    },
    {
      id: 'charts',
      label: 'Create Easy Charts',
      icon: BarChart3,
      description: 'Visual graphs & custom charts',
    },
    {
      id: 'sql',
      label: 'Search & Ask Questions',
      icon: Terminal,
      description: 'Ask questions or run custom searches',
    },
    {
      id: 'automl',
      label: 'Smart AI Predictions',
      icon: Cpu,
      description: 'Predict trends & future numbers',
      badge: 'AI Helper',
    },
    {
      id: 'chat',
      label: 'Chat with AI Helper',
      icon: MessageSquareCode,
      description: 'Ask any question about your data',
      badge: 'Live',
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md transition-all duration-300 z-30 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Navigation List */}
      <div className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Workspace Modules
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onTabChange(item.id as TabType)}
              className={`relative w-full flex items-center rounded-xl transition-all duration-200 group ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'
              } ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
              }`}
            >
              {/* Active Pill Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  className="absolute inset-0 rounded-xl bg-cyan-600 z-0"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-cyan-500'
                  }`}
                />
                {!isCollapsed && (
                  <div className="text-left min-w-0 truncate">
                    <p className="text-xs tracking-tight truncate">{item.label}</p>
                    <p
                      className={`text-[10px] truncate ${
                        isActive ? 'text-cyan-100' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`relative z-10 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dataset Health Status Mini Widget at Bottom */}
      {!isCollapsed && dataset && (
        <div className="p-3 m-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-850/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Data Health
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {dataset.health.score}/100
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                dataset.health.score >= 80
                  ? 'bg-emerald-500'
                  : dataset.health.score >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${dataset.health.score}%` }}
            />
          </div>

          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>Missingness: {dataset.health.missingnessRate}%</span>
            <span>Outliers: {dataset.health.outlierCount}</span>
          </p>
        </div>
      )}

      {/* Sidebar Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shadow-md transition-all hover:scale-110 z-40"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform duration-300 ${
            isCollapsed ? '' : 'rotate-180'
          }`}
        />
      </button>
    </aside>
  );
};
