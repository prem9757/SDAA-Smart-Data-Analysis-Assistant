import React from 'react';
import { motion } from 'motion/react';
import { 
  Cpu, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  TrendingUp, 
  BarChart2, 
  Sliders, 
  Layers, 
  Zap,
  Target,
  BrainCircuit,
  Activity
} from 'lucide-react';
import { Dataset, ProblemType, AutoMLConfig, AutoMLResult } from '../../types/dataset';
import { runAutoMLSimulation, predictSingleItem } from '../../utils/mlEngine';

interface AutoMLLabProps {
  dataset: Dataset;
}

export const AutoMLLab: React.FC<AutoMLLabProps> = ({ dataset }) => {
  const allCols = dataset.columns.map(c => c.name);
  const numericCols = dataset.columns.filter(c => c.type === 'number').map(c => c.name);
  const categoricalCols = dataset.columns.filter(c => c.type === 'string' || c.type === 'boolean').map(c => c.name);

  // Initial ML Setup state
  const [problemType, setProblemType] = React.useState<ProblemType>('classification');
  const [targetColumn, setTargetColumn] = React.useState<string>(
    categoricalCols[0] || allCols[0] || 'target'
  );
  const [selectedFeatures, setSelectedFeatures] = React.useState<string[]>(
    allCols.filter(c => c !== targetColumn).slice(0, 5)
  );
  const [algorithm, setAlgorithm] = React.useState<string>('XGBoost Gradient Boosting');
  const [testRatio, setTestRatio] = React.useState<number>(0.2);

  // Training state
  const [isTraining, setIsTraining] = React.useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = React.useState<number>(0);
  const [mlResult, setMlResult] = React.useState<AutoMLResult | null>(null);

  // Interactive Live Predictor Inputs
  const [predictorInputs, setPredictorInputs] = React.useState<Record<string, number>>({});
  const [livePrediction, setLivePrediction] = React.useState<{
    prediction: string | number;
    confidence: number;
    explanation: string;
  } | null>(null);

  // Update features when target changes
  React.useEffect(() => {
    setSelectedFeatures(allCols.filter(c => c !== targetColumn).slice(0, 5));
  }, [targetColumn]);

  // Handle ML Training Simulation
  const handleTrainModel = () => {
    setIsTraining(true);
    setTrainingProgress(0);

    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);

          // Run AutoML simulation logic
          const config: AutoMLConfig = {
            targetColumn,
            problemType,
            selectedFeatures,
            algorithm,
            testRatio,
          };
          const res = runAutoMLSimulation(dataset.rows, config);
          setMlResult(res);

          // Initialize predictor inputs
          const initialInputs: Record<string, number> = {};
          res.featureImportance.forEach(fi => {
            const colObj = dataset.columns.find(c => c.name === fi.feature);
            initialInputs[fi.feature] = colObj?.stats?.mean || 50;
          });
          setPredictorInputs(initialInputs);

          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  // Run initial training on mount
  React.useEffect(() => {
    handleTrainModel();
  }, [dataset.id]);

  // Handle Predictor Input changes
  const handlePredictorInputChange = (featureName: string, val: number) => {
    const updated = { ...predictorInputs, [featureName]: val };
    setPredictorInputs(updated);
    if (mlResult) {
      const pred = predictSingleItem(
        updated,
        mlResult.featureImportance,
        problemType,
        targetColumn
      );
      setLivePrediction(pred);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ML Setup & Config Panel */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-100 dark:bg-cyan-900/50 p-2 text-cyan-600 dark:text-cyan-400">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Smart Prediction Tool
              </h2>
              <p className="text-xs text-slate-400">
                Predict future outcomes, forecast numbers, and discover key drivers automatically
              </p>
            </div>
          </div>

          <button
            onClick={handleTrainModel}
            disabled={isTraining || selectedFeatures.length === 0}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>{isTraining ? `Analyzing (${trainingProgress}%)` : 'Run AI Prediction'}</span>
          </button>
        </div>

        {/* Configuration Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
          
          {/* Problem Type */}
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Prediction Goal
            </label>
            <select
              value={problemType}
              onChange={(e) => setProblemType(e.target.value as ProblemType)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="classification">Category / Status (e.g., Risk Level, Pass/Fail)</option>
              <option value="regression">Future Numbers (e.g., Revenue, Cost, Sales)</option>
              <option value="clustering">Customer Groups (Segmentation)</option>
            </select>
          </div>

          {/* Target Column */}
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Field to Predict
            </label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500"
            >
              {allCols.map((c, idx) => (
                <option key={`ml-target-${c}-${idx}`} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Model Algorithm */}
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Smart Engine
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="XGBoost Gradient Boosting">Smart Boost Engine (Recommended)</option>
              <option value="Random Forest Classifier">Pattern Matcher Engine</option>
              <option value="Ridge Linear Regression">Linear Trend Engine</option>
              <option value="LightGBM Regressor">High-Speed Engine</option>
            </select>
          </div>

          {/* Test Split Ratio */}
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Testing Data Split
            </label>
            <select
              value={testRatio}
              onChange={(e) => setTestRatio(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value={0.2}>80% Learn / 20% Test</option>
              <option value={0.3}>70% Learn / 30% Test</option>
              <option value={0.15}>85% Learn / 15% Test</option>
            </select>
          </div>

        </div>

        {/* Feature Checkbox Selection */}
        <div className="space-y-2 pt-2">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            Factors to Include in Prediction
          </span>
          <div className="flex flex-wrap gap-2">
            {allCols.filter(c => c !== targetColumn).map((col, idx) => {
              const isSelected = selectedFeatures.includes(col);
              return (
                <button
                  key={`ml-feat-${col}-${idx}`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedFeatures(selectedFeatures.filter(f => f !== col));
                    } else {
                      setSelectedFeatures([...selectedFeatures, col]);
                    }
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-400 text-cyan-700 dark:text-cyan-300'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Model Training Loading Progress Bar */}
      {isTraining && (
        <div className="rounded-2xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/30 p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
            <Cpu className="h-5 w-5 animate-spin" />
            <span>Training {algorithm} on dataset...</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden max-w-md mx-auto">
            <div
              className="h-full rounded-full bg-cyan-600 transition-all duration-300"
              style={{ width: `${trainingProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">Performing k-fold cross-validation & hyperparameter tuning</p>
        </div>
      )}

      {/* Evaluation Results */}
      {mlResult && !isTraining && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Metrics & Feature Importance */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Model Evaluation Metrics Cards */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Validation Metrics ({mlResult.modelName})
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Trained in {mlResult.trainingTimeMs} ms
                </span>
              </div>

              {problemType === 'classification' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 p-4 border border-cyan-100 dark:border-cyan-900/50">
                    <span className="text-xs font-semibold text-slate-500">Accuracy</span>
                    <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                      {mlResult.accuracy}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 p-4 border border-emerald-100 dark:border-emerald-900/50">
                    <span className="text-xs font-semibold text-slate-500">Precision</span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {mlResult.precision}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 p-4 border border-cyan-100 dark:border-cyan-900/50">
                    <span className="text-xs font-semibold text-slate-500">Recall</span>
                    <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                      {mlResult.recall}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/50 p-4 border border-violet-100 dark:border-violet-900/50">
                    <span className="text-xs font-semibold text-slate-500">F1 Score</span>
                    <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                      {mlResult.f1Score}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 p-4 border border-cyan-100 dark:border-cyan-900/50">
                    <span className="text-xs font-semibold text-slate-500">R² Score</span>
                    <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                      {mlResult.r2Score}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 p-4 border border-emerald-100 dark:border-emerald-900/50">
                    <span className="text-xs font-semibold text-slate-500">RMSE</span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {mlResult.rmse}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 p-4 border border-amber-100 dark:border-amber-900/50">
                    <span className="text-xs font-semibold text-slate-500">MAE</span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                      ${mlResult.mae}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Importance Bar List */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Feature Importance Weights
              </h3>

              <div className="space-y-3">
                {mlResult.featureImportance.map((fi) => (
                  <div key={fi.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{fi.feature}</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-mono">
                        {(fi.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${fi.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right 1 Col: Interactive Live Model Predictor */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-cyan-200/80 dark:border-cyan-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Interactive Live Predictor
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tweak feature values to evaluate model prediction in real-time:
              </p>

              <div className="space-y-3">
                {mlResult.featureImportance.map((fi) => (
                  <div key={fi.feature} className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {fi.feature}
                    </label>
                    <input
                      type="number"
                      value={predictorInputs[fi.feature] ?? 50}
                      onChange={(e) => handlePredictorInputChange(fi.feature, Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ))}
              </div>

              {/* Prediction Result Display Card */}
              {livePrediction && (
                <div className="rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/40 p-4 space-y-2 mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Model Predicted Output
                  </span>
                  <p className="text-xl font-black text-cyan-900 dark:text-cyan-100">
                    {livePrediction.prediction}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {livePrediction.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
