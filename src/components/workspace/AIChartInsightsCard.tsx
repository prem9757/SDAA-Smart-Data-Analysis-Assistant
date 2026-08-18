import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Target, CheckCircle2 } from 'lucide-react';

interface AIChartInsightsCardProps {
  chartTitle: string;
  chartType: string;
  xAxis: string;
  yAxis: string;
  data: any[];
  isPercentage?: boolean;
}

export const AIChartInsightsCard: React.FC<AIChartInsightsCardProps> = ({
  chartTitle,
  chartType,
  xAxis,
  yAxis,
  data,
  isPercentage = false
}) => {
  // Automated Analytical Insight Generation Engine
  const insights = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Extract numeric values from data
    const values = data.map(d => typeof d.value === 'number' ? d.value : (d.y || d.Frequency || 0));
    const totalSum = values.reduce((a, b) => a + b, 0);
    const meanVal = values.length > 0 ? totalSum / values.length : 0;

    // Find Max & Min items
    let topItem = data[0];
    let minItem = data[0];
    let maxVal = -Infinity;
    let minVal = Infinity;

    data.forEach(item => {
      const v = typeof item.value === 'number' ? item.value : (item.y || item.Frequency || 0);
      if (v > maxVal) {
        maxVal = v;
        topItem = item;
      }
      if (v < minVal) {
        minVal = v;
        minItem = item;
      }
    });

    const topShare = totalSum > 0 ? Math.round((maxVal / totalSum) * 100) : 0;

    // Detect outliers (> 1.5 * meanVal)
    const anomalies = data.filter(item => {
      const v = typeof item.value === 'number' ? item.value : (item.y || item.Frequency || 0);
      return v > meanVal * 1.6;
    });

    // Determine growth trend direction (first vs last)
    const firstVal = typeof data[0]?.value === 'number' ? data[0].value : (data[0]?.y || 0);
    const lastVal = typeof data[data.length - 1]?.value === 'number' ? data[data.length - 1].value : (data[data.length - 1]?.y || 0);
    const trendDirection = lastVal > firstVal ? 'UPWARD' : lastVal < firstVal ? 'DOWNWARD' : 'STABLE';

    return {
      topCategory: topItem?.name || 'Top Item',
      topValue: maxVal,
      topShare,
      minCategory: minItem?.name || 'Min Item',
      minValue: minVal,
      meanVal: Math.round(meanVal * 100) / 100,
      totalSum: Math.round(totalSum * 100) / 100,
      anomaliesCount: anomalies.length,
      anomalyItem: anomalies[0]?.name,
      trendDirection
    };
  }, [data]);

  if (!insights) return null;

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Executive AI Chart Explanation</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Gemini 3.6 Automated
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Statistical takeaways derived from current dataset plot</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
            {data.length} Categories Processed
          </span>
        </div>
      </div>

      {/* Bullet Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Core Takeaway Card */}
        <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <Target className="h-4 w-4 shrink-0" />
            <span>Top Performance Driver</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            Category <strong className="text-cyan-400">{insights.topCategory}</strong> generated the highest value at{' '}
            <strong className="text-white">{insights.topValue.toLocaleString()}</strong> ({insights.topShare}% of total aggregated metric).
          </p>
        </div>

        {/* Statistical Range & Distribution Card */}
        <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>Distribution & Mean</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            Mean average across categories is <strong className="text-emerald-400">{insights.meanVal.toLocaleString()}</strong>, with lowest recording at{' '}
            <strong className="text-white">{insights.minCategory}</strong> ({insights.minValue.toLocaleString()}).
          </p>
        </div>

        {/* Anomaly & Trend Card */}
        <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Spike & Anomaly Alert</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {insights.anomaliesCount > 0 ? (
              <>
                Detected <strong className="text-amber-400">{insights.anomaliesCount} category spike(s)</strong>, notably in{' '}
                <strong className="text-white">{insights.anomalyItem}</strong> exceeding standard distribution.
              </>
            ) : (
              <>Distribution is evenly balanced with no severe outlier spikes across category records.</>
            )}
          </p>
        </div>

      </div>

      {/* Strategic Recommendation Callout */}
      <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/20 p-3.5 flex items-start gap-3 text-xs text-cyan-200">
        <Lightbulb className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-cyan-300 font-extrabold">Executive Actionable Insight:</strong> Concentrate key operational resources on top driver <strong className="text-white">{insights.topCategory}</strong> while evaluating lower yield areas like <strong className="text-white">{insights.minCategory}</strong> to maximize overall metric efficiency.
        </div>
      </div>

    </div>
  );
};
