import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useEngagements, useHypotheses } from '../../hooks/useAPI.js';
import { useInputContext } from '../../context/InputContext.js';
import type { HypothesisData, CausalEdge, HypothesisType, HypothesisStatus } from '../../types/api.js';

interface HypothesisTabProps {
  serverUrl: string;
  authToken?: string | undefined;
}

type ViewMode = 'select_engagement' | 'tree' | 'detail';

interface TreeNode {
  hypothesis: HypothesisData;
  children: TreeNode[];
  depth: number;
}

function getTypeIcon(type: HypothesisType): string {
  switch (type) {
    case 'thesis': return '[T]';
    case 'lever': return '[L]';
    case 'assumption': return '[A]';
    case 'risk': return '[R]';
    case 'dependency': return '[D]';
  }
}

function getTypeColor(type: HypothesisType): string {
  switch (type) {
    case 'thesis': return 'cyan';
    case 'lever': return 'green';
    case 'assumption': return 'yellow';
    case 'risk': return 'red';
    case 'dependency': return 'magenta';
  }
}

function getStatusColor(status: HypothesisStatus): string {
  switch (status) {
    case 'validated': return 'green';
    case 'invalidated': return 'red';
    case 'testing': return 'yellow';
    case 'proposed': return 'gray';
    case 'deferred': return 'magenta';
  }
}

function getConfidenceBar(confidence: number): string {
  const filled = Math.round(confidence * 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function buildTree(hypotheses: HypothesisData[], _edges: CausalEdge[]): TreeNode[] {
  // Find root nodes (those without parent_id)
  const rootNodes = hypotheses.filter(h => !h.parent_id);
  const childMap = new Map<string, HypothesisData[]>();

  // Group children by parent_id
  for (const h of hypotheses) {
    if (h.parent_id) {
      const children = childMap.get(h.parent_id) || [];
      children.push(h);
      childMap.set(h.parent_id, children);
    }
  }

  // Recursively build tree
  function buildNode(hypothesis: HypothesisData, depth: number): TreeNode {
    const children = childMap.get(hypothesis.id) || [];
    return {
      hypothesis,
      children: children.map(child => buildNode(child, depth + 1)),
      depth,
    };
  }

  return rootNodes.map(h => buildNode(h, 0));
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];

  function traverse(node: TreeNode): void {
    result.push(node);
    if (expanded.has(node.hypothesis.id)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return result;
}

export function HypothesisTab({ serverUrl, authToken }: HypothesisTabProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('select_engagement');
  const [selectedEngagementIndex, setSelectedEngagementIndex] = useState(0);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { isInputActive } = useInputContext();

  const { engagements, loading: engLoading, error: engError } = useEngagements(serverUrl, authToken);
  const { hypotheses, edges, loading: hypLoading, error: hypError, refresh } = useHypotheses(
    serverUrl,
    authToken,
    selectedEngagementId
  );

  // Build and flatten tree
  const tree = useMemo(() => buildTree(hypotheses, edges), [hypotheses, edges]);
  const flatNodes = useMemo(() => flattenTree(tree, expandedNodes), [tree, expandedNodes]);

  const selectedNode = flatNodes[selectedIndex];

  // Keyboard input
  useInput((input, key) => {
    if (isInputActive) return;

    if (viewMode === 'select_engagement') {
      if (key.upArrow && selectedEngagementIndex > 0) {
        setSelectedEngagementIndex(selectedEngagementIndex - 1);
      }
      if (key.downArrow && selectedEngagementIndex < engagements.length - 1) {
        setSelectedEngagementIndex(selectedEngagementIndex + 1);
      }
      if (key.return && engagements[selectedEngagementIndex]) {
        setSelectedEngagementId(engagements[selectedEngagementIndex]!.id);
        setViewMode('tree');
        setSelectedIndex(0);
        setExpandedNodes(new Set());
      }
    } else if (viewMode === 'tree') {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < flatNodes.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.return && selectedNode) {
        // Toggle expand/collapse
        const newExpanded = new Set(expandedNodes);
        if (expandedNodes.has(selectedNode.hypothesis.id)) {
          newExpanded.delete(selectedNode.hypothesis.id);
        } else {
          newExpanded.add(selectedNode.hypothesis.id);
        }
        setExpandedNodes(newExpanded);
      }
      if ((input === 'v' || input === 'V') && selectedNode) {
        setViewMode('detail');
      }
      if (input === 'r' || input === 'R') {
        void refresh();
      }
      if (input === 'b' || input === 'B' || key.escape) {
        setViewMode('select_engagement');
        setSelectedEngagementId(null);
        setSelectedIndex(0);
      }
      // Expand all
      if (input === 'e' || input === 'E') {
        const allIds = new Set(hypotheses.map(h => h.id));
        setExpandedNodes(allIds);
      }
      // Collapse all
      if (input === 'c' || input === 'C') {
        setExpandedNodes(new Set());
      }
    } else if (viewMode === 'detail') {
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('tree');
      }
    }
  });

  // Loading state
  if (engLoading || hypLoading) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Loading...</Text>
      </Box>
    );
  }

  // Error state
  if (engError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {engError}</Text>
      </Box>
    );
  }

  if (hypError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {hypError}</Text>
        <Text color="gray">Press B to go back</Text>
      </Box>
    );
  }

  // Select engagement view
  if (viewMode === 'select_engagement') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Select an Engagement</Text>
        <Text color="gray">View the hypothesis tree for a deal</Text>
        <Text>{''}</Text>

        {engagements.length === 0 ? (
          <Text color="yellow">No engagements found. Create one first!</Text>
        ) : (
          engagements.map((eng, index) => (
            <Box key={eng.id}>
              <Text color={index === selectedEngagementIndex ? 'cyan' : 'white'}>
                {index === selectedEngagementIndex ? '> ' : '  '}
                {eng.name} ({eng.target.name}) - {eng.status}
              </Text>
            </Box>
          ))
        )}

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[^v] Navigate  [Enter] Select</Text>
        </Box>
      </Box>
    );
  }

  // Detail view
  if (viewMode === 'detail' && selectedNode) {
    const h = selectedNode.hypothesis;
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Hypothesis Details</Text>
        <Text color="gray">Press B or ESC to go back</Text>
        <Text>{''}</Text>

        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text bold>ID: </Text>
            <Text>{h.id}</Text>
          </Box>
          <Box>
            <Text bold>Type: </Text>
            <Text color={getTypeColor(h.type)}>{getTypeIcon(h.type)} {h.type}</Text>
          </Box>
          <Box>
            <Text bold>Status: </Text>
            <Text color={getStatusColor(h.status)}>{h.status}</Text>
          </Box>
          <Box>
            <Text bold>Importance: </Text>
            <Text>{h.importance}</Text>
          </Box>
          <Box>
            <Text bold>Testability: </Text>
            <Text>{h.testability}</Text>
          </Box>
          <Text>{''}</Text>
          <Box>
            <Text bold>Confidence: </Text>
            <Text color="cyan">{getConfidenceBar(h.confidence)} {(h.confidence * 100).toFixed(0)}%</Text>
          </Box>
          <Text>{''}</Text>
          <Text bold>Content:</Text>
          <Box marginLeft={2} marginTop={1}>
            <Text wrap="wrap">{h.content}</Text>
          </Box>
        </Box>

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[B/ESC] Back to tree</Text>
        </Box>
      </Box>
    );
  }

  // Tree view
  const selectedEng = engagements.find(e => e.id === selectedEngagementId);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Hypothesis Tree</Text>
        <Text color="gray"> - {selectedEng?.name} ({hypotheses.length} nodes)</Text>
      </Box>

      {hypotheses.length === 0 ? (
        <Box marginY={1}>
          <Text color="yellow">No hypotheses found. Run research to generate hypotheses.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          {flatNodes.map((node, index) => {
            const h = node.hypothesis;
            const isSelected = index === selectedIndex;
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedNodes.has(h.id);
            const indent = '  '.repeat(node.depth);
            const expandIcon = hasChildren ? (isExpanded ? '[-]' : '[+]') : '   ';

            return (
              <Box key={h.id}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '>' : ' '}{indent}{expandIcon}
                </Text>
                <Text color={getTypeColor(h.type)}> {getTypeIcon(h.type)} </Text>
                <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                  {h.content.substring(0, 60)}{h.content.length > 60 ? '...' : ''}
                </Text>
                <Text color={getStatusColor(h.status)}> [{h.status}]</Text>
                <Text color="gray"> {(h.confidence * 100).toFixed(0)}%</Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Text color="gray">
          [^v] Navigate  [Enter] Expand/Collapse  [V] Details  [E] Expand All  [C] Collapse All  [R] Refresh  [B] Back
        </Text>
      </Box>
    </Box>
  );
}
