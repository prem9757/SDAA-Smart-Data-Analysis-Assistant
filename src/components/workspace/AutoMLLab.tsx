import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Play, 
  ShoppingBag, 
  DollarSign, 
  PieChart as PieChartIcon, 
  Target, 
  Sparkles, 
  Send,
  ChevronDown,
  TrendingUp
} from 'lucide-react';
import { Dataset, ProblemType, AutoMLConfig, AutoMLResult } from '../../types/dataset';
import { runAutoMLSimulation } from '../../utils/mlEngine';

interface AutoMLLabProps {
  dataset: Dataset;
}

export const AutoMLLab: React.FC<AutoMLLabProps> = ({ dataset }) => {
  const allCols = dataset?.columns?.map(c => c.name) || [
    'Order_ID', 'Customer_Name', 'Product_Category', 'Product_Name',
    'Quantity', 'Unit_Price', 'Discount_Rate', 'Order_Date', 'Ship_Date',
    'Payment_Method', 'Status'
  ];

  // Prediction configuration state matching the reference image
  const [predictionGoal, setPredictionGoal] = React.useState<string>('regression');
  const [fieldToPredict, setFieldToPredict] = React.useState<string>('Total_Amount');
  const [smartEngine, setSmartEngine] = React.useState<string>('Linear Trend Engine');
  const [dataSplit, setDataSplit] = React.useState<string>('80% Learn / 20% Test');
  
  // Factors to include in prediction
  const [selectedFactors, setSelectedFactors] = React.useState<string[]>([
    'Order_ID', 'Quantity', 'Unit_Price', 'Discount_Rate'
  ]);

  // AI Query prompt state at bottom
  const [aiPrompt, setAiPrompt] = React.useState<string>('');
  const [timeRange, setTimeRange] = React.useState<string>('This Year');
  const [hoveredMonth, setHoveredMonth] = React.useState<number | null>(11); // Dec by default

  // Training state
  const [isTraining, setIsTraining] = React.useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = React.useState<number>(0);
  const [hasRunPrediction, setHasRunPrediction] = React.useState<boolean>(true);

  // Toggle factor selection
  const toggleFactor = (factorName: string) => {
    if (selectedFactors.includes(factorName)) {
      setSelectedFactors(selectedFactors.filter(f => f !== factorName));
    } else {
      setSelectedFactors([...selectedFactors, factorName]);
    }
  };

  // Run AI Prediction handler
  const handleRunPrediction = () => {
    setIsTraining(true);
    setTrainingProgress(0);

    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          setHasRunPrediction(true);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  // Monthly Sales Trend Data (Jan - Dec)
  const monthlySales = [
    { month: 'Jan', value: 12400, formatted: '$12,400' },
    { month: 'Feb', value: 24800, formatted: '$24,800' },
    { month: 'Mar', value: 31200, formatted: '$31,200' },
    { month: 'Apr', value: 28500, formatted: '$28,500' },
    { month: 'May', value: 45600, formatted: '$45,600' },
    { month: 'Jun', value: 58900, formatted: '$58,900' },
    { month: 'Jul', value: 51200, formatted: '$51,200' },
    { month: 'Aug', value: 72400, formatted: '$72,400' },
    { month: 'Sep', value: 68100, formatted: '$68,100' },
    { month: 'Oct', value: 79300, formatted: '$79,300' },
    { month: 'Nov', value: 71200, formatted: '$71,200' },
    { month: 'Dec', value: 98420, formatted: '$98,420' },
  ];

  // Category Distribution Data
  const categories = [
    { name: 'Electronics', percentage: 42, color: '#00E5FF' },
    { name: 'Clothing', percentage: 28, color: '#3B82F6' },
    { name: 'Home & Kitchen', percentage: 18, color: '#FACC15' },
    { name: 'Beauty', percentage: 8, color: '#EC4899' },
    { name: 'Others', percentage: 4, color: '#F43F5E' },
  ];

  // Calculate SVG line path coordinates for smooth curve
  const chartWidth = 560;
  const chartHeight = 180;
  const paddingX = 35;
  const paddingY = 25;
  const maxY = 100000;

  const points = monthlySales.map((item, idx) => {
    const x = paddingX + (idx / (monthlySales.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (item.value / maxY) * (chartHeight - paddingY * 2);
    return { x, y, ...item };
  });

  // Build SVG smooth Bezier curve path
  const curvePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
  }, '');

  // Fill area path for the gradient below the line
  const areaPath = `${curvePath} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`;

  return (
    <div className="space-y-5 pb-10">
      
      {/* 1. SMART PREDICTION TOOL CONFIGURATION CARD */}
      <div className="rounded-3xl border border-[#27345A] bg-[#10162B] p-6 shadow-2xl space-y-6">
        
        {/* Header Row: Pink Brain Icon, Title, Subtitle, and Run AI Prediction Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27345A]/60 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#EC4899] to-[#F43F5E] flex items-center justify-center text-white shadow-[0_0_16px_rgba(236,72,153,0.5)] shrink-0">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#F8FAFC] tracking-tight">
                Smart Prediction Tool
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Predict future outcomes, forecast numbers, and discover key drivers automatically
              </p>
            </div>
          </div>

          <button
            onClick={handleRunPrediction}
            disabled={isTraining || selectedFactors.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC4899] via-[#F43F5E] to-[#FB923C] hover:brightness-110 text-white px-6 py-2.5 text-xs font-extrabold shadow-lg shadow-[#EC4899]/30 transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{isTraining ? `Running (${trainingProgress}%)` : 'Run AI Prediction'}</span>
          </button>
        </div>

        {/* 4 Configuration Dropdowns in 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Prediction Goal */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              PREDICTION GOAL
            </label>
            <div className="relative">
              <select
                value={predictionGoal}
                onChange={(e) => setPredictionGoal(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#27345A] bg-[#0B1024] px-3.5 py-2.5 pr-8 text-xs font-semibold text-[#F8FAFC] focus:border-[#00E5FF] focus:outline-none"
              >
                <option value="regression">Future Numbers (e.g., Revenue, Cost)</option>
                <option value="classification">Category / Status (e.g., Risk Level)</option>
                <option value="clustering">Customer Segmentation</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#94A3B8]" />
            </div>
          </div>

          {/* Field to Predict */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              FIELD TO PREDICT
            </label>
            <div className="relative">
              <select
                value={fieldToPredict}
                onChange={(e) => setFieldToPredict(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#27345A] bg-[#0B1024] px-3.5 py-2.5 pr-8 text-xs font-semibold text-[#F8FAFC] focus:border-[#00E5FF] focus:outline-none font-mono"
              >
                {allCols.map((c) => (
                  <option key={`pred-field-${c}`} value={c}>
                    {c}
                  </option>
                ))}
                {!allCols.includes('Total_Amount') && (
                  <option value="Total_Amount">Total_Amount</option>
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#94A3B8]" />
            </div>
          </div>

          {/* Smart Engine */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              SMART ENGINE
            </label>
            <div className="relative">
              <select
                value={smartEngine}
                onChange={(e) => setSmartEngine(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#27345A] bg-[#0B1024] px-3.5 py-2.5 pr-8 text-xs font-semibold text-[#F8FAFC] focus:border-[#00E5FF] focus:outline-none"
              >
                <option value="Linear Trend Engine">Linear Trend Engine</option>
                <option value="Smart Boost (XGBoost)">Smart Boost Engine</option>
                <option value="Random Forest Matcher">Random Forest Matcher</option>
                <option value="Deep Neural Network">Deep Neural Network</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#94A3B8]" />
            </div>
          </div>

          {/* Testing Data Split */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              TESTING DATA SPLIT
            </label>
            <div className="relative">
              <select
                value={dataSplit}
                onChange={(e) => setDataSplit(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#27345A] bg-[#0B1024] px-3.5 py-2.5 pr-8 text-xs font-semibold text-[#F8FAFC] focus:border-[#00E5FF] focus:outline-none"
              >
                <option value="80% Learn / 20% Test">80% Learn / 20% Test</option>
                <option value="70% Learn / 30% Test">70% Learn / 30% Test</option>
                <option value="85% Learn / 15% Test">85% Learn / 15% Test</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#94A3B8]" />
            </div>
          </div>

        </div>

        {/* Factors to Include in Prediction (Factor Pills) */}
        <div className="space-y-2.5 pt-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
            FACTORS TO INCLUDE IN PREDICTION
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'Order_ID', 'Customer_Name', 'Product_Category', 'Product_Name',
              'Quantity', 'Unit_Price', 'Discount_Rate', 'Order_Date', 'Ship_Date',
              'Payment_Method', 'Status'
            ].map((col) => {
              const isSelected = selectedFactors.includes(col);
              return (
                <button
                  key={`factor-${col}`}
                  onClick={() => toggleFactor(col)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold font-mono border transition-all active:scale-95 ${
                    isSelected
                      ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                      : 'border-[#27345A] bg-[#0B1024] text-[#CBD5E1] hover:border-[#00E5FF]/40'
                  }`}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 2. DASHBOARD ANALYTICS ROW: SALES TREND, CATEGORIES DONUT, AND 2X2 KPIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Chart: Sales Trend Overview (Span 5 on large screens) */}
        <div className="lg:col-span-5 rounded-3xl border border-[#27345A] bg-[#10162B] p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#F8FAFC]">
              Sales Trend Overview
            </h3>
            <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="appearance-none rounded-lg border border-[#27345A] bg-[#0B1024] px-2.5 py-1 pr-6 text-[11px] font-semibold text-[#CBD5E1] focus:outline-none"
              >
                <option value="This Year">This Year</option>
                <option value="Last 6 Months">Last 6 Months</option>
                <option value="All Time">All Time</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-[#94A3B8]" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
            <span>Total Sales</span>
          </div>

          {/* SVG Line Chart with Gradient Curve and Interactive Data Points */}
          <div className="relative w-full h-48 select-none">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="salesTrendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="salesLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="50%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 20000, 40000, 60000, 80000, 100000].map((val) => {
                const y = chartHeight - paddingY - (val / maxY) * (chartHeight - paddingY * 2);
                return (
                  <g key={`grid-${val}`}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#27345A"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.6"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      fill="#94A3B8"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val === 0 ? '0' : `${val / 1000}K`}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient Fill */}
              <path d={areaPath} fill="url(#salesTrendGradient)" />

              {/* Smooth Bezier Line */}
              <path
                d={curvePath}
                fill="none"
                stroke="url(#salesLineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Data Points */}
              {points.map((pt, idx) => (
                <g key={`pt-${idx}`} className="cursor-pointer" onClick={() => setHoveredMonth(idx)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredMonth === idx ? 6 : 4}
                    fill={hoveredMonth === idx ? '#FFFFFF' : '#8B5CF6'}
                    stroke={hoveredMonth === idx ? '#00E5FF' : '#10162B'}
                    strokeWidth="2"
                    className="transition-all hover:scale-125"
                  />
                  {/* Month Label */}
                  <text
                    x={pt.x}
                    y={chartHeight - 6}
                    fill="#94A3B8"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {pt.month}
                  </text>
                </g>
              ))}
            </svg>

            {/* Interactive Tooltip Card for Selected Month (Dec $98,420 by default) */}
            {hoveredMonth !== null && points[hoveredMonth] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-4 bottom-14 rounded-xl border border-[#27345A] bg-[#080D1F]/95 p-2.5 shadow-xl text-left pointer-events-none backdrop-blur-md"
              >
                <p className="text-[11px] font-bold text-[#F8FAFC]">
                  {points[hoveredMonth].month}
                </p>
                <p className="text-[10px] text-[#94A3B8]">Total Sales</p>
                <p className="text-xs font-black text-[#00E5FF] font-mono">
                  {points[hoveredMonth].formatted}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Middle Chart: Sales by Category Donut Chart (Span 3 on large screens) */}
        <div className="lg:col-span-3 rounded-3xl border border-[#27345A] bg-[#10162B] p-5 shadow-xl space-y-3 flex flex-col">
          <h3 className="font-extrabold text-sm text-[#F8FAFC]">
            Sales by Category
          </h3>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4">
            
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* SVG Slices with strokeDasharray */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth="14"
                  strokeDasharray="100.2 238.8"
                  strokeDashoffset="0"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="14"
                  strokeDasharray="66.8 238.8"
                  strokeDashoffset="-100.2"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#FACC15"
                  strokeWidth="14"
                  strokeDasharray="43.0 238.8"
                  strokeDashoffset="-167"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#EC4899"
                  strokeWidth="14"
                  strokeDasharray="19.1 238.8"
                  strokeDashoffset="-210"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="14"
                  strokeDasharray="9.5 238.8"
                  strokeDashoffset="-229.1"
                />
              </svg>

              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="text-[10px] text-[#94A3B8] font-medium">Total Sales</span>
                <span className="text-xs font-black text-[#F8FAFC] font-mono">$573,820</span>
              </div>
            </div>

            {/* Category Percentages Legend */}
            <div className="space-y-1.5 text-xs">
              {categories.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-[#CBD5E1] truncate">{cat.name}</span>
                  </div>
                  <span className="font-bold text-[#F8FAFC] font-mono">{cat.percentage}%</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right 2x2 KPI Metric Cards (Span 4 on large screens) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3">
          
          {/* Card 1: Total Orders */}
          <div className="rounded-2xl border border-[#27345A] bg-[#10162B] p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#8B5CF6]">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-[#94A3B8]">Total Orders</p>
              <p className="text-xl font-black text-[#F8FAFC] font-mono tracking-tight mt-0.5">
                12,842
              </p>
              <p className="text-[10px] font-bold text-[#22C55E] flex items-center gap-1 mt-1 font-mono">
                <span>▲ 18.6%</span> <span className="text-[#94A3B8] font-normal">vs last month</span>
              </p>
            </div>
          </div>

          {/* Card 2: Total Revenue */}
          <div className="rounded-2xl border border-[#27345A] bg-[#10162B] p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center text-[#22C55E]">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-[#94A3B8]">Total Revenue</p>
              <p className="text-xl font-black text-[#F8FAFC] font-mono tracking-tight mt-0.5">
                $573,820
              </p>
              <p className="text-[10px] font-bold text-[#22C55E] flex items-center gap-1 mt-1 font-mono">
                <span>▲ 23.4%</span> <span className="text-[#94A3B8] font-normal">vs last month</span>
              </p>
            </div>
          </div>

          {/* Card 3: Avg. Order Value */}
          <div className="rounded-2xl border border-[#27345A] bg-[#10162B] p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-[#F97316]/20 border border-[#F97316]/40 flex items-center justify-center text-[#F97316]">
                <PieChartIcon className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-[#94A3B8]">Avg. Order Value</p>
              <p className="text-xl font-black text-[#F8FAFC] font-mono tracking-tight mt-0.5">
                $44.72
              </p>
              <p className="text-[10px] font-bold text-[#22C55E] flex items-center gap-1 mt-1 font-mono">
                <span>▲ 11.2%</span> <span className="text-[#94A3B8] font-normal">vs last month</span>
              </p>
            </div>
          </div>

          {/* Card 4: Prediction Accuracy */}
          <div className="rounded-2xl border border-[#27345A] bg-[#10162B] p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-[#EC4899]/20 border border-[#EC4899]/40 flex items-center justify-center text-[#EC4899]">
                <Target className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-[#94A3B8]">Prediction Accuracy</p>
              <p className="text-xl font-black text-[#F8FAFC] font-mono tracking-tight mt-0.5">
                92.7%
              </p>
              <p className="text-[10px] font-bold text-[#22C55E] flex items-center gap-1 mt-1 font-mono">
                <span>▲ 4.8%</span> <span className="text-[#94A3B8] font-normal">vs last run</span>
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* 3. BOTTOM FLOATING AI QUICK QUERY BAR */}
      <div className="rounded-2xl border border-[#27345A] bg-[#10162B] p-3 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#EC4899] to-[#8B5CF6] flex items-center justify-center text-white shrink-0 shadow-md">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask anything about your data... Example: Show monthly sales trend for Electronics category"
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (aiPrompt.trim()) {
              setAiPrompt('');
            }
          }}
          className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] hover:brightness-110 flex items-center justify-center text-white shrink-0 shadow-md active:scale-95 transition-all"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};
