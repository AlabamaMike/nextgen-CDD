import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { ThesisValidatorClient } from '../../api/client.js';
import type { SkillData, SkillCategory, SkillExecuteResult, SkillExecuteRequest } from '../../types/api.js';
import { useInputContext } from '../../context/InputContext.js';
import { SkillExecuteForm } from '../forms/SkillExecuteForm.js';

interface SkillsTabProps {
  serverUrl: string;
  authToken?: string | undefined;
}

type ViewMode = 'list' | 'detail' | 'execute_params' | 'execute_result';

const CATEGORIES: Array<SkillCategory | 'all'> = ['all', 'analysis', 'research', 'synthesis', 'validation', 'other', 'market_sizing', 'competitive', 'financial', 'risk', 'operational', 'regulatory', 'customer', 'technology', 'general'];

function getCategoryColor(category: SkillCategory): string {
  switch (category) {
    case 'analysis': return 'cyan';
    case 'research': return 'green';
    case 'synthesis': return 'yellow';
    case 'validation': return 'magenta';
    case 'market_sizing': return 'blue';
    case 'competitive': return 'red';
    case 'financial': return 'green';
    case 'risk': return 'red';
    case 'operational': return 'yellow';
    case 'regulatory': return 'magenta';
    case 'customer': return 'cyan';
    case 'technology': return 'blue';
    case 'general': return 'white';
    case 'other': return 'gray';
  }
}

function formatSuccessRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function SkillsTab({ serverUrl, authToken }: SkillsTabProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<SkillExecuteResult | null>(null);

  const { isInputActive } = useInputContext();

  const apiClient = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  // Load skills
  useEffect(() => {
    const loadSkills = async () => {
      try {
        setLoading(true);
        const filters = categoryFilter !== 'all' ? { category: categoryFilter } : {};
        const result = await apiClient.getSkills(filters);
        setSkills(result.skills);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        setLoading(false);
      }
    };

    void loadSkills();
  }, [apiClient, categoryFilter]);

  // Filter skills by category
  const filteredSkills = useMemo(() => {
    if (categoryFilter === 'all') return skills;
    return skills.filter(s => s.category === categoryFilter);
  }, [skills, categoryFilter]);

  const selectedSkill = filteredSkills[selectedIndex];

  // Cycle through categories
  const cycleCategory = () => {
    const currentIdx = CATEGORIES.indexOf(categoryFilter);
    const nextIdx = (currentIdx + 1) % CATEGORIES.length;
    setCategoryFilter(CATEGORIES[nextIdx]!);
    setSelectedIndex(0);
  };

  // Execute skill with parameters
  const handleExecuteSkill = async (request: SkillExecuteRequest) => {
    if (!selectedSkill) return;

    try {
      setIsExecuting(true);
      setMessage(`Executing ${selectedSkill.name}...`);
      const result = await apiClient.executeSkill(selectedSkill.id, request);
      setExecResult(result);
      setViewMode('execute_result');
      if (result.success) {
        setMessage(`Skill executed successfully in ${result.execution_time_ms}ms`);
      } else {
        setMessage(`Skill execution failed`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setViewMode('detail');
    } finally {
      setIsExecuting(false);
    }
  };

  // Start parameter collection before execution
  const startSkillExecution = () => {
    if (!selectedSkill) return;
    setViewMode('execute_params');
  };

  // Keyboard input
  useInput((input, key) => {
    if (isInputActive) return;

    // Clear message on any input
    if (message) setMessage(null);

    if (viewMode === 'list') {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < filteredSkills.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.return && selectedSkill) {
        setViewMode('detail');
      }
      if (input === 'f' || input === 'F') {
        cycleCategory();
      }
      if (input === 'x' || input === 'X') {
        startSkillExecution();
      }
    } else if (viewMode === 'detail') {
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('list');
      }
      if (input === 'x' || input === 'X') {
        startSkillExecution();
      }
    } else if (viewMode === 'execute_result') {
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('detail');
        setExecResult(null);
      }
    }
  });

  // Loading state
  if (loading) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Loading skills...</Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  // Detail view
  if (viewMode === 'detail' && selectedSkill) {
    const skill = selectedSkill;
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Skill Details</Text>
        <Text color="gray">Press B or ESC to go back</Text>
        <Text>{''}</Text>

        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text bold>Name: </Text>
            <Text>{skill.name}</Text>
          </Box>
          <Box>
            <Text bold>Category: </Text>
            <Text color={getCategoryColor(skill.category)}>{skill.category}</Text>
          </Box>
          <Box>
            <Text bold>Version: </Text>
            <Text>{skill.version}</Text>
          </Box>
          <Box>
            <Text bold>Success Rate: </Text>
            <Text color={skill.success_rate >= 0.8 ? 'green' : skill.success_rate >= 0.5 ? 'yellow' : 'red'}>
              {formatSuccessRate(skill.success_rate)}
            </Text>
          </Box>
          <Box>
            <Text bold>Usage Count: </Text>
            <Text>{skill.usage_count}</Text>
          </Box>

          <Text>{''}</Text>
          <Text bold>Description:</Text>
          <Box paddingLeft={2} marginTop={1}>
            <Text wrap="wrap">{skill.description}</Text>
          </Box>
        </Box>

        {message && (
          <Box marginY={1}>
            <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>
          </Box>
        )}

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[X] Execute  [B/ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  // Execute params view - show form for parameter collection
  if (viewMode === 'execute_params' && selectedSkill) {
    return (
      <SkillExecuteForm
        skill={selectedSkill}
        onSubmit={handleExecuteSkill}
        onCancel={() => setViewMode('detail')}
        isExecuting={isExecuting}
      />
    );
  }

  // Execute result view - show execution results
  if (viewMode === 'execute_result' && selectedSkill && execResult) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Execution Result: {selectedSkill.name}</Text>
        <Text color="gray">Press B or ESC to go back</Text>
        <Text>{''}</Text>

        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text bold>Status: </Text>
            <Text color={execResult.success ? 'green' : 'red'}>
              {execResult.success ? '✓ Success' : '✗ Failed'}
            </Text>
          </Box>
          <Box>
            <Text bold>Execution Time: </Text>
            <Text>{execResult.execution_time_ms}ms</Text>
          </Box>
        </Box>

        <Text bold>Output:</Text>
        <Box
          flexDirection="column"
          marginTop={1}
          paddingX={1}
          paddingY={1}
          borderStyle="single"
          borderColor={execResult.success ? 'green' : 'red'}
        >
          <Text wrap="wrap">
            {typeof execResult.output === 'string'
              ? execResult.output
              : JSON.stringify(execResult.output, null, 2)}
          </Text>
        </Box>

        {message && (
          <Box marginY={1}>
            <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>
          </Box>
        )}

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[B/ESC] Back to Details</Text>
        </Box>
      </Box>
    );
  }

  // List view
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Skills Library</Text>
        <Text color="gray"> - {filteredSkills.length} skills</Text>
        <Text color="yellow"> Filter: {categoryFilter}</Text>
      </Box>

      {/* Message */}
      {message && (
        <Box marginBottom={1}>
          <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>
        </Box>
      )}

      {filteredSkills.length === 0 ? (
        <Box marginY={1}>
          <Text color="yellow">
            No skills found. Try changing the filter.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          {/* Table header */}
          <Box marginBottom={1}>
            <Box width={30}><Text bold>Name</Text></Box>
            <Box width={14}><Text bold>Category</Text></Box>
            <Box width={12}><Text bold>Success</Text></Box>
            <Box width={10}><Text bold>Uses</Text></Box>
          </Box>
          <Text color="gray">{'─'.repeat(70)}</Text>

          {filteredSkills.map((skill, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={skill.id}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '>' : ' '}
                </Text>
                <Box width={29}>
                  <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                    {skill.name.substring(0, 28)}
                  </Text>
                </Box>
                <Box width={14}>
                  <Text color={getCategoryColor(skill.category)}>{skill.category}</Text>
                </Box>
                <Box width={12}>
                  <Text color={skill.success_rate >= 0.8 ? 'green' : skill.success_rate >= 0.5 ? 'yellow' : 'red'}>
                    {formatSuccessRate(skill.success_rate)}
                  </Text>
                </Box>
                <Box width={10}>
                  <Text>{skill.usage_count}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Text color="gray">
          [^v] Navigate  [Enter] Details  [F] Filter  [X] Execute
        </Text>
      </Box>
    </Box>
  );
}
