import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Engagement, UpdateEngagementRequest } from '../../types/api.js';
import { useInputContext } from '../../context/InputContext.js';

interface EngagementEditFormProps {
  engagement: Engagement;
  onSubmit: (data: UpdateEngagementRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type FormField = 'name' | 'target_name' | 'sector' | 'location';

const SECTORS = [
  'technology',
  'healthcare',
  'financial_services',
  'consumer',
  'industrial',
  'energy',
  'real_estate',
  'other',
];

export function EngagementEditForm({
  engagement,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EngagementEditFormProps): React.ReactElement {
  const [currentField, setCurrentField] = useState<FormField>('name');
  const [formData, setFormData] = useState({
    name: engagement.name,
    target_name: engagement.target.name,
    sector: engagement.target.sector,
    location: engagement.target.location ?? '',
  });
  const [sectorIndex, setSectorIndex] = useState(() => {
    const idx = SECTORS.indexOf(engagement.target.sector);
    return idx >= 0 ? idx : SECTORS.length - 1;
  });
  const { setInputActive } = useInputContext();

  // Text input is active when currentField is a text field
  const isTextInputActive = currentField === 'name' || currentField === 'target_name' || currentField === 'location';

  // Sync text input state with global input state to disable app hotkeys
  useEffect(() => {
    setInputActive(isTextInputActive);
    return () => setInputActive(false);
  }, [isTextInputActive, setInputActive]);

  // Handle field navigation
  useInput((input, key) => {
    if (isSubmitting) return;

    // Cancel with Escape
    if (key.escape) {
      onCancel();
      return;
    }

    // Submit with Ctrl+S
    if (key.ctrl && input === 's') {
      handleSubmit();
      return;
    }

    // Tab between fields (when not in text input)
    if (key.tab && !isTextInputActive) {
      const fields: FormField[] = ['name', 'target_name', 'sector', 'location'];
      const currentIdx = fields.indexOf(currentField);
      const nextIdx = key.shift
        ? (currentIdx - 1 + fields.length) % fields.length
        : (currentIdx + 1) % fields.length;
      setCurrentField(fields[nextIdx]!);
    }

    // Navigation for dropdown fields
    if (currentField === 'sector') {
      if (key.upArrow && sectorIndex > 0) {
        setSectorIndex(sectorIndex - 1);
      } else if (key.downArrow && sectorIndex < SECTORS.length - 1) {
        setSectorIndex(sectorIndex + 1);
      } else if (key.return) {
        setFormData({ ...formData, sector: SECTORS[sectorIndex] || 'other' });
        setCurrentField('location');
      }
    }
  });

  const handleFieldChange = (field: FormField, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFieldSubmit = () => {
    if (currentField === 'name') {
      setCurrentField('target_name');
    } else if (currentField === 'target_name') {
      setCurrentField('sector');
    } else if (currentField === 'location') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return;
    }

    const updates: UpdateEngagementRequest = {};

    // Only include changed fields
    if (formData.name !== engagement.name) {
      updates.name = formData.name;
    }

    const targetUpdates: UpdateEngagementRequest['target'] = {};
    let hasTargetUpdates = false;

    if (formData.target_name !== engagement.target.name) {
      targetUpdates.name = formData.target_name;
      hasTargetUpdates = true;
    }
    if (formData.sector !== engagement.target.sector) {
      targetUpdates.sector = formData.sector;
      hasTargetUpdates = true;
    }
    if (formData.location !== (engagement.target.location ?? '')) {
      if (formData.location) {
        targetUpdates.location = formData.location;
      }
      hasTargetUpdates = true;
    }

    if (hasTargetUpdates) {
      updates.target = targetUpdates;
    }

    // Only submit if there are actual changes
    if (Object.keys(updates).length === 0) {
      onCancel();
      return;
    }

    onSubmit(updates);
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Form Title */}
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Edit Engagement
        </Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(60)}</Text>
      </Box>

      {/* Engagement Name */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={currentField === 'name' ? 'cyan' : 'gray'}>
            Engagement Name {currentField === 'name' ? '*' : ''}
          </Text>
        </Box>
        <Box>
          {currentField === 'name' ? (
            <TextInput
              value={formData.name}
              onChange={(value) => handleFieldChange('name', value)}
              onSubmit={handleFieldSubmit}
              placeholder="e.g., Deal with Acme Corporation"
            />
          ) : (
            <Text color="white">{formData.name}</Text>
          )}
        </Box>
      </Box>

      {/* Target Company Name */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={currentField === 'target_name' ? 'cyan' : 'gray'}>
            Target Company Name {currentField === 'target_name' ? '*' : ''}
          </Text>
        </Box>
        <Box>
          {currentField === 'target_name' ? (
            <TextInput
              value={formData.target_name}
              onChange={(value) => handleFieldChange('target_name', value)}
              onSubmit={handleFieldSubmit}
              placeholder="e.g., Acme Corporation"
            />
          ) : (
            <Text color="white">{formData.target_name}</Text>
          )}
        </Box>
      </Box>

      {/* Sector */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={currentField === 'sector' ? 'cyan' : 'gray'}>
            Sector {currentField === 'sector' ? '(use arrow keys, Enter to select)' : ''}
          </Text>
        </Box>
        {currentField === 'sector' ? (
          <Box flexDirection="column">
            {SECTORS.map((sector, idx) => (
              <Box key={sector}>
                {idx === sectorIndex ? (
                  <Text color="cyan" bold>
                    {sector}
                  </Text>
                ) : (
                  <Text color="gray">  {sector}</Text>
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <Box>
            <Text color="white">{formData.sector}</Text>
          </Box>
        )}
      </Box>

      {/* Location */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={currentField === 'location' ? 'cyan' : 'gray'}>
            Location (optional) {currentField === 'location' ? '(Enter to submit)' : ''}
          </Text>
        </Box>
        <Box>
          {currentField === 'location' ? (
            <TextInput
              value={formData.location}
              onChange={(value) => handleFieldChange('location', value)}
              onSubmit={handleFieldSubmit}
              placeholder="e.g., New York, NY"
            />
          ) : (
            <Text color="white">{formData.location || '(not set)'}</Text>
          )}
        </Box>
      </Box>

      {/* Status/Instructions */}
      {isSubmitting ? (
        <Box marginTop={1}>
          <Text color="yellow">Updating engagement...</Text>
        </Box>
      ) : (
        <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
          <Text color="gray">
            [Ctrl+S] Save  [Tab] Next Field  [Esc] Cancel
          </Text>
        </Box>
      )}
    </Box>
  );
}
