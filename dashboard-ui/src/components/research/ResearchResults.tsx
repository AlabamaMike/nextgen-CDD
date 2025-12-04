/**
 * Component for displaying research results
 */
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { ResearchResults } from '../../types/api';

interface ResearchResultsProps {
  results: ResearchResults;
}

export function ResearchResults({ results }: ResearchResultsProps) {
  const getVerdictIcon = () => {
    switch (results.verdict) {
      case 'validated':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'refuted':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'inconclusive':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getVerdictColor = () => {
    switch (results.verdict) {
      case 'validated':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'refuted':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'inconclusive':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Verdict Summary */}
      <div className={`p-6 rounded-lg border ${getVerdictColor()}`}>
        <div className="flex items-start gap-4">
          {getVerdictIcon()}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
              {results.verdict.charAt(0).toUpperCase() + results.verdict.slice(1)}
            </h2>
            <p className="text-surface-700 dark:text-surface-300 mb-4">
              {results.summary}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                Confidence:
              </span>
              <span className={`text-sm font-bold ${getConfidenceColor(results.confidence)}`}>
                {Math.round(results.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Findings */}
      {results.key_findings && results.key_findings.length > 0 && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Key Findings
            </h3>
          </div>
          <div className="p-4 space-y-3 bg-white dark:bg-surface-900">
            {results.key_findings.map((finding, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {finding.sentiment === 'positive' ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 dark:text-surface-300">
                    {finding.text}
                  </p>
                  {finding.source && (
                    <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">
                      Source: {finding.source}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {results.risks && results.risks.length > 0 && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Identified Risks
            </h3>
          </div>
          <div className="p-4 space-y-3 bg-white dark:bg-surface-900">
            {results.risks.map((risk, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
              >
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-red-900 dark:text-red-300">
                      {risk.category}
                    </span>
                    <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {risk.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {risk.description}
                  </p>
                  {risk.mitigation && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      Mitigation: {risk.mitigation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {results.recommendations && results.recommendations.length > 0 && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Recommendations
            </h3>
          </div>
          <div className="p-4 bg-white dark:bg-surface-900">
            <ul className="space-y-2">
              {results.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex gap-3 text-sm text-surface-700 dark:text-surface-300"
                >
                  <span className="text-primary-500 font-bold">{index + 1}.</span>
                  <span className="flex-1">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Evidence Summary */}
      {results.evidence_summary && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Evidence Summary
            </h3>
          </div>
          <div className="p-4 bg-white dark:bg-surface-900">
            <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
              {results.evidence_summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
