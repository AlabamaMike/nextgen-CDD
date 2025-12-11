/**
 * Modal for executing a skill with parameter inputs
 */
import { useState } from 'react';
import { X, Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useExecuteSkill } from '../../hooks/useSkills';
import type { Skill, SkillExecutionResult } from '../../types/api';

interface SkillExecuteModalProps {
  skill: Skill;
  engagementId?: string;
  hypothesisId?: string;
  onClose: () => void;
}

export function SkillExecuteModal({
  skill,
  engagementId,
  hypothesisId,
  onClose,
}: SkillExecuteModalProps) {
  const [parameters, setParameters] = useState<Record<string, unknown>>(() => {
    // Initialize with default values
    const defaults: Record<string, unknown> = {};
    skill.parameters.forEach((param) => {
      if (param.default !== undefined) {
        defaults[param.name] = param.default;
      } else if (param.type === 'boolean') {
        defaults[param.name] = false;
      } else if (param.type === 'number') {
        defaults[param.name] = 0;
      } else if (param.type === 'array') {
        defaults[param.name] = [];
      } else {
        defaults[param.name] = '';
      }
    });
    return defaults;
  });

  const [result, setResult] = useState<SkillExecutionResult | null>(null);

  const { mutate: execute, isPending } = useExecuteSkill(skill.id);

  const handleExecute = () => {
    execute(
      {
        parameters,
        context: {
          ...(engagementId && { engagementId }),
          ...(hypothesisId && { hypothesisId }),
        },
      },
      {
        onSuccess: (data) => setResult(data),
        onError: (error) => {
          setResult({
            success: false,
            output: String(error),
            executionTime: 0,
          });
        },
      }
    );
  };

  const updateParameter = (name: string, value: unknown) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
  };

  const renderParameterInput = (param: (typeof skill.parameters)[0]) => {
    const value = parameters[param.name];

    switch (param.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => updateParameter(param.name, e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-600"
            />
            <span className="text-sm text-surface-700 dark:text-surface-300">Enable</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) => updateParameter(param.name, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
          />
        );

      case 'array':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                updateParameter(param.name, JSON.parse(e.target.value));
              } catch {
                // Keep as-is if invalid JSON
              }
            }}
            placeholder="Enter JSON array..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white font-mono text-sm"
          />
        );

      default: // string
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Execute: {skill.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {result ? (
            // Results Display
            <div className="space-y-4">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {result.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {result.success ? 'Execution Successful' : 'Execution Failed'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
                <span>Time: {result.executionTime.toFixed(2)}s</span>
                {result.tokensUsed && <span>Tokens: {result.tokensUsed}</span>}
              </div>

              <div>
                <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">
                  Output
                </h3>
                <pre className="p-4 rounded-lg bg-surface-100 dark:bg-surface-900 text-sm overflow-x-auto">
                  {typeof result.output === 'string'
                    ? result.output
                    : JSON.stringify(result.output, null, 2)}
                </pre>
              </div>

              <button
                onClick={() => setResult(null)}
                className="w-full px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 font-medium hover:bg-surface-50 dark:hover:bg-surface-700"
              >
                Run Again
              </button>
            </div>
          ) : (
            // Parameter Form
            <div className="space-y-4">
              {skill.parameters.length === 0 ? (
                <p className="text-sm text-surface-500 dark:text-surface-400 text-center py-4">
                  This skill has no parameters.
                </p>
              ) : (
                skill.parameters.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
                      {param.description}
                    </p>
                    {renderParameterInput(param)}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="p-4 border-t border-surface-200 dark:border-surface-700">
            <button
              onClick={handleExecute}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 text-white disabled:text-surface-500 font-medium transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Execute
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
