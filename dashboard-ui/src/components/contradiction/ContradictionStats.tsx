/**
 * Statistics display for contradictions
 */
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import type { ContradictionStats as ContradictionStatsType } from '../../types/api';

interface ContradictionStatsProps {
  stats: ContradictionStatsType;
}

const SEVERITY_COLORS = {
  low: '#9ca3af',
  medium: '#f59e0b',
  high: '#ef4444',
};

const STATUS_COLORS = {
  unresolved: '#f97316',
  explained: '#22c55e',
  dismissed: '#6b7280',
  critical: '#dc2626',
};

export function ContradictionStats({ stats }: ContradictionStatsProps) {
  const severityData = Object.entries(stats.bySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: SEVERITY_COLORS[name as keyof typeof SEVERITY_COLORS],
  }));

  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name as keyof typeof STATUS_COLORS],
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Count */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
        <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">
          Total Contradictions
        </h3>
        <p className="text-3xl font-bold text-surface-900 dark:text-white">
          {stats.total}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-surface-600 dark:text-surface-400">Resolution Rate:</span>
          <span className={`text-sm font-semibold ${
            stats.resolutionRate > 0.7
              ? 'text-green-600 dark:text-green-400'
              : stats.resolutionRate > 0.4
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {Math.round(stats.resolutionRate * 100)}%
          </span>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
        <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
          By Severity
        </h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`
                }
                labelLine={false}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
        <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
          By Status
        </h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
