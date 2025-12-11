/**
 * Line chart showing metric trends over time
 */
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import type { MetricHistory as MetricHistoryType, MetricType } from '../../types/api';

interface MetricsHistoryProps {
  history: MetricHistoryType[];
  isLoading?: boolean;
}

const metricLabels: Record<MetricType, string> = {
  evidence_credibility_avg: 'Evidence Credibility',
  source_diversity_score: 'Source Diversity',
  hypothesis_coverage: 'Hypothesis Coverage',
  contradiction_resolution_rate: 'Contradiction Resolution',
  overall_confidence: 'Overall Confidence',
  stress_test_vulnerability: 'Stress Test Vulnerability',
  research_completeness: 'Research Completeness',
};

const metricColors: Record<MetricType, string> = {
  evidence_credibility_avg: '#3b82f6',
  source_diversity_score: '#8b5cf6',
  hypothesis_coverage: '#22c55e',
  contradiction_resolution_rate: '#f59e0b',
  overall_confidence: '#06b6d4',
  stress_test_vulnerability: '#ef4444',
  research_completeness: '#ec4899',
};

type DateRange = '7d' | '30d' | '90d';

export function MetricsHistory({ history, isLoading }: MetricsHistoryProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('overall_confidence');
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  // Find the history for the selected metric
  const selectedHistory = history.find((h) => h.metricType === selectedMetric);

  // Filter by date range
  const now = new Date();
  const rangeMs = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };

  const filteredData = selectedHistory?.values
    .filter((v) => {
      const date = new Date(v.recordedAt);
      return now.getTime() - date.getTime() <= rangeMs[dateRange];
    })
    .map((v) => ({
      date: new Date(v.recordedAt).toLocaleDateString(),
      value: Math.round(v.value * 100),
    }))
    .reverse() ?? [];

  return (
    <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Metrics Trend
        </h3>

        <div className="flex flex-wrap gap-2">
          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
            className="px-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
          >
            {Object.entries(metricLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Date Range Selector */}
          <div className="flex rounded-lg border border-surface-300 dark:border-surface-600 overflow-hidden">
            {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-surface-500 dark:text-surface-400">
          <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
          <p>No historical data available</p>
          <p className="text-sm">Metrics will be tracked over time as you work</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-800)',
                  border: '1px solid var(--color-surface-700)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [`${value}%`, metricLabels[selectedMetric]]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={metricColors[selectedMetric]}
                strokeWidth={2}
                dot={{ r: 4, fill: metricColors[selectedMetric] }}
                activeDot={{ r: 6, fill: metricColors[selectedMetric] }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend for multiple metrics view (future enhancement) */}
      <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
        <div className="flex flex-wrap gap-4">
          {Object.entries(metricLabels).slice(0, 4).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as MetricType)}
              className={`flex items-center gap-2 text-sm ${
                selectedMetric === key
                  ? 'text-surface-900 dark:text-white font-medium'
                  : 'text-surface-500 dark:text-surface-400'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: metricColors[key as MetricType] }}
              />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
