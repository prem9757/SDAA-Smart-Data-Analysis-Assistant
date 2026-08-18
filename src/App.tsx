import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, PlusCircle, Upload, FileSpreadsheet } from 'lucide-react';
import { Header } from './components/layout/Header';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { DatasetOverview } from './components/workspace/DatasetOverview';
import { UniversalDataProfiler } from './components/workspace/UniversalDataProfiler';
import { DataCleaning } from './components/workspace/DataCleaning';
import { GuidedWorkflowBar } from './components/workspace/GuidedWorkflowBar';
import { DataTable } from './components/workspace/DataTable';
import { ChartStudio } from './components/workspace/ChartStudio';
import { SQLExecutor } from './components/workspace/SQLExecutor';
import { AutoMLLab } from './components/workspace/AutoMLLab';
import { AIChatPanel } from './components/workspace/AIChatPanel';
import { ExecutiveReportModal } from './components/workspace/ExecutiveReportModal';
import { FileUploadModal } from './components/workspace/FileUploadModal';
import { LoginPage } from './components/auth/LoginPage';
import { ThreeBackground } from './components/common/ThreeBackground';
import { getInitialDatasets } from './data/sampleDatasets';
import { Dataset } from './types/dataset';
import { User } from './types/auth';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = React.useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('sdaa_authenticated_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('sdaa_authenticated_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sdaa_authenticated_user');
  };

  // Datasets state
  const [datasets, setDatasets] = React.useState<Dataset[]>(() => getInitialDatasets());
  const [activeDatasetId, setActiveDatasetId] = React.useState<string>(datasets[0]?.id || '');
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');

  // UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('smart_data_analysis_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return true; // Default dark
  });
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  // Apply dark mode class to html document and store preference
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smart_data_analysis_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smart_data_analysis_theme', 'light');
    }
  }, [isDarkMode]);

  const activeDataset = React.useMemo(() => {
    return datasets.find((d) => d.id === activeDatasetId) || datasets[0];
  }, [datasets, activeDatasetId]);

  // Handle Dataset Upload
  const handleDatasetUploaded = (newDataset: Dataset) => {
    setDatasets((prev) => [newDataset, ...prev]);
    setActiveDatasetId(newDataset.id);
    setActiveTab('overview');
  };

  // Trigger Dynamic AI Dataset Re-analysis via server-side Gemini 3.6 Flash
  const handleRefreshAIAnalysis = async () => {
    if (!activeDataset || isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/ai/analyze-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: activeDataset.name,
          sampleRows: activeDataset.rows.slice(0, 10),
          columnStats: activeDataset.columns.map((c) => ({
            name: c.name,
            type: c.type,
            missingPercentage: c.missingPercentage,
            stats: c.stats,
          })),
          rowCount: activeDataset.rows.length,
        }),
      });

      if (response.ok) {
        const aiSummary = await response.json();
        setDatasets((prev) =>
          prev.map((ds) =>
            ds.id === activeDataset.id ? { ...ds, summary: aiSummary } : ds
          )
        );
      }
    } catch (err) {
      console.error('Failed to re-run AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Guard application access with Login Page if user is not authenticated
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen relative bg-slate-100/90 dark:bg-slate-950/90 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-300">
      
      {/* Interactive 3D WebGL Background Canvas */}
      <ThreeBackground isDarkMode={isDarkMode} />

      {/* Header */}
      <div className="relative z-20">
        <Header
          datasets={datasets}
          activeDataset={activeDataset}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSelectDataset={(ds) => setActiveDatasetId(ds.id)}
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onRefresh={handleRefreshAIAnalysis}
          isRefreshing={isAnalyzing}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        />
      </div>

      <div className="flex min-h-[calc(100vh-64px)] relative z-10">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dataset={activeDataset}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Workspace Main Display Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {!activeDataset ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 sm:p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-xs my-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 mb-6 shadow-inner border border-cyan-200 dark:border-cyan-800">
                  <Database className="h-10 w-10" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  No Dataset Loaded
                </h2>
                <p className="mt-3 max-w-lg text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  Import your CSV, Excel (.xlsx, .xls), TSV, or JSON dataset to generate instant AI intelligence, data health diagnostics, custom charts, SQL searches, and predictive ML models.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3.5 text-sm font-bold shadow-xl shadow-cyan-600/30 transition-all active:scale-95"
                  >
                    <PlusCircle className="h-5 w-5" />
                    <span>Import Your Dataset</span>
                  </button>
                </div>

                <div className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-800/80 w-full max-w-xl flex flex-wrap justify-center items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Supported Formats:</span>
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono font-bold text-slate-700 dark:text-slate-300">CSV</span>
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono font-bold text-slate-700 dark:text-slate-300">XLSX</span>
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono font-bold text-slate-700 dark:text-slate-300">TSV</span>
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono font-bold text-slate-700 dark:text-slate-300">JSON</span>
                </div>
              </div>
            ) : (
              <>
                {/* Guided Simple Workflow Bar: Understanding Data -> Executive Report */}
                <GuidedWorkflowBar
                  activeTab={activeTab}
                  onNavigateTab={setActiveTab}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                  datasetName={activeDataset.name}
                  rowCount={activeDataset.rows.length}
                />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeDataset.id}-${activeTab}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'overview' && (
                      <DatasetOverview
                        dataset={activeDataset}
                        onNavigateTab={setActiveTab}
                        onRefreshAIAnalysis={handleRefreshAIAnalysis}
                        isAnalyzing={isAnalyzing}
                      />
                    )}

                    {activeTab === 'profiling' && (
                      <UniversalDataProfiler
                        dataset={activeDataset}
                        onNavigateToCleaning={() => setActiveTab('cleaning')}
                      />
                    )}

                    {activeTab === 'cleaning' && (
                      <DataCleaning
                        dataset={activeDataset}
                        onUpdateDataset={(cleanedDataset) => {
                          setDatasets((prev) =>
                            prev.map((d) => (d.id === cleanedDataset.id ? cleanedDataset : d))
                          );
                        }}
                      />
                    )}

                    {activeTab === 'table' && <DataTable dataset={activeDataset} />}

                    {activeTab === 'charts' && (
                      <ChartStudio
                        dataset={activeDataset}
                        onUpdateDataset={(updatedDataset) => {
                          setDatasets((prev) =>
                            prev.map((d) => (d.id === updatedDataset.id ? updatedDataset : d))
                          );
                        }}
                      />
                    )}

                    {activeTab === 'sql' && <SQLExecutor dataset={activeDataset} />}

                    {activeTab === 'automl' && <AutoMLLab dataset={activeDataset} />}

                    {activeTab === 'chat' && <AIChatPanel dataset={activeDataset} />}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals & Dialogs */}
      <ExecutiveReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        dataset={activeDataset}
      />

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDatasetUploaded={handleDatasetUploaded}
      />
    </div>
  );
}
