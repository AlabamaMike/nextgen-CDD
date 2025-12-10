import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useEngagements, useStressTests } from '../../hooks/useAPI.js';
import { useInputContext } from '../../context/InputContext.js';
import { ThesisValidatorClient } from '../../api/client.js';
import type { StressTestIntensity, StressTestStatus } from '../../types/api.js';

interface StressTestTabProps {
  serverUrl: string;
  authToken?: string | undefined;
}

type ViewMode = 'select_engagement' | 'list' | 'detail' | 'configure';

function getStatusColor(status: StressTestStatus): string {
  switch (status) {
    case 'pending': return 'yellow';
    case 'running': return 'blue';
    case 'completed': return 'green';
    case 'failed': return 'red';
  }
}

function getStatusIcon(status: StressTestStatus): string {
  switch (status) {
    case 'pending': return '[.]';
    case 'running': return '[~]';
    case 'completed': return '[+]';
    case 'failed': return '[X]';
  }
}

function getIntensityColor(intensity: StressTestIntensity): string {
  switch (intensity) {
    case 'light': return 'green';
    case 'moderate': return 'yellow';
    case 'aggressive': return 'red';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return 'N/A';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const durationMs = end - start;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function StressTestTab({ serverUrl, authToken }: StressTestTabProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('select_engagement');
  const [selectedEngagementIndex, setSelectedEngagementIndex] = useState(0);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  // Configuration state
  const [configIntensity, setConfigIntensity] = useState<StressTestIntensity>('moderate');

  // Polling ref for running tests (use ref to avoid render loops)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { isInputActive } = useInputContext();

  const { engagements, loading: engLoading, error: engError } = useEngagements(serverUrl, authToken);
  const { stressTests, stats, loading: stLoading, error: stError, refresh } = useStressTests(
    serverUrl,
    authToken,
    selectedEngagementId
  );

  const selectedTest = stressTests[selectedIndex];

  // Memoize refresh to prevent dependency changes
  const stableRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  // Poll for updates when there are running tests
  useEffect(() => {
    const hasRunningTests = stressTests.some(t => t.status === 'running' || t.status === 'pending');

    if (hasRunningTests && selectedEngagementId) {
      // Only start polling if not already active
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(stableRefresh, 3000);
      }
    } else {
      // Stop polling when no running tests
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [stressTests, selectedEngagementId, stableRefresh]);

  // Start a stress test
  const handleStartTest = async () => {
    if (!selectedEngagementId) return;

    try {
      const client = new ThesisValidatorClient(serverUrl, authToken);
      const result = await client.startStressTest(selectedEngagementId, {
        intensity: configIntensity,
      });
      setMessage(`Stress test started: ${result.id}`);
      setViewMode('list');
      await refresh();
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Delete a stress test
  const handleDeleteTest = async () => {
    if (!selectedTest || !selectedEngagementId) return;
    if (selectedTest.status === 'running') {
      setMessage('Cannot delete a running test');
      return;
    }

    try {
      const client = new ThesisValidatorClient(serverUrl, authToken);
      await client.deleteStressTest(selectedEngagementId, selectedTest.id);
      setMessage('Test deleted');
      setSelectedIndex(Math.max(0, selectedIndex - 1));
      await refresh();
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
        setViewMode('list');
        setSelectedIndex(0);
      }
    } else if (viewMode === 'list') {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < stressTests.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.return && selectedTest) {
        setViewMode('detail');
      }
      if (input === 'n' || input === 'N') {
        setViewMode('configure');
      }
      if (input === 'r' || input === 'R') {
        void refresh();
      }
      if (input === 'b' || input === 'B' || key.escape) {
        setViewMode('select_engagement');
        setSelectedEngagementId(null);
        setSelectedIndex(0);
      }
    } else if (viewMode === 'detail') {
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('list');
      }
      if ((input === 'd' || input === 'D') && selectedTest?.status !== 'running') {
        void handleDeleteTest();
      }
    } else if (viewMode === 'configure') {
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('list');
      }
      if (key.return) {
        void handleStartTest();
      }
      // Toggle intensity with arrow keys
      if (key.leftArrow || key.rightArrow) {
        const intensities: StressTestIntensity[] = ['light', 'moderate', 'aggressive'];
        const currentIdx = intensities.indexOf(configIntensity);
        if (key.leftArrow && currentIdx > 0) {
          setConfigIntensity(intensities[currentIdx - 1]!);
        }
        if (key.rightArrow && currentIdx < intensities.length - 1) {
          setConfigIntensity(intensities[currentIdx + 1]!);
        }
      }
      // Quick selection
      if (input === '1') setConfigIntensity('light');
      if (input === '2') setConfigIntensity('moderate');
      if (input === '3') setConfigIntensity('aggressive');
    }
  });

  // Loading state
  if (engLoading || stLoading) {
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

  if (stError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {stError}</Text>
        <Text color="gray">Press B to go back</Text>
      </Box>
    );
  }

  // Select engagement view
  if (viewMode === 'select_engagement') {
    return (
      <Box flexDirection="column">
        <Text bold color="red">Stress Testing</Text>
        <Text color="gray">Challenge your investment thesis</Text>
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

  // Configure new stress test
  if (viewMode === 'configure') {
    return (
      <Box flexDirection="column">
        <Text bold color="red">Configure Stress Test</Text>
        <Text color="gray">Press Enter to start, ESC to cancel</Text>
        <Text>{''}</Text>

        <Box marginY={1} flexDirection="column">
          <Text bold>Intensity Level:</Text>
          <Box marginTop={1}>
            <Text color={configIntensity === 'light' ? 'green' : 'gray'} bold={configIntensity === 'light'}>
              [1] Light
            </Text>
            <Text>  </Text>
            <Text color={configIntensity === 'moderate' ? 'yellow' : 'gray'} bold={configIntensity === 'moderate'}>
              [2] Moderate
            </Text>
            <Text>  </Text>
            <Text color={configIntensity === 'aggressive' ? 'red' : 'gray'} bold={configIntensity === 'aggressive'}>
              [3] Aggressive
            </Text>
          </Box>

          <Box marginTop={2}>
            <Text color="gray">
              {configIntensity === 'light' && 'Light: Basic devil\'s advocate challenges'}
              {configIntensity === 'moderate' && 'Moderate: Thorough questioning of key assumptions'}
              {configIntensity === 'aggressive' && 'Aggressive: Exhaustive bear case analysis'}
            </Text>
          </Box>
        </Box>

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[1-3] Select Intensity  [&lt;&gt;] Toggle  [Enter] Start  [ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Detail view
  if (viewMode === 'detail' && selectedTest) {
    const t = selectedTest;
    return (
      <Box flexDirection="column">
        <Text bold color="red">Stress Test Details</Text>
        <Text color="gray">Press B or ESC to go back</Text>
        <Text>{''}</Text>

        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text bold>ID: </Text>
            <Text>{t.id}</Text>
          </Box>
          <Box>
            <Text bold>Status: </Text>
            <Text color={getStatusColor(t.status)}>
              {getStatusIcon(t.status)} {t.status.toUpperCase()}
            </Text>
          </Box>
          <Box>
            <Text bold>Intensity: </Text>
            <Text color={getIntensityColor(t.intensity)}>{t.intensity.toUpperCase()}</Text>
          </Box>
          <Box>
            <Text bold>Started: </Text>
            <Text>{formatDate(t.startedAt)}</Text>
          </Box>
          <Box>
            <Text bold>Duration: </Text>
            <Text>{formatDuration(t.startedAt, t.completedAt)}</Text>
          </Box>

          {t.status === 'running' && (
            <Box marginTop={1}>
              <Text color="blue">Test is running... (auto-refreshing)</Text>
            </Box>
          )}

          {t.results && (
            <>
              <Text>{''}</Text>
              <Text bold color="cyan">Results:</Text>
              <Box marginLeft={2} flexDirection="column">
                <Text>Contradictions Found: <Text color="red">{t.results.contradictionsFound}</Text></Text>
                <Text>Hypotheses Challenged: <Text color="yellow">{t.results.hypothesesChallenged}</Text></Text>
                <Text>Bear Case Strength: <Text color={t.results.bearCaseStrength > 0.5 ? 'red' : 'green'}>{(t.results.bearCaseStrength * 100).toFixed(0)}%</Text></Text>
                {t.results.summary && (
                  <>
                    <Text>{''}</Text>
                    <Text bold>Summary:</Text>
                    <Text wrap="wrap">{t.results.summary}</Text>
                  </>
                )}
                {t.results.recommendations && t.results.recommendations.length > 0 && (
                  <>
                    <Text>{''}</Text>
                    <Text bold>Recommendations:</Text>
                    {t.results.recommendations.map((rec, i) => (
                      <Text key={i}> - {rec}</Text>
                    ))}
                  </>
                )}
              </Box>
            </>
          )}

          {t.errorMessage && (
            <>
              <Text>{''}</Text>
              <Text bold color="red">Error:</Text>
              <Text color="red">{t.errorMessage}</Text>
            </>
          )}
        </Box>

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">
            [B/ESC] Back
            {t.status !== 'running' && '  [D] Delete'}
          </Text>
        </Box>
      </Box>
    );
  }

  // List view
  const selectedEng = engagements.find(eng => eng.id === selectedEngagementId);
  const hasRunningTest = stressTests.some(t => t.status === 'running' || t.status === 'pending');

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="red">Stress Tests</Text>
        <Text color="gray"> - {selectedEng?.name}</Text>
        {hasRunningTest && <Text color="blue"> (auto-refreshing)</Text>}
      </Box>

      {/* Message */}
      {message && (
        <Box marginBottom={1}>
          <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>
        </Box>
      )}

      {/* Stats summary */}
      {stats && (
        <Box marginBottom={1}>
          <Text color="gray">
            Total Runs: {stats.totalRuns} |
            Avg Contradictions: {stats.avgContradictionsFound?.toFixed(1) ?? '0'} |
            Last Run: {stats.lastRunAt ? formatDate(stats.lastRunAt) : 'Never'}
          </Text>
        </Box>
      )}

      {stressTests.length === 0 ? (
        <Box marginY={1}>
          <Text color="yellow">
            No stress tests found. Press N to start a new stress test.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          {/* Table header */}
          <Box marginBottom={1}>
            <Box width={12}><Text bold>Status</Text></Box>
            <Box width={12}><Text bold>Intensity</Text></Box>
            <Box width={20}><Text bold>Started</Text></Box>
            <Box flexGrow={1}><Text bold>Results</Text></Box>
          </Box>
          <Text color="gray">{'─'.repeat(80)}</Text>

          {stressTests.map((t, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={t.id}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '>' : ' '}
                </Text>
                <Box width={11}>
                  <Text color={getStatusColor(t.status)}>
                    {getStatusIcon(t.status)}{t.status.substring(0, 8)}
                  </Text>
                </Box>
                <Box width={12}>
                  <Text color={getIntensityColor(t.intensity)}>{t.intensity}</Text>
                </Box>
                <Box width={20}>
                  <Text>{formatDate(t.startedAt).substring(0, 18)}</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={isSelected ? 'cyan' : 'white'}>
                    {t.results
                      ? `${t.results.contradictionsFound} contradictions`
                      : t.errorMessage
                        ? 'Failed'
                        : t.status === 'running'
                          ? 'In progress...'
                          : 'Pending'}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Text color="gray">
          [^v] Navigate  [Enter] Details  [N] New Test  [R] Refresh  [B] Back
        </Text>
      </Box>
    </Box>
  );
}
