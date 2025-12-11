/**
 * List view for contradictions with filtering
 */
import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Filter } from 'lucide-react';
import type { Contradiction, ContradictionSeverity, ContradictionStatus } from '../../types/api';

interface ContradictionListProps {
  contradictions: Contradiction[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

const severityColors: Record<ContradictionSeverity, string> = {
  low: 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const severityIcons: Record<ContradictionSeverity, React.ReactNode> = {
  low: <Info className="h-4 w-4" />,
  medium: <AlertCircle className="h-4 w-4" />,
  high: <AlertTriangle className="h-4 w-4" />,
};

const statusColors: Record<ContradictionStatus, string> = {
  unresolved: 'text-red-600 dark:text-red-400',
  explained: 'text-green-600 dark:text-green-400',
  dismissed: 'text-surface-500 dark:text-surface-400',
  critical: 'text-red-700 dark:text-red-300 font-bold',
};

export function ContradictionList({
  contradictions,
  selectedId,
  onSelect,
  isLoading,
}: ContradictionListProps) {
  const [severityFilter, setSeverityFilter] = useState<ContradictionSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContradictionStatus | 'all'>('all');

  const filteredContradictions = contradictions.filter((c) => {
    if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b border-surface-200 dark:border-surface-700 space-y-2">
        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as ContradictionSeverity | 'all')}
            className="flex-1 px-2 py-1 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800"
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContradictionStatus | 'all')}
            className="flex-1 px-2 py-1 text-sm rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800"
          >
            <option value="all">All Statuses</option>
            <option value="unresolved">Unresolved</option>
            <option value="critical">Critical</option>
            <option value="explained">Explained</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContradictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-surface-500 dark:text-surface-400">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No contradictions found</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-200 dark:divide-surface-700">
            {filteredContradictions.map((contradiction) => (
              <button
                key={contradiction.id}
                onClick={() => onSelect(contradiction.id)}
                className={`w-full p-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors ${
                  selectedId === contradiction.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-500'
                    : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${severityColors[contradiction.severity]}`}>
                    {severityIcons[contradiction.severity]}
                    {contradiction.severity}
                  </span>
                  <span className={`text-xs ${statusColors[contradiction.status]}`}>
                    {contradiction.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-surface-700 dark:text-surface-300 line-clamp-2">
                  {contradiction.description}
                </p>
                {contradiction.bearCaseTheme && (
                  <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                    Theme: {contradiction.bearCaseTheme}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
