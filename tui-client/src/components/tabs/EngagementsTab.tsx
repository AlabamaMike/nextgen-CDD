import React from 'react';
import { Box, Text } from 'ink';
import type { Engagement } from '../../types/api.js';

// Mock data for testing
const mockEngagements: Engagement[] = [
  {
    id: 'eng-1',
    name: 'TechCo Acquisition',
    target: {
      name: 'TechCo',
      sector: 'Software',
      location: 'San Francisco',
    },
    deal_type: 'buyout',
    status: 'research_active',
    created_at: Date.now() - 86400000 * 2, // 2 days ago
    updated_at: Date.now(),
    created_by: 'user-1',
  },
  {
    id: 'eng-2',
    name: 'MediHealth Growth Investment',
    target: {
      name: 'MediHealth',
      sector: 'Healthcare',
      location: 'Boston',
    },
    deal_type: 'growth',
    status: 'pending',
    created_at: Date.now() - 86400000 * 5, // 5 days ago
    updated_at: Date.now() - 86400000,
    created_by: 'user-2',
  },
  {
    id: 'eng-3',
    name: 'FinServe Platform',
    target: {
      name: 'FinServe',
      sector: 'Financial Services',
      location: 'New York',
    },
    deal_type: 'venture',
    status: 'research_complete',
    created_at: Date.now() - 86400000 * 10, // 10 days ago
    updated_at: Date.now() - 86400000 * 3,
    created_by: 'user-1',
  },
];

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusColor(
  status: Engagement['status']
): 'green' | 'yellow' | 'blue' | 'red' | 'gray' {
  switch (status) {
    case 'research_active':
      return 'yellow';
    case 'research_complete':
      return 'green';
    case 'completed':
      return 'blue';
    case 'research_failed':
      return 'red';
    case 'pending':
      return 'gray';
  }
}

function formatStatus(status: Engagement['status']): string {
  switch (status) {
    case 'research_active':
      return 'Active';
    case 'research_complete':
      return 'Complete';
    case 'completed':
      return 'Done';
    case 'research_failed':
      return 'Failed';
    case 'pending':
      return 'Pending';
  }
}

export function EngagementsTab(): React.ReactElement {
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Table Header */}
      <Box marginBottom={1}>
        <Box width={30}>
          <Text bold>Name</Text>
        </Box>
        <Box width={25}>
          <Text bold>Target</Text>
        </Box>
        <Box width={15}>
          <Text bold>Status</Text>
        </Box>
        <Box width={15}>
          <Text bold>Created</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text color="gray">
          {'─'.repeat(85)}
        </Text>
      </Box>

      {/* Table Rows */}
      {mockEngagements.map((eng) => (
        <Box key={eng.id} marginBottom={1}>
          <Box width={30}>
            <Text>{eng.name}</Text>
          </Box>
          <Box width={25}>
            <Text color="cyan">{eng.target.name}</Text>
          </Box>
          <Box width={15}>
            <Text color={getStatusColor(eng.status)}>{formatStatus(eng.status)}</Text>
          </Box>
          <Box width={15}>
            <Text color="gray">{formatDate(eng.created_at)}</Text>
          </Box>
        </Box>
      ))}

      {/* Empty State */}
      {mockEngagements.length === 0 && (
        <Box marginY={2}>
          <Text color="gray">No engagements found. Press [N] to create a new one.</Text>
        </Box>
      )}

      {/* Action Hints */}
      <Box marginTop={2} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">
          [N] New  [E] Edit  [D] Delete  [Enter] Details  [↑↓] Navigate
        </Text>
      </Box>
    </Box>
  );
}
