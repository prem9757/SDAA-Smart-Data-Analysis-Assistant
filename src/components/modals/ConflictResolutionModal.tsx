import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Scale,
  Shield,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Zap,
  Sparkles,
  HelpCircle,
  Clock,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { DomainRule, RuleConflictReport, DomainDefinition } from '../../types/domainKnowledge';
import { Dataset } from '../../types/dataset';
import { updateDomainRule, setDomainRuleStatus, createDomainRule } from '../../utils/knowledgeBaseApi';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: RuleConflictReport[];
  initialConflictIndex?: number;
  domain: DomainDefinition;
  dataset?: Dataset;
  allDatasets?: Dataset[];
  onConflictResolved: (message: string) => void;
}

type ResolutionStrategy =
  | 'KEEP_USER_RULE'
  | 'KEEP_DOMAIN_RULE'
  | 'SMART_SCALE_MERGE'
  | 'DATASET_SCOPED_EXCEPTION';

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  initialConflictIndex = 0,
  domain,
  dataset,
  allDatasets = [],
  onConflictResolved,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState<number>(initialConflictIndex);
  const [selectedStrategy, setSelectedStrategy] = React.useState<ResolutionStrategy>('KEEP_USER_RULE');
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string>(dataset?.id || 'current');
  const [stewardReason, setStewardReason] = React.useState<string>('Reconciled contradictory rule specifications');
  const [isApplying, setIsApplying] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (initialConflictIndex >= 0 && initialConflictIndex < conflicts.length) {
      setCurrentIndex(initialConflictIndex);
    }
  }, [initialConflictIndex, conflicts.length]);

  if (!isOpen || conflicts.length === 0) return null;

  const currentConflict = conflicts[Math.min(currentIndex, conflicts.length - 1)];
  const { rule_a: ruleA, rule_b: ruleB, conflict_type: conflictType, affected_columns: affectedCols } = currentConflict;

  // Combine available datasets
  const availableDatasets: Array<{ id: string; name: string; rows: any[] }> = [];
  if (dataset && dataset.rows) {
    availableDatasets.push({ id: dataset.id || 'current', name: dataset.name || 'Current Active Dataset', rows: dataset.rows });
  }
  allDatasets.forEach((ds) => {
    if (ds.id !== dataset?.id && ds.rows) {
      availableDatasets.push({ id: ds.id || `ds-${Math.random()}`, name: ds.name || 'Loaded Dataset', rows: ds.rows });
    }
  });

  // If no datasets exist, provide realistic simulation data
  if (availableDatasets.length === 0) {
    availableDatasets.push({
      id: 'simulated_orders',
      name: 'E-commerce Orders & Transactions (Simulated Live Feed)',
      rows: [
        { Order_ID: 'ORD-9021', Customer_ID: 'CUST-104', Quantity: 3, Unit_Price: 45.0, Discount: 15, Revenue: 114.75, Order_Status: 'Completed' },
        { Order_ID: 'ORD-9022', Customer_ID: 'CUST-882', Quantity: -2, Unit_Price: 120.0, Discount: 0.10, Revenue: 216.0, Order_Status: 'Pending' },
        { Order_ID: 'ORD-9023', Customer_ID: 'CUST-391', Quantity: 1, Unit_Price: 250.0, Discount: 25, Revenue: 187.5, Order_Status: 'Shipped' },
        { Order_ID: 'ORD-9024', Customer_ID: 'CUST-774', Quantity: 5, Unit_Price: 15.0, Discount: 0.05, Revenue: 71.25, Order_Status: 'Delivered' },
        { Order_ID: 'ORD-9025', Customer_ID: 'CUST-551', Quantity: 10, Unit_Price: 80.0, Discount: 50, Revenue: 400.0, Order_Status: 'Processing' },
      ],
    });
  }

  const activeDataset = availableDatasets.find((d) => d.id === selectedDatasetId) || availableDatasets[0];
  const primaryCol = affectedCols[0] || 'Discount';

  // Extract sample rows that trigger difference between ruleA and ruleB
  const sampleComparisonRows = activeDataset.rows.slice(0, 6).map((r, idx) => {
    const rawVal = r[primaryCol];
    const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[$,%]/g, ''));

    let ruleAEffect = 'Valid / Unchanged';
    let ruleBEffect = 'Valid / Unchanged';
    let hasDiscrepancy = false;
    let discrepancyDetails = '';

    // Check Range Conflict simulation
    if (ruleA.valid_range && ruleB.valid_range && !isNaN(numVal)) {
      const inRangeA = numVal >= ruleA.valid_range[0] && numVal <= ruleA.valid_range[1];
      const inRangeB = numVal >= ruleB.valid_range[0] && numVal <= ruleB.valid_range[1];

      if (inRangeA && !inRangeB) {
        ruleAEffect = `Passes range [${ruleA.valid_range[0]}, ${ruleA.valid_range[1]}]`;
        ruleBEffect = `Violates range [${ruleB.valid_range[0]}, ${ruleB.valid_range[1]}]`;
        hasDiscrepancy = true;
        discrepancyDetails = `Rule B would flag or cap value ${numVal}`;
      } else if (!inRangeA && inRangeB) {
        ruleAEffect = `Violates bounds [${ruleA.valid_range[0]}, ${ruleA.valid_range[1]}] (Caps to ${ruleA.valid_range[1]})`;
        ruleBEffect = `Passes user range [${ruleB.valid_range[0]}, ${ruleB.valid_range[1]}]`;
        hasDiscrepancy = true;
        discrepancyDetails = `Rule A truncates ${numVal} -> ${ruleA.valid_range[1]} (90%+ data distortion)`;
      }
    }

    // Check Action Conflict simulation
    if (ruleA.action === 'REJECT' && (ruleB.action === 'CORRECT' || ruleB.action === 'CAP')) {
      if (numVal < 0) {
        ruleAEffect = 'REJECT: Row dropped completely';
        ruleBEffect = `CORRECT: Absolute value Math.abs(${numVal}) -> ${Math.abs(numVal)}`;
        hasDiscrepancy = true;
        discrepancyDetails = 'Critical disparity: Row loss vs In-place sign correction';
      }
    }

    // Check Formula Divergence simulation
    if (ruleA.formula_expression && ruleB.formula_expression && ruleA.formula_expression !== ruleB.formula_expression) {
      hasDiscrepancy = true;
      ruleAEffect = `Computes via: ${ruleA.formula_expression}`;
      ruleBEffect = `Computes via: ${ruleB.formula_expression}`;
      discrepancyDetails = 'Calculated ledger total diverges across formulas';
    }

    return {
      rowNumber: idx + 1,
      id: r.Order_ID || r.id || r.Customer_ID || `ROW-${idx + 1}`,
      rawVal: rawVal !== undefined ? rawVal : '—',
      ruleAEffect,
      ruleBEffect,
      hasDiscrepancy,
      discrepancyDetails: discrepancyDetails || 'Congruent treatment',
      fullRow: r,
    };
  });

  // Execute the chosen reconciliation strategy
  const handleApplyReconciliation = async () => {
    setIsApplying(true);
    try {
      if (selectedStrategy === 'KEEP_USER_RULE') {
        // Promotes rule B (user rule) and updates or lowers priority of rule A
        await updateDomainRule(
          domain.id,
          ruleB.rule_id,
          { status: 'ACTIVE', priority: 1 },
          'Chief Data Steward',
          `Reconciled conflict ${currentConflict.conflict_id}: Preferred User Rule over Domain Standard (${stewardReason})`
        );
        await updateDomainRule(
          domain.id,
          ruleA.rule_id,
          { status: 'DEPRECATED' },
          'Chief Data Steward',
          `Reconciled conflict ${currentConflict.conflict_id}: Deprecated in favor of ${ruleB.rule_id}`
        );
        onConflictResolved(`Reconciled: User-Approved Rule '${ruleB.rule_id}' enforced as primary authority.`);
      } else if (selectedStrategy === 'KEEP_DOMAIN_RULE') {
        // Enforces rule A (domain rule) and deactivates/rejects rule B
        await updateDomainRule(
          domain.id,
          ruleA.rule_id,
          { status: 'ACTIVE', priority: 2 },
          'Chief Data Steward',
          `Reconciled conflict ${currentConflict.conflict_id}: Restored Domain Standard over User Rule (${stewardReason})`
        );
        await updateDomainRule(
          domain.id,
          ruleB.rule_id,
          { status: 'REJECTED' },
          'Chief Data Steward',
          `Reconciled conflict ${currentConflict.conflict_id}: Rejected user rule in favor of standard ${ruleA.rule_id}`
        );
        onConflictResolved(`Reconciled: Domain Standard Rule '${ruleA.rule_id}' enforced.`);
      } else if (selectedStrategy === 'SMART_SCALE_MERGE') {
        // Merges both rules by creating a smart normalized condition
        await updateDomainRule(
          domain.id,
          ruleA.rule_id,
          {
            description: `${ruleA.description} (Auto-normalizes whole percentages > 1.0 to decimal fractions).`,
            condition: `(${ruleA.condition}) || (${ruleB.condition})`,
            valid_range: [0, 100],
            action: 'NORMALIZE',
          },
          'Chief Data Steward',
          `Reconciled conflict ${currentConflict.conflict_id}: Unified scale normalization rule (${stewardReason})`
        );
        await setDomainRuleStatus(domain.id, ruleB.rule_id, 'APPROVED', 'Chief Data Steward', 'Merged into unified scale standard');
        onConflictResolved(`Reconciled: Smart Scale Normalization unified both percentage and decimal rules.`);
      } else if (selectedStrategy === 'DATASET_SCOPED_EXCEPTION') {
        // Confines Rule B strictly to the active dataset
        await updateDomainRule(
          domain.id,
          ruleB.rule_id,
          {
            source: 'DATASET_CUSTOM',
            priority: 3,
            description: `[Dataset-Scoped: ${activeDataset.name}] ${ruleB.description}`,
          },
          'Chief Data Steward',
          `Reconciled conflict ${currentConflict.conflict_id}: Scoped to dataset ${activeDataset.name}`
        );
        onConflictResolved(`Reconciled: Created dataset-scoped exception rule for '${activeDataset.name}'.`);
      }

      onClose();
    } catch (err) {
      console.error('Error applying reconciliation:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="conflict-resolution-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          id="conflict-resolution-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Rule Contradiction & Conflict Resolution
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                    {conflictType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated conflict detector detected opposing rule constraints on column(s):{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{affectedCols.join(', ')}</strong> in{' '}
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">{domain.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {conflicts.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span>
                    {currentIndex + 1} of {conflicts.length}
                  </span>
                  <button
                    disabled={currentIndex === conflicts.length - 1}
                    onClick={() => setCurrentIndex((prev) => Math.min(conflicts.length - 1, prev + 1))}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-xs">
            {/* Contradiction Diagnostic Banner */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Diagnosis: {currentConflict.description}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pl-5">
                {currentConflict.possible_interpretation}
              </p>
            </div>

            {/* Side-by-Side Contradicting Rules Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rule A */}
              <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white">
                      {ruleA.rule_id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">v{ruleA.version}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Priority {ruleA.priority} ({ruleA.source})
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rule Logic</span>
                  <div className="font-mono text-[11px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400">
                    {ruleA.condition}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">Action</span>
                    <span className="font-black text-slate-900 dark:text-white">{ruleA.action}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block">Valid Range</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {ruleA.valid_range ? `[${ruleA.valid_range[0]}, ${ruleA.valid_range[1]}]` : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {ruleA.description}
                </p>
              </div>

              {/* Rule B */}
              <div className="p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {ruleB.rule_id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">v{ruleB.version}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    <span>Priority {ruleB.priority} ({ruleB.source})</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rule Logic</span>
                  <div className="font-mono text-[11px] p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                    {ruleB.condition}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30">
                    <span className="text-[10px] font-bold text-slate-400 block">Action</span>
                    <span className="font-black text-slate-900 dark:text-white">{ruleB.action}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30">
                    <span className="text-[10px] font-bold text-slate-400 block">Valid Range</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {ruleB.valid_range ? `[${ruleB.valid_range[0]}, ${ruleB.valid_range[1]}]` : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {ruleB.description}
                </p>
              </div>
            </div>

            {/* Affected Datasets & Records Simulation Section */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-500" />
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    Affected Datasets & Record-Level Conflict Audit
                  </h4>
                </div>

                {availableDatasets.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Target Dataset:</span>
                    <select
                      value={selectedDatasetId}
                      onChange={(e) => setSelectedDatasetId(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    >
                      {availableDatasets.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} ({ds.rows.length} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Evaluation of sample rows in <strong className="text-slate-700 dark:text-slate-300">{activeDataset.name}</strong> showing diverging cleaning outputs between {ruleA.rule_id} vs {ruleB.rule_id}:
              </p>

              {/* Records Discrepancy Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-extrabold">
                      <th className="py-2.5 px-3">Row / Entity</th>
                      <th className="py-2.5 px-3">Target Field ({primaryCol})</th>
                      <th className="py-2.5 px-3">Rule A Output ({ruleA.rule_id})</th>
                      <th className="py-2.5 px-3">Rule B Output ({ruleB.rule_id})</th>
                      <th className="py-2.5 px-3">Discrepancy Analysis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {sampleComparisonRows.map((row) => (
                      <tr
                        key={row.id}
                        className={row.hasDiscrepancy ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {row.id}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-white">
                          {String(row.rawVal)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {row.ruleAEffect}
                        </td>
                        <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-bold">
                          {row.ruleBEffect}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.hasDiscrepancy ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              {row.discrepancyDetails}
                            </span>
                          ) : (
                            <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                              <Check className="h-3 w-3" /> Neutral
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reconciliation Strategies (Actionable Choices) */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-4">
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-500" />
                <span>Select Manual Reconciliation Policy</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option 1: Keep User-Approved */}
                <label
                  onClick={() => setSelectedStrategy('KEEP_USER_RULE')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    selectedStrategy === 'KEEP_USER_RULE'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          selectedStrategy === 'KEEP_USER_RULE'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-400'
                        }`}
                      >
                        {selectedStrategy === 'KEEP_USER_RULE' && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="font-black text-xs text-slate-900 dark:text-white">
                        1. Enforce User-Approved Rule (P1 Override)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                    Prioritize user-defined business logic ({ruleB.rule_id}). Automatically adjusts domain standard constraints to respect marketing & operational rules.
                  </p>
                </label>

                {/* Option 2: Keep Domain Standard */}
                <label
                  onClick={() => setSelectedStrategy('KEEP_DOMAIN_RULE')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    selectedStrategy === 'KEEP_DOMAIN_RULE'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          selectedStrategy === 'KEEP_DOMAIN_RULE'
                            ? 'border-cyan-500 bg-cyan-500'
                            : 'border-slate-400'
                        }`}
                      >
                        {selectedStrategy === 'KEEP_DOMAIN_RULE' && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="font-black text-xs text-slate-900 dark:text-white">
                        2. Enforce Industry Domain Baseline (P2)
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                    Revert strictly to standard industry guidelines ({ruleA.rule_id}). Deprecates the custom user rule to prevent downstream schema non-compliance.
                  </p>
                </label>

                {/* Option 3: Smart Scale Merge */}
                <label
                  onClick={() => setSelectedStrategy('SMART_SCALE_MERGE')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    selectedStrategy === 'SMART_SCALE_MERGE'
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          selectedStrategy === 'SMART_SCALE_MERGE'
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-slate-400'
                        }`}
                      >
                        {selectedStrategy === 'SMART_SCALE_MERGE' && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="font-black text-xs text-slate-900 dark:text-white">
                        3. Smart Scale Normalization (Harmonize Both)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black">
                      Intelligent
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                    Automatically normalizes percentage inputs (&gt; 1.0) to decimal scales [0.0 - 1.0], harmonizing both user input and industry standards.
                  </p>
                </label>

                {/* Option 4: Dataset Scoped Exception */}
                <label
                  onClick={() => setSelectedStrategy('DATASET_SCOPED_EXCEPTION')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    selectedStrategy === 'DATASET_SCOPED_EXCEPTION'
                      ? 'border-amber-500 bg-amber-500/10 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          selectedStrategy === 'DATASET_SCOPED_EXCEPTION'
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-slate-400'
                        }`}
                      >
                        {selectedStrategy === 'DATASET_SCOPED_EXCEPTION' && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className="font-black text-xs text-slate-900 dark:text-white">
                        4. Create Dataset-Scoped Exception
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
                    Confine the user rule strictly to &ldquo;{activeDataset.name}&rdquo; without altering global domain rules used by other pipelines.
                  </p>
                </label>
              </div>

              {/* Steward Reason Input */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Steward Reconciliation Justification (Audit Provenance)
                </label>
                <input
                  type="text"
                  value={stewardReason}
                  onChange={(e) => setStewardReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="State the rationale for resolving this contradiction..."
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
            >
              Dismiss (Retain Priority Order)
            </button>

            <button
              onClick={handleApplyReconciliation}
              disabled={isApplying}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Applying Knowledge Reconciliation...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Apply Reconciliation & Save to KB</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
