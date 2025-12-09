import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useEngagements, useEvidence } from '../../hooks/useAPI.js';
import { useInputContext } from '../../context/InputContext.js';
import type { EvidenceSentiment, EvidenceSourceType } from '../../types/api.js';

interface EvidenceTabProps {
  serverUrl: string;
  authToken?: string | undefined;
}

type ViewMode = 'select_engagement' | 'list' | 'detail';
type SentimentFilter = 'all' | EvidenceSentiment;

function getSourceIcon(type: EvidenceSourceType): string {
  switch (type) {
    case 'web': return '[W]';
    case 'document': return '[D]';
    case 'expert': return '[E]';
    case 'data': return '[#]';
    case 'filing': return '[F]';
    case 'financial': return '[$]';
  }
}

function getSourceColor(type: EvidenceSourceType): string {
  switch (type) {
    case 'web': return 'blue';
    case 'document': return 'cyan';
    case 'expert': return 'magenta';
    case 'data': return 'yellow';
    case 'filing': return 'gray';
    case 'financial': return 'green';
  }
}

function getSentimentColor(sentiment: EvidenceSentiment): string {
  switch (sentiment) {
    case 'supporting': return 'green';
    case 'neutral': return 'yellow';
    case 'contradicting': return 'red';
  }
}

function getSentimentIcon(sentiment: EvidenceSentiment): string {
  switch (sentiment) {
    case 'supporting': return '+';
    case 'neutral': return '~';
    case 'contradicting': return '-';
  }
}

function getCredibilityBar(credibility: number): string {
  const filled = Math.round(credibility * 5);
  const empty = 5 - filled;
  return '*'.repeat(filled) + '.'.repeat(empty);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function EvidenceTab({ serverUrl, authToken }: EvidenceTabProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('select_engagement');
  const [selectedEngagementIndex, setSelectedEngagementIndex] = useState(0);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');

  const { isInputActive } = useInputContext();

  const { engagements, loading: engLoading, error: engError } = useEngagements(serverUrl, authToken);
  const { evidence, stats, loading: evLoading, error: evError, refresh } = useEvidence(
    serverUrl,
    authToken,
    selectedEngagementId,
    sentimentFilter !== 'all' ? { sentiment: sentimentFilter } : undefined
  );

  // Filter evidence by sentiment
  const filteredEvidence = sentimentFilter === 'all'
    ? evidence
    : evidence.filter(e => e.sentiment === sentimentFilter);

  const selectedEvidence = filteredEvidence[selectedIndex];

  // Cycle through filters
  const cycleFilter = () => {
    const filters: SentimentFilter[] = ['all', 'supporting', 'neutral', 'contradicting'];
    const currentIdx = filters.indexOf(sentimentFilter);
    const nextIdx = (currentIdx + 1) % filters.length;
    setSentimentFilter(filters[nextIdx]!);
    setSelectedIndex(0);
  };

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
        setViewMode('list');
        setSelectedIndex(0);
      }
    } else if (viewMode === 'list') {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < filteredEvidence.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.return && selectedEvidence) {
        setViewMode('detail');
      }
      if (input === 'f' || input === 'F') {
        cycleFilter();
      }
      if (input === 'r' || input === 'R') {
        void refresh();
      }
      if (input === 'b' || input === 'B' || key.escape) {
        setViewMode('select_engagement');
        setSelectedEngagementId(null);
        setSelectedIndex(0);
      }
    } else if (viewMode === 'detail') {
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('list');
      }
    }
  });

  // Loading state
  if (engLoading || evLoading) {
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

  if (evError) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {evError}</Text>
        <Text color="gray">Press B to go back</Text>
      </Box>
    );
  }

  // Select engagement view
  if (viewMode === 'select_engagement') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Select an Engagement</Text>
        <Text color="gray">Browse evidence gathered for a deal</Text>
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
  if (viewMode === 'detail' && selectedEvidence) {
    const e = selectedEvidence;
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Evidence Details</Text>
        <Text color="gray">Press B or ESC to go back</Text>
        <Text>{''}</Text>

        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text bold>ID: </Text>
            <Text>{e.id}</Text>
          </Box>
          <Box>
            <Text bold>Source Type: </Text>
            <Text color={getSourceColor(e.source_type)}>{getSourceIcon(e.source_type)} {e.source_type}</Text>
          </Box>
          <Box>
            <Text bold>Sentiment: </Text>
            <Text color={getSentimentColor(e.sentiment)}>
              [{getSentimentIcon(e.sentiment)}] {e.sentiment}
            </Text>
          </Box>
          <Box>
            <Text bold>Credibility: </Text>
            <Text color="yellow">{getCredibilityBar(e.credibility)} {(e.credibility * 100).toFixed(0)}%</Text>
          </Box>
          {e.source_title && (
            <Box>
              <Text bold>Title: </Text>
              <Text>{e.source_title}</Text>
            </Box>
          )}
          {e.source_author && (
            <Box>
              <Text bold>Author: </Text>
              <Text>{e.source_author}</Text>
            </Box>
          )}
          {e.source_url && (
            <Box>
              <Text bold>URL: </Text>
              <Text color="blue">{truncate(e.source_url, 60)}</Text>
            </Box>
          )}
          <Text>{''}</Text>
          <Text bold>Content:</Text>
          <Box marginLeft={2} marginTop={1}>
            <Text wrap="wrap">{e.content}</Text>
          </Box>
        </Box>

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[B/ESC] Back to list</Text>
        </Box>
      </Box>
    );
  }

  // List view
  const selectedEng = engagements.find(eng => eng.id === selectedEngagementId);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Evidence</Text>
        <Text color="gray"> - {selectedEng?.name} ({filteredEvidence.length} items)</Text>
        <Text color="yellow"> Filter: {sentimentFilter}</Text>
      </Box>

      {/* Stats summary */}
      {stats && (
        <Box marginBottom={1}>
          <Text color="gray">
            Total: {stats.total ?? 0} |
            Avg Credibility: {((stats.avg_credibility ?? 0) * 100).toFixed(0)}% |
            <Text color="green"> +{stats.by_sentiment?.supporting ?? 0}</Text>
            <Text color="yellow"> ~{stats.by_sentiment?.neutral ?? 0}</Text>
            <Text color="red"> -{stats.by_sentiment?.contradicting ?? 0}</Text>
          </Text>
        </Box>
      )}

      {filteredEvidence.length === 0 ? (
        <Box marginY={1}>
          <Text color="yellow">
            {sentimentFilter === 'all'
              ? 'No evidence found. Run research to gather evidence.'
              : `No ${sentimentFilter} evidence found. Press F to change filter.`}
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          {/* Table header */}
          <Box marginBottom={1}>
            <Box width={5}><Text bold>Type</Text></Box>
            <Box width={10}><Text bold>Sentiment</Text></Box>
            <Box width={8}><Text bold>Cred.</Text></Box>
            <Box flexGrow={1}><Text bold>Content</Text></Box>
          </Box>
          <Text color="gray">{'─'.repeat(80)}</Text>

          {filteredEvidence.map((e, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={e.id}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '>' : ' '}
                </Text>
                <Box width={4}>
                  <Text color={getSourceColor(e.source_type)}>{getSourceIcon(e.source_type)}</Text>
                </Box>
                <Box width={10}>
                  <Text color={getSentimentColor(e.sentiment)}>
                    [{getSentimentIcon(e.sentiment)}]{e.sentiment.substring(0, 6)}
                  </Text>
                </Box>
                <Box width={8}>
                  <Text color="yellow">{(e.credibility * 100).toFixed(0)}%</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={isSelected ? 'cyan' : 'white'}>
                    {truncate(e.content, 50)}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Text color="gray">
          [^v] Navigate  [Enter] Details  [F] Filter ({sentimentFilter})  [R] Refresh  [B] Back
        </Text>
      </Box>
    </Box>
  );
}
