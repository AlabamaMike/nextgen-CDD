# Agent-Triggered Skill Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable agents to discover and execute analytical skills during their work, starting with EvidenceGatherer.

**Architecture:** Create an LLM-based SkillExecutor that agents invoke mid-task. Agents search for relevant skills via semantic search, execute top 2, and incorporate outputs into their prompts.

**Tech Stack:** TypeScript, Anthropic SDK, Vertex AI, existing LLMProvider abstraction

---

## Task 1: Create SkillExecutor Module

**Files:**
- Create: `thesis-validator/src/memory/skill-executor.ts`
- Modify: `thesis-validator/src/memory/index.ts` (add export)

**Step 1: Create the skill executor file**

```typescript
// thesis-validator/src/memory/skill-executor.ts
/**
 * Skill Executor - LLM-based skill execution
 *
 * Executes skill prompts with parameters via the LLM provider.
 */

import type { SkillExecutor, SkillExecutionContext } from './skill-library.js';
import type { SkillExecutionResult } from '../models/index.js';
import { LLMProvider, getLLMProviderConfig } from '../services/llm-provider.js';

/**
 * Build a prompt from skill implementation and parameters
 */
function buildSkillPrompt(
  implementation: string,
  parameters: Record<string, unknown>,
  context: SkillExecutionContext
): string {
  const parameterSection = Object.entries(parameters)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  let prompt = `Execute the following analytical skill with the provided parameters.

## Skill Instructions
${implementation}

## Parameters
${parameterSection || 'No parameters provided'}
`;

  if (context.additional_context) {
    prompt += `\n## Additional Context\n${context.additional_context}\n`;
  }

  prompt += `
## Output Requirements
Provide your analysis as structured JSON with the following format:
{
  "analysis": "Your detailed analysis",
  "findings": ["Key finding 1", "Key finding 2", ...],
  "confidence": 0.0-1.0,
  "data_sources": ["Source 1", "Source 2", ...],
  "recommendations": ["Recommendation 1", ...]
}`;

  return prompt;
}

/**
 * Parse skill execution output from LLM response
 */
function parseSkillOutput(content: string): unknown {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1]?.trim() : content;

  try {
    return JSON.parse(jsonStr ?? '');
  } catch {
    // Try to find JSON object in content
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Return as plain text if JSON parsing fails
        return { analysis: content, findings: [], confidence: 0.5 };
      }
    }
    return { analysis: content, findings: [], confidence: 0.5 };
  }
}

/**
 * Create an LLM-based skill executor
 */
export function createLLMSkillExecutor(): SkillExecutor {
  let llmProvider: LLMProvider | null = null;
  let initialized = false;

  return async (
    implementation: string,
    parameters: Record<string, unknown>,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> => {
    const startTime = Date.now();

    // Lazy initialize LLM provider
    if (!initialized) {
      const config = getLLMProviderConfig();
      llmProvider = new LLMProvider(config);
      await llmProvider.initialize();
      initialized = true;
    }

    if (!llmProvider) {
      return {
        skill_id: '',
        success: false,
        output: null,
        execution_time_ms: Date.now() - startTime,
        error: 'LLM provider not initialized',
      };
    }

    try {
      const prompt = buildSkillPrompt(implementation, parameters, context);

      const response = await llmProvider.createMessage({
        model: process.env['VERTEX_AI_MODEL'] ?? 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.3,
        system: 'You are an expert analyst executing structured analytical frameworks. Provide thorough, evidence-based analysis.',
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      const output = parseSkillOutput(content);

      return {
        skill_id: '',
        success: true,
        output,
        execution_time_ms: Date.now() - startTime,
        metadata: {
          tokens_used: response.usage.input_tokens + response.usage.output_tokens,
          model_used: process.env['VERTEX_AI_MODEL'] ?? 'claude-sonnet-4-20250514',
        },
      };
    } catch (error) {
      return {
        skill_id: '',
        success: false,
        output: null,
        execution_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}
```

**Step 2: Export from memory index**

Add to `thesis-validator/src/memory/index.ts`:

```typescript
// After existing skill-library exports
export { createLLMSkillExecutor } from './skill-executor.js';
```

**Step 3: Run typecheck to verify**

Run: `cd thesis-validator && npm run typecheck`
Expected: PASS with no errors

**Step 4: Commit**

```bash
git add thesis-validator/src/memory/skill-executor.ts thesis-validator/src/memory/index.ts
git commit -m "feat(skills): add LLM-based skill executor"
```

---

## Task 2: Wire Executor at Startup

**Files:**
- Modify: `thesis-validator/src/memory/index.ts:103-116`

**Step 1: Update initializeMemorySystems to wire executor**

Replace the skill seeding section in `thesis-validator/src/memory/index.ts`:

```typescript
// Replace lines 103-116 with:

  // Seed default skills if ENABLE_SKILL_LIBRARY is set
  if (process.env['ENABLE_SKILL_LIBRARY'] === 'true') {
    // Wire the LLM executor
    const { createLLMSkillExecutor } = await import('./skill-executor.js');
    skillLibrary.setExecutor(createLLMSkillExecutor());
    console.log('[Memory] Skill executor configured');

    try {
      const seededCount = await skillLibrary.seedDefaultSkills('system');
      if (seededCount > 0) {
        console.log(`[Memory] Seeded ${seededCount} default skills`);
      }
    } catch (error) {
      console.warn('[Memory] Failed to seed default skills:', error);
    }
  }
```

**Step 2: Run typecheck**

Run: `cd thesis-validator && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add thesis-validator/src/memory/index.ts
git commit -m "feat(skills): wire skill executor at startup"
```

---

## Task 3: Add Skill Library to AgentContext

**Files:**
- Modify: `thesis-validator/src/agents/base-agent.ts:52-62`

**Step 1: Update AgentContext interface**

Add SkillLibrary to AgentContext in `thesis-validator/src/agents/base-agent.ts`:

```typescript
// Add import at top of file (around line 14):
import type { SkillLibrary } from '../memory/skill-library.js';

// Update AgentContext interface (around line 55):
export interface AgentContext {
  engagementId: string;
  dealMemory: DealMemory;
  institutionalMemory?: InstitutionalMemory;
  marketIntelligence?: MarketIntelligence;
  skillLibrary?: SkillLibrary;
  onEvent?: (event: EngagementEvent) => void;
  abortSignal?: AbortSignal;
}
```

**Step 2: Run typecheck**

Run: `cd thesis-validator && npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add thesis-validator/src/agents/base-agent.ts
git commit -m "feat(agents): add skillLibrary to AgentContext"
```

---

## Task 4: Add Skill Methods to BaseAgent

**Files:**
- Modify: `thesis-validator/src/agents/base-agent.ts` (add methods after line 246)

**Step 1: Add skill-related imports**

Add after existing imports in `thesis-validator/src/agents/base-agent.ts`:

```typescript
import type { SkillDefinition, SkillExecutionResult } from '../models/index.js';
```

**Step 2: Add skill methods to BaseAgent class**

Add after the `embed()` method (around line 246):

```typescript
  /**
   * Find relevant skills for a task description
   */
  protected async findRelevantSkills(
    taskDescription: string,
    topK = 2
  ): Promise<SkillDefinition[]> {
    if (!this.context?.skillLibrary) {
      return [];
    }

    const embedding = await this.embed(taskDescription);
    const results = await this.context.skillLibrary.search(embedding, { top_k: topK });

    const skills: SkillDefinition[] = [];
    for (const result of results) {
      const skill = await this.context.skillLibrary.get(result.id);
      if (skill) {
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Execute a skill with parameters
   */
  protected async executeSkill(
    skillId: string,
    parameters: Record<string, unknown>
  ): Promise<SkillExecutionResult> {
    if (!this.context?.skillLibrary) {
      return {
        skill_id: skillId,
        success: false,
        output: null,
        execution_time_ms: 0,
        error: 'Skill library not available',
      };
    }

    return this.context.skillLibrary.execute({
      skill_id: skillId,
      parameters,
      context: {
        engagement_id: this.context.engagementId,
      },
    });
  }

  /**
   * Extract parameters for a skill from agent input using LLM
   */
  protected async extractParametersForSkill(
    skill: SkillDefinition,
    agentInput: unknown
  ): Promise<Record<string, unknown>> {
    const parameterDescriptions = skill.parameters
      .map((p) => `- ${p.name} (${p.type}): ${p.description}${p.required ? ' [REQUIRED]' : ' [OPTIONAL]'}`)
      .join('\n');

    const prompt = `Extract parameter values for this skill from the given context.

SKILL: ${skill.name}
DESCRIPTION: ${skill.description}

PARAMETERS NEEDED:
${parameterDescriptions}

CONTEXT:
${JSON.stringify(agentInput, null, 2)}

Extract values for each parameter as JSON. Use null for missing optional parameters.
Only include parameters that can be reasonably inferred from the context.

Output as JSON object with parameter names as keys:`;

    try {
      const response = await this.callLLM(prompt, { temperature: 0, maxTokens: 1024 });
      const params = this.parseJSON<Record<string, unknown>>(response.content);
      return params ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Build prompt context from skill execution results
   */
  protected buildSkillContextPrompt(skillResults: Array<{ skill: SkillDefinition; result: SkillExecutionResult }>): string {
    const successfulResults = skillResults.filter((r) => r.result.success);

    if (successfulResults.length === 0) {
      return '';
    }

    const sections = successfulResults.map((r) => {
      const output = typeof r.result.output === 'string'
        ? r.result.output
        : JSON.stringify(r.result.output, null, 2);
      return `### ${r.skill.name}\n${r.skill.description}\n\nAnalysis:\n${output}`;
    });

    return `## Analytical Framework Results\n\nThe following analytical frameworks were applied:\n\n${sections.join('\n\n')}`;
  }
```

**Step 3: Run typecheck**

Run: `cd thesis-validator && npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add thesis-validator/src/agents/base-agent.ts
git commit -m "feat(agents): add skill discovery and execution methods to BaseAgent"
```

---

## Task 5: Update Research Workflow to Pass SkillLibrary

**Files:**
- Modify: `thesis-validator/src/workflows/research-workflow.ts:14-20, 115-120`

**Step 1: Add skill library import**

Add to imports in `thesis-validator/src/workflows/research-workflow.ts`:

```typescript
import { getSkillLibrary } from '../memory/index.js';
```

**Step 2: Update baseContext to include skillLibrary**

Update the baseContext creation (around line 115-120):

```typescript
    // Create agent context - conditionally include optional properties
    const baseContext: AgentContext = {
      engagementId: input.engagement.id,
      dealMemory: this.dealMemory,
      institutionalMemory: getInstitutionalMemory(),
      marketIntelligence: getMarketIntelligence(),
      skillLibrary: getSkillLibrary(),
    };
```

**Step 3: Run typecheck**

Run: `cd thesis-validator && npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add thesis-validator/src/workflows/research-workflow.ts
git commit -m "feat(workflow): pass skillLibrary to agents in research workflow"
```

---

## Task 6: Integrate Skills into EvidenceGatherer

**Files:**
- Modify: `thesis-validator/src/agents/evidence-gatherer.ts:106-130`

**Step 1: Add skill invocation to execute method**

Update the `execute` method in `thesis-validator/src/agents/evidence-gatherer.ts`. After the status update (line 116) and before generating search queries:

```typescript
  async execute(input: EvidenceGathererInput): Promise<AgentResult<EvidenceGathererOutput>> {
    const startTime = Date.now();

    if (!this.context) {
      return this.createResult(false, undefined, {
        error: 'No context set',
        startTime,
      });
    }

    this.updateStatus('searching', 'Gathering evidence');

    try {
      const evidence: EvidenceNode[] = [];
      const searchQueries: string[] = [];
      const sources = input.sources ?? ['web', 'documents', 'market_intel'];
      const maxResults = input.maxResults ?? 20;
      const minCredibility = input.minCredibility ?? 0.3;

      // Find and execute relevant skills
      const skillContext = await this.executeRelevantSkills(input);

      // Generate search queries (now informed by skill insights)
      const queries = await this.generateSearchQueries(input.query, skillContext);
      searchQueries.push(...queries);
```

**Step 2: Add executeRelevantSkills method**

Add this new method to the EvidenceGathererAgent class (after the execute method):

```typescript
  /**
   * Find and execute relevant skills for the evidence gathering task
   */
  private async executeRelevantSkills(input: EvidenceGathererInput): Promise<string> {
    if (!this.context?.skillLibrary) {
      return '';
    }

    const taskDescription = `Gather evidence for investment thesis analysis: ${input.query}`;

    try {
      const skills = await this.findRelevantSkills(taskDescription, 2);

      if (skills.length === 0) {
        return '';
      }

      console.log(`[EvidenceGatherer] Found ${skills.length} relevant skills: ${skills.map((s) => s.name).join(', ')}`);

      const skillResults: Array<{ skill: SkillDefinition; result: SkillExecutionResult }> = [];

      for (const skill of skills) {
        const params = await this.extractParametersForSkill(skill, input);
        console.log(`[EvidenceGatherer] Executing skill: ${skill.name}`);

        const result = await this.executeSkill(skill.id, params);

        if (result.success) {
          skillResults.push({ skill, result });
          console.log(`[EvidenceGatherer] Skill ${skill.name} completed successfully`);
        } else {
          console.warn(`[EvidenceGatherer] Skill ${skill.name} failed: ${result.error}`);
        }
      }

      return this.buildSkillContextPrompt(skillResults);
    } catch (error) {
      console.error('[EvidenceGatherer] Error executing skills:', error);
      return '';
    }
  }
```

**Step 3: Update generateSearchQueries to use skill context**

Modify the `generateSearchQueries` method signature and implementation:

```typescript
  /**
   * Generate varied search queries
   */
  private async generateSearchQueries(baseQuery: string, skillContext?: string): Promise<string[]> {
    let prompt = `Generate 5 different search queries to thoroughly research the following topic:

Topic: ${baseQuery}
`;

    if (skillContext) {
      prompt += `
The following analytical frameworks have been applied and provide additional context:
${skillContext}

Use insights from these frameworks to create more targeted search queries.
`;
    }

    prompt += `
Create queries that:
1. The main topic directly
2. Market size / TAM aspects
3. Competitive landscape
4. Risk factors or challenges
5. Recent news or developments

Output as JSON array of strings:
["query1", "query2", ...]`;

    const response = await this.callLLM(prompt, { temperature: 0.3 });
    const queries = this.parseJSON<string[]>(response.content);

    return queries ?? [baseQuery];
  }
```

**Step 4: Add SkillDefinition import**

Add to imports at top of file:

```typescript
import type { SkillDefinition, SkillExecutionResult } from '../models/index.js';
```

**Step 5: Run typecheck**

Run: `cd thesis-validator && npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add thesis-validator/src/agents/evidence-gatherer.ts
git commit -m "feat(evidence-gatherer): integrate skill discovery and execution"
```

---

## Task 7: Build and Deploy

**Step 1: Run full build**

Run: `cd thesis-validator && npm run build`
Expected: PASS with no errors

**Step 2: Run lint**

Run: `cd thesis-validator && npm run lint`
Expected: PASS or minor warnings only

**Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: lint fixes" --allow-empty
```

**Step 4: Push to trigger deployment**

```bash
git push origin main
```

**Step 5: Trigger Cloud Build**

```bash
gcloud builds submit --config=thesis-validator/cloudbuild.yaml --substitutions=_TAG=latest .
```

Expected: SUCCESS

---

## Task 8: Verify Skill Execution in Logs

**Step 1: Create a test engagement via the API**

Use the dashboard or API to create an engagement with a thesis.

**Step 2: Start research workflow**

Trigger the research workflow for the engagement.

**Step 3: Check logs for skill execution**

Look for logs containing:
- `[EvidenceGatherer] Found X relevant skills`
- `[EvidenceGatherer] Executing skill:`
- `[EvidenceGatherer] Skill X completed successfully`

---

## Summary

After completing these tasks:
1. SkillExecutor module created and wired at startup
2. BaseAgent has skill discovery/execution methods
3. EvidenceGatherer integrates skills into evidence gathering
4. Skills are executed mid-task and their outputs inform search queries
5. Deployed and verified in Cloud Run logs

**Future extensions (not in this plan):**
- Add skill integration to HypothesisBuilder
- Add skill integration to ContradictionHunter
- Add skill integration to ComparablesFinderAgent
- Add skill integration to ExpertSynthesizer
