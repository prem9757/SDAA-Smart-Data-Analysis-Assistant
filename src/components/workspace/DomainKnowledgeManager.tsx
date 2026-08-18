import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Shield,
  Layers,
  Sparkles,
  Search,
  Filter,
  Check,
  RotateCcw,
  Zap,
  Sliders,
  Scale,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Database,
  RefreshCw,
  Cpu,
  Info,
  Clock,
  UserCheck,
} from 'lucide-react';
import {
  DomainDefinition,
  DomainRule,
  AIRuleProposal,
  HistoricalValidationResult,
  RuleConflictReport,
  KnowledgeVersionRecord,
  RuleStatus,
  RuleSeverity,
  RuleAction,
} from '../../types/domainKnowledge';
import {
  fetchAllDomains,
  createDomainRule,
  updateDomainRule,
  setDomainRuleStatus,
  fetchAIProposals,
  reviewAIProposal,
  runHistoricalValidation,
  detectRuleConflicts,
  fetchVersionHistory,
} from '../../utils/knowledgeBaseApi';
import { Dataset } from '../../types/dataset';
import { ConflictResolutionModal } from '../modals/ConflictResolutionModal';

interface DomainKnowledgeManagerProps {
  dataset?: Dataset;
  allDatasets?: Dataset[];
  onDomainUpdated?: () => void;
}

export const DomainKnowledgeManager: React.FC<DomainKnowledgeManagerProps> = ({
  dataset,
  allDatasets = [],
  onDomainUpdated,
}) => {
  const [domains, setDomains] = React.useState<DomainDefinition[]>([]);
  const [selectedDomainId, setSelectedDomainId] = React.useState<string>('ecommerce');
  const [activeSubTab, setActiveSubTab] = React.useState<
    'rules' | 'semantics' | 'proposals' | 'conflicts' | 'simulator' | 'history'
  >('rules');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL');

  // AI Proposals state
  const [aiProposals, setAiProposals] = React.useState<AIRuleProposal[]>([]);
  // Conflicts state
  const [conflicts, setConflicts] = React.useState<RuleConflictReport[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = React.useState<boolean>(false);
  const [selectedConflictIndex, setSelectedConflictIndex] = React.useState<number>(0);
  const hasAutoTriggeredRef = React.useRef<boolean>(false);
  // Version History state
  const [versionHistory, setVersionHistory] = React.useState<KnowledgeVersionRecord[]>([]);
  // Simulator State
  const [selectedRuleForSim, setSelectedRuleForSim] = React.useState<DomainRule | null>(null);
  const [simResult, setSimResult] = React.useState<HistoricalValidationResult | null>(null);
  const [isSimulating, setIsSimulating] = React.useState<boolean>(false);

  // Modal State for Rule Creation/Editing
  const [isRuleModalOpen, setIsRuleModalOpen] = React.useState<boolean>(false);
  const [editingRule, setEditingRule] = React.useState<DomainRule | null>(null);
  const [modalFormData, setModalFormData] = React.useState({
    rule_id: '',
    description: '',
    target_columns: '',
    condition: '',
    action: 'CORRECT' as RuleAction,
    severity: 'HIGH' as RuleSeverity,
    confidence: 'HIGH' as 'HIGH' | 'MEDIUM' | 'LOW',
    auto_fix_allowed: true,
    min_range: '',
    max_range: '',
    allowed_values: '',
    formula_expression: '',
    reason_for_change: 'Standard rule tuning',
    author: 'Chief Data Steward',
  });

  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Data from API
  const loadKnowledgeBaseData = async () => {
    setIsLoading(true);
    try {
      const [fetchedDomains, fetchedProposals, fetchedVersions] = await Promise.all([
        fetchAllDomains(),
        fetchAIProposals(),
        fetchVersionHistory(),
      ]);
      setDomains(fetchedDomains);
      if (fetchedDomains.length > 0 && !fetchedDomains.some((d) => d.id === selectedDomainId)) {
        setSelectedDomainId(fetchedDomains[0].id);
      }
      setAiProposals(fetchedProposals);
      setVersionHistory(fetchedVersions);

      // Check conflicts for the selected domain
      const activeDomain = fetchedDomains.find((d) => d.id === selectedDomainId) || fetchedDomains[0];
      if (activeDomain) {
        const detectedConflicts = await detectRuleConflicts(activeDomain.rules);
        setConflicts(detectedConflicts);
        // Automatic Trigger: If unresolved contradictions exist between rules and user hasn't seen the modal yet
        if (detectedConflicts.length > 0 && !hasAutoTriggeredRef.current) {
          hasAutoTriggeredRef.current = true;
          setSelectedConflictIndex(0);
          setIsConflictModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error loading KB:', err);
      showNotification('error', 'Failed to synchronize with Knowledge Base API');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadKnowledgeBaseData();
  }, [selectedDomainId]);

  const selectedDomain = domains.find((d) => d.id === selectedDomainId) || domains[0];

  // Filter Rules
  const filteredRules = React.useMemo(() => {
    if (!selectedDomain) return [];
    return (selectedDomain.rules || []).filter((rule) => {
      const matchesSearch =
        rule.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.target_columns.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || rule.status === statusFilter;
      const matchesSeverity = severityFilter === 'ALL' || rule.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [selectedDomain, searchQuery, statusFilter, severityFilter]);

  // Handle Status Change (Approve, Deprecate, Reject)
  const handleStatusChange = async (rule: DomainRule, newStatus: RuleStatus) => {
    try {
      const updated = await setDomainRuleStatus(
        selectedDomain.id,
        rule.rule_id,
        newStatus,
        'Chief Data Steward',
        `Changed status from ${rule.status} to ${newStatus}`
      );
      if (updated) {
        showNotification('success', `Rule ${rule.rule_id} status updated to ${newStatus}`);
        loadKnowledgeBaseData();
        onDomainUpdated?.();
      }
    } catch {
      showNotification('error', 'Failed to update rule status');
    }
  };

  // Open Create/Edit Modal
  const handleOpenRuleModal = (rule?: DomainRule) => {
    if (rule) {
      setEditingRule(rule);
      setModalFormData({
        rule_id: rule.rule_id,
        description: rule.description,
        target_columns: rule.target_columns.join(', '),
        condition: rule.condition,
        action: rule.action,
        severity: rule.severity,
        confidence: rule.confidence,
        auto_fix_allowed: rule.auto_fix_allowed,
        min_range: rule.valid_range ? String(rule.valid_range[0]) : '',
        max_range: rule.valid_range ? String(rule.valid_range[1]) : '',
        allowed_values: rule.allowed_values ? rule.allowed_values.join(', ') : '',
        formula_expression: rule.formula_expression || '',
        reason_for_change: `Updated parameters for v${rule.version}`,
        author: 'Chief Data Steward',
      });
    } else {
      setEditingRule(null);
      setModalFormData({
        rule_id: `${selectedDomain.id.toUpperCase()}_RULE_${Math.floor(100 + Math.random() * 900)}`,
        description: '',
        target_columns: '',
        condition: '',
        action: 'CORRECT',
        severity: 'HIGH',
        confidence: 'HIGH',
        auto_fix_allowed: true,
        min_range: '',
        max_range: '',
        allowed_values: '',
        formula_expression: '',
        reason_for_change: 'Created new domain validation rule',
        author: 'Chief Data Steward',
      });
    }
    setIsRuleModalOpen(true);
  };

  // Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetCols = modalFormData.target_columns
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const validRange: [number, number] | undefined =
        modalFormData.min_range && modalFormData.max_range
          ? [parseFloat(modalFormData.min_range), parseFloat(modalFormData.max_range)]
          : undefined;

      const allowedVals: string[] | undefined = modalFormData.allowed_values
        ? modalFormData.allowed_values.split(',').map((v) => v.trim()).filter(Boolean)
        : undefined;

      const rulePayload: DomainRule = {
        rule_id: modalFormData.rule_id,
        domain: selectedDomain.id,
        version: editingRule ? editingRule.version : '1.0.0',
        description: modalFormData.description,
        condition: modalFormData.condition || 'true',
        action: modalFormData.action,
        severity: modalFormData.severity,
        confidence: modalFormData.confidence,
        auto_fix_allowed: modalFormData.auto_fix_allowed,
        source: editingRule ? editingRule.source : 'USER_APPROVED',
        created_at: editingRule ? editingRule.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: editingRule ? editingRule.status : 'ACTIVE',
        priority: 1, // User-approved
        target_columns: targetCols,
        valid_range: validRange,
        allowed_values: allowedVals,
        formula_expression: modalFormData.formula_expression || undefined,
      };

      if (editingRule) {
        await updateDomainRule(
          selectedDomain.id,
          editingRule.rule_id,
          rulePayload,
          modalFormData.author,
          modalFormData.reason_for_change
        );
        showNotification('success', `Rule ${editingRule.rule_id} updated (Version Bumped)`);
      } else {
        await createDomainRule(
          selectedDomain.id,
          rulePayload,
          modalFormData.author,
          modalFormData.reason_for_change
        );
        showNotification('success', `New rule ${rulePayload.rule_id} added to Knowledge Base`);
      }

      setIsRuleModalOpen(false);
      loadKnowledgeBaseData();
      onDomainUpdated?.();
    } catch {
      showNotification('error', 'Failed to save rule');
    }
  };

  // Review AI Proposal
  const handleReviewProposal = async (proposalId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await reviewAIProposal(
        proposalId,
        action,
        'Human Data Steward',
        action === 'REJECT' ? 'Rejected by manual domain auditor' : undefined
      );
      if (res) {
        showNotification(
          'success',
          action === 'APPROVE'
            ? 'AI Proposal Approved and promoted to Priority-1 Active Production Rule!'
            : 'AI Proposal rejected.'
        );
        loadKnowledgeBaseData();
        onDomainUpdated?.();
      }
    } catch {
      showNotification('error', 'Failed to review AI Proposal');
    }
  };

  // Run Historical Validation Simulator
  const handleRunSimulation = async (rule: DomainRule) => {
    setSelectedRuleForSim(rule);
    setActiveSubTab('simulator');
    setIsSimulating(true);
    try {
      const benchmarkDatasets =
        allDatasets.length > 0
          ? allDatasets.map((d) => ({ name: d.name, rows: d.rows }))
          : dataset
          ? [{ name: dataset.name, rows: dataset.rows }]
          : [];

      const result = await runHistoricalValidation(rule, benchmarkDatasets);
      setSimResult(result);
    } catch {
      showNotification('error', 'Historical simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Dynamic Domain Knowledge Base
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Versioned, API-retrievable business rules, mathematical constraints, column semantics, and AI discovery engine.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadKnowledgeBaseData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-100/80 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync API</span>
            </button>

            <button
              onClick={() => handleOpenRuleModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Domain Rule</span>
            </button>
          </div>
        </div>

        {/* Domain Selector & Stats Strip */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-2">
              Industry Domains:
            </span>
            {domains.map((dom) => (
              <button
                key={dom.id}
                onClick={() => {
                  hasAutoTriggeredRef.current = false;
                  setSelectedDomainId(dom.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDomainId === dom.id
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {dom.name} <span className="opacity-70 text-[10px] ml-1 font-mono">v{dom.version}</span>
              </button>
            ))}
          </div>

          {selectedDomain && (
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                {selectedDomain.rules.length} Rules Active
              </span>
              <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                {selectedDomain.column_semantics.length} Columns Mapped
              </span>
              {conflicts.length > 0 ? (
                <button
                  onClick={() => {
                    setSelectedConflictIndex(0);
                    setIsConflictModalOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-black flex items-center gap-1.5 animate-pulse transition-all"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{conflicts.length} Rule Conflict{conflicts.length > 1 ? 's' : ''} (Reconcile)</span>
                </button>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                  <Check className="h-3 w-3" /> 0 Conflicts
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prominent Conflict Alert & Trigger Callout */}
      {conflicts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl border-2 border-rose-500/30 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-transparent backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-rose-500/5"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Contradictory Rules Detected in {selectedDomain?.name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                  {conflicts.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Generic or domain standard rules contradict user-defined business rules on columns:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {Array.from(new Set(conflicts.flatMap((c) => c.affected_columns))).join(', ')}
                </strong>
                . Manual reconciliation ensures accurate data cleaning without distorting valid business data.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedConflictIndex(0);
              setIsConflictModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 shrink-0 transition-all active:scale-95"
          >
            <Scale className="h-4 w-4" />
            <span>Open Conflict Resolution Modal</span>
          </button>
        </motion.div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'rules'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Domain Rules ({filteredRules.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('semantics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'semantics'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Column Semantics & KPIs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('proposals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'proposals'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>AI Rule Proposals</span>
          {aiProposals.filter((p) => p.status === 'PROPOSED').length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
              {aiProposals.filter((p) => p.status === 'PROPOSED').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('conflicts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'conflicts'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Conflict Inspector</span>
          {conflicts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px]">
              {conflicts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'simulator'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Historical Validator</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'history'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Version Changelog ({versionHistory.length})</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* 1. DOMAIN RULES TAB */}
      {/* ==================================================== */}
      {activeSubTab === 'rules' && selectedDomain && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search rules by ID, target column, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PROPOSED">PROPOSED</option>
                <option value="DEPRECATED">DEPRECATED</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          {/* Rules Cards List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredRules.map((rule) => {
              const isP1 = rule.priority === 1;
              const isP2 = rule.priority === 2;

              return (
                <div
                  key={rule.rule_id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-850/80 backdrop-blur-md shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {rule.rule_id}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-500/10">
                        v{rule.version}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isP1
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                            : isP2
                            ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-500/20 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Priority {rule.priority} ({rule.source})
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rule.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                            : rule.severity === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {rule.severity}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          rule.status === 'ACTIVE' || rule.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunSimulation(rule)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all"
                        title="Simulate rule against historical benchmark datasets"
                      >
                        <Cpu className="h-3.5 w-3.5 text-cyan-500" />
                        <span>Validate</span>
                      </button>

                      <button
                        onClick={() => handleOpenRuleModal(rule)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Edit</span>
                      </button>

                      {rule.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleStatusChange(rule, 'DEPRECATED')}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all"
                        >
                          Deprecate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(rule, 'ACTIVE')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {rule.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Target Columns
                      </span>
                      <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {rule.target_columns.join(', ') || '*'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Action & Fix Policy
                      </span>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">{rule.action}</span>
                        {rule.auto_fix_allowed ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                            Auto-Fix Allowed
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-bold">
                            Audit Only
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Boundary / Formula
                      </span>
                      <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                        {rule.formula_expression ||
                          (rule.valid_range ? `[${rule.valid_range[0]} to ${rule.valid_range[1]}]` : rule.condition)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRules.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                <p className="text-sm font-semibold text-slate-500">No domain rules match your filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. COLUMN SEMANTICS & KPIS TAB */}
      {/* ==================================================== */}
      {activeSubTab === 'semantics' && selectedDomain && (
        <div className="space-y-6">
          {/* Column Semantics */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-500" />
              <span>Standard Column Semantics for {selectedDomain.name}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Canonical Name</th>
                    <th className="pb-3 px-3">Recognized Aliases</th>
                    <th className="pb-3 px-3">Type</th>
                    <th className="pb-3 px-3">Expected Range / Enums</th>
                    <th className="pb-3 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {selectedDomain.column_semantics.map((sem, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {sem.name}
                        {sem.is_identifier && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">
                            KEY
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {sem.aliases.join(', ')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold">
                          {sem.expected_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {sem.valid_range
                          ? `[${sem.valid_range[0]} to ${sem.valid_range[1]}]`
                          : sem.allowed_values
                          ? `[${sem.allowed_values.slice(0, 3).join(', ')}...]`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{sem.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Domain KPIs */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span>Standard Industry KPIs & Formulas</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedDomain.kpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{kpi.name}</span>
                    {kpi.unit && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                        {kpi.unit}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    {kpi.formula}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {kpi.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. AI RULE PROPOSALS QUEUE TAB */}
      {/* ==================================================== */}
      {activeSubTab === 'proposals' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md flex items-center gap-4">
            <Sparkles className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Human-In-The-Loop AI Rule Proposal Center
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                The AI profiler discovers novel column distributions, recurring categoricals, and formula relationships. Approved rules are elevated to <strong>Priority-1 User-Approved</strong> production status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {aiProposals.map((proposal) => (
              <div
                key={proposal.rule_id}
                className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-850/80 backdrop-blur-md space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {proposal.rule_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        proposal.status === 'PROPOSED'
                          ? 'bg-amber-500/20 text-amber-500 font-extrabold'
                          : proposal.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {proposal.status}
                    </span>
                  </div>

                  {proposal.status === 'PROPOSED' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewProposal(proposal.rule_id, 'REJECT')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleReviewProposal(proposal.rule_id, 'APPROVE')}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Approve & Activate (P1)</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {proposal.detected_pattern}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {proposal.proposed_rule.condition}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Discovery Evidence
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">{proposal.evidence}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      False Positive Risk
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      {proposal.potential_false_positives}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Business Impact
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      {proposal.potential_business_impact}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {aiProposals.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                <Sparkles className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No new AI proposals queued.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload new datasets or run data cleaning to automatically discover candidate rules.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. CONFLICT INSPECTOR TAB */}
      {/* ==================================================== */}
      {activeSubTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Rule Conflict Detection & Precedence Resolution
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Evaluates contradictions between User-Approved, Organization, Dataset, and Generic rule tiers. Precedence strictly respects Priority Hierarchy (P1 User &gt; P2 Org &gt; P3 Dataset &gt; P4 Generic).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {conflicts.map((conf, idx) => (
              <div
                key={conf.conflict_id}
                className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-md space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                      {conf.conflict_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-bold">
                      Contradiction Detected
                    </span>
                    <button
                      onClick={() => {
                        setSelectedConflictIndex(idx);
                        setIsConflictModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md shadow-rose-600/20 transition-all active:scale-95"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      <span>Reconcile Rule Contradiction</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  {conf.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Rule A</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {conf.rule_a.rule_id} (Priority {conf.rule_a.priority})
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">{conf.rule_a.description}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Rule B</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {conf.rule_b.rule_id} (Priority {conf.rule_b.priority})
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">{conf.rule_b.description}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">
                    Automated Resolution Applied
                  </span>
                  {conf.recommended_resolution}
                </div>
              </div>
            ))}

            {conflicts.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Zero Rule Contradictions
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  All active rules in {selectedDomain.name} are mathematically congruent and mutually orthogonal.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. HISTORICAL VALIDATOR & SIMULATOR TAB */}
      {/* ==================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyan-500" />
              <span>Historical Benchmark & False Positive Simulator</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates any proposed or modified rule across past datasets and benchmark sets to compute mathematical precision, recall, and false-positive rates before deployment.
            </p>

            {/* Select Rule */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <select
                value={selectedRuleForSim?.rule_id || ''}
                onChange={(e) => {
                  const rule = selectedDomain.rules.find((r) => r.rule_id === e.target.value);
                  if (rule) handleRunSimulation(rule);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="">Select Rule to Benchmark...</option>
                {selectedDomain.rules.map((r) => (
                  <option key={r.rule_id} value={r.rule_id}>
                    {r.rule_id}: {r.description.slice(0, 60)}...
                  </option>
                ))}
              </select>

              {selectedRuleForSim && (
                <button
                  onClick={() => handleRunSimulation(selectedRuleForSim)}
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>Re-run Benchmark</span>
                </button>
              )}
            </div>
          </div>

          {/* Simulation Results Display */}
          {simResult && (
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Benchmarked Rule
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                    {simResult.rule_id}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{simResult.rule_description}</p>
                </div>

                <div>
                  <span
                    className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 ${
                      simResult.recommendation === 'SAFE_TO_ACTIVATE'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : simResult.recommendation === 'HIGH_RISK_FALSE_POSITIVES'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {simResult.recommendation === 'SAFE_TO_ACTIVATE' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>{simResult.recommendation.replace(/_/g, ' ')}</span>
                  </span>
                </div>
              </div>

              {/* 4-Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Precision</span>
                  <p className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-1">
                    {Math.round(simResult.precision * 100)}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">TP / (TP + FP)</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Recall</span>
                  <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                    {Math.round(simResult.recall * 100)}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">TP / (TP + FN)</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400">False Positive Rate</span>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {(simResult.false_positive_rate * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">FP / (FP + TN)</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Rows Evaluated</span>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                    {simResult.rows_evaluated}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">across {simResult.datasets_evaluated} dataset(s)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. IMMUTABLE VERSION HISTORY & CHANGELOG TAB */}
      {/* ==================================================== */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Immutable Knowledge Base Version Audit Log
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Every rule creation, parameter adjustment, and status modification is versioned immutably to ensure 100% reproducible data provenance.
            </p>
          </div>

          <div className="space-y-3">
            {versionHistory.map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-850/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10">
                      v{rec.version}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {rec.rule_id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-500">
                      {rec.domain}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{rec.reason_for_change}</p>
                  <p className="text-[11px] text-slate-400">Evidence: {rec.evidence}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end text-slate-600 dark:text-slate-400 font-medium">
                    <UserCheck className="h-3.5 w-3.5 text-cyan-500" />
                    <span>{rec.changed_by}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(rec.timestamp).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            ))}

            {versionHistory.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                <History className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No version records logged yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* RULE CREATOR / EDITOR MODAL */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isRuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {editingRule ? `Edit Rule: ${editingRule.rule_id}` : 'Create New Domain Rule'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Domain: <strong className="text-slate-700 dark:text-slate-300">{selectedDomain.name}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsRuleModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Rule ID
                    </label>
                    <input
                      type="text"
                      required
                      value={modalFormData.rule_id}
                      onChange={(e) => setModalFormData({ ...modalFormData, rule_id: e.target.value })}
                      disabled={!!editingRule}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Column(s)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Discount, Revenue (comma-separated)"
                      value={modalFormData.target_columns}
                      onChange={(e) => setModalFormData({ ...modalFormData, target_columns: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rule Description & Business Rationale
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={modalFormData.description}
                    onChange={(e) => setModalFormData({ ...modalFormData, description: e.target.value })}
                    placeholder="e.g. Discount fraction must strictly reside between 0.00 and 1.00."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Action Type
                    </label>
                    <select
                      value={modalFormData.action}
                      onChange={(e) => setModalFormData({ ...modalFormData, action: e.target.value as RuleAction })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="CORRECT">CORRECT</option>
                      <option value="NORMALIZE">NORMALIZE</option>
                      <option value="FLAG">FLAG</option>
                      <option value="CAP">CAP</option>
                      <option value="IMPUTE">IMPUTE</option>
                      <option value="CALCULATE">CALCULATE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Severity
                    </label>
                    <select
                      value={modalFormData.severity}
                      onChange={(e) => setModalFormData({ ...modalFormData, severity: e.target.value as RuleSeverity })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Auto-Fix Allowed?
                    </label>
                    <select
                      value={modalFormData.auto_fix_allowed ? 'yes' : 'no'}
                      onChange={(e) => setModalFormData({ ...modalFormData, auto_fix_allowed: e.target.value === 'yes' })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="yes">Yes (Execute Transformation)</option>
                      <option value="no">No (Audit & Flag Only)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Valid Range Bounds [Min, Max]
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Min (e.g. 0)"
                        value={modalFormData.min_range}
                        onChange={(e) => setModalFormData({ ...modalFormData, min_range: e.target.value })}
                        className="w-1/2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Max (e.g. 1)"
                        value={modalFormData.max_range}
                        onChange={(e) => setModalFormData({ ...modalFormData, max_range: e.target.value })}
                        className="w-1/2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Allowed Values (Enum)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shipped, Completed, Pending"
                      value={modalFormData.allowed_values}
                      onChange={(e) => setModalFormData({ ...modalFormData, allowed_values: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Change / Version Notes (Logged in immutable audit trail)
                  </label>
                  <input
                    type="text"
                    required
                    value={modalFormData.reason_for_change}
                    onChange={(e) => setModalFormData({ ...modalFormData, reason_for_change: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsRuleModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 active:scale-95 transition-all"
                  >
                    {editingRule ? 'Save & Bump Version' : 'Create & Activate Rule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Conflict Resolution Modal */}
      {selectedDomain && (
        <ConflictResolutionModal
          isOpen={isConflictModalOpen}
          onClose={() => setIsConflictModalOpen(false)}
          conflicts={conflicts}
          initialConflictIndex={selectedConflictIndex}
          domain={selectedDomain}
          dataset={dataset}
          allDatasets={allDatasets}
          onConflictResolved={(msg) => {
            showNotification('success', msg);
            loadKnowledgeBaseData();
            onDomainUpdated?.();
          }}
        />
      )}
    </div>
  );
};
