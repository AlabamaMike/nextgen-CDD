/**
 * Research Quality Charts - Visualizations for evidence statistics
 */
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { EvidenceStats } from '../../types/api';

interface ResearchQualityChartsProps {
  stats: EvidenceStats;
}

const SENTIMENT_COLORS = {
  supporting: '#22c55e',
  neutral: '#6b7280',
  contradicting: '#ef4444',
};

const SOURCE_COLORS = {
  web: '#3b82f6',
  document: '#8b5cf6',
  expert: '#f59e0b',
  data: '#06b6d4',
  filing: '#10b981',
  financial: '#ec4899',
};

const SOURCE_LABELS: Record<string, string> = {
  web: 'Web',
  document: 'Document',
  expert: 'Expert',
  data: 'Data',
  filing: 'Filing',
  financial: 'Financial',
};

export function ResearchQualityCharts({ stats }: ResearchQualityChartsProps) {
  // Prepare sentiment data for pie chart
  const sentimentData = Object.entries(stats.bySentiment)
    .filter(([_, count]) => count > 0)
    .map(([sentiment, count]) => ({
      name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
      value: count,
      color: SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS] || '#6b7280',
    }));

  // Prepare source type data for bar chart
  const sourceData = Object.entries(stats.bySourceType)
    .filter(([_, count]) => count > 0)
    .map(([source, count]) => ({
      name: SOURCE_LABELS[source] || source,
      count,
      color: SOURCE_COLORS[source as keyof typeof SOURCE_COLORS] || '#6b7280',
    }))
    .sort((a, b) => b.count - a.count);

  const credibilityPercent = Math.round(stats.averageCredibility * 100);
  const coveragePercent = Math.round(stats.hypothesisCoverage * 100);

  if (stats.totalCount === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No evidence data to display
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalCount}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Evidence
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className={`text-2xl font-bold ${
            credibilityPercent >= 70 ? 'text-green-600' :
            credibilityPercent >= 40 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {credibilityPercent}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Avg Credibility
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">
            {coveragePercent}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Hypothesis Coverage
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Object.keys(stats.bySourceType).length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Source Types
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Sentiment Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Evidence Sentiment
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, 'Count']}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {sentimentData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source Types Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Evidence by Source
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip
                  formatter={(value: number) => [value, 'Count']}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Credibility Gauge */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
          Research Quality Score
        </h3>
        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              credibilityPercent >= 70 ? 'bg-green-500' :
              credibilityPercent >= 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${credibilityPercent}%` }}
          />
          <div className="absolute inset-0 flex">
            <div className="flex-1 border-r border-white/30" />
            <div className="flex-1 border-r border-white/30" />
            <div className="flex-1 border-r border-white/30" />
            <div className="flex-1 border-r border-white/30" />
            <div className="flex-1" />
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
          Based on average credibility score of {stats.totalCount} evidence items
        </p>
      </div>
    </div>
  );
}
