# Research Observability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance TUI research progress display with visual progress bar, phase indicator, elapsed time with spinner, inline milestone stats, and collapsible event log.

**Architecture:** Create a new `ResearchProgressDisplay` component that receives progress events and job status as props. It manages its own animation state (spinner, elapsed time) via React intervals. The component will replace the current basic progress display in both `ResearchTab.tsx` and `EngagementResearch.tsx`.

**Tech Stack:** React 19, Ink (React for CLI), TypeScript

---

## Task 1: Create ResearchProgressDisplay Component - Types and Constants

**Files:**
- Create: `tui-client/src/components/research/ResearchProgressDisplay.tsx`

**Step 1: Create the file with types and constants**

```typescript
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
```

**Step 2: Verify file was created**

Run: `ls -la tui-client/src/components/research/ResearchProgressDisplay.tsx`
Expected: File exists

---

## Task 2: Implement ResearchProgressDisplay Component - Main Logic

**Files:**
- Modify: `tui-client/src/components/research/ResearchProgressDisplay.tsx`

**Step 1: Add the main component implementation**

Append to the file after the helper functions:

```typescript
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
  const startTimeRef = useRef<number>(Date.now());
  const spinnerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      // Reset start time when job starts running
      startTimeRef.current = Date.now();

      // Spinner animation - 100ms interval
      spinnerIntervalRef.current = setInterval(() => {
        setSpinnerIndex(prev => (prev + 1) % SPINNER_FRAMES.length);
      }, 100);

      // Elapsed time - 1 second interval
      timerIntervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 1000);
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
  }, [status]);

  // Keyboard input for log toggle and cancel
  useInput((input, key) => {
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
    : '○';

  const statusColor = status === 'running'
    ? 'yellow'
    : status === 'completed'
    ? 'green'
    : status === 'failed'
    ? 'red'
    : 'gray';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Research in Progress: {engagementName}</Text>
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
```

**Step 2: Verify TypeScript compiles**

Run: `cd tui-client && npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add tui-client/src/components/research/ResearchProgressDisplay.tsx
git commit -m "feat(tui): add ResearchProgressDisplay component with progress bar, spinner, and milestones"
```

---

## Task 3: Integrate ResearchProgressDisplay into ResearchTab

**Files:**
- Modify: `tui-client/src/components/tabs/ResearchTab.tsx`

**Step 1: Add import for new component**

At line 6, add the import:

```typescript
import { ResearchProgressDisplay } from '../research/ResearchProgressDisplay.js';
```

**Step 2: Replace the running view (lines 252-285)**

Find the existing `if (view === 'running')` block and replace with:

```typescript
  if (view === 'running') {
    return (
      <Box flexDirection="column">
        <ResearchProgressDisplay
          jobId={job?.id ?? ''}
          status={job?.status ?? 'queued'}
          progressEvents={progressEvents}
          engagementName={selectedEngagement?.name ?? 'Unknown'}
        />
      </Box>
    );
  }
```

**Step 3: Verify TypeScript compiles**

Run: `cd tui-client && npm run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add tui-client/src/components/tabs/ResearchTab.tsx
git commit -m "feat(tui): integrate ResearchProgressDisplay into ResearchTab"
```

---

## Task 4: Integrate ResearchProgressDisplay into EngagementResearch

**Files:**
- Modify: `tui-client/src/components/research/EngagementResearch.tsx`

**Step 1: Add import for new component**

At line 7, add the import:

```typescript
import { ResearchProgressDisplay } from './ResearchProgressDisplay.js';
```

**Step 2: Replace the running view (lines 241-289)**

Find the existing `if (view === 'running')` block and replace with:

```typescript
  // Running view
  if (view === 'running') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <ResearchProgressDisplay
          jobId={job?.id ?? ''}
          status={job?.status ?? 'queued'}
          progressEvents={progressEvents}
          engagementName={engagement.name}
        />
      </Box>
    );
  }
```

**Step 3: Verify TypeScript compiles**

Run: `cd tui-client && npm run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add tui-client/src/components/research/EngagementResearch.tsx
git commit -m "feat(tui): integrate ResearchProgressDisplay into EngagementResearch"
```

---

## Task 5: Update HelpView with Research Progress Keyboard Shortcuts

**Files:**
- Modify: `tui-client/src/components/HelpView.tsx`

**Step 1: Update the research help section**

Find the `research:` section in `HELP_CONTENT` (around line 57) and update to include the new shortcuts:

```typescript
  research: [
    {
      title: 'Research Tab',
      items: [
        { key: 'S', description: 'Edit thesis statement' },
        { key: 'R', description: 'Start/Run research workflow' },
        { key: 'Enter', description: 'Select engagement for research' },
        { key: 'L', description: 'Toggle event log (during research)' },
      ],
    },
  ],
```

**Step 2: Verify TypeScript compiles**

Run: `cd tui-client && npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add tui-client/src/components/HelpView.tsx
git commit -m "docs(tui): add L key shortcut to research help"
```

---

## Task 6: Build and Final Verification

**Files:**
- None (verification only)

**Step 1: Run full typecheck**

Run: `cd tui-client && npm run typecheck`
Expected: No errors

**Step 2: Run build**

Run: `cd tui-client && npm run build`
Expected: Build succeeds

**Step 3: Verify all files are properly formatted**

Run: `cd tui-client && ls -la dist/components/research/`
Expected: `ResearchProgressDisplay.js` exists in build output

**Step 4: Final commit if any uncommitted changes**

```bash
git status
# If clean, no action needed
# If changes, commit them
```

---

## Summary

This plan creates:
1. **ResearchProgressDisplay.tsx** - New component with:
   - Phase indicator (Phase X/Y: Label)
   - ASCII progress bar with percentage
   - Animated spinner (100ms interval)
   - Elapsed time counter (1s interval)
   - Inline milestone stats (hypotheses, evidence, contradictions)
   - Collapsible event log (L key toggle)

2. **ResearchTab.tsx** - Updated to use new component in running view

3. **EngagementResearch.tsx** - Updated to use new component in running view

4. **HelpView.tsx** - Updated with L key documentation

No backend changes required - uses existing WebSocket progress events.
