import React from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Download, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  Table as TableIcon, 
  Info,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet,
  FileCode,
  Database,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dataset, ColumnMetadata } from '../../types/dataset';

interface DataTableProps {
  dataset: Dataset;
}

export const DataTable: React.FC<DataTableProps> = ({ dataset }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [selectedColumnFilter, setSelectedColumnFilter] = React.useState<string>('all');
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);

  // Filter rows by search term and selected column
  const filteredRows = React.useMemo(() => {
    let result = [...dataset.rows];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        if (selectedColumnFilter !== 'all') {
          const val = row[selectedColumnFilter];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
        }
        return Object.values(row).some(
          (val) => val !== undefined && val !== null && String(val).toLowerCase().includes(term)
        );
      });
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [dataset.rows, searchTerm, selectedColumnFilter, sortColumn, sortDirection]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    if (dataset.rows.length === 0) return;
    const headers = dataset.columns.map(c => c.name).join(',');
    const csvLines = dataset.rows.map(row =>
      dataset.columns
        .map(c => {
          const val = row[c.name];
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...csvLines].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportMenuOpen(false);
  };

  const handleExportJSON = () => {
    if (dataset.rows.length === 0) return;
    const jsonStr = JSON.stringify(dataset.rows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    if (dataset.rows.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(dataset.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_export.xlsx`);
    setExportMenuOpen(false);
  };

  const handleExportSQL = () => {
    if (dataset.rows.length === 0) return;
    const tableName = dataset.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cols = dataset.columns.map(c => `"${c.name}"`).join(', ');

    const sqlLines = dataset.rows.map(row => {
      const values = dataset.columns.map(c => {
        const val = row[c.name];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');
      return `INSERT INTO "${tableName}" (${cols}) VALUES (${values});`;
    });

    const sqlScript = `-- SQL INSERT Export for ${dataset.name}\n` + sqlLines.join('\n');
    const blob = new Blob([sqlScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_inserts.sql`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        
        {/* Search Input */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search across all records..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={selectedColumnFilter}
            onChange={(e) => setSelectedColumnFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Columns</option>
            {dataset.columns.map((c, idx) => (
              <option key={`dt-col-opt-${c.name}-${idx}`} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Info & Export */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <b>{filteredRows.length}</b> of <b>{dataset.rows.length}</b> rows
          </span>

          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Export Dataset</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl z-50 space-y-1 text-xs">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                >
                  <Download className="h-4 w-4 text-cyan-500" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                >
                  <FileCode className="h-4 w-4 text-amber-500" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={handleExportSQL}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                >
                  <Database className="h-4 w-4 text-indigo-500" />
                  <span>Export SQL Inserts</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 w-12 text-center border-r border-slate-200 dark:border-slate-800">
                  #
                </th>
                {dataset.columns.map((col, idx) => {
                  const isSorted = sortColumn === col.name;
                  return (
                    <th
                      key={`dt-th-${col.name}-${idx}`}
                      onClick={() => handleSort(col.name)}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-r border-slate-200 dark:border-slate-800 last:border-r-0 select-none"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-800 dark:text-slate-200">{col.name}</span>
                          <span className="rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.2 text-[8px] font-mono text-slate-600 dark:text-slate-300">
                            {col.type}
                          </span>
                        </div>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-cyan-500" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-cyan-500" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-50 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-mono">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={dataset.columns.length + 1}
                    className="py-12 text-center text-slate-400 font-sans"
                  >
                    No matching records found for "{searchTerm}".
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const rowIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-cyan-50/40 dark:hover:bg-cyan-950/30 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-center font-sans text-slate-400 text-[11px] border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-850/50">
                        {rowIndex}
                      </td>
                      {dataset.columns.map((col, cIdx) => {
                        const val = row[col.name];
                        const isNull = val === null || val === undefined || val === '';

                        return (
                          <td
                            key={`dt-cell-${col.name}-${cIdx}`}
                            className="py-2.5 px-4 truncate border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 max-w-[200px]"
                          >
                            {isNull ? (
                              <span className="italic text-slate-300 dark:text-slate-600 font-sans text-[11px]">
                                null
                              </span>
                            ) : typeof val === 'number' ? (
                              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                                {val.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-800 dark:text-slate-200">
                                {String(val)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-850/50 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 px-2 py-1 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">
              Page <b>{currentPage}</b> of <b>{totalPages}</b>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg p-1.5 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg p-1.5 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
