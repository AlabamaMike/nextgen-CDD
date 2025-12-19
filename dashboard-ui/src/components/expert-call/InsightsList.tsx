/**
 * Component for displaying extracted insights from expert calls
 * Presents insights as a nicely formatted document with bullets
 */
import {
  Lightbulb,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Shield,
  Target,
  CheckCircle,
  MessageCircle,
  ThumbsUp,
} from 'lucide-react';
import type { EnhancedInsight, TranscriptInsight } from '../../types/api';

interface InsightsListProps {
  insights: EnhancedInsight[];
  onHypothesisClick?: (hypothesisId: string) => void;
}

type InsightType = TranscriptInsight['type'];

const insightTypeConfig: Record<InsightType, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  key_point: {
    label: 'Key Points',
    icon: <Lightbulb className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
  },
  data_point: {
    label: 'Data Points',
    icon: <BarChart3 className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
  },
  market_insight: {
    label: 'Market Insights',
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-purple-600 dark:text-purple-400',
  },
  competitive_intel: {
    label: 'Competitive Intelligence',
    icon: <Target className="h-4 w-4" />,
    color: 'text-orange-600 dark:text-orange-400',
  },
  risk_factor: {
    label: 'Risk Factors',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600 dark:text-red-400',
  },
  opportunity: {
    label: 'Opportunities',
    icon: <ThumbsUp className="h-4 w-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  contradiction: {
    label: 'Contradictions',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600 dark:text-amber-400',
  },
  validation: {
    label: 'Validations',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
  },
  caveat: {
    label: 'Caveats',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  recommendation: {
    label: 'Recommendations',
    icon: <MessageCircle className="h-4 w-4" />,
    color: 'text-indigo-600 dark:text-indigo-400',
  },
};

function getImportanceBadge(importance: 'high' | 'medium' | 'low'): string {
  switch (importance) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'low':
      return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
  }
}

export function InsightsList({ insights, onHypothesisClick: _onHypothesisClick }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-surface-500 dark:text-surface-400">
        <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No insights extracted yet</p>
      </div>
    );
  }

  // Group insights by type
  const groupedInsights = insights.reduce((acc, enhanced) => {
    const type = enhanced.insight.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(enhanced);
    return acc;
  }, {} as Record<InsightType, EnhancedInsight[]>);

  // Order types by importance for the document
  const typeOrder: InsightType[] = [
    'key_point',
    'data_point',
    'market_insight',
    'competitive_intel',
    'opportunity',
    'risk_factor',
    'contradiction',
    'validation',
    'caveat',
    'recommendation',
  ];

  const orderedTypes = typeOrder.filter(type => groupedInsights[type]?.length > 0);

  return (
    <div className="space-y-6">
      {orderedTypes.map((type) => {
        const config = insightTypeConfig[type];
        const typeInsights = groupedInsights[type] || [];
        if (!config || typeInsights.length === 0) return null;

        return (
          <section key={type}>
            <h4 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${config.color}`}>
              {config.icon}
              {config.label}
            </h4>
            <ul className="space-y-3 ml-1">
              {typeInsights.map((enhanced, idx) => {
                const { insight, actionItems } = enhanced;
                return (
                  <li key={idx} className="flex items-start gap-3">
                    <span className={`mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0 ${config.color.replace('text-', 'bg-')}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-800 dark:text-surface-200 leading-relaxed">
                        {insight.content}
                      </p>

                      {/* Quote if available */}
                      {insight.quote && (
                        <blockquote className="mt-2 pl-3 border-l-2 border-surface-300 dark:border-surface-600 italic text-xs text-surface-600 dark:text-surface-400">
                          "{insight.quote}"
                        </blockquote>
                      )}

                      {/* Metadata line */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-surface-500 dark:text-surface-400">
                        {insight.speaker && insight.speaker !== 'Unknown' && (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium">{insight.speaker}</span>
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getImportanceBadge(insight.importance)}`}>
                          {insight.importance}
                        </span>
                        {insight.sentiment && insight.sentiment !== 'neutral' && (
                          <span className={insight.sentiment === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {insight.sentiment}
                          </span>
                        )}
                      </div>

                      {/* Action items if available */}
                      {actionItems && actionItems.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-primary-300 dark:border-primary-700">
                          <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
                            Action Items:
                          </p>
                          <ul className="text-xs text-surface-600 dark:text-surface-400 space-y-0.5">
                            {actionItems.map((item, actionIdx) => (
                              <li key={actionIdx} className="flex items-start gap-1">
                                <span className="text-primary-500">→</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
