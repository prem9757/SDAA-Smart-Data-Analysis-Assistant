import React, { useState, useMemo } from 'react';
import { X, Download, Filter, Search, Table, Layers, ArrowUpRight } from 'lucide-react';
import Papa from 'papaparse';
import { Dataset } from '../../types/dataset';

interface ChartDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  categoryName: string;
  categoryValue?: number | string;
  xAxisKey: string;
  yAxisKey: string;
  groupByKey?: string;
}

export const ChartDrilldownModal: React.FC<ChartDrilldownModalProps> = ({
  isOpen,
  onClose,
  dataset,
  categoryName,
  categoryValue,
  xAxisKey,
  yAxisKey,
  groupByKey
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter matching raw rows from dataset
  const filteredRows = useMemo(() => {
    if (!isOpen || !dataset || !categoryName) return [];

    return dataset.rows.filter(row => {
      const xMatch = String(row[xAxisKey] ?? '').toLowerCase() === String(categoryName).toLowerCase();
      const gMatch = groupByKey && groupByKey !== 'none' 
        ? String(row[groupByKey] ?? '').toLowerCase() === String(categoryName).toLowerCase()
        : false;
      return xMatch || gMatch;
    });
  }, [isOpen, dataset, categoryName, xAxisKey, groupByKey]);

  // Apply search term filter inside drilldown table
  const searchMatchingRows = useMemo(() => {
    if (!searchTerm.trim()) return filteredRows;
    const term = searchTerm.toLowerCase();
    return filteredRows.filter(row => 
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(term))
    );
  }, [filteredRows, searchTerm]);

  // Summary Metrics calculation for drilled down category
  const metrics = useMemo(() => {
    if (filteredRows.length === 0) return { totalRows: 0, sumY: 0, avgY: 0, minY: 0, maxY: 0 };

    const yVals = filteredRows
      .map(r => Number(r[yAxisKey]))
      .filter(v => !isNaN(v));

    if (yVals.length === 0) return { totalRows: filteredRows.length, sumY: 0, avgY: 0, minY: 0, maxY: 0 };

    const sumY = yVals.reduce((a, b) => a + b, 0);
    const avgY = sumY / yVals.length;
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);

    return {
      totalRows: filteredRows.length,
      sumY: Math.round(sumY * 100) / 100,
      avgY: Math.round(avgY * 100) / 100,
      minY,
      maxY
    };
  }, [filteredRows, yAxisKey]);

  // Export drilled-down subset as CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const csv = Papa.unparse(filteredRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.name}_drilldown_${categoryName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                  Interactive Drilldown
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Field: <strong className="text-slate-700 dark:text-slate-200">{xAxisKey}</strong>
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <span>Category:</span>
                <span className="text-cyan-500 dark:text-cyan-400 font-extrabold">{categoryName}</span>
                {categoryValue !== undefined && (
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full ml-1">
                    Value: {typeof categoryValue === 'number' ? categoryValue.toLocaleString() : categoryValue}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-slate-100/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
          <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Matching Records</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
              {metrics.totalRows.toLocaleString()}
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sum ({yAxisKey})</span>
            <span className="text-xl font-black text-cyan-500 dark:text-cyan-400 mt-1 block">
              {metrics.sumY.toLocaleString()}
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mean Average</span>
            <span className="text-xl font-black text-emerald-500 dark:text-emerald-400 mt-1 block">
              {metrics.avgY.toLocaleString()}
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Min / Max Range</span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 mt-2 block truncate">
              {metrics.minY.toLocaleString()} → {metrics.maxY.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Search & Export Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search drilled rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold transition-all shadow-md shadow-cyan-600/20 active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Export Sub-CSV</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto p-6">
          {searchMatchingRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No matching records found for "{categoryName}".
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">#</th>
                    {dataset.columns.map((col) => (
                      <th
                        key={`th-${col.name}`}
                        className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap ${
                          col.name === xAxisKey || col.name === yAxisKey
                            ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                            : ''
                        }`}
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                  {searchMatchingRows.map((row, idx) => (
                    <tr key={`row-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 text-[11px] font-mono">{idx + 1}</td>
                      {dataset.columns.map((col) => (
                        <td
                          key={`td-${idx}-${col.name}`}
                          className={`px-4 py-2.5 whitespace-nowrap ${
                            col.name === xAxisKey || col.name === yAxisKey ? 'font-bold text-cyan-600 dark:text-cyan-300' : ''
                          }`}
                        >
                          {String(row[col.name] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Showing {searchMatchingRows.length} of {filteredRows.length} drilled records</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-5 py-2 text-xs font-bold text-slate-800 dark:text-white transition-colors"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
