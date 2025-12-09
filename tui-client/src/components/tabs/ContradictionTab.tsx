import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useEngagements, useContradictions } from '../../hooks/useAPI.js';
import { useInputContext } from '../../context/InputContext.js';
import { ThesisValidatorClient } from '../../api/client.js';
import type { ContradictionSeverity, ContradictionStatus } from '../../types/api.js';

interface ContradictionTabProps {
  serverUrl: string;
  authToken?: string | undefined;
}

type ViewMode = 'select_engagement' | 'list' | 'detail' | 'resolve';
type StatusFilter = 'all' | ContradictionStatus;

function getSeverityColor(severity: ContradictionSeverity): string {
  switch (severity) {
    case 'high': return 'red';
    case 'medium': return 'yellow';
    case 'low': return 'green';
  }
}

function getSeverityIcon(severity: ContradictionSeverity): string {
  switch (severity) {
    case 'high': return '!!!';
    case 'medium': return '!!';
    case 'low': return '!';
  }
}

function getStatusColor(status: ContradictionStatus): string {
  switch (status) {
    case 'unresolved': return 'red';
    case 'critical': return 'magenta';
    case 'explained': return 'green';
    case 'dismissed': return 'gray';
  }
}

function getStatusIcon(status: ContradictionStatus): string {
  switch (status) {
    case 'unresolved': return '[?]';
    case 'critical': return '[!]';
    case 'explained': return '[+]';
    case 'dismissed': return '[-]';
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function ContradictionTab({ serverUrl, authToken }: ContradictionTabProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('select_engagement');
  const [selectedEngagementIndex, setSelectedEngagementIndex] = useState(0);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [resolutionType, setResolutionType] = useState<'explained' | 'dismissed'>('explained');
  const [message, setMessage] = useState<string | null>(null);

  const { isInputActive } = useInputContext();

  const { engagements, loading: engLoading, error: engError } = useEngagements(serverUrl, authToken);
  const { contradictions, stats, loading: contLoading, error: contError, refresh } = useContradictions(
    serverUrl,
    authToken,
    selectedEngagementId,
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  // Filter contradictions by status
  const filteredContradictions = statusFilter === 'all'
    ? contradictions
    : contradictions.filter(c => c.status === statusFilter);

  const selectedContradiction = filteredContradictions[selectedIndex];

  // Cycle through filters
  const cycleFilter = () => {
    const filters: StatusFilter[] = ['all', 'unresolved', 'critical', 'explained', 'dismissed'];
    const currentIdx = filters.indexOf(statusFilter);
    const nextIdx = (currentIdx + 1) % filters.length;
    setStatusFilter(filters[nextIdx]!);
    setSelectedIndex(0);
  };

  // Resolve contradiction
  const handleResolve = async () => {
    if (!selectedContradiction || !selectedEngagementId) return;

    try {
      const client = new ThesisValidatorClient(serverUrl, authToken);
      await client.resolveContradiction(selectedEngagementId, selectedContradiction.id, {
        status: resolutionType,
        resolutionNotes: `Marked as ${resolutionType} via TUI`,
      });
      setMessage(`Contradiction ${resolutionType}`);
      setViewMode('list');
      await refresh();
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Mark as critical
  const handleMarkCritical = async () => {
    if (!selectedContradiction || !selectedEngagementId) return;

    try {
      const client = new ThesisValidatorClient(serverUrl, authToken);
      await client.markContradictionCritical(selectedEngagementId, selectedContradiction.id);
      setMessage('Marked as critical');
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
      if (key.downArrow && selectedIndex < filteredContradictions.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.return && selectedContradiction) {
        setViewMode('detail');
      }
      if (input === 'f' || input === 'F') {
        cycleFilter();
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
      if ((input === 'e' || input === 'E') && selectedContradiction?.status === 'unresolved') {
        setResolutionType('explained');
        setViewMode('resolve');
      }
      if ((input === 'd' || input === 'D') && selectedContradiction?.status === 'unresolved') {
        setResolutionType('dismissed');
        setViewMode('resolve');
      }
      if ((input === 'c' || input === 'C') && selectedContradiction?.status === 'unresolved') {
        void handleMarkCritical();
      }
    } else if (viewMode === 'resolve') {
      if (key.escape || input === 'n' || input === 'N') {
        setViewMode('detail');
      }
      if (key.return || input === 'y' || input === 'Y') {
        void handleResolve();
      }
      if (key.leftArrow || key.rightArrow) {
        setResolutionType(resolutionType === 'explained' ? 'dismissed' : 'explained');
      }
    }
  });

  // Loading state
  if (engLoading || contLoading) {
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

  if (contError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {contError}</Text>
        <Text color="gray">Press B to go back</Text>
      </Box>
    );
  }

  // Select engagement view
  if (viewMode === 'select_engagement') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Select an Engagement</Text>
        <Text color="gray">View contradictions for a deal</Text>
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

  // Resolve confirmation view
  if (viewMode === 'resolve' && selectedContradiction) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Resolve Contradiction</Text>
        <Text color="gray">Press Y to confirm, N to cancel</Text>
        <Text>{''}</Text>

        <Box marginY={1} flexDirection="column">
          <Text>Contradiction: {truncate(selectedContradiction.description, 60)}</Text>
          <Text>{''}</Text>
          <Box>
            <Text>Resolution: </Text>
            <Text color={resolutionType === 'explained' ? 'green' : 'gray'} bold={resolutionType === 'explained'}>
              [E] Explained
            </Text>
            <Text>  </Text>
            <Text color={resolutionType === 'dismissed' ? 'yellow' : 'gray'} bold={resolutionType === 'dismissed'}>
              [D] Dismissed
            </Text>
          </Box>
        </Box>

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[Y] Confirm  [N] Cancel  [&lt;&gt;] Toggle</Text>
        </Box>
      </Box>
    );
  }

  // Detail view
  if (viewMode === 'detail' && selectedContradiction) {
    const c = selectedContradiction;
    const isUnresolved = c.status === 'unresolved' || c.status === 'critical';
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Contradiction Details</Text>
        <Text color="gray">Press B or ESC to go back</Text>
        <Text>{''}</Text>

        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text bold>ID: </Text>
            <Text>{c.id}</Text>
          </Box>
          <Box>
            <Text bold>Severity: </Text>
            <Text color={getSeverityColor(c.severity)}>
              {getSeverityIcon(c.severity)} {c.severity.toUpperCase()}
            </Text>
          </Box>
          <Box>
            <Text bold>Status: </Text>
            <Text color={getStatusColor(c.status)}>
              {getStatusIcon(c.status)} {c.status}
            </Text>
          </Box>
          {c.bearCaseTheme && (
            <Box>
              <Text bold>Bear Case Theme: </Text>
              <Text color="red">{c.bearCaseTheme}</Text>
            </Box>
          )}
          <Text>{''}</Text>
          <Text bold>Description:</Text>
          <Box marginLeft={2} marginTop={1}>
            <Text wrap="wrap">{c.description}</Text>
          </Box>
          {c.resolutionNotes && (
            <>
              <Text>{''}</Text>
              <Text bold>Resolution Notes:</Text>
              <Box marginLeft={2} marginTop={1}>
                <Text wrap="wrap" color="green">{c.resolutionNotes}</Text>
              </Box>
            </>
          )}
        </Box>

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">
            [B/ESC] Back
            {isUnresolved && '  [E] Mark Explained  [D] Dismiss  [C] Mark Critical'}
          </Text>
        </Box>
      </Box>
    );
  }

  // List view
  const selectedEng = engagements.find(eng => eng.id === selectedEngagementId);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Contradictions</Text>
        <Text color="gray"> - {selectedEng?.name} ({filteredContradictions.length} items)</Text>
        <Text color="yellow"> Filter: {statusFilter}</Text>
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
            Total: {stats.totalCount} |
            Unresolved: <Text color="red">{stats.unresolvedCount}</Text> |
            Critical: <Text color="magenta">{stats.criticalCount}</Text> |
            Resolution Rate: <Text color="green">{(stats.resolutionRate * 100).toFixed(0)}%</Text>
          </Text>
        </Box>
      )}

      {filteredContradictions.length === 0 ? (
        <Box marginY={1}>
          <Text color="yellow">
            {statusFilter === 'all'
              ? 'No contradictions found. Run a stress test to find contradictions.'
              : `No ${statusFilter} contradictions found. Press F to change filter.`}
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          {/* Table header */}
          <Box marginBottom={1}>
            <Box width={6}><Text bold>Sev.</Text></Box>
            <Box width={12}><Text bold>Status</Text></Box>
            <Box flexGrow={1}><Text bold>Description</Text></Box>
          </Box>
          <Text color="gray">{'─'.repeat(80)}</Text>

          {filteredContradictions.map((c, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={c.id}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '>' : ' '}
                </Text>
                <Box width={5}>
                  <Text color={getSeverityColor(c.severity)}>{getSeverityIcon(c.severity)}</Text>
                </Box>
                <Box width={12}>
                  <Text color={getStatusColor(c.status)}>
                    {getStatusIcon(c.status)}{c.status.substring(0, 8)}
                  </Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={isSelected ? 'cyan' : 'white'}>
                    {truncate(c.description, 55)}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Text color="gray">
          [^v] Navigate  [Enter] Details  [F] Filter ({statusFilter})  [R] Refresh  [B] Back
        </Text>
      </Box>
    </Box>
  );
}
