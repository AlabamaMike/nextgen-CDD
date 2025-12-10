# Research Workflow Observability Design

## Overview

Enhance the TUI client's research progress display to give users clear visibility into workflow execution. Address three user concerns:
1. "Is it working?" - Show continuous activity feedback
2. "Where are we?" - Display current phase and overall progress
3. "What's happening?" - Show milestone results as they complete

## Current State

The TUI currently shows:
- Job status text
- Latest event message and progress percentage
- Last 10 events as a simple text list

Users report insufficient feedback during long-running operations and difficulty understanding workflow progress.

## Design

### Visual Layout

```
┌─ Research in Progress ──────────────────────────────────────────┐
│                                                                 │
│  Phase 2/4: Gathering Evidence                                  │
│  [████████████████░░░░░░░░░░░░░░] 52%                          │
│                                                                 │
│  ⠋ Running for 1m 23s                                          │
│                                                                 │
│  ✓ 5 hypotheses  ✓ 12 evidence  ⋯ scanning sources...         │
│                                                                 │
│                                        [L] Show Log  [C] Cancel │
└─────────────────────────────────────────────────────────────────┘
```

### Key Elements

1. **Phase indicator**: "Phase X/Y: Phase Name" at top
2. **ASCII progress bar**: 30 characters wide using `█` (filled) and `░` (empty)
3. **Spinner + elapsed time**: Animated spinner with continuously updating elapsed time
4. **Milestone stats**: Inline display of completed work counts
5. **Collapsible event log**: Hidden by default, toggle with `L` key

## Technical Design

### Phase Mapping

```typescript
const RESEARCH_PHASES = [
  { id: 'hypothesis_generation', label: 'Building Hypotheses', order: 1 },
  { id: 'evidence_gathering', label: 'Gathering Evidence', order: 2 },
  { id: 'contradiction_detection', label: 'Finding Contradictions', order: 3 },
  { id: 'report_generation', label: 'Generating Report', order: 4 },
] as const;
```

### State Management

State tracked by the component:
- `currentPhase`: Derived from latest `phase_start` event
- `phaseProgress`: Percentage from event `progress` field
- `startTime`: Job start time for elapsed calculation
- `milestones`: Object with counts `{ hypotheses, evidence, contradictions }`
- `currentAction`: Latest action message
- `showLog`: Boolean for log visibility toggle

### Spinner Animation

```typescript
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
```

- 100ms interval cycles through frames
- Only animates while status is `running`
- Shows `✓` on success, `✗` on failure

### Elapsed Time Format

- Under 60 seconds: `Running for 45s`
- 1-59 minutes: `Running for 2m 15s`
- 60+ minutes: `Running for 1h 5m`

### Event Log (Collapsed by Default)

When expanded via `L` key:

```
┌─ Event Log (last 10) ────────────────────────────────────────────┐
│  12:34:15  phase_complete   Hypothesis generation complete       │
│  12:34:02  phase_start      Starting evidence gathering          │
│  12:33:45  status_update    Research job started                 │
└──────────────────────────────────────────────────────────────────┘
```

Color coding:
- `phase_start` → cyan
- `phase_complete` → green
- `status_update` → gray
- `error` → red

## File Changes

### New Component

`tui-client/src/components/research/ResearchProgressDisplay.tsx`
- Self-contained progress visualization
- Manages spinner/timer state internally
- Receives progress events and job status as props

### Modified Files

`tui-client/src/components/tabs/ResearchTab.tsx`
- Replace basic progress display with `ResearchProgressDisplay`
- Add `L` key handler for log toggle

`tui-client/src/components/research/EngagementResearch.tsx`
- Same integration as ResearchTab

### Props Interface

```typescript
interface ResearchProgressDisplayProps {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progressEvents: ProgressEvent[];
  onCancel?: () => void;
}
```

## Backend Changes

None required. Existing WebSocket events already contain:
- `progress` field for percentage
- `phase` field for current phase name
- `data` object with counts (hypotheses, evidence, contradictions)
- `message` field for human-readable status

## Success Criteria

- [ ] Progress bar displays with accurate percentage
- [ ] Phase indicator shows current phase and total count
- [ ] Spinner animates continuously while job is running
- [ ] Elapsed time updates every second
- [ ] Milestone stats update as phases complete
- [ ] Event log toggles with L key
- [ ] All existing functionality preserved
