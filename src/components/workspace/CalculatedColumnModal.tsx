import React, { useState } from 'react';
import { X, Plus, Calculator, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Dataset, ColumnMetadata } from '../../types/dataset';

interface CalculatedColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (updatedDataset: Dataset) => void;
  onSelectCreatedColumn?: (colName: string) => void;
}

export const CalculatedColumnModal: React.FC<CalculatedColumnModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  onSelectCreatedColumn
}) => {
  const numericColumns = dataset.columns.filter(c => c.type === 'number');

  const [colName, setColName] = useState('');
  const [firstCol, setFirstCol] = useState(numericColumns[0]?.name || dataset.columns[0]?.name || '');
  const [operator, setOperator] = useState<'+' | '-' | '*' | '/'>('*');
  const [secondType, setSecondType] = useState<'column' | 'constant'>('constant');
  const [secondCol, setSecondCol] = useState(numericColumns[1]?.name || numericColumns[0]?.name || '');
  const [constantValue, setConstantValue] = useState<number>(0.15);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick preset formula suggestions
  const applyPreset = (presetType: 'tax' | 'margin' | 'double' | 'ratio') => {
    if (presetType === 'tax') {
      setColName('Estimated Tax (18%)');
      setFirstCol(numericColumns[0]?.name || '');
      setOperator('*');
      setSecondType('constant');
      setConstantValue(0.18);
    } else if (presetType === 'margin') {
      const revenueCol = numericColumns.find(c => c.name.toLowerCase().includes('rev') || c.name.toLowerCase().includes('sales'))?.name || numericColumns[0]?.name || '';
      const costCol = numericColumns.find(c => c.name.toLowerCase().includes('cost') || c.name.toLowerCase().includes('expense'))?.name || numericColumns[1]?.name || '';
      setColName('Net Profit Margin');
      setFirstCol(revenueCol);
      setOperator('-');
      setSecondType('column');
      setSecondCol(costCol);
    } else if (presetType === 'double') {
      setColName(`2x ${numericColumns[0]?.name || 'Metric'}`);
      setFirstCol(numericColumns[0]?.name || '');
      setOperator('*');
      setSecondType('constant');
      setConstantValue(2);
    }
  };

  const handleCreateColumn = () => {
    setErrorMsg('');
    const trimmedName = colName.trim();
    if (!trimmedName) {
      setErrorMsg('Please enter a valid name for the calculated field.');
      return;
    }

    if (dataset.columns.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMsg('A column with this name already exists in the dataset.');
      return;
    }

    if (!firstCol) {
      setErrorMsg('Please select a valid base column.');
      return;
    }

    // Generate new values for each row in dataset
    const updatedRows = dataset.rows.map(row => {
      const valA = Number(row[firstCol]) || 0;
      let valB = 0;

      if (secondType === 'column') {
        valB = Number(row[secondCol]) || 0;
      } else {
        valB = Number(constantValue) || 0;
      }

      let res = 0;
      if (operator === '+') res = valA + valB;
      else if (operator === '-') res = valA - valB;
      else if (operator === '*') res = valA * valB;
      else if (operator === '/') res = valB !== 0 ? valA / valB : 0;

      return {
        ...row,
        [trimmedName]: Math.round(res * 100) / 100
      };
    });

    // Compute stats for new column
    const generatedValues = updatedRows.map(r => Number(r[trimmedName])).filter(v => !isNaN(v));
    const minVal = generatedValues.length > 0 ? Math.min(...generatedValues) : 0;
    const maxVal = generatedValues.length > 0 ? Math.max(...generatedValues) : 0;
    const sumVal = generatedValues.reduce((a, b) => a + b, 0);
    const meanVal = generatedValues.length > 0 ? sumVal / generatedValues.length : 0;

    const newColMetadata: ColumnMetadata = {
      name: trimmedName,
      type: 'number',
      missingCount: 0,
      missingPercentage: 0,
      uniqueCount: new Set(generatedValues).size,
      sampleValues: generatedValues.slice(0, 5),
      stats: {
        min: minVal,
        max: maxVal,
        mean: Math.round(meanVal * 100) / 100
      }
    };

    const updatedDataset: Dataset = {
      ...dataset,
      columns: [...dataset.columns, newColMetadata],
      rows: updatedRows
    };

    onUpdateDataset(updatedDataset);
    if (onSelectCreatedColumn) {
      onSelectCreatedColumn(trimmedName);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Create Calculated Field</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generate custom numeric formulas across rows</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quick Formula Presets</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('margin')}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 hover:text-cyan-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold transition-all"
              >
                Profit = Rev - Cost
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tax')}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 hover:text-cyan-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold transition-all"
              >
                Tax (18%) = Col * 0.18
              </button>
              <button
                type="button"
                onClick={() => applyPreset('double')}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 hover:text-cyan-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold transition-all"
              >
                2x Multiplier
              </button>
            </div>
          </div>

          {/* New Field Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Calculated Field Name
            </label>
            <input
              type="text"
              placeholder="e.g. Net Revenue Margin, Tax 18%, Projected 2027"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Formula Builder */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Formula Construction</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              
              {/* First Operand Column */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Primary Metric</span>
                <select
                  value={firstCol}
                  onChange={(e) => setFirstCol(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white p-2 focus:outline-none"
                >
                  {dataset.columns.map((c) => (
                    <option key={`fcol-${c.name}`} value={c.name} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mathematical Operator */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Operator</span>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white p-2 text-center focus:outline-none"
                >
                  <option value="+" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">+ Add</option>
                  <option value="-" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">- Subtract</option>
                  <option value="*" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">* Multiply</option>
                  <option value="/" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">/ Divide</option>
                </select>
              </div>

              {/* Second Operand Selector (Column or Constant) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400">Operand B</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSecondType('column')}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        secondType === 'column' ? 'bg-cyan-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Column
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecondType('constant')}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        secondType === 'constant' ? 'bg-cyan-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Number
                    </button>
                  </div>
                </div>

                {secondType === 'column' ? (
                  <select
                    value={secondCol}
                    onChange={(e) => setSecondCol(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white p-2 focus:outline-none"
                  >
                    {dataset.columns.map((c) => (
                      <option key={`scol-${c.name}`} value={c.name} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    step="any"
                    value={constantValue}
                    onChange={(e) => setConstantValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white p-2 focus:outline-none"
                  />
                )}
              </div>

            </div>

            {/* Formula Preview Box */}
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-2.5 flex items-center justify-between text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
              <span>Formula:</span>
              <span>
                [{colName || 'NewColumn'}] = [{firstCol || 'ColA'}] {operator}{' '}
                {secondType === 'column' ? `[${secondCol || 'ColB'}]` : constantValue}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 p-3 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateColumn}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-cyan-600/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Field</span>
          </button>
        </div>

      </div>
    </div>
  );
};
