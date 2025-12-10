import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HelpItem {
  key: string;
  description: string;
}

interface HelpSection {
  title: string;
  items: HelpItem[];
}

type TabContext =
  | 'deals'
  | 'research'
  | 'evidence'
  | 'hypotheses'
  | 'contradictions'
  | 'stress-tests'
  | 'monitor'
  | 'skills'
  | 'documents'
  | 'global';

const HELP_CONTENT: Record<TabContext, HelpSection[]> = {
  global: [
    {
      title: 'Navigation',
      items: [
        { key: '1-9', description: 'Switch between tabs' },
        { key: 'Q', description: 'Quit application' },
        { key: '?', description: 'Toggle this help view' },
        { key: 'ESC', description: 'Go back / Cancel current action' },
      ],
    },
    {
      title: 'Common Actions',
      items: [
        { key: 'Arrow Up/Down', description: 'Navigate lists' },
        { key: 'Enter', description: 'Select / Expand item' },
        { key: 'R', description: 'Refresh current view' },
        { key: 'B', description: 'Go back to list view' },
      ],
    },
  ],
  deals: [
    {
      title: 'Deals Tab',
      items: [
        { key: 'N', description: 'Create new engagement' },
        { key: 'E', description: 'Edit selected engagement' },
        { key: 'D', description: 'Delete selected engagement' },
        { key: 'Enter', description: 'View engagement details' },
      ],
    },
  ],
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
  evidence: [
    {
      title: 'Evidence Tab',
      items: [
        { key: 'F', description: 'Filter evidence by type/sentiment' },
        { key: 'Enter', description: 'View evidence details' },
        { key: 'L', description: 'Link evidence to hypothesis' },
      ],
    },
  ],
  hypotheses: [
    {
      title: 'Hypotheses Tab',
      items: [
        { key: 'E', description: 'Expand all hypothesis nodes' },
        { key: 'C', description: 'Collapse all hypothesis nodes' },
        { key: 'V', description: 'View hypothesis details' },
        { key: 'Enter', description: 'Toggle expand/collapse' },
      ],
    },
  ],
  contradictions: [
    {
      title: 'Contradictions Tab',
      items: [
        { key: 'F', description: 'Filter by severity/status' },
        { key: 'E', description: 'Mark as explained' },
        { key: 'D', description: 'Dismiss contradiction' },
        { key: 'C', description: 'Mark as critical' },
      ],
    },
  ],
  'stress-tests': [
    {
      title: 'Stress Tests Tab',
      items: [
        { key: 'N', description: 'Start new stress test' },
        { key: 'D', description: 'Delete stress test' },
        { key: 'Enter', description: 'View stress test details' },
      ],
    },
  ],
  monitor: [
    {
      title: 'Monitor Tab',
      items: [
        { key: 'C', description: 'Calculate/update metrics' },
        { key: 'A', description: 'Toggle auto-refresh' },
        { key: 'Enter', description: 'View metric details' },
      ],
    },
  ],
  skills: [
    {
      title: 'Skills Tab',
      items: [
        { key: 'F', description: 'Filter by category' },
        { key: 'X', description: 'Execute selected skill' },
        { key: 'Enter', description: 'View skill details' },
      ],
    },
  ],
  documents: [
    {
      title: 'Documents Tab',
      items: [
        { key: 'U', description: 'Upload a new document' },
        { key: 'D', description: 'Delete selected document' },
        { key: 'F', description: 'Filter by status' },
        { key: 'R', description: 'Refresh document list' },
        { key: 'Enter', description: 'View document details' },
      ],
    },
  ],
};

function getTabContext(tabIndex: number): TabContext {
  switch (tabIndex) {
    case 0:
      return 'deals';
    case 1:
      return 'research';
    case 2:
      return 'evidence';
    case 3:
      return 'hypotheses';
    case 4:
      return 'contradictions';
    case 5:
      return 'stress-tests';
    case 6:
      return 'monitor';
    case 7:
      return 'skills';
    case 8:
      return 'documents';
    default:
      return 'global';
  }
}

interface HelpViewProps {
  tabIndex: number;
  onClose: () => void;
}

export function HelpView({ tabIndex, onClose }: HelpViewProps): React.ReactElement {
  const context = getTabContext(tabIndex);
  const globalSections = HELP_CONTENT['global'];
  const contextSections = HELP_CONTENT[context];

  useInput((input, key) => {
    if (key.escape || input === '?' || input === 'h' || input === 'H') {
      onClose();
    }
  });

  const allSections = context === 'global' ? globalSections : [...contextSections, ...globalSections];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">
          Help - {context.charAt(0).toUpperCase() + context.slice(1).replace('-', ' ')}
        </Text>
        <Text color="gray">[ESC] or [?] to close</Text>
      </Box>

      {allSections.map((section, sectionIdx) => (
        <Box key={sectionIdx} flexDirection="column" marginBottom={1}>
          <Text bold color="yellow">
            {section.title}
          </Text>
          {section.items.map((item, itemIdx) => (
            <Box key={itemIdx} paddingLeft={1}>
              <Box width={18}>
                <Text color="cyan">{item.key}</Text>
              </Box>
              <Text>{item.description}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function getHelpForContext(context: TabContext): HelpItem[] {
  const sections = HELP_CONTENT[context] ?? [];
  return sections.flatMap((section) => section.items);
}
