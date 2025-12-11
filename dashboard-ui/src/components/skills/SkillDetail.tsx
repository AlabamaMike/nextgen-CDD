/**
 * Detail view for a selected skill
 */
import { X, Play, Code, Tag, CheckCircle, BarChart2 } from 'lucide-react';
import type { Skill, SkillCategory } from '../../types/api';

interface SkillDetailProps {
  skill: Skill;
  onExecute: () => void;
  onClose: () => void;
}

const categoryLabels: Record<SkillCategory, string> = {
  market_sizing: 'Market Sizing',
  competitive: 'Competitive',
  financial: 'Financial',
  risk: 'Risk',
  operational: 'Operational',
  regulatory: 'Regulatory',
  customer: 'Customer',
  technology: 'Technology',
  general: 'General',
};

const typeColors: Record<string, string> = {
  string: 'text-green-600 dark:text-green-400',
  number: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-purple-600 dark:text-purple-400',
  array: 'text-orange-600 dark:text-orange-400',
};

export function SkillDetail({ skill, onExecute, onClose }: SkillDetailProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
            {skill.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-surface-500 dark:text-surface-400">
              v{skill.version}
            </span>
            <span className="text-surface-300 dark:text-surface-600">•</span>
            <span className="inline-flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
              <Tag className="h-3 w-3" />
              {categoryLabels[skill.category]}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
            Description
          </h3>
          <p className="text-surface-700 dark:text-surface-300">
            {skill.description}
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={`h-5 w-5 ${
                skill.successRate >= 0.9
                  ? 'text-green-500'
                  : skill.successRate >= 0.7
                  ? 'text-yellow-500'
                  : 'text-red-500'
              }`} />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Success Rate
              </span>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {Math.round(skill.successRate * 100)}%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Usage Count
              </span>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {skill.usageCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Parameters */}
        {skill.parameters.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-3 flex items-center gap-2">
              <Code className="h-4 w-4" />
              Parameters ({skill.parameters.length})
            </h3>
            <div className="space-y-3">
              {skill.parameters.map((param) => (
                <div
                  key={param.name}
                  className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold text-surface-900 dark:text-white">
                      {param.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${typeColors[param.type] ?? 'text-surface-500'}`}>
                        {param.type}
                      </span>
                      {param.required && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          required
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    {param.description}
                  </p>
                  {param.default !== undefined && (
                    <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                      Default: <code className="bg-surface-100 dark:bg-surface-700 px-1 rounded">{JSON.stringify(param.default)}</code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Implementation (if available) */}
        {skill.implementation && (
          <div>
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
              Implementation
            </h3>
            <pre className="p-4 rounded-lg bg-surface-900 dark:bg-surface-950 text-sm text-surface-100 overflow-x-auto">
              <code>{skill.implementation}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Execute Button */}
      <div className="p-4 border-t border-surface-200 dark:border-surface-700">
        <button
          onClick={onExecute}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
        >
          <Play className="h-5 w-5" />
          Execute Skill
        </button>
      </div>
    </div>
  );
}
