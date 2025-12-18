/**
 * History table for past stress tests
 */
import { useState } from 'react';
import { Trash2, Eye, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { StressTest, StressTestStats } from '../../types/api';

interface StressTestHistoryProps {
  stressTests: StressTest[];
  stats?: StressTestStats;
  onSelect: (stressTest: StressTest) => void;
  onDelete: (id: string) => void;
  selectedId?: string;
  isLoading?: boolean;
}

const statusConfig = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-surface-500 dark:text-surface-400',
    label: 'Pending',
  },
  running: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-primary-600 dark:text-primary-400',
    label: 'Running',
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
    label: 'Completed',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600 dark:text-red-400',
    label: 'Failed',
  },
};

const intensityColors = {
  light: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  aggressive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function StressTestHistory({
  stressTests,
  stats,
  onSelect,
  onDelete,
  selectedId,
  isLoading,
}: StressTestHistoryProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {stats.totalTests ?? 0}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Total Tests</p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {stats.averageRiskScore?.toFixed(1) ?? 'N/A'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Avg Risk Score</p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {stats.vulnerabilitiesByIntensity?.aggressive ?? 0}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Aggressive Vulns</p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-sm text-surface-900 dark:text-white">
              {stats.lastTestAt ? new Date(stats.lastTestAt).toLocaleDateString() : 'Never'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Last Test</p>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            Test History
          </h3>
        </div>

        {stressTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-500 dark:text-surface-400">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p>No stress tests yet</p>
            <p className="text-sm">Run a stress test to see history</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-200 dark:divide-surface-700">
            {stressTests.map((test) => {
              const status = statusConfig[test.status];
              return (
                <div
                  key={test.id}
                  className={`p-4 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors ${
                    selectedId === test.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 ${status.color}`}>
                        {status.icon}
                        <span className="text-sm font-medium">{status.label}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${intensityColors[test.intensity]}`}>
                        {test.intensity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.overallRiskScore !== null && (
                        <span className={`text-sm font-semibold ${
                          test.overallRiskScore < 30
                            ? 'text-green-600 dark:text-green-400'
                            : test.overallRiskScore < 50
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : test.overallRiskScore < 70
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          Risk: {test.overallRiskScore}
                        </span>
                      )}
                      <button
                        onClick={() => onSelect(test)}
                        className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-400"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(test.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-600 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-surface-500 dark:text-surface-400">
                    <span>
                      Created: {new Date(test.createdAt).toLocaleDateString()}
                    </span>
                    {test.completedAt && (
                      <span>
                        Completed: {new Date(test.completedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span>Scenarios: {test.scenariosRun}</span>
                    <span>Vulnerabilities: {test.vulnerabilitiesFound}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-surface-800 p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
              Delete Stress Test?
            </h3>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
              This action cannot be undone. All test results will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
