import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  ScatterChart, 
  Scatter, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  LabelList,
  Brush,
  ReferenceLine
} from 'recharts';
import { 
  BarChart3, 
  LineChart as LineIcon, 
  PieChart as PieIcon, 
  Sparkles, 
  Download, 
  SlidersHorizontal, 
  Palette, 
  Layers,
  ChevronDown,
  LayoutDashboard,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Grid,
  Zap,
  TrendingUp,
  Maximize2,
  BarChart2,
  Activity,
  X,
  Share2,
  Tag,
  Paintbrush,
  ArrowUpDown,
  Filter,
  Eye,
  EyeOff,
  ZoomIn,
  Calculator,
  Target,
  Bookmark,
  Search,
  Minimize2,
  Lightbulb,
  MousePointerClick
} from 'lucide-react';
import { Dataset, ChartType, AggregationType, PaletteType, ChartConfig } from '../../types/dataset';
import { ChartDrilldownModal } from './ChartDrilldownModal';
import { CalculatedColumnModal } from './CalculatedColumnModal';
import { AIChartInsightsCard } from './AIChartInsightsCard';
import { ChartPresetBookmarks, PresetBookmark } from './ChartPresetBookmarks';

interface ChartStudioProps {
  dataset: Dataset;
  onUpdateDataset?: (updatedDataset: Dataset) => void;
}

const PALETTE_COLORS: Record<PaletteType, string[]> = {
  cyan: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'],
  emerald: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'],
  amber: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7', '#d97706'],
  rose: ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#e11d48'],
  indigo: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5'],
  violet: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#7c3aed'],
};

// All available chart types metadata organized by category
const ALL_CHART_TYPES: { id: ChartType; label: string; category: string; description: string }[] = [
  // Column Charts (Vertical)
  { id: 'clustered_column', label: 'Clustered Column', category: 'Column', description: 'Side-by-side vertical bars comparing categories' },
  { id: 'stacked_column', label: 'Stacked Column', category: 'Column', description: 'Vertical stacked bars showing component breakdown' },
  { id: 'percent_column', label: '100% Stacked Column', category: 'Column', description: 'Vertical stacked bars scaled to 100% percentage share' },
  { id: 'column', label: 'Standard Column', category: 'Column', description: 'Basic vertical bar chart for category comparison' },

  // Bar Charts (Horizontal)
  { id: 'clustered_bar', label: 'Clustered Bar', category: 'Bar', description: 'Side-by-side horizontal bars comparing categories' },
  { id: 'stacked_bar', label: 'Stacked Bar', category: 'Bar', description: 'Horizontal stacked bars showing component breakdown' },
  { id: 'percent_bar', label: '100% Stacked Bar', category: 'Bar', description: 'Horizontal stacked bars scaled to 100% percentage share' },
  { id: 'bar', label: 'Standard Bar', category: 'Bar', description: 'Basic horizontal bar chart for category comparison' },

  // Line Charts
  { id: 'line', label: 'Standard Line', category: 'Line', description: 'Continuous trend line over categories' },
  { id: 'smooth_line', label: 'Smooth Spline Line', category: 'Line', description: 'Curved smooth continuous trend line' },
  { id: 'stepped_line', label: 'Stepped Line', category: 'Line', description: 'Discrete step-after trend changes' },

  // Area Charts
  { id: 'area', label: 'Standard Area', category: 'Area', description: 'Overlapping volume under continuous trend line' },
  { id: 'stacked_area', label: 'Stacked Area', category: 'Area', description: 'Cumulative volume breakdown across categories' },
  { id: 'percent_area', label: '100% Stacked Area', category: 'Area', description: 'Proportional volume percentage over categories' },

  // Circular / Composition
  { id: 'pie', label: 'Pie Chart', category: 'Composition', description: 'Proportional slice percentage of total' },
  { id: 'donut', label: 'Donut Chart', category: 'Composition', description: 'Ring chart showing category composition' },

  // Advanced / Distribution
  { id: 'scatter', label: 'Scatter Plot', category: 'Distribution', description: 'Correlation & distribution between 2 metrics' },
  { id: 'radar', label: 'Radar Chart', category: 'Distribution', description: 'Multi-axis dimensional performance profile' },
  { id: 'combo', label: 'Combo (Bar + Line)', category: 'Advanced', description: 'Dual metric comparison in a single view' },
  { id: 'heatmap', label: 'Matrix Heatmap', category: 'Advanced', description: 'Value density and intensity matrix' },
  { id: 'boxplot', label: 'Histogram Distribution', category: 'Distribution', description: 'Value spread, frequency bins & summary stats' },
  { id: 'treemap', label: 'Treemap Grid', category: 'Advanced', description: 'Proportional hierarchical area tiles' },
];

export interface ChartComputationResult {
  data: any[];
  seriesKeys: string[];
  isPercentage: boolean;
}

// Helper to compute aggregated chart data supporting multi-series groupBy and percentage scaling
function computeChartData(
  dataset: Dataset, 
  xAxis: string, 
  yAxis: string, 
  groupBy: string | undefined,
  aggregation: AggregationType, 
  chartType: ChartType,
  sortOrder: 'none' | 'desc' | 'asc' = 'none',
  topN: number = 0,
  secondaryYAxis?: string,
  rowsToUse?: Record<string, any>[]
): ChartComputationResult {
  const sourceRows = rowsToUse || dataset?.rows || [];
  if (!dataset || sourceRows.length === 0) {
    return { data: [], seriesKeys: ['value'], isPercentage: false };
  }

  const isPercentage = chartType === 'percent_column' || chartType === 'percent_bar' || chartType === 'percent_area';

  if (chartType === 'scatter') {
    let data = sourceRows.slice(0, 40).map((row, idx) => ({
      x: Number(row[xAxis]) || idx + 1,
      y: Number(row[yAxis]) || 0,
      name: String(row[xAxis] ?? `Item ${idx + 1}`),
    }));
    if (sortOrder === 'desc') data.sort((a, b) => b.y - a.y);
    if (sortOrder === 'asc') data.sort((a, b) => a.y - b.y);
    if (topN > 0 && data.length > topN) data = data.slice(0, topN);
    return { data, seriesKeys: ['y'], isPercentage: false };
  }

  if (chartType === 'boxplot') {
    const vals = sourceRows.map(r => Number(r[yAxis])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    if (vals.length === 0) return { data: [], seriesKeys: ['Frequency'], isPercentage: false };
    const min = vals[0];
    const max = vals[vals.length - 1];
    const range = (max - min) || 1;
    const binCount = 6;
    const binWidth = range / binCount;

    let data = Array.from({ length: binCount }, (_, i) => {
      const start = min + i * binWidth;
      const end = start + binWidth;
      const count = vals.filter(v => v >= start && (i === binCount - 1 ? v <= end : v < end)).length;
      return {
        name: `${Math.round(start)}-${Math.round(end)}`,
        Frequency: count,
      };
    });
    if (sortOrder === 'desc') data.sort((a, b) => b.Frequency - a.Frequency);
    if (sortOrder === 'asc') data.sort((a, b) => a.Frequency - b.Frequency);
    if (topN > 0 && data.length > topN) data = data.slice(0, topN);
    return { data, seriesKeys: ['Frequency'], isPercentage: false };
  }

  // Determine if we do multi-series pivoting with groupBy
  const effectiveGroupBy = (groupBy && groupBy !== 'none' && groupBy !== xAxis) ? groupBy : undefined;

  if (effectiveGroupBy) {
    const xCategoriesMap = new Map<string, Record<string, number[]>>();
    const allGroupKeys = new Set<string>();

    sourceRows.forEach(row => {
      const xVal = String(row[xAxis] ?? 'Unknown');
      const gVal = String(row[effectiveGroupBy] ?? 'Other');
      const yVal = Number(row[yAxis]);

      if (!xCategoriesMap.has(xVal)) {
        xCategoriesMap.set(xVal, {});
      }
      const xObj = xCategoriesMap.get(xVal)!;
      if (!xObj[gVal]) {
        xObj[gVal] = [];
      }
      if (!isNaN(yVal)) {
        xObj[gVal].push(yVal);
      }
      allGroupKeys.add(gVal);
    });

    const seriesKeys = Array.from(allGroupKeys).slice(0, 6);

    let data = Array.from(xCategoriesMap.entries()).map(([xVal, gMap]) => {
      const row: Record<string, any> = { name: xVal };
      let rowTotal = 0;

      seriesKeys.forEach(gKey => {
        const vals = gMap[gKey] || [];
        let aggVal = 0;
        if (vals.length > 0) {
          if (aggregation === 'sum') aggVal = vals.reduce((a, b) => a + b, 0);
          else if (aggregation === 'avg') aggVal = vals.reduce((a, b) => a + b, 0) / vals.length;
          else if (aggregation === 'min') aggVal = Math.min(...vals);
          else if (aggregation === 'max') aggVal = Math.max(...vals);
          else if (aggregation === 'count') aggVal = vals.length;
        } else if (aggregation === 'count') {
          aggVal = 0;
        }
        row[gKey] = Math.round(aggVal * 100) / 100;
        rowTotal += row[gKey];
      });

      row._total = rowTotal;

      if (isPercentage && rowTotal > 0) {
        seriesKeys.forEach(gKey => {
          row[gKey] = Math.round((row[gKey] / rowTotal) * 1000) / 10;
        });
      }

      return row;
    });

    if (sortOrder === 'desc') data.sort((a, b) => (b._total || 0) - (a._total || 0));
    if (sortOrder === 'asc') data.sort((a, b) => (a._total || 0) - (b._total || 0));
    if (topN > 0 && data.length > topN) {
      data = data.slice(0, topN);
    } else if (data.length > 15) {
      data = data.slice(0, 15);
    }

    return { data, seriesKeys, isPercentage };
  } else {
    // Single-series standard grouping
    const grouped: Record<string, number[]> = {};
    const secondaryGrouped: Record<string, number[]> = {};

    sourceRows.forEach(row => {
      const xKey = String(row[xAxis] ?? 'Unknown');
      const yVal = Number(row[yAxis]);

      if (!grouped[xKey]) grouped[xKey] = [];
      if (!isNaN(yVal)) {
        grouped[xKey].push(yVal);
      }

      if (secondaryYAxis && secondaryYAxis !== 'none') {
        const secVal = Number(row[secondaryYAxis]);
        if (!secondaryGrouped[xKey]) secondaryGrouped[xKey] = [];
        if (!isNaN(secVal)) secondaryGrouped[xKey].push(secVal);
      }
    });

    let data = Object.entries(grouped).map(([xVal, yVals]) => {
      let aggregatedValue = 0;
      if (yVals.length > 0) {
        if (aggregation === 'sum') aggregatedValue = yVals.reduce((a, b) => a + b, 0);
        else if (aggregation === 'avg') aggregatedValue = yVals.reduce((a, b) => a + b, 0) / yVals.length;
        else if (aggregation === 'min') aggregatedValue = Math.min(...yVals);
        else if (aggregation === 'max') aggregatedValue = Math.max(...yVals);
        else if (aggregation === 'count') aggregatedValue = yVals.length;
      } else {
        if (aggregation === 'count') aggregatedValue = sourceRows.filter(r => String(r[xAxis]) === xVal).length;
      }

      const item: Record<string, any> = {
        name: xVal,
        value: Math.round(aggregatedValue * 100) / 100,
      };

      if (secondaryYAxis && secondaryYAxis !== 'none') {
        const secVals = secondaryGrouped[xVal] || [];
        let secAgg = 0;
        if (secVals.length > 0) {
          if (aggregation === 'sum') secAgg = secVals.reduce((a, b) => a + b, 0);
          else if (aggregation === 'avg') secAgg = secVals.reduce((a, b) => a + b, 0) / secVals.length;
          else if (aggregation === 'min') secAgg = Math.min(...secVals);
          else if (aggregation === 'max') secAgg = Math.max(...secVals);
          else if (aggregation === 'count') secAgg = secVals.length;
        }
        item.secondaryValue = Math.round(secAgg * 100) / 100;
      }

      return item;
    });

    if (isPercentage) {
      const total = data.reduce((a, b) => a + b.value, 0) || 1;
      data.forEach(d => {
        d.value = Math.round((d.value / total) * 1000) / 10;
      });
    }

    if (sortOrder === 'desc') data.sort((a, b) => b.value - a.value);
    if (sortOrder === 'asc') data.sort((a, b) => a.value - b.value);

    if (topN > 0 && data.length > topN) {
      data = data.slice(0, topN);
    } else if (data.length > 15) {
      data = data.slice(0, 15);
    }

    const seriesKeys = ['value'];
    if (secondaryYAxis && secondaryYAxis !== 'none') seriesKeys.push('secondaryValue');

    return { data, seriesKeys, isPercentage };
  }
}

// Reusable Chart Component
interface RenderChartProps {
  type: ChartType;
  computedResult: ChartComputationResult;
  colors: string[];
  xAxis: string;
  yAxis: string;
  secondaryYAxis?: string;
  showDataLabels?: boolean;
  multiColorBars?: boolean;
  enableBrush?: boolean;
  referenceValue?: number | null;
  referenceLabel?: string;
  onDataPointClick?: (categoryName: string) => void;
}

const RenderChartContent: React.FC<RenderChartProps> = ({ 
  type, 
  computedResult, 
  colors, 
  xAxis, 
  yAxis,
  secondaryYAxis,
  showDataLabels = true,
  multiColorBars = true,
  enableBrush = false,
  referenceValue = null,
  referenceLabel = '',
  onDataPointClick
}) => {
  const { data, seriesKeys, isPercentage } = computedResult;

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-xs">
        No valid numeric records to render for selected variables.
      </div>
    );
  }

  // Common Tooltip & Axis styling
  const tooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '12px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.4)',
  };

  const handleCellClick = (entry: any) => {
    if (onDataPointClick && entry) {
      const catName = entry.name || entry.activeLabel || (entry.activePayload && entry.activePayload[0]?.payload?.name);
      if (catName) onDataPointClick(String(catName));
    }
  };

  const renderRefLine = () => {
    if (referenceValue === null || referenceValue === undefined || isNaN(referenceValue)) return null;
    return (
      <ReferenceLine 
        y={referenceValue} 
        stroke="#ef4444" 
        strokeDasharray="5 5" 
        strokeWidth={2} 
        label={{ value: referenceLabel || `Target: ${referenceValue.toLocaleString()}`, fill: '#ef4444', fontSize: 11, fontWeight: 'bold', position: 'top' }} 
      />
    );
  };

  const hasSecondary = seriesKeys.includes('secondaryValue') && secondaryYAxis && secondaryYAxis !== 'none';

  // 1. Column / Vertical Bar Charts
  if (type === 'column' || type === 'clustered_column' || type === 'stacked_column' || type === 'percent_column') {
    const isStacked = type === 'stacked_column' || type === 'percent_column';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} onClick={(e) => handleCellClick(e)}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            domain={isPercentage ? [0, 100] : [0, 'auto']}
            tickFormatter={(v) => (isPercentage ? `${v}%` : v.toLocaleString())}
          />
          {hasSecondary && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => v.toLocaleString()}
            />
          )}
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(val: any, name: any) => [
              isPercentage ? `${val}%` : typeof val === 'number' ? val.toLocaleString() : val,
              name === 'value' ? yAxis : name === 'secondaryValue' ? secondaryYAxis : name,
            ]}
          />
          {(seriesKeys.length > 1 || hasSecondary) && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />}
          {renderRefLine()}
          {seriesKeys.filter(k => k !== 'secondaryValue').map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              name={key === 'value' ? yAxis : key}
              stackId={isStacked ? 'stack' : undefined}
              fill={colors[idx % colors.length]}
              radius={!isStacked || idx === seriesKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {seriesKeys.length === 1 && multiColorBars && data.map((entry, cellIdx) => (
                <Cell key={`col-cell-${cellIdx}`} fill={colors[cellIdx % colors.length]} onClick={() => handleCellClick(entry)} />
              ))}
              {showDataLabels && (
                <LabelList
                  dataKey={key}
                  position="top"
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  formatter={(v: any) => (typeof v === 'number' ? (isPercentage ? `${v}%` : v.toLocaleString()) : v)}
                />
              )}
            </Bar>
          ))}
          {hasSecondary && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="secondaryValue"
              name={secondaryYAxis}
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981' }}
            />
          )}
          {enableBrush && data.length > 5 && (
            <Brush dataKey="name" height={20} stroke="#06b6d4" fill="#0f172a" tickFormatter={() => ''} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 2. Bar / Horizontal Bar Charts
  if (type === 'bar' || type === 'clustered_bar' || type === 'stacked_bar' || type === 'percent_bar') {
    const isStacked = type === 'stacked_bar' || type === 'percent_bar';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            type="number"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            domain={isPercentage ? [0, 100] : [0, 'auto']}
            tickFormatter={(v) => (isPercentage ? `${v}%` : v.toLocaleString())}
          />
          <YAxis type="category" dataKey="name" stroke="#888888" fontSize={11} tickLine={false} width={100} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(val: any, name: any) => [
              isPercentage ? `${val}%` : typeof val === 'number' ? val.toLocaleString() : val,
              name === 'value' ? yAxis : name,
            ]}
          />
          {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />}
          {seriesKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              name={key === 'value' ? yAxis : key}
              stackId={isStacked ? 'stack' : undefined}
              fill={colors[idx % colors.length]}
              radius={!isStacked || idx === seriesKeys.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]}
            >
              {seriesKeys.length === 1 && multiColorBars && data.map((_, cellIdx) => (
                <Cell key={`bar-cell-${cellIdx}`} fill={colors[cellIdx % colors.length]} />
              ))}
              {showDataLabels && (
                <LabelList
                  dataKey={key}
                  position="right"
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  formatter={(v: any) => (typeof v === 'number' ? (isPercentage ? `${v}%` : v.toLocaleString()) : v)}
                />
              )}
            </Bar>
          ))}
          {enableBrush && data.length > 5 && (
            <Brush dataKey="name" height={20} stroke="#06b6d4" fill="#0f172a" tickFormatter={() => ''} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 3. Line Charts
  if (type === 'line' || type === 'smooth_line' || type === 'stepped_line') {
    const lineType = type === 'smooth_line' ? 'natural' : type === 'stepped_line' ? 'stepAfter' : 'monotone';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
          <YAxis stroke="#888888" fontSize={11} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />}
          {seriesKeys.map((key, idx) => (
            <Line
              key={key}
              type={lineType}
              dataKey={key}
              name={key === 'value' ? yAxis : key}
              stroke={colors[idx % colors.length]}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            >
              {showDataLabels && (
                <LabelList
                  dataKey={key}
                  position="top"
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  formatter={(v: any) => (typeof v === 'number' ? v.toLocaleString() : v)}
                />
              )}
            </Line>
          ))}
          {enableBrush && data.length > 5 && (
            <Brush dataKey="name" height={20} stroke="#06b6d4" fill="#0f172a" tickFormatter={() => ''} />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // 4. Area Charts
  if (type === 'area' || type === 'stacked_area' || type === 'percent_area') {
    const isStacked = type === 'stacked_area' || type === 'percent_area';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            domain={isPercentage ? [0, 100] : [0, 'auto']}
            tickFormatter={(v) => (isPercentage ? `${v}%` : v.toLocaleString())}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(val: any, name: any) => [
              isPercentage ? `${val}%` : typeof val === 'number' ? val.toLocaleString() : val,
              name === 'value' ? yAxis : name,
            ]}
          />
          {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />}
          {seriesKeys.map((key, idx) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={key === 'value' ? yAxis : key}
              stackId={isStacked ? 'stack' : undefined}
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={isStacked ? 0.6 : 0.3}
            >
              {showDataLabels && (
                <LabelList
                  dataKey={key}
                  position="top"
                  fill="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  formatter={(v: any) => (typeof v === 'number' ? (isPercentage ? `${v}%` : v.toLocaleString()) : v)}
                />
              )}
            </Area>
          ))}
          {enableBrush && data.length > 5 && (
            <Brush dataKey="name" height={20} stroke="#06b6d4" fill="#0f172a" tickFormatter={() => ''} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // 5. Pie & Donut Charts
  if (type === 'pie' || type === 'donut') {
    const activeKey = seriesKeys[0] || 'value';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={activeKey}
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={type === 'donut' ? 55 : 0}
            outerRadius={95}
            paddingAngle={3}
            label={showDataLabels ? ({ name, value, percent }) => `${name}: ${typeof value === 'number' ? value.toLocaleString() : value} (${(percent * 100).toFixed(0)}%)` : false}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // 6. Scatter Plot
  if (type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="x" name={xAxis} stroke="#888888" fontSize={11} />
          <YAxis dataKey="y" name={yAxis} stroke="#888888" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          <Scatter data={data} fill={colors[0]}>
            {multiColorBars && data.map((_, index) => (
              <Cell key={`scatter-cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            {showDataLabels && (
              <LabelList dataKey="name" position="top" fill="#94a3b8" fontSize={9} />
            )}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // 7. Radar Chart
  if (type === 'radar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid opacity={0.2} />
          <PolarAngleAxis dataKey="name" stroke="#888888" fontSize={11} />
          <PolarRadiusAxis fontSize={10} />
          {seriesKeys.map((key, idx) => (
            <Radar
              key={key}
              name={key === 'value' ? yAxis : key}
              dataKey={key}
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={0.4}
            />
          ))}
          <Tooltip contentStyle={tooltipStyle} />
          {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  // 8. Combo Chart
  if (type === 'combo') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" stroke="#888888" fontSize={11} />
          <YAxis stroke="#888888" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} />
          {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px' }} />}
          {seriesKeys.map((key, idx) => {
            if (idx % 2 === 0) {
              return (
                <Bar key={key} dataKey={key} name={key === 'value' ? yAxis : key} fill={colors[idx % colors.length]} radius={[6, 6, 0, 0]}>
                  {seriesKeys.length === 1 && multiColorBars && data.map((_, cellIdx) => (
                    <Cell key={`combo-cell-${cellIdx}`} fill={colors[cellIdx % colors.length]} />
                  ))}
                  {showDataLabels && <LabelList dataKey={key} position="top" fill="#94a3b8" fontSize={10} fontWeight={600} />}
                </Bar>
              );
            } else {
              return (
                <Line key={key} type="monotone" dataKey={key} name={key} stroke={colors[idx % colors.length]} strokeWidth={3} dot={{ r: 4 }}>
                  {showDataLabels && <LabelList dataKey={key} position="top" fill="#94a3b8" fontSize={10} fontWeight={600} />}
                </Line>
              );
            }
          })}
          {enableBrush && data.length > 5 && (
            <Brush dataKey="name" height={20} stroke="#06b6d4" fill="#0f172a" tickFormatter={() => ''} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // 9. Matrix Heatmap
  if (type === 'heatmap') {
    const activeKey = seriesKeys[0] || 'value';
    const maxVal = Math.max(...data.map(d => Number(d[activeKey]) || 0), 1);
    return (
      <div className="h-full w-full flex flex-col justify-center p-2">
        <div className="text-[11px] font-semibold text-slate-400 mb-2">Matrix Density Heatmap ({yAxis} by {xAxis})</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 overflow-y-auto max-h-64">
          {data.map((item, idx) => {
            const val = Number(item[activeKey]) || 0;
            const opacity = Math.max(0.2, val / maxVal);
            return (
              <div
                key={idx}
                className="rounded-xl p-3 flex flex-col justify-between transition-transform hover:scale-105 border border-white/10"
                style={{
                  backgroundColor: colors[idx % colors.length],
                  opacity: opacity,
                  color: opacity > 0.6 ? '#ffffff' : '#0f172a',
                }}
              >
                <span className="text-[10px] font-bold truncate">{item.name}</span>
                {showDataLabels && <span className="text-xs font-black">{val.toLocaleString()}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 10. Boxplot / Histogram Distribution
  if (type === 'boxplot') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" stroke="#888888" fontSize={11} label={{ value: `${yAxis} Range Bins`, position: 'bottom', offset: -2, fontSize: 10 }} />
          <YAxis stroke="#888888" fontSize={11} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fontSize: 10 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="Frequency" fill={colors[0]} radius={[6, 6, 0, 0]} name="Frequency Count">
            {multiColorBars && data.map((_, cellIdx) => (
              <Cell key={`box-cell-${cellIdx}`} fill={colors[cellIdx % colors.length]} />
            ))}
            {showDataLabels && (
              <LabelList dataKey="Frequency" position="top" fill="#94a3b8" fontSize={10} fontWeight={600} />
            )}
          </Bar>
          {enableBrush && data.length > 5 && (
            <Brush dataKey="name" height={20} stroke="#06b6d4" fill="#0f172a" tickFormatter={() => ''} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 11. Treemap Grid
  if (type === 'treemap') {
    const activeKey = seriesKeys[0] || 'value';
    const total = data.reduce((a, b) => a + (Number(b[activeKey]) || 0), 0) || 1;
    return (
      <div className="h-full w-full p-2 flex flex-col justify-center">
        <div className="text-[11px] font-semibold text-slate-400 mb-2">Treemap Distribution Tiles</div>
        <div className="flex flex-wrap gap-1.5 h-64 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 p-2 bg-slate-950">
          {data.map((item, idx) => {
            const val = Number(item[activeKey]) || 0;
            const pct = Math.max(8, Math.round((val / total) * 100));
            return (
              <div
                key={idx}
                className="rounded-xl p-2.5 flex flex-col justify-between transition-all hover:brightness-125"
                style={{
                  flexGrow: pct,
                  flexBasis: `${pct}%`,
                  backgroundColor: colors[idx % colors.length],
                  minWidth: '80px',
                }}
              >
                <span className="text-[10px] font-extrabold text-white truncate">{item.name}</span>
                <div className="text-xs font-black text-white">{val.toLocaleString()} <span className="text-[9px] font-normal opacity-80">({pct}%)</span></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
        <XAxis dataKey="name" stroke="#888888" fontSize={11} />
        <YAxis stroke="#888888" fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={seriesKeys[0] || 'value'} fill={colors[0]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const ChartStudio: React.FC<ChartStudioProps> = ({ dataset, onUpdateDataset }) => {
  const numericCols = React.useMemo(() => {
    return dataset.columns.filter(c => c.type === 'number').map(c => c.name);
  }, [dataset.columns]);

  const allCols = React.useMemo(() => {
    return dataset.columns.map(c => c.name);
  }, [dataset.columns]);

  const categoryCols = React.useMemo(() => {
    return dataset.columns.filter(c => c.type === 'string' || c.type === 'boolean').map(c => c.name);
  }, [dataset.columns]);

  // Mode View State: 'studio' (editor) or 'dashboard' (multi-chart dashboard)
  const [viewMode, setViewMode] = React.useState<'studio' | 'dashboard'>('studio');

  // Active Studio Chart Configuration
  const [chartType, setChartType] = React.useState<ChartType>('clustered_column');
  const [xAxis, setXAxis] = React.useState<string>(categoryCols[0] || allCols[0] || 'Category');
  const [yAxis, setYAxis] = React.useState<string>(numericCols[0] || allCols[1] || 'Value');
  const [secondaryYAxis, setSecondaryYAxis] = React.useState<string>('none');
  const [groupBy, setGroupBy] = React.useState<string>('none');
  const [aggregation, setAggregation] = React.useState<AggregationType>('sum');
  const [palette, setPalette] = React.useState<PaletteType>('cyan');
  const [chartTitle, setChartTitle] = React.useState<string>('');

  // Interactive Chart Feature Controls
  const [showDataLabels, setShowDataLabels] = React.useState<boolean>(true);
  const [multiColorBars, setMultiColorBars] = React.useState<boolean>(true);
  const [enableBrush, setEnableBrush] = React.useState<boolean>(false);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc' | 'none'>('desc');
  const [topN, setTopN] = React.useState<number>(0);

  // New Interactivity Features States
  const [referenceValue, setReferenceValue] = React.useState<number | null>(null);
  const [referenceLabel, setReferenceLabel] = React.useState<string>('Target Target');
  const [showAIInsights, setShowAIInsights] = React.useState<boolean>(true);
  const [isPresentationMode, setIsPresentationMode] = React.useState<boolean>(false);
  const [isCalculatedModalOpen, setIsCalculatedModalOpen] = React.useState<boolean>(false);
  const [drilldownCategory, setDrilldownCategory] = React.useState<string | null>(null);
  const [globalSlicerCategory, setGlobalSlicerCategory] = React.useState<string>('ALL');

  const chartContainerRef = React.useRef<HTMLDivElement>(null);

  // Filtered dataset rows based on Global Slicer
  const filteredDatasetRows = React.useMemo(() => {
    if (!globalSlicerCategory || globalSlicerCategory === 'ALL') return dataset.rows;
    return dataset.rows.filter(r => String(r[xAxis]) === globalSlicerCategory);
  }, [dataset.rows, xAxis, globalSlicerCategory]);

  // Dashboard State
  const [dashboardTitle, setDashboardTitle] = React.useState<string>(`${dataset.name} Executive Dashboard`);
  const [pinnedCharts, setPinnedCharts] = React.useState<ChartConfig[]>([]);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isAddChartModalOpen, setIsAddChartModalOpen] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState('');

  // Natural Language AI Chart Prompt Generator
  const handleGenerateChartFromPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;

    const query = aiPrompt.toLowerCase();
    
    // Detect chart type
    let detectedType: ChartType = 'clustered_column';
    if (query.includes('pie')) detectedType = 'pie';
    else if (query.includes('donut')) detectedType = 'donut';
    else if (query.includes('line')) detectedType = 'line';
    else if (query.includes('smooth') || query.includes('spline')) detectedType = 'smooth_line';
    else if (query.includes('area')) detectedType = 'area';
    else if (query.includes('bar')) detectedType = 'clustered_bar';
    else if (query.includes('stacked bar')) detectedType = 'stacked_bar';
    else if (query.includes('stacked column') || query.includes('stacked')) detectedType = 'stacked_column';
    else if (query.includes('scatter')) detectedType = 'scatter';
    else if (query.includes('radar')) detectedType = 'radar';
    else if (query.includes('combo')) detectedType = 'combo';
    else if (query.includes('histogram') || query.includes('distribution')) detectedType = 'boxplot';

    // Detect aggregation
    let detectedAgg: AggregationType = 'sum';
    if (query.includes('average') || query.includes('avg') || query.includes('mean')) detectedAgg = 'avg';
    else if (query.includes('count') || query.includes('number of')) detectedAgg = 'count';
    else if (query.includes('maximum') || query.includes('highest') || query.includes('max')) detectedAgg = 'max';
    else if (query.includes('minimum') || query.includes('lowest') || query.includes('min')) detectedAgg = 'min';

    // Match column names from dataset
    const matchedCols = dataset.columns.filter(c => query.includes(c.name.toLowerCase()));
    
    let matchedX = xAxis;
    let matchedY = yAxis;

    if (matchedCols.length > 0) {
      const catCol = matchedCols.find(c => c.type === 'string' || c.type === 'date') || matchedCols[0];
      const numCol = matchedCols.find(c => c.type === 'number') || matchedCols[1] || matchedCols[0];
      if (catCol) matchedX = catCol.name;
      if (numCol && numCol.name !== catCol.name) matchedY = numCol.name;
    }

    setChartType(detectedType);
    setAggregation(detectedAgg);
    setXAxis(matchedX);
    setYAxis(matchedY);
    showToast(`AI generated ${detectedType.replace('_', ' ')} chart for ${matchedY} by ${matchedX}!`);
    setAiPrompt('');
  };

  // Sync title whenever parameters change in Studio mode
  React.useEffect(() => {
    const groupSuffix = groupBy && groupBy !== 'none' ? ` grouped by ${groupBy}` : '';
    setChartTitle(`${aggregation.toUpperCase()} of ${yAxis} by ${xAxis}${groupSuffix}`);
  }, [xAxis, yAxis, groupBy, aggregation]);

  // Helper Toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Generate Current Active Chart Data for Studio
  const studioChartData = React.useMemo(() => {
    return computeChartData(
      dataset, 
      xAxis, 
      yAxis, 
      groupBy, 
      aggregation, 
      chartType, 
      sortOrder, 
      topN, 
      secondaryYAxis, 
      filteredDatasetRows
    );
  }, [dataset, xAxis, yAxis, groupBy, aggregation, chartType, sortOrder, topN, secondaryYAxis, filteredDatasetRows]);

  // Handler: Export High-Res PNG
  const handleExportPNG = async () => {
    if (!chartContainerRef.current) return;
    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${chartTitle || dataset.name}_chart.png`;
      link.click();
      showToast('📸 High-resolution chart PNG exported successfully!');
    } catch (err) {
      console.error('Export PNG failed:', err);
      showToast('Failed to export chart image.');
    }
  };

  // Handler: Pin Current Chart to Dashboard
  const handlePinCurrentChart = () => {
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      title: chartTitle || `${yAxis} by ${xAxis}`,
      type: chartType,
      xAxis,
      yAxis,
      groupBy,
      aggregation,
      colorPalette: palette,
    };
    setPinnedCharts(prev => [...prev, newChart]);
    showToast(`Added "${newChart.title}" to Dashboard!`);
  };

  // Handler: Auto-Generate Complete Dashboard from Dataset
  const handleAutoGenerateDashboard = () => {
    const defaultY = numericCols[0] || allCols[1] || 'Value';
    const secondY = numericCols[1] || numericCols[0] || defaultY;
    const catX = categoryCols[0] || allCols[0] || 'Category';
    const catX2 = categoryCols[1] || categoryCols[0] || allCols[0] || 'Category';
    const groupCol = categoryCols[1] || categoryCols[0] || 'none';

    const autoCharts: ChartConfig[] = [
      {
        id: `auto-1`,
        title: `Clustered Column: ${defaultY} by ${catX}`,
        type: 'clustered_column',
        xAxis: catX,
        yAxis: defaultY,
        groupBy: groupCol !== catX ? groupCol : undefined,
        aggregation: 'sum',
        colorPalette: 'cyan',
      },
      {
        id: `auto-2`,
        title: `Stacked Column Breakdown: ${defaultY}`,
        type: 'stacked_column',
        xAxis: catX,
        yAxis: defaultY,
        groupBy: groupCol !== catX ? groupCol : undefined,
        aggregation: 'sum',
        colorPalette: 'emerald',
      },
      {
        id: `auto-3`,
        title: `100% Stacked Percentage Share`,
        type: 'percent_column',
        xAxis: catX,
        yAxis: defaultY,
        groupBy: groupCol !== catX ? groupCol : undefined,
        aggregation: 'sum',
        colorPalette: 'indigo',
      },
      {
        id: `auto-4`,
        title: `Horizontal 100% Stacked Bar Share`,
        type: 'percent_bar',
        xAxis: catX,
        yAxis: defaultY,
        groupBy: groupCol !== catX ? groupCol : undefined,
        aggregation: 'sum',
        colorPalette: 'violet',
      },
      {
        id: `auto-5`,
        title: `Smooth Trend Curve (${secondY})`,
        type: 'smooth_line',
        xAxis: catX2,
        yAxis: secondY,
        aggregation: 'avg',
        colorPalette: 'amber',
      },
      {
        id: `auto-6`,
        title: `100% Stacked Area Volume Share`,
        type: 'percent_area',
        xAxis: catX,
        yAxis: defaultY,
        groupBy: groupCol !== catX ? groupCol : undefined,
        aggregation: 'sum',
        colorPalette: 'rose',
      },
    ];

    setPinnedCharts(autoCharts);
    setViewMode('dashboard');
    showToast('⚡ Auto-created 6 multi-variant charts dashboard!');
  };

  // Handler: Remove Chart from Dashboard
  const handleRemoveChart = (id: string) => {
    setPinnedCharts(prev => prev.filter(c => c.id !== id));
    showToast('Removed chart from dashboard.');
  };

  // Handler: Edit Chart in Studio
  const handleEditChart = (chart: ChartConfig) => {
    setChartType(chart.type);
    setXAxis(chart.xAxis);
    setYAxis(chart.yAxis);
    setAggregation(chart.aggregation);
    setPalette(chart.colorPalette);
    setChartTitle(chart.title);
    setViewMode('studio');
    showToast(`Loaded "${chart.title}" into Studio`);
  };

  // Calculate Key KPI Summary Metrics for Dashboard
  const dashboardKPIs = React.useMemo(() => {
    const totalRows = dataset.rows.length;
    const primaryMetric = numericCols[0];
    let sumVal = 0;
    let avgVal = 0;

    if (primaryMetric && totalRows > 0) {
      const vals = dataset.rows.map(r => Number(r[primaryMetric])).filter(v => !isNaN(v));
      sumVal = vals.reduce((a, b) => a + b, 0);
      avgVal = vals.length > 0 ? sumVal / vals.length : 0;
    }

    return {
      totalRows,
      primaryMetricName: primaryMetric || 'Records',
      sumVal: Math.round(sumVal * 100) / 100,
      avgVal: Math.round(avgVal * 100) / 100,
      chartCount: pinnedCharts.length,
    };
  }, [dataset, numericCols, pinnedCharts]);

  return (
    <div className="space-y-6 pb-12 relative">

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 flex items-center gap-2 rounded-2xl bg-cyan-600 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-cyan-400/30"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Navigation Switcher */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-100 dark:bg-cyan-900/50 p-2.5 text-cyan-600 dark:text-cyan-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Visual Analytics & Chart Studio
                <span className="text-xs font-semibold text-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 px-2.5 py-0.5 rounded-full">
                  11 Chart Types
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create custom charts, explore multi-variable distributions, or build interactive dashboards.
              </p>
            </div>
          </div>

          {/* Mode Switcher & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1">
              <button
                onClick={() => setViewMode('studio')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'studio'
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Chart Builder</span>
              </button>

              <button
                onClick={() => setViewMode('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'dashboard'
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard ({pinnedCharts.length})</span>
              </button>
            </div>

            <button
              onClick={handleAutoGenerateDashboard}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-4 py-2.5 text-xs font-extrabold shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <Zap className="h-3.5 w-3.5 fill-white" />
              <span>⚡ Auto-Create Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* STUDIO MODE CONTENT */}
      {viewMode === 'studio' && (
        <div className="space-y-6">

          {/* Feature 7: Global Category Slicer & Preset Bookmarks Bar */}
          <div className="space-y-3">
            <ChartPresetBookmarks
              currentConfig={{
                chartType,
                xAxis,
                yAxis,
                secondaryYAxis,
                groupBy,
                aggregation,
                palette,
                sortOrder,
                topN
              }}
              onApplyPreset={(preset) => {
                setChartType(preset.chartType);
                setXAxis(preset.xAxis);
                setYAxis(preset.yAxis);
                if (preset.secondaryYAxis) setSecondaryYAxis(preset.secondaryYAxis);
                if (preset.groupBy) setGroupBy(preset.groupBy);
                setAggregation(preset.aggregation);
                setPalette(preset.palette);
                setSortOrder(preset.sortOrder);
                setTopN(preset.topN);
                showToast(`Applied preset view: "${preset.name}"`);
              }}
              datasetName={dataset.name}
            />

            {/* Global Slicer Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Filter className="h-4 w-4 text-cyan-500" />
                <span>Global Slicer Filter ({xAxis}):</span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <select
                  value={globalSlicerCategory}
                  onChange={(e) => setGlobalSlicerCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">All Categories (Unfiltered)</option>
                  {Array.from(new Set(dataset.rows.map(r => String(r[xAxis] ?? '')).filter(Boolean))).map((cat) => (
                    <option key={`slicer-${cat}`} value={cat}>{cat}</option>
                  ))}
                </select>
                {globalSlicerCategory !== 'ALL' && (
                  <button
                    onClick={() => setGlobalSlicerCategory('ALL')}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 shrink-0"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* AI Natural Language Chart Prompt Box */}
          <form onSubmit={handleGenerateChartFromPrompt} className="rounded-3xl border border-cyan-200/80 dark:border-cyan-900/60 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-4 sm:p-5 text-white shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span>Natural Language AI Chart Generator</span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">Try: "Line chart of average revenue by month" or "Pie chart of sales"</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe any chart in plain English (e.g. 'Show total sales by category as a donut chart')..."
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 text-xs font-extrabold shadow-md shadow-cyan-600/30 transition-all shrink-0 active:scale-95"
              >
                <Zap className="h-4 w-4 fill-white" />
                <span>Generate Chart</span>
              </button>
            </div>
          </form>

          {/* Controls Bar */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-cyan-500" />
                Chart Configuration & Variables
              </h3>

              {/* Color Palette Picker */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Theme Palette:</span>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-800">
                  {(['cyan', 'emerald', 'indigo', 'rose', 'amber', 'violet'] as PaletteType[]).map((p) => (
                    <button
                      key={`palette-picker-${p}`}
                      onClick={() => setPalette(p)}
                      className={`h-5 w-5 rounded-full transition-transform ${
                        palette === p ? 'scale-125 ring-2 ring-cyan-500 ring-offset-1' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: PALETTE_COLORS[p][0] }}
                      title={p}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 6: Active Field Selection Well Badges + Formula Button */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">Mapped Well Fields:</span>
              <div className="flex items-center gap-1.5 bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800 px-2.5 py-1 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300">
                <span className="opacity-70">X:</span> {xAxis}
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span className="opacity-70">Y:</span> {yAxis}
              </div>
              {secondaryYAxis !== 'none' && (
                <div className="flex items-center gap-1.5 bg-violet-100 dark:bg-violet-950/80 border border-violet-300 dark:border-violet-800 px-2.5 py-1 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300">
                  <span className="opacity-70">Y2:</span> {secondaryYAxis}
                  <button onClick={() => setSecondaryYAxis('none')} className="hover:text-rose-500"><X className="h-3 w-3" /></button>
                </div>
              )}
              {groupBy !== 'none' && (
                <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span className="opacity-70">Group:</span> {groupBy}
                  <button onClick={() => setGroupBy('none')} className="hover:text-rose-500"><X className="h-3 w-3" /></button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsCalculatedModalOpen(true)}
                className="ml-auto flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>+ Custom Calculated Field</span>
              </button>
            </div>

            {/* Selection Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 text-xs font-medium">
              
              {/* Chart Type Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  Chart Type ({ALL_CHART_TYPES.length})
                </label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {ALL_CHART_TYPES.map(ct => (
                    <option key={`opt-charttype-${ct.id}`} value={ct.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      [{ct.category}] {ct.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* X-Axis Dimension */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  X-Axis / Category
                </label>
                <select
                  value={xAxis}
                  onChange={(e) => setXAxis(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {allCols.map((c, idx) => (
                    <option key={`opt-xaxis-${c}-${idx}`} value={c} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Y-Axis Metric */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  Primary Y-Axis Metric
                </label>
                <select
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {numericCols.map((c, idx) => (
                    <option key={`opt-yaxis-${c}-${idx}`} value={c} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feature 4: Secondary Y-Axis Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 text-emerald-500">
                  Secondary Y-Axis (Dual)
                </label>
                <select
                  value={secondaryYAxis}
                  onChange={(e) => setSecondaryYAxis(e.target.value)}
                  className="w-full rounded-xl border border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="none" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">(None)</option>
                  {numericCols.filter(c => c !== yAxis).map((c, idx) => (
                    <option key={`opt-sec-yaxis-${c}-${idx}`} value={c} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group By / Secondary Category */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  Group By Breakdown
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="none" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">(None - Single Series)</option>
                  {categoryCols.filter(c => c !== xAxis).map((c, idx) => (
                    <option key={`opt-groupby-${c}-${idx}`} value={c} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aggregation Function */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  Aggregation
                </label>
                <select
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value as AggregationType)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="sum" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">SUM (Total)</option>
                  <option value="avg" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">AVG (Mean)</option>
                  <option value="count" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">COUNT (Frequency)</option>
                  <option value="min" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">MIN (Minimum)</option>
                  <option value="max" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">MAX (Maximum)</option>
                </select>
              </div>

            </div>

            {/* Feature 3: Benchmark Target Line Controls */}
            <div className="p-3 bg-rose-50/40 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-rose-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">Benchmark Reference Target Line:</span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="number"
                  placeholder="Target Value (e.g. 10000)..."
                  value={referenceValue === null ? '' : referenceValue}
                  onChange={(e) => setReferenceValue(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-32 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Label (e.g. Target KPI)..."
                  value={referenceLabel}
                  onChange={(e) => setReferenceLabel(e.target.value)}
                  className="flex-1 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                />
                {referenceValue !== null && (
                  <button
                    onClick={() => setReferenceValue(null)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 shrink-0"
                  >
                    Clear Target
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Data Sorting & Filtering Controls */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Sort Order Selector */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800">
                <ArrowUpDown className="h-4 w-4 text-cyan-500 shrink-0" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Sort Order</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Highest → Lowest</option>
                    <option value="asc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Lowest → Highest</option>
                    <option value="none" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Original Data Order</option>
                  </select>
                </div>
              </div>

              {/* Top N Filter */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800">
                <Filter className="h-4 w-4 text-cyan-500 shrink-0" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Items Limit</span>
                  <select
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value={0} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">All Items</option>
                    <option value={5} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Top 5 Items</option>
                    <option value={10} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Top 10 Items</option>
                    <option value={15} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Top 15 Items</option>
                    <option value={20} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Top 20 Items</option>
                  </select>
                </div>
              </div>

              {/* Data Labels Toggle Button */}
              <button
                type="button"
                onClick={() => setShowDataLabels(!showDataLabels)}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                  showDataLabels
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>Data Labels</span>
                </div>
                {showDataLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>

              {/* Multi-Color Bars Toggle Button */}
              <button
                type="button"
                onClick={() => setMultiColorBars(!multiColorBars)}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                  multiColorBars
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Paintbrush className="h-4 w-4" />
                  <span>Multi-Color Bars</span>
                </div>
                <span className="text-[10px] font-black">{multiColorBars ? 'ON' : 'OFF'}</span>
              </button>

              {/* Zoom & Scroll Brush Toggle Button */}
              <button
                type="button"
                onClick={() => setEnableBrush(!enableBrush)}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                  enableBrush
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  <span>Zoom Slider</span>
                </div>
                <span className="text-[10px] font-black">{enableBrush ? 'ACTIVE' : 'OFF'}</span>
              </button>

            </div>

            {/* Quick Chart Type Buttons Carousel */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Quick Select Chart Type:
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_CHART_TYPES.map((ct) => (
                  <button
                    key={`quick-ct-${ct.id}`}
                    onClick={() => setChartType(ct.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
                      chartType === ct.id
                        ? 'bg-cyan-500 text-white border-cyan-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Canvas Chart Card */}
          <div ref={chartContainerRef} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <input
                  type="text"
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  className="font-extrabold text-slate-900 dark:text-white text-base bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                  placeholder="Enter Chart Title..."
                />
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>X: <b className="text-slate-300">{xAxis}</b> • Y: <b className="text-slate-300">{yAxis}</b> ({aggregation})</span>
                  <span className="text-cyan-500 font-bold flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Click any bar to drilldown!</span>
                </div>
              </div>

              {/* Action Toolbar Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAIInsights(!showAIInsights)}
                  className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold border transition-all ${
                    showAIInsights
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>AI Insights</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="flex items-center gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <Download className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Export PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPresentationMode(true)}
                  className="flex items-center gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Presentation</span>
                </button>

                <button
                  onClick={handlePinCurrentChart}
                  className="flex items-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Pin to Dashboard</span>
                </button>
              </div>
            </div>

            <div className="h-96 w-full pt-4">
              <RenderChartContent
                type={chartType}
                computedResult={studioChartData}
                colors={PALETTE_COLORS[palette]}
                xAxis={xAxis}
                yAxis={yAxis}
                secondaryYAxis={secondaryYAxis}
                showDataLabels={showDataLabels}
                multiColorBars={multiColorBars}
                enableBrush={enableBrush}
                referenceValue={referenceValue}
                referenceLabel={referenceLabel}
                onDataPointClick={(categoryName) => setDrilldownCategory(categoryName)}
              />
            </div>
          </div>

          {/* Feature 5: AI Insights Breakdown Card */}
          {showAIInsights && (
            <AIChartInsightsCard
              data={studioChartData.data}
              metricName={yAxis}
              categoryName={xAxis}
              aggregationType={aggregation}
            />
          )}

        </div>
      )}

      {/* DASHBOARD MODE CONTENT */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Dashboard Header Bar */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <input
                  type="text"
                  value={dashboardTitle}
                  onChange={(e) => setDashboardTitle(e.target.value)}
                  className="text-lg font-black text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Live multi-chart interactive view for dataset: <b className="text-slate-200">{dataset.name}</b>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAddChartModalOpen(true)}
                  className="flex items-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Chart</span>
                </button>

                <button
                  onClick={() => setViewMode('studio')}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Open Studio</span>
                </button>
              </div>
            </div>

            {/* Executive Top KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Total Records</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {dashboardKPIs.totalRows.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Total {dashboardKPIs.primaryMetricName}</div>
                <div className="text-xl font-black text-cyan-500 mt-1">
                  {dashboardKPIs.sumVal.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Average {dashboardKPIs.primaryMetricName}</div>
                <div className="text-xl font-black text-emerald-500 mt-1">
                  {dashboardKPIs.avgVal.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Pinned Visual Charts</div>
                <div className="text-xl font-black text-amber-500 mt-1">
                  {dashboardKPIs.chartCount}
                </div>
              </div>
            </div>
          </div>

          {/* Grid of Pinned Dashboard Charts */}
          {pinnedCharts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 p-3 text-cyan-500 flex items-center justify-center">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dashboard is currently empty
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Pin customized charts from Chart Studio or click below to automatically create a complete AI dashboard with 6 charts.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleAutoGenerateDashboard}
                  className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  ⚡ Auto-Create AI Dashboard
                </button>
                <button
                  onClick={() => setViewMode('studio')}
                  className="rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2.5 text-xs font-bold"
                >
                  Go to Chart Studio
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pinnedCharts.map((chart) => {
                const chartData = computeChartData(dataset, chart.xAxis, chart.yAxis, chart.groupBy, chart.aggregation, chart.type);
                const colors = PALETTE_COLORS[chart.colorPalette || 'cyan'];

                return (
                  <div
                    key={chart.id}
                    className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {chart.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-800">
                            {chart.type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {chart.aggregation.toUpperCase()} of {chart.yAxis} by {chart.xAxis}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditChart(chart)}
                          title="Edit in Studio"
                          className="rounded-xl p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveChart(chart.id)}
                          title="Remove from Dashboard"
                          className="rounded-xl p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="h-72 w-full pt-2">
                      <RenderChartContent
                        type={chart.type}
                        computedResult={chartData}
                        colors={colors}
                        xAxis={chart.xAxis}
                        yAxis={chart.yAxis}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* MODAL: ADD CUSTOM CHART DIRECTLY TO DASHBOARD */}
      <AnimatePresence>
        {isAddChartModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-cyan-500" />
                  Add New Chart to Dashboard
                </h3>
                <button
                  onClick={() => setIsAddChartModalOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase">Chart Type</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as ChartType)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-semibold"
                  >
                    {ALL_CHART_TYPES.map(ct => (
                      <option key={`modal-ct-${ct.id}`} value={ct.id}>{ct.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-400 uppercase">X-Axis</label>
                    <select
                      value={xAxis}
                      onChange={(e) => setXAxis(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-semibold"
                    >
                      {allCols.map((c, idx) => <option key={`modal-xaxis-${c}-${idx}`} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-400 uppercase">Y-Axis</label>
                    <select
                      value={yAxis}
                      onChange={(e) => setYAxis(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-semibold"
                    >
                      {numericCols.map((c, idx) => <option key={`modal-yaxis-${c}-${idx}`} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase">Aggregation</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as AggregationType)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="sum">SUM</option>
                    <option value="avg">AVG</option>
                    <option value="count">COUNT</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsAddChartModalOpen(false)}
                  className="rounded-2xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handlePinCurrentChart();
                    setIsAddChartModalOpen(false);
                  }}
                  className="rounded-2xl bg-cyan-500 text-white px-5 py-2 text-xs font-bold shadow-md shadow-cyan-500/20"
                >
                  Create & Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: DRILLDOWN DATA INSPECTOR */}
      <ChartDrilldownModal
        isOpen={!!drilldownCategory}
        onClose={() => setDrilldownCategory(null)}
        categoryName={drilldownCategory || ''}
        xAxisColumn={xAxis}
        yAxisColumn={yAxis}
        dataset={dataset}
      />

      {/* MODAL 2: CALCULATED FIELD FORMULA BUILDER */}
      <CalculatedColumnModal
        isOpen={isCalculatedModalOpen}
        onClose={() => setIsCalculatedModalOpen(false)}
        dataset={dataset}
        onUpdateDataset={(updated) => {
          if (onUpdateDataset) {
            onUpdateDataset(updated);
          }
          showToast('Formula created! New calculated column added to dataset.');
        }}
      />

      {/* MODAL 3: FULLSCREEN PRESENTATION MODE */}
      <AnimatePresence>
        {isPresentationMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-slate-950 p-6 sm:p-10 text-white space-y-6 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">{chartTitle}</h2>
                <p className="text-xs text-slate-400">Presentation Mode • {dataset.name}</p>
              </div>
              <button
                onClick={() => setIsPresentationMode(false)}
                className="flex items-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-xs font-bold transition-all"
              >
                <X className="h-4 w-4" />
                <span>Exit Presentation</span>
              </button>
            </div>

            <div className="flex-1 w-full bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-2xl flex items-center justify-center">
              <div className="h-full w-full">
                <RenderChartContent
                  type={chartType}
                  computedResult={studioChartData}
                  colors={PALETTE_COLORS[palette]}
                  xAxis={xAxis}
                  yAxis={yAxis}
                  secondaryYAxis={secondaryYAxis}
                  showDataLabels={showDataLabels}
                  multiColorBars={multiColorBars}
                  enableBrush={enableBrush}
                  referenceValue={referenceValue}
                  referenceLabel={referenceLabel}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
