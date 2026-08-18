import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Wand2,
  Table2, 
  BarChart3, 
  Search, 
  Brain, 
  MessageSquare, 
  ChevronRight,
  ShieldCheck
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
      description: 'Key takeaways & dashboard',
      badge: 'AI INSIGHTS',
      badgeColor: 'cyan',
    },
    {
      id: 'profiling',
      label: 'Data Profiling & Quality',
      icon: ShieldCheck,
      description: 'Data completeness & issues',
      badge: dataset?.profile ? `${dataset.profile.overallQualityScore}/100` : '98/100',
      badgeColor: 'cyan',
    },
    {
      id: 'cleaning',
      label: 'Clean & Fix Data',
      icon: Wand2,
      description: 'Autonomous cleaning',
      badge: 'AUTO-CLEAN',
      badgeColor: 'cyan',
    },
    {
      id: 'table',
      label: 'View Data Rows',
      icon: Table2,
      description: 'Browse, search & filter',
      badge: dataset ? `${dataset.rows.length} ROWS` : '13 ROWS',
      badgeColor: 'cyan',
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
      icon: Search,
      description: 'Ask questions or run search',
    },
    {
      id: 'automl',
      label: 'Smart AI Predictions',
      icon: Brain,
      description: 'Predict trends & future',
      badge: 'AI HELPER',
      badgeColor: 'indigo',
    },
    {
      id: 'chat',
      label: 'Chat with AI Helper',
      icon: MessageSquare,
      description: 'Ask any question about your data',
      badge: 'LIVE',
      badgeColor: 'magenta',
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-[#27345A] bg-[#080D1F] transition-all duration-300 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Navigation List */}
      <div className="flex-1 space-y-1.5 p-3 overflow-y-auto z-10">
        {!isCollapsed && (
          <div className="px-3 pt-2 pb-3 text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">
            WORKSPACE MODULES
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isPredictions = item.id === 'automl';

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onTabChange(item.id as TabType)}
              className={`relative w-full flex items-center rounded-2xl transition-all duration-200 group text-left ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'
              } ${
                isActive
                  ? isPredictions
                    ? 'bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#3B82F6] text-white shadow-xl shadow-[#7C3AED]/25 border border-transparent'
                    : 'bg-[#151B35] border border-[#00E5FF]/60 text-[#F8FAFC] shadow-lg shadow-[#00E5FF]/10'
                  : 'text-[#94A3B8] hover:bg-[#10162B] hover:text-[#F8FAFC] border border-transparent'
              }`}
            >
              <div className="relative z-10 flex items-center gap-3 min-w-0">
                <div
                  className={`flex items-center justify-center shrink-0 rounded-xl ${
                    isActive && isPredictions
                      ? 'h-8 w-8 bg-[#EC4899] text-white shadow-[0_0_12px_rgba(236,72,153,0.6)]'
                      : isActive
                      ? 'h-8 w-8 bg-[#00E5FF]/15 text-[#00E5FF]'
                      : 'h-8 w-8 text-[#94A3B8] group-hover:text-[#00E5FF]'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                {!isCollapsed && (
                  <div className="text-left min-w-0 truncate">
                    <p
                      className={`text-xs font-bold tracking-tight truncate ${
                        isActive ? 'text-white' : 'text-[#F8FAFC]'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p
                      className={`text-[10px] truncate mt-0.5 ${
                        isActive && isPredictions
                          ? 'text-white/80'
                          : isActive
                          ? 'text-[#00E5FF]'
                          : 'text-[#94A3B8]'
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
                    isActive && isPredictions
                      ? 'bg-white/20 text-white border border-white/30 backdrop-blur-xs'
                      : item.badgeColor === 'magenta'
                      ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40'
                      : 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cyber Neural Waves Ribbon Artwork at Bottom of Sidebar */}
      {!isCollapsed && (
        <div className="relative w-full h-32 overflow-hidden pointer-events-none mt-auto opacity-80">
          <svg
            viewBox="0 0 300 140"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="sidebarWaveCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="sidebarWavePurple" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EC4899" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d="M-20,100 C60,40 120,130 200,60 C260,-5 290,70 320,120"
              stroke="url(#sidebarWaveCyan)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M-20,120 C80,70 140,140 220,70 C280,15 300,90 330,130"
              stroke="url(#sidebarWavePurple)"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M-10,80 C70,110 160,50 240,110 C290,140 310,100 330,80"
              stroke="url(#sidebarWaveCyan)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
          </svg>
        </div>
      )}

      {/* Sidebar Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#27345A] bg-[#10162B] text-[#94A3B8] hover:text-[#00E5FF] hover:border-[#00E5FF] shadow-lg transition-all hover:scale-110 z-40"
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

