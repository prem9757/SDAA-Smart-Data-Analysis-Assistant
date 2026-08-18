import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, Check, Sparkles, Sliders, ChevronDown } from 'lucide-react';
import { ChartType, AggregationType, PaletteType } from '../../types/dataset';

export interface PresetBookmark {
  id: string;
  name: string;
  chartType: ChartType;
  xAxis: string;
  yAxis: string;
  secondaryYAxis?: string;
  groupBy?: string;
  aggregation: AggregationType;
  palette: PaletteType;
  sortOrder: 'asc' | 'desc' | 'none';
  topN: number;
}

interface ChartPresetBookmarksProps {
  currentConfig: Omit<PresetBookmark, 'id' | 'name'>;
  onApplyPreset: (preset: PresetBookmark) => void;
  datasetName: string;
}

export const ChartPresetBookmarks: React.FC<ChartPresetBookmarksProps> = ({
  currentConfig,
  onApplyPreset,
  datasetName
}) => {
  const [bookmarks, setBookmarks] = useState<PresetBookmark[]>([
    {
      id: 'default-top5',
      name: '🔥 Top 5 Performers (Descending)',
      chartType: 'clustered_column',
      xAxis: currentConfig.xAxis,
      yAxis: currentConfig.yAxis,
      aggregation: 'sum',
      palette: 'cyan',
      sortOrder: 'desc',
      topN: 5
    },
    {
      id: 'default-trend',
      name: '📈 Smooth Trend Overview',
      chartType: 'smooth_line',
      xAxis: currentConfig.xAxis,
      yAxis: currentConfig.yAxis,
      aggregation: 'avg',
      palette: 'emerald',
      sortOrder: 'none',
      topN: 0
    }
  ]);

  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSaveCurrent = () => {
    if (!newBookmarkName.trim()) return;
    const newBookmark: PresetBookmark = {
      id: `bookmark-${Date.now()}`,
      name: newBookmarkName.trim(),
      ...currentConfig
    };
    setBookmarks(prev => [newBookmark, ...prev]);
    setNewBookmarkName('');
    setIsAdding(false);
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-800">
      
      {/* Left Label */}
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-cyan-500" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Preset Views & Bookmarks:</span>
      </div>

      {/* Preset List Chips */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {bookmarks.map((b) => (
          <div
            key={b.id}
            onClick={() => onApplyPreset(b)}
            className="group relative flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-cyan-500 hover:text-cyan-500 transition-all cursor-pointer shadow-xs"
          >
            <span>{b.name}</span>
            <button
              type="button"
              onClick={(e) => handleDeleteBookmark(b.id, e)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add New Preset Toggle */}
        {isAdding ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Preset Name..."
              value={newBookmarkName}
              onChange={(e) => setNewBookmarkName(e.target.value)}
              className="rounded-xl border border-cyan-500 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveCurrent}
              className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 text-xs font-bold transition-all"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Bookmark Current View</span>
          </button>
        )}
      </div>

    </div>
  );
};
