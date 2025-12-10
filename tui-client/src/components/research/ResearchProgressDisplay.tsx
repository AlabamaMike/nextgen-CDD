import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ProgressEvent } from '../../types/api.js';

// Props interface
export interface ResearchProgressDisplayProps {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  progressEvents: ProgressEvent[];
  engagementName: string;
  onCancel?: () => void;
}

// Phase configuration
const RESEARCH_PHASES = [
  { id: 'hypothesis_generation', label: 'Building Hypotheses', order: 1 },
  { id: 'evidence_gathering', label: 'Gathering Evidence', order: 2 },
  { id: 'contradiction_detection', label: 'Finding Contradictions', order: 3 },
  { id: 'report_generation', label: 'Generating Report', order: 4 },
] as const;

type PhaseId = typeof RESEARCH_PHASES[number]['id'];

// Spinner frames for activity indicator
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Milestone tracking
interface Milestones {
  hypotheses: number;
  evidence: number;
  contradictions: number;
}

// Helper: format elapsed time
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Helper: get phase info by id
function getPhaseInfo(phaseId: string): { label: string; order: number } | null {
  const phase = RESEARCH_PHASES.find(p => p.id === phaseId);
  return phase ? { label: phase.label, order: phase.order } : null;
}

// Helper: build progress bar
function buildProgressBar(percentage: number, width: number = 30): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function ResearchProgressDisplay({
  jobId,
  status,
  progressEvents,
  engagementName,
  onCancel,
}: ResearchProgressDisplayProps): React.ReactElement {
  // Animation state
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const spinnerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate start time from first progress event or fallback to now
  const firstEventTimestamp = progressEvents[0]?.timestamp;
  const startTime = useMemo(() => {
    if (firstEventTimestamp !== undefined) {
      return firstEventTimestamp;
    }
    return Date.now();
  }, [firstEventTimestamp]);

  // Derive state from progress events
  const { currentPhase, phaseOrder, progress, milestones, currentAction } = useMemo(() => {
    let currentPhase: PhaseId | null = null;
    let phaseOrder = 0;
    let progress = 0;
    let currentAction = 'Initializing...';
    const milestones: Milestones = { hypotheses: 0, evidence: 0, contradictions: 0 };

    for (const event of progressEvents) {
      // Track current phase from phase_start events
      if (event.type === 'phase_start' && typeof event.data.phase === 'string') {
        currentPhase = event.data.phase as PhaseId;
        const info = getPhaseInfo(currentPhase);
        if (info) phaseOrder = info.order;
      }

      // Track progress percentage
      if (typeof event.data.progress === 'number') {
        progress = event.data.progress;
      }

      // Track current action message
      if (typeof event.data.message === 'string') {
        currentAction = event.data.message;
      }

      // Extract milestone counts from phase_complete events
      if (event.type === 'phase_complete') {
        if (typeof event.data.hypothesis_count === 'number') {
          milestones.hypotheses = event.data.hypothesis_count;
        }
        if (typeof event.data.evidence_count === 'number') {
          milestones.evidence = event.data.evidence_count;
        }
        if (typeof event.data.contradiction_count === 'number') {
          milestones.contradictions = event.data.contradiction_count;
        }
      }
    }

    return { currentPhase, phaseOrder, progress, milestones, currentAction };
  }, [progressEvents]);

  // Get phase label
  const phaseLabel = currentPhase ? getPhaseInfo(currentPhase)?.label ?? currentPhase : 'Starting';
  const totalPhases = RESEARCH_PHASES.length;

  // Spinner and timer animation
  useEffect(() => {
    if (status === 'running') {
      // Spinner animation - 100ms interval
      spinnerIntervalRef.current = setInterval(() => {
        setSpinnerIndex(prev => (prev + 1) % SPINNER_FRAMES.length);
      }, 100);

      // Elapsed time - 1 second interval, based on first event timestamp
      timerIntervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 1000);

      // Initialize elapsed time immediately
      setElapsedMs(Date.now() - startTime);
    }

    return () => {
      if (spinnerIntervalRef.current) {
        clearInterval(spinnerIntervalRef.current);
        spinnerIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [status, startTime]);

  // Keyboard input for log toggle and cancel
  useInput((input, _key) => {
    if (input === 'l' || input === 'L') {
      setShowLog(prev => !prev);
    }
    if ((input === 'c' || input === 'C') && onCancel) {
      onCancel();
    }
  });

  // Determine status indicator
  const statusIcon = status === 'running'
    ? SPINNER_FRAMES[spinnerIndex]
    : status === 'completed'
    ? '✓'
    : status === 'failed'
    ? '✗'
    : status === 'partial'
    ? '◐'
    : '○';

  const statusColor = status === 'running'
    ? 'yellow'
    : status === 'completed'
    ? 'green'
    : status === 'failed'
    ? 'red'
    : status === 'partial'
    ? 'yellow'
    : 'gray';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">Research in Progress: {engagementName}</Text>
        <Text color="gray">Job: {jobId.substring(0, 8)}</Text>
      </Box>

      {/* Phase indicator */}
      <Box marginBottom={1}>
        <Text bold>
          Phase {phaseOrder || 1}/{totalPhases}: {phaseLabel}
        </Text>
      </Box>

      {/* Progress bar */}
      <Box marginBottom={1}>
        <Text color="cyan">[{buildProgressBar(progress)}]</Text>
        <Text> {progress}%</Text>
      </Box>

      {/* Spinner and elapsed time */}
      <Box marginBottom={1}>
        <Text color={statusColor}>{statusIcon}</Text>
        <Text> Running for {formatElapsedTime(elapsedMs)}</Text>
      </Box>

      {/* Milestone stats */}
      <Box marginBottom={1}>
        {milestones.hypotheses > 0 && (
          <Text color="green">✓ {milestones.hypotheses} hypotheses  </Text>
        )}
        {milestones.evidence > 0 && (
          <Text color="green">✓ {milestones.evidence} evidence  </Text>
        )}
        {milestones.contradictions > 0 && (
          <Text color="yellow">✓ {milestones.contradictions} contradictions  </Text>
        )}
        <Text color="gray">⋯ {currentAction}</Text>
      </Box>

      {/* Collapsible event log */}
      {showLog && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="gray">Event Log (last 10)</Text>
          {progressEvents.slice(-10).reverse().map((event, idx) => {
            const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const typeColor = event.type === 'phase_start' ? 'cyan'
              : event.type === 'phase_complete' ? 'green'
              : event.type === 'error' ? 'red'
              : 'gray';
            return (
              <Box key={idx}>
                <Text color="gray">{time}  </Text>
                <Text color={typeColor}>{event.type.padEnd(14)}  </Text>
                <Text>{String(event.data.message ?? '').substring(0, 40)}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Keyboard hints */}
      <Box marginTop={1}>
        <Text color="gray">
          [L] {showLog ? 'Hide' : 'Show'} Log
          {onCancel && '  [C] Cancel'}
        </Text>
      </Box>
    </Box>
  );
}
