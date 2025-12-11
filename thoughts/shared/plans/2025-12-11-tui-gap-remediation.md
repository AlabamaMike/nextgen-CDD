# TUI Client Gap Remediation Plan

**Date:** 2025-12-11
**Status:** Ready for Implementation
**Priority:** Medium
**Current Coverage:** 73% → Target: 90%

## Executive Summary

The TUI client has solid read-only coverage and core workflows, but lacks full CRUD functionality in the UI layer despite having many API methods already implemented. This plan addresses the gaps to bring coverage from 73% to ~90%.

## Gap Analysis Summary

| Domain | Current | Target | Gap Description |
|--------|---------|--------|-----------------|
| Skills | 40% | 85% | Missing API methods + execute with parameters |
| Documents | 60% | 75% | Upload not functional in TUI |
| Research | 70% | 85% | Missing report endpoint |
| Contradictions | 75% | 90% | Missing update endpoint |
| Engagements | 80% | 95% | Team management UI unused |
| Evidence | 85% | 95% | CRUD not wired to UI |
| Stress Tests | 85% | 95% | Already good |
| Hypotheses | 90% | 95% | CRUD not wired to UI |
| Metrics | 95% | 95% | Already complete |

## Implementation Phases

---

## Phase 1: Skills Domain Enhancement (40% → 85%)

**Priority: High** - Largest gap

### Task 1.1: Add Missing API Client Methods

**File:** `tui-client/src/api/client.ts`

Add the following methods to ThesisValidatorClient:

```typescript
// Skills - Additional methods
async getSkillTemplates(): Promise<{ templates: SkillTemplate[] }> {
  const response = await this.http.get<{ templates: SkillTemplate[] }>(
    '/api/v1/skills/templates'
  );
  return response.data;
}

async getComparablesBySector(sector: string): Promise<ComparableData[]> {
  const response = await this.http.get<{ comparables: ComparableData[] }>(
    `/api/v1/skills/comparables/sectors/${encodeURIComponent(sector)}`
  );
  return response.data.comparables;
}

async getComparableMethodologies(): Promise<{ methodologies: string[] }> {
  const response = await this.http.get<{ methodologies: string[] }>(
    '/api/v1/skills/comparables/methodologies'
  );
  return response.data;
}
```

### Task 1.2: Add Types for Skills Templates

**File:** `tui-client/src/types/api.ts`

```typescript
export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  parameters: SkillParameter[];
  default_values?: Record<string, unknown>;
}
```

### Task 1.3: Enhance SkillsTab with Parameter Collection

**File:** `tui-client/src/components/tabs/SkillsTab.tsx`

Currently, skill execution at line 82-99 doesn't collect parameters. Update to:

1. Add 'execute_params' to ViewMode type
2. Create SkillExecuteForm component similar to EngagementCreateForm pattern
3. Collect parameters before execution
4. Display execution results in detail view

**New ViewMode:**
```typescript
type ViewMode = 'list' | 'detail' | 'execute_params' | 'execute_result';
```

**Changes needed:**
- Add state for execution parameters: `const [execParams, setExecParams] = useState<Record<string, unknown>>({});`
- Add state for execution result: `const [execResult, setExecResult] = useState<SkillExecuteResult | null>(null);`
- When 'X' pressed, transition to 'execute_params' instead of executing immediately
- Render parameter collection form in 'execute_params' mode
- On form submit, call executeSkill and show results

### Task 1.4: Create SkillExecuteForm Component

**File:** `tui-client/src/components/forms/SkillExecuteForm.tsx` (NEW)

Follow the pattern from EngagementCreateForm:
- Accept skill parameters as props
- Render appropriate input for each parameter type (string, number, boolean, array)
- Use TextInput for strings/numbers
- Use toggle for booleans
- Handle Enter to progress, Escape to cancel, Ctrl+S to submit

### Success Criteria Phase 1:
- [x] All skills API methods implemented
- [x] Skill execution collects parameters before running
- [x] Execution results displayed in TUI
- [x] TypeScript compiles: `npm run typecheck`
- [x] Tests pass: `npm test`

---

## Phase 2: Document Upload Enhancement (60% → 75%)

**Priority: Medium** - Complex TUI limitation

### Task 2.1: Add File Path Input for Document Upload

**File:** `tui-client/src/components/tabs/DocumentsTab.tsx`

The current implementation has 'upload' in ViewMode but doesn't implement it. Add:

1. Text input for file path (user types path to local file)
2. File existence validation using Node.js fs module
3. FormData construction with file stream
4. Progress indicator during upload

### Task 2.2: Create DocumentUploadForm Component

**File:** `tui-client/src/components/forms/DocumentUploadForm.tsx` (NEW)

```typescript
interface DocumentUploadFormProps {
  onSubmit: (filePath: string, documentType: string) => void;
  onCancel: () => void;
}
```

Features:
- Text input for file path
- Dropdown for document type (data_room, expert_transcript, market_research, financial_model)
- File existence check before submit
- Clear error messaging for invalid paths

### Task 2.3: Update API Client for File Upload

**File:** `tui-client/src/api/client.ts`

The current `uploadDocument` method accepts File/Blob which doesn't work in Node.js TUI context. Add alternative method:

```typescript
async uploadDocumentFromPath(
  engagementId: string,
  filePath: string,
  documentType: string
): Promise<DocumentUploadResponse> {
  const fs = await import('fs');
  const path = await import('path');
  const FormData = (await import('form-data')).default;

  const filename = path.basename(filePath);
  const stream = fs.createReadStream(filePath);

  const formData = new FormData();
  formData.append('file', stream, filename);
  formData.append('document_type', documentType);

  const response = await this.http.post<DocumentUploadResponse>(
    `/api/v1/engagements/${engagementId}/documents`,
    formData,
    { headers: formData.getHeaders() }
  );
  return response.data;
}
```

### Success Criteria Phase 2:
- [ ] File path input works in TUI
- [ ] Document type selection functional
- [ ] Upload completes with progress indication
- [ ] Error handling for invalid paths
- [ ] TypeScript compiles

---

## Phase 3: Research Report Endpoint (70% → 85%)

**Priority: Medium**

### Task 3.1: Add Research Report API Method

**File:** `tui-client/src/api/client.ts`

```typescript
async getResearchReport(engagementId: string): Promise<ResearchReport> {
  const response = await this.http.get<{ report: ResearchReport }>(
    `/api/v1/engagements/${engagementId}/report`
  );
  return response.data.report;
}
```

### Task 3.2: Add ResearchReport Type

**File:** `tui-client/src/types/api.ts`

```typescript
export interface ResearchReport {
  engagement_id: string;
  generated_at: number;
  executive_summary: string;
  thesis_validation: {
    original_thesis: string;
    validation_score: number;
    key_findings: string[];
  };
  hypothesis_summary: {
    total: number;
    validated: number;
    invalidated: number;
    pending: number;
  };
  risk_assessment: {
    overall_score: number;
    key_risks: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      mitigation: string | null;
    }>;
  };
  recommendations: string[];
}
```

### Task 3.3: Add Report View to ResearchTab

**File:** `tui-client/src/components/tabs/ResearchTab.tsx`

Add 'R' hotkey to view report when research is complete:
- Fetch report via API
- Display formatted report in terminal
- Include executive summary, key findings, risk assessment

### Success Criteria Phase 3:
- [ ] Report API method implemented
- [ ] Report viewable from ResearchTab
- [ ] Report displays all sections
- [ ] TypeScript compiles

---

## Phase 4: Wire Existing CRUD to UI (Evidence, Hypotheses)

**Priority: Low** - Methods exist, just need UI wiring

### Task 4.1: Add Evidence Create/Edit to EvidenceTab

**File:** `tui-client/src/components/tabs/EvidenceTab.tsx`

Add ViewModes: 'create', 'edit'
Add hotkeys: 'N' for new, 'E' for edit, 'D' for delete with confirmation
Create EvidenceForm component following existing patterns

### Task 4.2: Add Hypothesis Create/Edit to HypothesisTab

**File:** `tui-client/src/components/tabs/HypothesisTab.tsx`

Add ViewModes: 'create', 'edit'
Add hotkeys: 'N' for new, 'E' for edit, 'D' for delete
Create HypothesisForm component

### Task 4.3: Add Team Management to EngagementsTab

**File:** `tui-client/src/components/tabs/EngagementsTab.tsx`

Add ViewMode: 'manage_team'
Add hotkey: 'T' for team management
Show team members list with add/remove capability

### Success Criteria Phase 4:
- [ ] Evidence CRUD functional in UI
- [ ] Hypothesis CRUD functional in UI
- [ ] Team management accessible
- [ ] All operations use existing API methods

---

## Phase 5: Contradiction Update Endpoint

**Priority: Low** - Minor gap

### Task 5.1: Add Update Contradiction Method

**File:** `tui-client/src/api/client.ts`

```typescript
async updateContradiction(
  engagementId: string,
  contradictionId: string,
  data: Partial<CreateContradictionRequest>
): Promise<ContradictionData> {
  const response = await this.http.patch<{ contradiction: ContradictionData }>(
    `/api/v1/engagements/${engagementId}/contradictions/${contradictionId}`,
    data
  );
  return response.data.contradiction;
}
```

Note: Check if backend actually supports PATCH. If not, this is a backend gap.

### Success Criteria Phase 5:
- [ ] Update method added (if backend supports it)
- [ ] Or documented as backend limitation

---

## Verification Checklist

### Per-Phase Verification
1. TypeScript compiles: `npm run typecheck`
2. Tests pass: `npm test`
3. TUI runs without errors: `npm run dev`
4. New functionality is keyboard accessible
5. Help text updated for new hotkeys

### Final Integration Test
1. Browse and execute skill with parameters
2. Upload document from file path
3. View research report
4. Create/edit evidence
5. Create/edit hypothesis
6. Manage engagement team

---

## Files to Create/Modify

### New Files
```
tui-client/src/components/forms/
├── SkillExecuteForm.tsx (NEW)
├── DocumentUploadForm.tsx (NEW)
├── EvidenceForm.tsx (NEW)
├── HypothesisForm.tsx (NEW)
└── TeamMemberForm.tsx (NEW)
```

### Modified Files
```
tui-client/src/
├── api/client.ts (add 5 methods)
├── types/api.ts (add ResearchReport, SkillTemplate)
├── components/tabs/
│   ├── SkillsTab.tsx (parameter collection)
│   ├── DocumentsTab.tsx (file upload)
│   ├── ResearchTab.tsx (report view)
│   ├── EvidenceTab.tsx (CRUD)
│   ├── HypothesisTab.tsx (CRUD)
│   └── EngagementsTab.tsx (team management)
└── components/HelpView.tsx (update hotkey docs)
```

---

## Priority Order

1. **Phase 1** (Skills) - Highest impact, largest gap
2. **Phase 3** (Research Report) - Quick win, single endpoint
3. **Phase 2** (Documents) - Medium complexity
4. **Phase 4** (CRUD wiring) - Many small changes
5. **Phase 5** (Contradiction update) - Minor, may need backend

---

## Estimated Complexity

| Phase | New Components | API Methods | Complexity |
|-------|----------------|-------------|------------|
| 1 | 1 form | 3 | Medium |
| 2 | 1 form | 1 | Medium |
| 3 | 0 | 1 | Low |
| 4 | 3 forms | 0 | Medium |
| 5 | 0 | 1 | Low |

**Total: 5 new form components, 6 new API methods**
