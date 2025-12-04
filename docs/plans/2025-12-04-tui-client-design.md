# TUI Client Design

**Date:** 2025-12-04
**Status:** Design Complete
**Type:** Full CLI Alternative to Web UI

## Overview

A standalone Terminal User Interface (TUI) client for the Thesis Validator application, providing a complete command-line alternative to the web dashboard. Built with React for terminals (ink), it offers fast keyboard-driven navigation for power users while maintaining full feature parity with the web UI.

## Architecture

### Technology Stack

- **ink v4.x** - React for terminal UIs
- **ink-ui** or similar component libraries - Pre-built UI components
- **axios** - HTTP client for REST API
- **ws** - WebSocket client for real-time updates
- **chalk** - Terminal colors and styling
- **commander** - CLI argument parsing

### Project Structure

```
tui-client/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.tsx              # Entry point, starts ink app
│   ├── App.tsx                # Main component with tab management
│   ├── api/
│   │   ├── client.ts          # HTTP client (fetch/axios wrapper)
│   │   └── websocket.ts       # WebSocket connection manager
│   ├── components/
│   │   ├── Header.tsx         # Tab bar + server status
│   │   ├── Footer.tsx         # Help text, keybindings
│   │   └── tabs/
│   │       ├── EngagementsTab.tsx
│   │       ├── ResearchTab.tsx
│   │       ├── EvidenceTab.tsx
│   │       ├── HypothesisTab.tsx
│   │       └── MonitorTab.tsx
│   ├── hooks/
│   │   ├── useAPI.ts          # Custom hook for API calls
│   │   └── useWebSocket.ts    # Custom hook for WS subscriptions
│   └── types/
│       └── api.ts             # TypeScript types from API
```

### Startup & Configuration

```bash
npm start                          # Connects to localhost:3000
npm start -- --server=api.prod.com # Connect to remote server
```

## User Interface

### Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Thesis Validator TUI  |  Server: localhost:3000  |  ✓ Online│
├─────────────────────────────────────────────────────────────┤
│ [1] Engagements  [2] Research  [3] Evidence  [4] Hypothesis │
│                  [5] Monitor    [Q] Quit                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│              Active Tab Content Area                        │
│                                                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ ↑↓: Navigate  Enter: Select  /: Search  ?: Help            │
└─────────────────────────────────────────────────────────────┘
```

### Navigation

**Tab-based interface** - Press numbers 1-5 to switch between tabs instantly.

**State Management:**
- `activeTab` state (number 0-4)
- `selectedEngagement` context (shared across all tabs)
- Each tab maintains its own local state (filters, pagination, selection)

## Tab Components

### 1. Engagements Tab

```
┌─ Engagements ────────────────────────────────────────────┐
│ Name              Target        Status        Created    │
├──────────────────────────────────────────────────────────┤
│ > Series A Due    TechCo Inc   research_act  2024-01-15 │
│   Growth Equity   MedDevice     pending       2024-01-14 │
│   Bolt-on M&A     SaaS Co       completed     2024-01-10 │
│                                                           │
│ [N] New  [E] Edit  [D] Delete  [Enter] Details          │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Sortable columns (click to sort)
- Search/filter by name, sector, status
- Pagination (10/20/50 per page)
- Create form with validation
- Delete with confirmation

**Actions:**
- `N` - New engagement (opens form)
- `E` - Edit selected engagement
- `D` - Delete selected engagement (with confirmation)
- `Enter` - View engagement details
- `↑↓` - Navigate list
- `/` - Search

### 2. Research Tab

```
┌─ Research Jobs ──────────────────────────────────────────┐
│ Active Jobs:                                             │
│ ┌─ Series A Due Diligence ──────────── 67% ────────┐   │
│ │ Status: running  •  15/22 sources processed       │   │
│ │ [████████████████░░░░░░] 67%                      │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ Recent Completions:                                      │
│ • Growth Equity Research - completed 2h ago             │
│                                                           │
│ [R] New Research  [S] Stress Test  [Enter] View Results │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Live progress bars for running jobs
- Auto-refresh (polls every 2s when jobs active)
- Job history with completion times
- Detailed results view with hypothesis/evidence counts

**Actions:**
- `R` - Start new research workflow (opens config form)
- `S` - Start stress test workflow
- `Enter` - View job results
- Auto-updates when jobs running

### 3. Evidence Tab

```
┌─ Evidence (Series A Due) ────────────────────────────────┐
│ Filter: [supporting] Source: [all] Credibility: >0.7    │
├──────────────────────────────────────────────────────────┤
│ Source              Type        Sentiment    Cred       │
│ > Expert Interview  primary     supporting   0.92       │
│   Market Report     secondary   neutral      0.85       │
│   Financial Stmt    primary     supporting   0.95       │
│                                                           │
│ [F] Filter  [/] Search  [Enter] Details  [C] Clear      │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Multi-field filtering (sentiment, source type, credibility)
- Full-text search across evidence content
- Detail modal shows complete evidence text and metadata
- Pagination for large evidence sets

**Actions:**
- `F` - Open filter dialog
- `/` - Full-text search
- `Enter` - View evidence details
- `C` - Clear all filters
- `↑↓` - Navigate list

### 4. Hypothesis Tab

```
┌─ Hypothesis Tree ────────────────────────────────────────┐
│ Thesis: Strong market position enables pricing power    │
│                                                           │
│ ├─ [●] Market leadership (conf: 0.85)                   │
│ │   ├─ [●] 40% market share verified                    │
│ │   └─ [○] Brand recognition strong                     │
│ ├─ [●] Pricing power exists (conf: 0.78)                │
│ │   └─ [●] 15% price increase accepted                  │
│ └─ [?] Questionable sustainable growth (conf: 0.45)     │
│                                                           │
│ [Enter] Expand/Collapse  [V] View Details  [E] Evidence │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- ASCII tree visualization
- Expand/collapse nodes
- Color coding by confidence level (green/yellow/red)
- Navigate with arrow keys
- Link to supporting evidence

**Actions:**
- `Enter` - Expand/collapse selected node
- `V` - View hypothesis details (confidence, reasoning)
- `E` - View supporting/contradicting evidence
- `↑↓←→` - Navigate tree

**Confidence Indicators:**
- `[●]` High confidence (>0.7) - Green
- `[○]` Medium confidence (0.4-0.7) - Yellow
- `[?]` Low confidence (<0.4) - Red

### 5. Monitor Tab

```
┌─ System Monitor ─────────────────────────────────────────┐
│ Server: localhost:3000          Status: ✓ Online        │
│ Uptime: 2h 34m                  Memory: 234MB / 512MB   │
│                                                           │
│ Active WebSocket Connections: 3                          │
│ • Engagement events (2 clients)                          │
│ • Expert call session (1 client)                         │
│                                                           │
│ Recent Activity:                                         │
│ [14:23:45] Research job completed: job-abc123           │
│ [14:22:10] New evidence added to eng-456                │
│                                                           │
│ [Auto-refresh: 5s]                                       │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Real-time metrics via `/metrics` endpoint
- Live event log (WebSocket subscriptions)
- Connection health monitoring
- Auto-refresh every 5 seconds

**Displayed Metrics:**
- Server status and uptime
- Memory usage (heap/RSS)
- Active WebSocket connections
- Recent events stream
- Active expert call sessions

## API Integration

### HTTP Client (`src/api/client.ts`)

```typescript
class ThesisValidatorClient {
  constructor(baseURL: string) // e.g., 'http://localhost:3000'

  // Engagement endpoints
  async getEngagements(filters?: EngagementFilters): Promise<Engagement[]>
  async getEngagement(id: string): Promise<Engagement>
  async createEngagement(data: CreateEngagementRequest): Promise<Engagement>
  async updateEngagement(id: string, data: UpdateEngagementRequest): Promise<Engagement>
  async deleteEngagement(id: string): Promise<void>

  // Research endpoints
  async startResearch(engagementId: string, config: ResearchConfig): Promise<ResearchJob>
  async getResearchJob(jobId: string): Promise<ResearchJob>
  async getHypothesisTree(engagementId: string): Promise<HypothesisTree>

  // Evidence endpoints
  async getEvidence(engagementId: string, filters?: EvidenceFilters): Promise<Evidence[]>

  // Health/monitoring
  async getHealth(): Promise<HealthStatus>
  async getMetrics(): Promise<SystemMetrics>
}
```

### WebSocket Manager (`src/api/websocket.ts`)

```typescript
class WebSocketManager {
  // Subscribe to engagement events
  subscribeToEngagement(engagementId: string, handlers: {
    onEvent?: (event: EngagementEvent) => void,
    onInsight?: (insight: Insight) => void,
    onQuestion?: (questions: SuggestedQuestion[]) => void
  })

  // Expert call WebSocket (for real-time transcripts)
  connectExpertCall(engagementId: string, handlers: ExpertCallHandlers)

  // Auto-reconnect on disconnect
  // Handles authentication via query param token
}
```

### Custom Hooks

- `useAPI()` - Provides API client instance with error handling
- `useWebSocket(engagementId)` - Manages WebSocket lifecycle, auto-reconnects
- `useEngagements()` - Fetches and caches engagement list
- `useResearchJob(jobId)` - Polls job status, updates on completion

### Data Flow Example

**Starting a Research Workflow:**

1. User presses `R` in Research tab
2. Form modal appears to configure research:
   - Depth: quick/standard/deep
   - Focus areas (multi-select)
   - Include comparables (yes/no)
   - Max sources (number input)
3. User submits form
4. Call `client.startResearch(engagementId, config)`
5. API returns `{ job_id: "job-abc123", status_url: "/research/jobs/job-abc123" }`
6. UI starts polling `client.getResearchJob("job-abc123")` every 2 seconds
7. Progress bar updates as `job.progress` changes (0-100)
8. On `job.status === 'completed'`, show results and stop polling
9. Update engagement status in Engagements tab

## Error Handling

### Connection Errors

**Status Display:**
```
Server: localhost:3000 | Status: ✗ Offline - Retrying in 5s...
```

**Retry Logic:**
- Network errors: Retry 3 times with exponential backoff (1s, 2s, 4s)
- 401/403 errors: Show "Authentication failed" modal, exit
- 500 errors: Show error toast, allow manual retry
- Timeout errors: Cancel request, show "Request timed out" message

### WebSocket Reconnection

**Auto-Reconnect Strategy:**
1. On disconnect: Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s max)
2. Show "Reconnecting..." indicator in header
3. On successful reconnect: Re-subscribe to all active channels
4. After 5 failed attempts: Show manual "Reconnect" button
5. Log all reconnection attempts in Monitor tab

### Loading & Error States

**Loading States:**
```
Initial load:     "Loading engagements..."
Empty state:      "No engagements found. Press [N] to create one."
Error state:      "⚠ Failed to load data. [R] Retry  [Q] Quit"
Slow response:    Show spinner after 2s: "⠋ Loading..."
```

**Input Validation:**
- Forms show inline errors (red text below field)
- Required fields marked with asterisk (*)
- Validation on blur and submit
- Clear error messages: "Target company name is required"

**Graceful Degradation:**
- If WebSocket unavailable: Fall back to polling (5s intervals)
- If `/metrics` endpoint fails: Hide Monitor tab or show "Metrics unavailable"
- If API version mismatch: Show warning banner but continue

## Keyboard Shortcuts

### Global Shortcuts

| Key   | Action                              |
|-------|-------------------------------------|
| 1-5   | Switch to tab 1-5                   |
| Q     | Quit (with confirmation if jobs running) |
| ?     | Show help modal                     |
| Esc   | Close modal/cancel action           |
| Ctrl+C| Force quit                          |

### Context-Specific Shortcuts

| Key   | Action                              |
|-------|-------------------------------------|
| ↑↓    | Navigate list/table                 |
| Enter | Select item / Open details          |
| /     | Search / Filter                     |
| Tab   | Move between form fields            |
| Space | Toggle checkbox/multi-select        |

### Tab-Specific Shortcuts

**Engagements Tab:**
- `N` - New engagement
- `E` - Edit selected
- `D` - Delete selected

**Research Tab:**
- `R` - New research workflow
- `S` - Stress test workflow

**Evidence Tab:**
- `F` - Filter dialog
- `C` - Clear filters

**Hypothesis Tab:**
- `V` - View details
- `E` - View evidence

## Development & Testing

### Development Commands

```bash
# Install dependencies
npm install

# Start in development mode (watch mode)
npm run dev

# Build for production
npm run build

# Run built version
npm start

# Run tests
npm test

# Type check
npm run typecheck
```

### Testing Strategy

1. **Unit Tests** - Test API client methods, WebSocket manager
2. **Component Tests** - Test individual tab components with mocked API
3. **Integration Tests** - Test against real API (require backend running)
4. **Manual Testing** - Test keyboard navigation, error scenarios

### Configuration

**Environment Variables:**
```bash
THESIS_VALIDATOR_API_URL=http://localhost:3000  # API base URL
THESIS_VALIDATOR_WS_URL=ws://localhost:3000     # WebSocket URL
THESIS_VALIDATOR_AUTH_TOKEN=<optional-token>    # Auth token if required
```

**Config File (`~/.thesis-validator/config.json`):**
```json
{
  "defaultServer": "http://localhost:3000",
  "autoReconnect": true,
  "pollInterval": 2000,
  "theme": "dark"
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)
- [ ] Project setup (ink, TypeScript, dependencies)
- [ ] API client with basic endpoints (engagements, health)
- [ ] Main App component with tab switching
- [ ] Header and Footer components
- [ ] Basic Engagements tab (list only)

### Phase 2: Full Engagement Management
- [ ] Engagements tab: Create, Edit, Delete
- [ ] Form validation and error handling
- [ ] Pagination and sorting
- [ ] Search/filter functionality

### Phase 3: Research Workflows
- [ ] Research tab with job list
- [ ] Start research workflow form
- [ ] Progress tracking and polling
- [ ] Results display
- [ ] Stress test workflow

### Phase 4: Evidence & Hypothesis
- [ ] Evidence tab with filtering
- [ ] Evidence detail view
- [ ] Hypothesis tab with tree visualization
- [ ] Tree navigation and expand/collapse

### Phase 5: Real-time Features
- [ ] WebSocket manager implementation
- [ ] Monitor tab with live metrics
- [ ] Real-time event subscriptions
- [ ] Auto-reconnect logic

### Phase 6: Polish & Testing
- [ ] Comprehensive error handling
- [ ] Help modal with keybindings
- [ ] Theme customization (colors)
- [ ] Unit and integration tests
- [ ] Documentation and README

## Success Criteria

✅ **Functional Completeness:**
- All web UI features accessible via TUI
- Keyboard-only navigation works smoothly
- Real-time updates via WebSocket function correctly

✅ **Performance:**
- Tab switching is instant (<100ms)
- No UI freezing during long-running operations
- Smooth scrolling in large lists (1000+ items)

✅ **Reliability:**
- Graceful handling of network errors
- Auto-reconnect works consistently
- No data loss on connection failures

✅ **Usability:**
- Intuitive keyboard shortcuts
- Clear help documentation
- Responsive UI (works on various terminal sizes)

## Future Enhancements

- **Export functionality** - Export reports to Markdown/PDF
- **Vim keybindings** - Optional vim-style navigation (hjkl)
- **Themes** - Light/dark themes, custom color schemes
- **Plugins** - Extension system for custom tabs/features
- **SSH support** - Connect to remote servers via SSH tunnel
- **Multi-engagement** - Work with multiple engagements simultaneously
