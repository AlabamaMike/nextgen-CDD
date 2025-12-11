import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { SkillParameter, SkillData, SkillExecuteRequest } from '../../types/api.js';
import { useInputContext } from '../../context/InputContext.js';

interface SkillExecuteFormProps {
  skill: SkillData;
  onSubmit: (request: SkillExecuteRequest) => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function SkillExecuteForm({
  skill,
  onSubmit,
  onCancel,
  isExecuting = false,
}: SkillExecuteFormProps): React.ReactElement {
  const parameters = skill.parameters ?? [];
  const [currentParamIndex, setCurrentParamIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    // Initialize with defaults
    const initial: Record<string, unknown> = {};
    for (const param of parameters) {
      if (param.default !== undefined) {
        initial[param.name] = param.default;
      } else if (param.type === 'boolean') {
        initial[param.name] = false;
      } else if (param.type === 'number') {
        initial[param.name] = 0;
      } else if (param.type === 'array') {
        initial[param.name] = [];
      } else if (param.type === 'object') {
        initial[param.name] = {};
      } else {
        initial[param.name] = '';
      }
    }
    return initial;
  });

  const { setInputActive } = useInputContext();

  const currentParam = parameters[currentParamIndex];
  const isTextInputActive = currentParam && (currentParam.type === 'string' || currentParam.type === 'number' || currentParam.type === 'array');

  // Sync text input state with global input state
  useEffect(() => {
    setInputActive(!!isTextInputActive);
    return () => setInputActive(false);
  }, [isTextInputActive, setInputActive]);

  // Determine if we can submit (all required fields filled)
  const canSubmit = useMemo(() => {
    for (const param of parameters) {
      if (param.required) {
        const value = formData[param.name];
        if (value === undefined || value === '' || value === null) {
          return false;
        }
        if (param.type === 'array' && Array.isArray(value) && value.length === 0) {
          return false;
        }
      }
    }
    return true;
  }, [formData, parameters]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (isExecuting) return;

    // Cancel with Escape
    if (key.escape) {
      onCancel();
      return;
    }

    // Submit with Ctrl+S
    if (key.ctrl && input === 's') {
      if (canSubmit) {
        handleSubmit();
      }
      return;
    }

    // Handle boolean toggle
    if (currentParam?.type === 'boolean') {
      if (input === ' ' || key.return) {
        setFormData({ ...formData, [currentParam.name]: !formData[currentParam.name] });
      }
      if (key.upArrow && currentParamIndex > 0) {
        setCurrentParamIndex(currentParamIndex - 1);
      }
      if (key.downArrow && currentParamIndex < parameters.length - 1) {
        setCurrentParamIndex(currentParamIndex + 1);
      }
    }

    // Handle enum selection
    if (currentParam?.validation?.enum) {
      const enumValues = currentParam.validation.enum;
      const currentValue = formData[currentParam.name] as string;
      const currentEnumIndex = enumValues.indexOf(currentValue);

      if (key.upArrow) {
        if (currentEnumIndex > 0) {
          setFormData({ ...formData, [currentParam.name]: enumValues[currentEnumIndex - 1] });
        }
      }
      if (key.downArrow) {
        if (currentEnumIndex < enumValues.length - 1) {
          setFormData({ ...formData, [currentParam.name]: enumValues[currentEnumIndex + 1] });
        }
      }
      if (key.return) {
        // Move to next param
        if (currentParamIndex < parameters.length - 1) {
          setCurrentParamIndex(currentParamIndex + 1);
        }
      }
    }
  });

  const handleFieldChange = (value: string) => {
    if (!currentParam) return;

    if (currentParam.type === 'number') {
      const numValue = parseFloat(value);
      setFormData({ ...formData, [currentParam.name]: isNaN(numValue) ? 0 : numValue });
    } else if (currentParam.type === 'array') {
      // Parse comma-separated values
      const arrayValue = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
      setFormData({ ...formData, [currentParam.name]: arrayValue });
    } else {
      setFormData({ ...formData, [currentParam.name]: value });
    }
  };

  const handleFieldSubmit = () => {
    if (currentParamIndex < parameters.length - 1) {
      setCurrentParamIndex(currentParamIndex + 1);
    } else if (canSubmit) {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const request: SkillExecuteRequest = {
      parameters: formData,
      context: {},
    };
    onSubmit(request);
  };

  // No parameters - can execute directly
  if (parameters.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Execute Skill: {skill.name}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">{'─'.repeat(60)}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="yellow">This skill has no parameters. Press Enter or Ctrl+S to execute.</Text>
        </Box>
        {isExecuting ? (
          <Box marginTop={1}>
            <Text color="yellow">Executing...</Text>
          </Box>
        ) : (
          <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
            <Text color="gray">[Ctrl+S/Enter] Execute  [Esc] Cancel</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Execute Skill: {skill.name}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(60)}</Text>
      </Box>

      {/* Parameter Fields */}
      {parameters.map((param, idx) => {
        const isActive = idx === currentParamIndex;
        const value = formData[param.name];

        return (
          <Box key={param.name} flexDirection="column" marginBottom={1}>
            <Box marginBottom={1}>
              <Text color={isActive ? 'cyan' : 'gray'}>
                {param.name}
                {param.required ? ' *' : ' (optional)'}
                {isActive ? ` (${param.type})` : ''}
              </Text>
            </Box>
            <Box paddingLeft={2}>
              <Text color="gray" dimColor>{param.description}</Text>
            </Box>
            <Box marginTop={1}>
              {isActive ? (
                renderActiveInput(param, value, handleFieldChange, handleFieldSubmit)
              ) : (
                <Text color="white">{formatValue(value, param.type)}</Text>
              )}
            </Box>
          </Box>
        );
      })}

      {/* Validation Message */}
      {!canSubmit && (
        <Box marginTop={1}>
          <Text color="red">Please fill in all required fields (*)</Text>
        </Box>
      )}

      {/* Status/Instructions */}
      {isExecuting ? (
        <Box marginTop={1}>
          <Text color="yellow">Executing skill...</Text>
        </Box>
      ) : (
        <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
          <Text color="gray">
            [Enter] Next Field  [Ctrl+S] Execute  [Esc] Cancel
          </Text>
        </Box>
      )}
    </Box>
  );
}

function renderActiveInput(
  param: SkillParameter,
  value: unknown,
  onChange: (value: string) => void,
  onSubmit: () => void
): React.ReactElement {
  // Enum type - show dropdown
  if (param.validation?.enum) {
    const enumValues = param.validation.enum;
    const currentValue = value as string;

    return (
      <Box flexDirection="column">
        {enumValues.map((enumValue) => (
          <Box key={enumValue}>
            {enumValue === currentValue ? (
              <Text color="cyan" bold>▸ {enumValue}</Text>
            ) : (
              <Text color="gray">  {enumValue}</Text>
            )}
          </Box>
        ))}
      </Box>
    );
  }

  // Boolean type - show toggle
  if (param.type === 'boolean') {
    const boolValue = value as boolean;
    return (
      <Box>
        <Text color={boolValue ? 'green' : 'red'}>
          [{boolValue ? '✓' : ' '}] {boolValue ? 'true' : 'false'}
        </Text>
        <Text color="gray"> (Space/Enter to toggle)</Text>
      </Box>
    );
  }

  // Array type - comma-separated input
  if (param.type === 'array') {
    const arrayValue = Array.isArray(value) ? value.join(', ') : '';
    return (
      <Box flexDirection="column">
        <TextInput
          value={arrayValue}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Enter comma-separated values..."
        />
      </Box>
    );
  }

  // Number type
  if (param.type === 'number') {
    return (
      <TextInput
        value={String(value ?? '')}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={`Enter a number${param.validation?.min !== undefined ? ` (min: ${param.validation.min})` : ''}${param.validation?.max !== undefined ? ` (max: ${param.validation.max})` : ''}...`}
      />
    );
  }

  // Default: string input
  return (
    <TextInput
      value={String(value ?? '')}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={`Enter ${param.name}...`}
    />
  );
}

function formatValue(value: unknown, type: string): string {
  if (value === undefined || value === null || value === '') {
    return '(not set)';
  }
  if (type === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (type === 'array' && Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '(empty)';
  }
  if (type === 'object' && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
