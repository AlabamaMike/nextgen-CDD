import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useEngagements, useMetrics } from '../../hooks/useAPI.js';
import { useInputContext } from '../../context/InputContext.js';

interface MonitorTabProps {
  serverUrl: string;
  authToken?: string | undefined;
}

type ViewMode = 'select_engagement' | 'dashboard';

// ASCII Gauge Bar Component
function GaugeBar({
  label,
  value,
  max = 1,
  color,
  width = 20,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  width?: number;
}): React.ReactElement {
  const percentage = Math.min((value / max) * 100, 100);
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Box width={28}>
        <Text>{label}:</Text>
      </Box>
      <Text color={color}>
        {'█'.repeat(filled)}
      </Text>
      <Text color="gray">
        {'░'.repeat(empty)}
      </Text>
      <Text> {percentage.toFixed(1)}%</Text>
    </Box>
  );
}

// Sparkline Chart Component
function Sparkline({
  data,
  width = 40,
  color = 'cyan',
}: {
  data: number[];
  width?: number;
  color?: string;
}): React.ReactElement {
  if (data.length === 0) {
    return <Text color="gray">No history data</Text>;
  }

  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Sample data to fit width
  const sampleSize = Math.ceil(data.length / width);
  const sampledData: number[] = [];
  for (let i = 0; i < data.length; i += sampleSize) {
    const slice = data.slice(i, i + sampleSize);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    sampledData.push(avg);
  }

  const sparkline = sampledData
    .slice(-width)
    .map((v) => {
      const normalized = (v - min) / range;
      const charIndex = Math.min(Math.floor(normalized * chars.length), chars.length - 1);
      return chars[charIndex];
    })
    .join('');

  return (
    <Box>
      <Text color={color}>{sparkline}</Text>
      <Text color="gray"> ({min.toFixed(2)} - {max.toFixed(2)})</Text>
    </Box>
  );
}

// Quality Indicator Component
function QualityIndicator({
  label,
  value,
  thresholds,
}: {
  label: string;
  value: number;
  thresholds: { good: number; warning: number };
}): React.ReactElement {
  let color: string;
  let status: string;

  if (value >= thresholds.good) {
    color = 'green';
    status = 'Good';
  } else if (value >= thresholds.warning) {
    color = 'yellow';
    status = 'Fair';
  } else {
    color = 'red';
    status = 'Poor';
  }

  return (
    <Box>
      <Box width={28}>
        <Text>{label}:</Text>
      </Box>
      <Text color={color}>[{status}]</Text>
      <Text color="gray"> ({(value * 100).toFixed(0)}%)</Text>
    </Box>
  );
}

function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function MonitorTab({ serverUrl, authToken }: MonitorTabProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('select_engagement');
  const [selectedEngagementIndex, setSelectedEngagementIndex] = useState(0);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(5000);
  const [message, setMessage] = useState<string | null>(null);

  const { isInputActive } = useInputContext();

  const { engagements, loading: engLoading, error: engError } = useEngagements(serverUrl, authToken);
  const { metrics, history, loading: metricsLoading, error: metricsError, refresh, calculate } = useMetrics(
    serverUrl,
    authToken,
    selectedEngagementId,
    'overall_confidence'
  );

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !selectedEngagementId) return;

    const interval = setInterval(() => {
      void refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedEngagementId, refreshInterval, refresh]);

  // Handle calculate
  const handleCalculate = async () => {
    try {
      await calculate();
      setMessage('Metrics calculated successfully');
    } catch {
      setMessage('Failed to calculate metrics');
    }
  };

  // Keyboard input
  useInput((input, key) => {
    if (isInputActive) return;

    // Clear message on any input
    if (message) setMessage(null);

    if (viewMode === 'select_engagement') {
      if (key.upArrow && selectedEngagementIndex > 0) {
        setSelectedEngagementIndex(selectedEngagementIndex - 1);
      }
      if (key.downArrow && selectedEngagementIndex < engagements.length - 1) {
        setSelectedEngagementIndex(selectedEngagementIndex + 1);
      }
      if (key.return && engagements[selectedEngagementIndex]) {
        setSelectedEngagementId(engagements[selectedEngagementIndex]!.id);
        setViewMode('dashboard');
      }
    } else if (viewMode === 'dashboard') {
      if (input === 'r' || input === 'R') {
        void refresh();
      }
      if (input === 'c' || input === 'C') {
        void handleCalculate();
      }
      if (input === 'a' || input === 'A') {
        setAutoRefresh(!autoRefresh);
      }
      if (input === 'b' || input === 'B' || key.escape) {
        setViewMode('select_engagement');
        setSelectedEngagementId(null);
      }
    }
  });

  // Loading state
  if (engLoading) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Loading...</Text>
      </Box>
    );
  }

  // Error state
  if (engError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {engError}</Text>
      </Box>
    );
  }

  // Select engagement view
  if (viewMode === 'select_engagement') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Research Quality Monitor</Text>
        <Text color="gray">Track research quality metrics in real-time</Text>
        <Text>{''}</Text>

        {engagements.length === 0 ? (
          <Text color="yellow">No engagements found. Create one first!</Text>
        ) : (
          engagements.map((eng, index) => (
            <Box key={eng.id}>
              <Text color={index === selectedEngagementIndex ? 'cyan' : 'white'}>
                {index === selectedEngagementIndex ? '> ' : '  '}
                {eng.name} ({eng.target.name}) - {eng.status}
              </Text>
            </Box>
          ))
        )}

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[^v] Navigate  [Enter] Select</Text>
        </Box>
      </Box>
    );
  }

  // Dashboard view
  const selectedEng = engagements.find(eng => eng.id === selectedEngagementId);

  if (metricsError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {metricsError}</Text>
        <Text color="gray">Press B to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Research Quality Dashboard</Text>
        <Text color="gray"> - {selectedEng?.name}</Text>
        {autoRefresh && <Text color="blue"> (auto-refresh: {refreshInterval / 1000}s)</Text>}
        {metricsLoading && <Text color="yellow"> refreshing...</Text>}
      </Box>

      {/* Message */}
      {message && (
        <Box marginBottom={1}>
          <Text color={message.startsWith('Failed') ? 'red' : 'green'}>{message}</Text>
        </Box>
      )}

      {metrics ? (
        <>
          {/* Gauge Section */}
          <Box flexDirection="column" marginY={1}>
            <Text bold>Quality Metrics</Text>
            <Box flexDirection="column" marginTop={1}>
              <GaugeBar
                label="Evidence Credibility"
                value={metrics.evidenceCredibilityAvg}
                color="green"
              />
              <GaugeBar
                label="Source Diversity"
                value={metrics.sourceDiversityScore}
                color="blue"
              />
              <GaugeBar
                label="Hypothesis Coverage"
                value={metrics.hypothesisCoverage}
                color="yellow"
              />
              <GaugeBar
                label="Contradiction Resolution"
                value={metrics.contradictionResolutionRate}
                color="magenta"
              />
              <GaugeBar
                label="Overall Confidence"
                value={metrics.overallConfidence}
                color="cyan"
              />
            </Box>
          </Box>

          {/* Trend Section */}
          <Box flexDirection="column" marginY={1}>
            <Text bold>Confidence Trend</Text>
            <Box marginTop={1}>
              <Sparkline data={history.map(h => h.value).reverse()} />
            </Box>
          </Box>

          {/* Quality Indicators */}
          <Box flexDirection="column" marginY={1}>
            <Text bold>Quality Assessment</Text>
            <Box flexDirection="column" marginTop={1}>
              <QualityIndicator
                label="Evidence Quality"
                value={metrics.evidenceCredibilityAvg}
                thresholds={{ good: 0.7, warning: 0.4 }}
              />
              <QualityIndicator
                label="Research Diversity"
                value={metrics.sourceDiversityScore}
                thresholds={{ good: 0.6, warning: 0.3 }}
              />
              <QualityIndicator
                label="Thesis Validation"
                value={metrics.hypothesisCoverage}
                thresholds={{ good: 0.8, warning: 0.5 }}
              />
            </Box>
          </Box>

          {/* Last Updated */}
          <Box marginTop={1}>
            <Text color="gray">Last updated: {formatLastUpdated(metrics.lastUpdated)}</Text>
          </Box>
        </>
      ) : (
        <Box marginY={1}>
          <Text color="yellow">
            No metrics data available. Press C to calculate metrics.
          </Text>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Text color="gray">
          [R] Refresh  [C] Calculate  [A] Auto-refresh ({autoRefresh ? 'ON' : 'OFF'})  [B] Back
        </Text>
      </Box>
    </Box>
  );
}
