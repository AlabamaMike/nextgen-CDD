/**
 * Display component for stress test results
 */
import { AlertTriangle, CheckCircle, AlertOctagon, Shield, TrendingDown } from 'lucide-react';
import type { StressTest, StressTestResults as StressTestResultsType } from '../../types/api';

interface StressTestResultsProps {
  stressTest: StressTest;
}

const assessmentConfig = {
  robust: {
    label: 'Robust',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: <CheckCircle className="h-5 w-5" />,
    description: 'Thesis withstands stress testing well',
  },
  moderate: {
    label: 'Moderate',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    icon: <AlertTriangle className="h-5 w-5" />,
    description: 'Some vulnerabilities identified',
  },
  vulnerable: {
    label: 'Vulnerable',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    icon: <AlertOctagon className="h-5 w-5" />,
    description: 'Significant weaknesses found',
  },
  critical: {
    label: 'Critical',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: <AlertOctagon className="h-5 w-5" />,
    description: 'Major thesis flaws detected',
  },
};

const impactColors = {
  low: 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const severityColors = {
  low: 'border-surface-300 dark:border-surface-600',
  medium: 'border-yellow-400 dark:border-yellow-600',
  high: 'border-red-400 dark:border-red-600',
};

export function StressTestResults({ stressTest }: StressTestResultsProps) {
  const results = stressTest.results as StressTestResultsType | null;

  if (!results) {
    return (
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-6">
        <div className="flex flex-col items-center justify-center text-surface-500 dark:text-surface-400 py-8">
          <Shield className="h-12 w-12 mb-3 opacity-50" />
          <p>No results available</p>
          <p className="text-sm">Run a stress test to see results</p>
        </div>
      </div>
    );
  }

  const assessment = assessmentConfig[results.overallAssessment];
  const riskScore = stressTest.overallRiskScore ?? 0;

  return (
    <div className="space-y-4">
      {/* Overall Assessment */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            Overall Assessment
          </h3>
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${assessment.color}`}>
            {assessment.icon}
            {assessment.label}
          </span>
        </div>

        {/* Risk Score Gauge */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-surface-600 dark:text-surface-400">Risk Score</span>
            <span className="font-semibold text-surface-900 dark:text-white">{riskScore}/100</span>
          </div>
          <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                riskScore < 30
                  ? 'bg-green-500'
                  : riskScore < 50
                  ? 'bg-yellow-500'
                  : riskScore < 70
                  ? 'bg-orange-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </div>

        <p className="text-sm text-surface-600 dark:text-surface-400">{assessment.description}</p>

        {/* Summary */}
        <div className="mt-4 p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
          <p className="text-sm text-surface-700 dark:text-surface-300">{results.summary}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {stressTest.scenariosRun}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Scenarios Run</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stressTest.vulnerabilitiesFound}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">Vulnerabilities</p>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      {results.scenarios.length > 0 && (
        <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
          <h3 className="text-md font-semibold text-surface-900 dark:text-white mb-3">
            Test Scenarios ({results.scenarios.length})
          </h3>
          <div className="space-y-3">
            {results.scenarios.map((scenario, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-surface-200 dark:border-surface-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-surface-900 dark:text-white">{scenario.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${impactColors[scenario.impact]}`}>
                    {scenario.impact.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">
                  {scenario.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                  <TrendingDown className="h-3 w-3" />
                  <span>Likelihood: {Math.round(scenario.likelihood * 100)}%</span>
                </div>
                {scenario.findings.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                      Findings:
                    </p>
                    <ul className="text-xs text-surface-600 dark:text-surface-400 list-disc list-inside">
                      {scenario.findings.map((finding, fIdx) => (
                        <li key={fIdx}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vulnerabilities */}
      {results.vulnerabilities.length > 0 && (
        <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
          <h3 className="text-md font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Vulnerabilities ({results.vulnerabilities.length})
          </h3>
          <div className="space-y-3">
            {results.vulnerabilities.map((vuln, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border-l-4 bg-surface-50 dark:bg-surface-700/50 ${severityColors[vuln.severity]}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-surface-900 dark:text-white text-sm">
                    {vuln.hypothesis}
                  </p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    vuln.severity === 'high'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : vuln.severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-surface-100 text-surface-700 dark:bg-surface-600 dark:text-surface-300'
                  }`}>
                    {vuln.severity}
                  </span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">
                  {vuln.weakness}
                </p>
                {vuln.mitigation && (
                  <div className="mt-2 p-2 rounded bg-green-50 dark:bg-green-900/20">
                    <p className="text-xs text-green-700 dark:text-green-400">
                      <span className="font-medium">Mitigation:</span> {vuln.mitigation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
