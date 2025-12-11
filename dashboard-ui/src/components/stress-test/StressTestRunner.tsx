/**
 * Component for running stress tests with intensity selection
 */
import { useState } from 'react';
import { Play, AlertTriangle, Loader2, Zap, Shield, Flame } from 'lucide-react';
import type { StressTestIntensity } from '../../types/api';

interface StressTestRunnerProps {
  onRun: (intensity: StressTestIntensity) => void;
  isRunning?: boolean;
  hasActiveTest?: boolean;
}

const intensityOptions: Array<{
  value: StressTestIntensity;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Quick validation of core assumptions with minimal scenarios',
    icon: <Shield className="h-5 w-5" />,
    color: 'text-green-600 dark:text-green-400',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced testing covering major risk areas and edge cases',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Comprehensive stress testing with adversarial scenarios',
    icon: <Flame className="h-5 w-5" />,
    color: 'text-red-600 dark:text-red-400',
  },
];

export function StressTestRunner({ onRun, isRunning, hasActiveTest }: StressTestRunnerProps) {
  const [selectedIntensity, setSelectedIntensity] = useState<StressTestIntensity>('moderate');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRun = () => {
    if (selectedIntensity === 'aggressive') {
      setShowConfirm(true);
    } else {
      onRun(selectedIntensity);
    }
  };

  const handleConfirmRun = () => {
    setShowConfirm(false);
    onRun(selectedIntensity);
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
        Run Stress Test
      </h3>

      {hasActiveTest && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">A stress test is currently running</span>
          </div>
        </div>
      )}

      {/* Intensity Selection */}
      <div className="space-y-3 mb-4">
        <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
          Test Intensity
        </label>
        <div className="space-y-2">
          {intensityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedIntensity(option.value)}
              disabled={isRunning || hasActiveTest}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                selectedIntensity === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
              } ${isRunning || hasActiveTest ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className={option.color}>{option.icon}</span>
                <div className="flex-1">
                  <p className={`font-medium ${
                    selectedIntensity === option.value
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-surface-900 dark:text-white'
                  }`}>
                    {option.label}
                  </p>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    {option.description}
                  </p>
                </div>
                {selectedIntensity === option.value && (
                  <div className="h-4 w-4 rounded-full bg-primary-500 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={handleRun}
        disabled={isRunning || hasActiveTest}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 text-white disabled:text-surface-500 font-medium transition-colors"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Running Stress Test...
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            Run Stress Test
          </>
        )}
      </button>

      {/* Confirmation Modal for Aggressive */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-surface-800 p-6 rounded-lg shadow-xl max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                Confirm Aggressive Test
              </h3>
            </div>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
              Aggressive stress testing will run comprehensive adversarial scenarios that may take
              longer to complete and consume more resources. Are you sure you want to proceed?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmRun}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Run Aggressive Test
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 font-medium"
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
