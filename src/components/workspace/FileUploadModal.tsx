import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, FileSpreadsheet, Check, AlertCircle, Globe, Link } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset } from '../../types/dataset';
import { processRawDataset } from '../../utils/dataProcessor';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetUploaded: (dataset: Dataset) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetUploaded,
}) => {
  const [activeSourceTab, setActiveSourceTab] = React.useState<'file' | 'url'>('file');
  const [datasetName, setDatasetName] = React.useState('');
  const [datasetDescription, setDatasetDescription] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [webUrl, setWebUrl] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!datasetName) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setDatasetName(nameWithoutExt.replace(/[-_]/g, ' '));
      }
      setErrorMessage(null);
    }
  };

  const handleProcessUrl = async () => {
    if (!webUrl.trim()) {
      setErrorMessage('Please enter a valid CSV or Google Sheets published URL.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    let targetUrl = webUrl.trim();
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      if (!targetUrl.includes('/export?format=csv') && !targetUrl.includes('/pub?output=csv')) {
        targetUrl = targetUrl.replace(/\/edit.*$/, '/export?format=csv');
      }
    }

    try {
      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const csvText = await res.text();

      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const rows = results.data as Record<string, any>[];

            const newDataset = processRawDataset(
              `ds-url-${Date.now()}`,
              datasetName || 'Web / Google Sheets Data',
              datasetDescription || 'Imported from URL',
              'Custom',
              'Web Stream',
              rows
            );

            onDatasetUploaded(newDataset);
            setIsProcessing(false);
            onClose();
          } else {
            setErrorMessage('No valid data rows found at the provided URL.');
            setIsProcessing(false);
          }
        },
        error: (err) => {
          setErrorMessage(`Error parsing fetched CSV: ${err.message}`);
          setIsProcessing(false);
        },
      });
    } catch (err: any) {
      setErrorMessage(`Failed to fetch dataset from URL: ${err.message || 'CORS or Network Error'}`);
      setIsProcessing(false);
    }
  };

  const handleProcessUpload = () => {
    if (activeSourceTab === 'url') {
      handleProcessUrl();
      return;
    }

    if (!file) {
      setErrorMessage('Please select an Excel (.xlsx, .xls), CSV, TSV, or JSON dataset file.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const filename = file.name.toLowerCase();

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            setErrorMessage('No worksheets found in Excel file.');
            setIsProcessing(false);
            return;
          }
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

          if (!rows || rows.length === 0) {
            setErrorMessage('The selected Excel sheet contains no readable rows.');
            setIsProcessing(false);
            return;
          }

          const newDataset = processRawDataset(
            `ds-custom-${Date.now()}`,
            datasetName || file.name.replace(/\.[^/.]+$/, ''),
            datasetDescription || 'Uploaded Excel workbook dataset',
            'Custom',
            'Excel Workbook',
            rows
          );

          onDatasetUploaded(newDataset);
          setIsProcessing(false);
          onClose();
        } catch (err: any) {
          setErrorMessage(`Error parsing Excel workbook: ${err.message || 'Invalid format'}`);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (filename.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonText = event.target?.result as string;
          const parsed = JSON.parse(jsonText);
          const rows = Array.isArray(parsed) ? parsed : [parsed];

          const newDataset = processRawDataset(
            `ds-custom-${Date.now()}`,
            datasetName || 'Uploaded Dataset',
            datasetDescription || 'Custom uploaded dataset',
            'Custom',
            'Database',
            rows
          );

          onDatasetUploaded(newDataset);
          setIsProcessing(false);
          onClose();
        } catch (err: any) {
          setErrorMessage('Invalid JSON format. Please upload an array of objects.');
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const rows = results.data as Record<string, any>[];

            const newDataset = processRawDataset(
              `ds-custom-${Date.now()}`,
              datasetName || 'Uploaded Dataset',
              datasetDescription || 'Custom uploaded dataset',
              'Custom',
              'Database',
              rows
            );

            onDatasetUploaded(newDataset);
            setIsProcessing(false);
            onClose();
          } else {
            setErrorMessage('No valid data rows found in CSV file.');
            setIsProcessing(false);
          }
        },
        error: (error) => {
          setErrorMessage(`Error parsing CSV: ${error.message}`);
          setIsProcessing(false);
        },
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5 overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-cyan-100 dark:bg-cyan-900/50 p-2 text-cyan-600 dark:text-cyan-400">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Import New Dataset
                </h3>
                <p className="text-[11px] text-slate-500">Upload local files or connect via Google Sheets / CSV URL</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Source Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              onClick={() => { setActiveSourceTab('file'); setErrorMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
                activeSourceTab === 'file'
                  ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Local File (CSV/XLSX/JSON)</span>
            </button>
            <button
              onClick={() => { setActiveSourceTab('url'); setErrorMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
                activeSourceTab === 'url'
                  ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Google Sheets / Web URL</span>
            </button>
          </div>

          <div className="space-y-4 text-xs font-medium">
            {/* Dataset Title Input */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g., Q3 Financial Operations Data"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Description
              </label>
              <input
                type="text"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                placeholder="Brief summary of dataset contents"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* File Dropzone or Web URL */}
            {activeSourceTab === 'file' ? (
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Dataset File (Excel, CSV, TSV, or JSON)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 cursor-pointer transition-colors p-4 text-center">
                  <FileSpreadsheet className="h-7 w-7 text-cyan-500 mb-1.5" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {file ? file.name : 'Click to select or drag & drop file'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Supports .xlsx, .xls, .csv, .tsv, .json files up to 50MB
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Google Sheets Published URL or Direct CSV Link
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  <Link className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-400">
                  Tip: For Google Sheets, go to File → Share → Publish to Web → Select CSV option and paste the URL here.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-xs text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessUpload}
              disabled={isProcessing || (activeSourceTab === 'file' ? !file : !webUrl.trim())}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>{isProcessing ? 'Connecting & Inferring Schema...' : 'Import Dataset'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
