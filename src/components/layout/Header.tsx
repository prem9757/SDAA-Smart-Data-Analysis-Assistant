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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Branding & Dataset Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          <SdaaLogo size="sm" showSubtitle={false} />

          {activeDataset && (
            <>
              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block" />

              {/* Dataset Switcher Dropdown */}
              <div className="relative">
                <button
                  id="dataset-switcher-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all shadow-xs"
                >
                  <Database className="h-4 w-4 text-cyan-500 shrink-0" />
                  <span className="max-w-[100px] sm:max-w-[180px] truncate font-semibold">
                    {activeDataset.name}
                  </span>
                  <span className="hidden sm:inline-block rounded-md bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                    {activeDataset.rows.length} rows
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute left-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50"
                  >
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex justify-between items-center">
                      <span>Datasets ({datasets.length})</span>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenUploadModal();
                        }}
                        className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> Add New Data
                      </button>
                    </div>

                    <div className="mt-1 space-y-1 max-h-64 overflow-y-auto pr-1">
                      {datasets.map((ds) => (
                        <button
                          key={ds.id}
                          onClick={() => {
                            onSelectDataset(ds);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left rounded-xl p-2.5 transition-all flex items-start gap-3 ${
                            ds.id === activeDataset.id
                              ? 'bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-100'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="mt-0.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 p-1.5 text-cyan-600 dark:text-cyan-300">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate">{ds.name}</p>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {ds.rows.length} rows
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {ds.description || 'Uploaded dataset'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenUploadModal();
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 p-2 text-xs font-bold transition-all border border-cyan-200/60 dark:border-cyan-800/60"
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
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Add New Data Button at the Top */}
          <button
            id="add-new-data-header-btn"
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/80 text-cyan-700 dark:text-cyan-300 px-3 py-2 text-xs font-bold transition-all shadow-xs active:scale-95"
            title="Upload or import a new dataset"
          >
            <PlusCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden sm:inline">Add New Data</span>
          </button>

          {/* Refresh Button */}
          <button
            id="refresh-header-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh dataset analysis"
          >
            <RefreshCw className={`h-4 w-4 text-teal-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          {/* Executive Report Generator Button */}
          <button
            id="executive-report-header-btn"
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 text-xs font-semibold shadow-md shadow-teal-600/20 transition-all active:scale-95"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden lg:inline">Executive Report</span>
          </button>

          {/* Dark / Light Mode Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs active:scale-95"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" />
                <span className="hidden xl:inline text-amber-400">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-cyan-600" />
                <span className="hidden xl:inline text-cyan-600">Dark</span>
              </>
            )}
          </button>

          {/* Logged In User Profile & Logout Button */}
          {currentUser && (
            <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800">
              <button
                id="user-profile-header-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800/90 px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all shadow-xs"
              >
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-xs font-extrabold text-white shadow-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 truncate max-w-[110px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold truncate max-w-[110px]">
                    {currentUser.role}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xl z-50"
                >
                  <div className="pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-cyan-500" />
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {currentUser.email}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold">
                        {currentUser.role}
                      </span>
                      <span className="text-slate-400">
                        {currentUser.department || 'Data Unit'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out of Workspace</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

