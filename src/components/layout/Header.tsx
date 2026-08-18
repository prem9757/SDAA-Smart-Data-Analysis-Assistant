import React from 'react';
import { motion } from 'motion/react';
import { 
  Database,
  PlusCircle,
  RefreshCw,
  FileText, 
  Sun, 
  Moon, 
  ChevronDown,
  Layers,
  LogOut,
  UserCheck
} from 'lucide-react';
import { Dataset } from '../../types/dataset';
import { User } from '../../types/auth';
import { SdaaLogo } from '../common/SdaaLogo';

interface HeaderProps {
  datasets: Dataset[];
  activeDataset?: Dataset;
  currentUser?: User | null;
  onLogout?: () => void;
  onSelectDataset: (dataset: Dataset) => void;
  onOpenReportModal: () => void;
  onOpenUploadModal: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  datasets,
  activeDataset,
  currentUser,
  onLogout,
  onSelectDataset,
  onOpenReportModal,
  onOpenUploadModal,
  onRefresh,
  isRefreshing = false,
  isDarkMode,
  onToggleTheme,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#27345A] bg-[#080D1F]/90 backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Branding & Dataset Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          <SdaaLogo size="sm" showSubtitle={false} />

          {activeDataset && (
            <>
              <div className="h-6 w-[1px] bg-[#27345A] hidden md:block" />

              {/* Dataset Switcher Dropdown */}
              <div className="relative">
                <button
                  id="dataset-switcher-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-[#27345A] bg-[#10162B] px-3 py-1.5 text-xs sm:text-sm font-medium text-[#F8FAFC] hover:border-[#00E5FF]/60 hover:bg-[#151B35] transition-all shadow-md active:scale-98"
                >
                  <Database className="h-4 w-4 text-[#00E5FF] shrink-0" />
                  <span className="max-w-[100px] sm:max-w-[180px] truncate font-semibold text-[#F8FAFC]">
                    {activeDataset.name}
                  </span>
                  <span className="hidden sm:inline-block rounded-md bg-[#151B35] border border-[#27345A] px-1.5 py-0.5 text-[10px] text-[#00E5FF] font-mono">
                    {activeDataset.rows.length} rows
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                </button>

                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute left-0 mt-2 w-80 rounded-2xl border border-[#27345A] bg-[#10162B] p-2 shadow-2xl z-50 backdrop-blur-xl"
                  >
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex justify-between items-center border-b border-[#27345A]/60 pb-2">
                      <span>Available Datasets ({datasets.length})</span>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenUploadModal();
                        }}
                        className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1 font-bold"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> Add New
                      </button>
                    </div>

                    <div className="mt-2 space-y-1 max-h-64 overflow-y-auto pr-1">
                      {datasets.map((ds) => (
                        <button
                          key={ds.id}
                          onClick={() => {
                            onSelectDataset(ds);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left rounded-xl p-2.5 transition-all flex items-start gap-3 ${
                            ds.id === activeDataset.id
                              ? 'bg-[#151B35] border border-[#00E5FF]/50 text-[#F8FAFC] shadow-inner'
                              : 'hover:bg-[#151B35]/60 text-[#CBD5E1]'
                          }`}
                        >
                          <div className="mt-0.5 rounded-lg bg-[#00E5FF]/10 p-1.5 text-[#00E5FF]">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate text-[#F8FAFC]">{ds.name}</p>
                              <span className="text-[10px] text-[#94A3B8] font-mono">
                                {ds.rows.length} rows
                              </span>
                            </div>
                            <p className="text-xs text-[#94A3B8] line-clamp-1 mt-0.5">
                              {ds.description || 'Uploaded dataset'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#27345A]">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenUploadModal();
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00E5FF]/20 to-[#3B82F6]/20 hover:from-[#00E5FF]/30 hover:to-[#3B82F6]/30 text-[#00E5FF] p-2 text-xs font-bold transition-all border border-[#00E5FF]/40"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Add New Data</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Actions & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Add New Data Button - Styled as in reference image */}
          <button
            id="add-new-data-header-btn"
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 rounded-full border border-[#00E5FF] bg-[#10162B] hover:bg-[#00E5FF]/10 text-[#00E5FF] px-3.5 py-1.5 text-xs font-semibold transition-all shadow-md active:scale-95"
            title="Upload or import a new dataset"
          >
            <PlusCircle className="h-4 w-4 text-[#00E5FF]" />
            <span>Add New Data</span>
          </button>

          {/* Refresh Button */}
          <button
            id="refresh-header-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-full border border-[#27345A] bg-[#10162B] hover:bg-[#151B35] px-3.5 py-1.5 text-xs font-semibold text-[#CBD5E1] hover:text-[#F8FAFC] transition-all shadow-md active:scale-95 disabled:opacity-50"
            title="Refresh dataset analysis"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#CBD5E1] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Executive Report Generator Button - Prominent Purple/Magenta Gradient Pill */}
          <button
            id="executive-report-header-btn"
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] hover:brightness-110 text-white px-4 py-1.5 text-xs font-bold shadow-lg shadow-[#9333EA]/30 transition-all active:scale-95"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Executive Report</span>
          </button>

          {/* Light / Dark Mode Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 rounded-full border border-[#27345A] bg-[#10162B] hover:bg-[#151B35] px-3.5 py-1.5 text-xs font-semibold text-[#FACC15] transition-all shadow-md active:scale-95"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <Sun className="h-3.5 w-3.5 text-[#FACC15]" />
            <span>Light</span>
          </button>

          {/* Logged In User Profile - Sarah Chen with circular magenta badge */}
          <div className="relative pl-1">
            <button
              id="user-profile-header-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-full border border-transparent hover:border-[#27345A] bg-transparent hover:bg-[#10162B] px-2 py-1 transition-all active:scale-98"
            >
              <div className="h-8 w-8 rounded-full bg-[#EC4899] flex items-center justify-center text-xs font-bold text-white shadow-md">
                SC
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-tight text-[#F8FAFC]">
                  {currentUser ? currentUser.name : 'Sarah Chen'}
                </p>
                <p className="text-[10px] text-[#94A3B8] font-normal">
                  {currentUser ? currentUser.role : 'Lead Data Scientist'}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
            </button>

            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#27345A] bg-[#10162B] p-3 shadow-2xl z-50 backdrop-blur-xl"
              >
                <div className="pb-2.5 mb-2 border-b border-[#27345A]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#00E5FF]" />
                    <p className="text-xs font-bold text-[#F8FAFC] truncate">
                      {currentUser ? currentUser.name : 'Sarah Chen'}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                    {currentUser ? currentUser.email : 'sarah.chen@sdaa.ai'}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-[#151B35] border border-[#27345A] text-[#00E5FF] font-semibold">
                      {currentUser ? currentUser.role : 'Lead Data Scientist'}
                    </span>
                    <span className="text-[#94A3B8]">Data Unit</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of Workspace</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

