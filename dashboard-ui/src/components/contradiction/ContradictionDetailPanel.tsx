/**
 * Detail panel for viewing and resolving a contradiction
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertOctagon, Loader2 } from 'lucide-react';
import type { Contradiction } from '../../types/api';

interface ContradictionDetailPanelProps {
  contradiction: Contradiction;
  onResolve: (status: 'explained' | 'dismissed', notes: string) => void;
  onMarkCritical: () => void;
  onDelete: () => void;
  isResolving?: boolean;
}

export function ContradictionDetailPanel({
  contradiction,
  onResolve,
  onMarkCritical,
  onDelete,
  isResolving,
}: ContradictionDetailPanelProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isResolved = contradiction.status === 'explained' || contradiction.status === 'dismissed';

  const handleResolve = (status: 'explained' | 'dismissed') => {
    if (resolutionNotes.trim().length < 10) {
      alert('Please provide resolution notes (at least 10 characters)');
      return;
    }
    onResolve(status, resolutionNotes);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
            contradiction.severity === 'high'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              : contradiction.severity === 'medium'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300'
          }`}>
            <AlertTriangle className="h-4 w-4" />
            {contradiction.severity.toUpperCase()} Severity
          </span>
          <span className={`text-sm font-medium ${
            contradiction.status === 'critical'
              ? 'text-red-700 dark:text-red-300'
              : contradiction.status === 'unresolved'
              ? 'text-orange-600 dark:text-orange-400'
              : contradiction.status === 'explained'
              ? 'text-green-600 dark:text-green-400'
              : 'text-surface-500 dark:text-surface-400'
          }`}>
            {contradiction.status.charAt(0).toUpperCase() + contradiction.status.slice(1)}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          Contradiction Details
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">
            Description
          </h3>
          <p className="text-surface-700 dark:text-surface-300">
            {contradiction.description}
          </p>
        </div>

        {/* Bear Case Theme */}
        {contradiction.bearCaseTheme && (
          <div>
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">
              Bear Case Theme
            </h3>
            <p className="text-surface-700 dark:text-surface-300">
              {contradiction.bearCaseTheme}
            </p>
          </div>
        )}

        {/* Resolution Info */}
        {isResolved && contradiction.resolutionNotes && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolution Notes
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400">
              {contradiction.resolutionNotes}
            </p>
            {contradiction.resolvedAt && (
              <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                Resolved on {new Date(contradiction.resolvedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-surface-500 dark:text-surface-400 space-y-1">
          <p>Created: {new Date(contradiction.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(contradiction.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      {!isResolved && (
        <div className="p-4 border-t border-surface-200 dark:border-surface-700 space-y-3">
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Resolution notes (min 10 characters)..."
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm resize-none"
            rows={3}
            disabled={isResolving}
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleResolve('explained')}
              disabled={isResolving || resolutionNotes.trim().length < 10}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-surface-300 text-white disabled:text-surface-500 text-sm font-medium transition-colors"
            >
              {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Mark Explained
            </button>
            <button
              onClick={() => handleResolve('dismissed')}
              disabled={isResolving || resolutionNotes.trim().length < 10}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-600 hover:bg-surface-700 disabled:bg-surface-300 text-white disabled:text-surface-500 text-sm font-medium transition-colors"
            >
              {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Dismiss
            </button>
          </div>

          <div className="flex gap-2">
            {contradiction.status !== 'critical' && (
              <button
                onClick={onMarkCritical}
                disabled={isResolving}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
              >
                <AlertOctagon className="h-4 w-4" />
                Mark Critical
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isResolving}
              className="px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-surface-800 p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
              Delete Contradiction?
            </h3>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
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
