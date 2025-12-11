/**
 * Circular gauge indicators for research quality metrics
 */
import { RefreshCw, Loader2 } from 'lucide-react';
import type { ResearchMetrics } from '../../types/api';

interface MetricsGaugesProps {
  metrics: ResearchMetrics | null;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
  isLoading?: boolean;
}

interface GaugeConfig {
  key: keyof Omit<ResearchMetrics, 'calculatedAt'>;
  label: string;
  description: string;
}

const gaugeConfigs: GaugeConfig[] = [
  {
    key: 'evidenceCredibilityAvg',
    label: 'Evidence Credibility',
    description: 'Average credibility of collected evidence',
  },
  {
    key: 'sourceDiversityScore',
    label: 'Source Diversity',
    description: 'Diversity across evidence sources',
  },
  {
    key: 'hypothesisCoverage',
    label: 'Hypothesis Coverage',
    description: 'Evidence coverage of hypotheses',
  },
  {
    key: 'contradictionResolutionRate',
    label: 'Contradiction Resolution',
    description: 'Rate of resolved contradictions',
  },
  {
    key: 'overallConfidence',
    label: 'Overall Confidence',
    description: 'Thesis confidence level',
  },
  {
    key: 'stressTestVulnerability',
    label: 'Stress Test Vulnerability',
    description: 'Vulnerability from stress tests',
  },
  {
    key: 'researchCompleteness',
    label: 'Research Completeness',
    description: 'Overall research completion',
  },
];

function getColor(value: number, isVulnerability = false): string {
  // For vulnerability, lower is better (invert the color logic)
  if (isVulnerability) {
    if (value < 30) return '#22c55e'; // green
    if (value < 50) return '#f59e0b'; // yellow
    if (value < 70) return '#f97316'; // orange
    return '#ef4444'; // red
  }
  // For other metrics, higher is better
  if (value < 40) return '#ef4444'; // red
  if (value < 70) return '#f59e0b'; // yellow
  return '#22c55e'; // green
}

function CircularGauge({
  value,
  label,
  description,
  isVulnerability = false
}: {
  value: number;
  label: string;
  description: string;
  isVulnerability?: boolean;
}) {
  const normalizedValue = Math.min(100, Math.max(0, value * 100));
  const color = getColor(normalizedValue, isVulnerability);

  // SVG circle calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-surface-200 dark:text-surface-700"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        {/* Value in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-surface-900 dark:text-white">
            {Math.round(normalizedValue)}%
          </span>
        </div>
      </div>
      <h4 className="mt-2 text-sm font-medium text-surface-900 dark:text-white text-center">
        {label}
      </h4>
      <p className="text-xs text-surface-500 dark:text-surface-400 text-center mt-1">
        {description}
      </p>
    </div>
  );
}

export function MetricsGauges({ metrics, onRecalculate, isRecalculating, isLoading }: MetricsGaugesProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-8">
        <div className="flex flex-col items-center justify-center text-surface-500 dark:text-surface-400">
          <RefreshCw className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">No metrics available</p>
          <p className="text-sm mb-4">Calculate metrics to see research quality indicators</p>
          {onRecalculate && (
            <button
              onClick={onRecalculate}
              disabled={isRecalculating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
            >
              {isRecalculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Calculate Metrics
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with recalculate button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            Research Quality Metrics
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Last calculated: {new Date(metrics.calculatedAt).toLocaleString()}
          </p>
        </div>
        {onRecalculate && (
          <button
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 text-sm font-medium transition-colors"
          >
            {isRecalculating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Recalculate
          </button>
        )}
      </div>

      {/* Gauge Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {gaugeConfigs.map((config) => (
          <CircularGauge
            key={config.key}
            value={metrics[config.key]}
            label={config.label}
            description={config.description}
            isVulnerability={config.key === 'stressTestVulnerability'}
          />
        ))}
      </div>

      {/* Overall Summary */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <p className={`text-2xl font-bold ${
              metrics.overallConfidence >= 0.7
                ? 'text-green-600 dark:text-green-400'
                : metrics.overallConfidence >= 0.4
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {Math.round(metrics.overallConfidence * 100)}%
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Overall Confidence</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <p className={`text-2xl font-bold ${
              metrics.researchCompleteness >= 0.8
                ? 'text-green-600 dark:text-green-400'
                : metrics.researchCompleteness >= 0.5
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {Math.round(metrics.researchCompleteness * 100)}%
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Research Complete</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <p className={`text-2xl font-bold ${
              metrics.contradictionResolutionRate >= 0.8
                ? 'text-green-600 dark:text-green-400'
                : metrics.contradictionResolutionRate >= 0.5
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {Math.round(metrics.contradictionResolutionRate * 100)}%
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">Issues Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
