/**
 * Evidence Detail Panel - Shows detailed info for selected evidence
 */
import { X, ExternalLink, Link2 } from 'lucide-react';
import type { Evidence, EvidenceSentiment } from '../../types/api';

interface EvidenceDetailPanelProps {
  evidence: Evidence;
  onClose: () => void;
  onUpdateSentiment?: (sentiment: EvidenceSentiment) => void;
  onUpdateCredibility?: (credibility: number) => void;
}

const sentimentOptions = [
  { value: 'supporting', label: 'Supporting', color: 'bg-green-100 text-green-800' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-800' },
  { value: 'contradicting', label: 'Contradicting', color: 'bg-red-100 text-red-800' },
] as const;

const sourceTypeLabels: Record<string, string> = {
  web: 'Web Source',
  document: 'Document',
  expert: 'Expert Input',
  data: 'Data Analysis',
  filing: 'Public Filing',
  financial: 'Financial Data',
};

export function EvidenceDetailPanel({
  evidence,
  onClose,
  onUpdateSentiment,
  onUpdateCredibility,
}: EvidenceDetailPanelProps) {
  const credibilityPercent = evidence.credibility !== null
    ? Math.round(evidence.credibility * 100)
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 w-96 h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Evidence Details
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Source Type and Sentiment */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">
            {sourceTypeLabels[evidence.sourceType] || evidence.sourceType}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            sentimentOptions.find(s => s.value === evidence.sentiment)?.color
          }`}>
            {evidence.sentiment}
          </span>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Content
          </h3>
          <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
            {evidence.content}
          </p>
        </div>

        {/* Source Info */}
        {(evidence.sourceTitle || evidence.sourceUrl || evidence.sourceAuthor) && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Source
            </h3>
            <div className="space-y-2">
              {evidence.sourceTitle && (
                <p className="text-gray-900 dark:text-white text-sm font-medium">
                  {evidence.sourceTitle}
                </p>
              )}
              {evidence.sourceAuthor && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  By: {evidence.sourceAuthor}
                </p>
              )}
              {evidence.sourceUrl && (
                <a
                  href={evidence.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Source
                </a>
              )}
              {evidence.sourcePublicationDate && (
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Published: {new Date(evidence.sourcePublicationDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Credibility */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Credibility
          </h3>
          {credibilityPercent !== null ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    credibilityPercent >= 70 ? 'bg-green-500' :
                    credibilityPercent >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${credibilityPercent}%` }}
                />
              </div>
              <span className={`font-bold ${
                credibilityPercent >= 70 ? 'text-green-600' :
                credibilityPercent >= 40 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {credibilityPercent}%
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Not assessed</span>
          )}
        </div>

        {/* Linked Hypotheses */}
        {evidence.linkedHypotheses && evidence.linkedHypotheses.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Linked Hypotheses ({evidence.linkedHypotheses.length})
            </h3>
            <div className="space-y-2">
              {evidence.linkedHypotheses.map((link) => (
                <div
                  key={link.hypothesisId}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300 truncate">
                      {link.hypothesisId.slice(0, 8)}...
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {Math.round(link.relevanceScore * 100)}% relevant
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Link */}
        {evidence.documentId && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Source Document
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Document ID: {evidence.documentId.slice(0, 8)}...
            </p>
          </div>
        )}

        {/* Metadata */}
        {Object.keys(evidence.metadata).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Metadata
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs font-mono">
              <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                {JSON.stringify(evidence.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>Created: {new Date(evidence.createdAt).toLocaleString()}</p>
          {evidence.retrievedAt && (
            <p>Retrieved: {new Date(evidence.retrievedAt).toLocaleString()}</p>
          )}
        </div>

        {/* Actions */}
        {(onUpdateSentiment || onUpdateCredibility) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Update Evidence
            </h3>

            {onUpdateSentiment && (
              <div className="space-y-2 mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400">Sentiment</label>
                <div className="flex gap-2">
                  {sentimentOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onUpdateSentiment(option.value)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        evidence.sentiment === option.value
                          ? option.color + ' ring-2 ring-offset-2'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onUpdateCredibility && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Credibility: {credibilityPercent ?? 50}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={credibilityPercent ?? 50}
                  onChange={(e) => onUpdateCredibility(parseInt(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
