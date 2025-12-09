import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { EngagementsTab } from './components/tabs/EngagementsTab.js';
import { ResearchTab } from './components/tabs/ResearchTab.js';
import { EvidenceTab } from './components/tabs/EvidenceTab.js';
import { HypothesisTab } from './components/tabs/HypothesisTab.js';
import { ContradictionTab } from './components/tabs/ContradictionTab.js';
import { StressTestTab } from './components/tabs/StressTestTab.js';
import { MonitorTab } from './components/tabs/MonitorTab.js';
import { useHealthCheck } from './hooks/useAPI.js';
import { InputProvider, useInputContext } from './context/InputContext.js';

interface AppProps {
  serverUrl: string;
  authToken?: string | undefined;
}

function AppContent({ serverUrl, authToken }: AppProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState(0);
  const { isOnline } = useHealthCheck(serverUrl);
  const { exit } = useApp();
  const { isInputActive } = useInputContext();

  // Handle keyboard input - disabled when input is active
  useInput((input, key) => {
    // Skip global hotkeys when text input is active
    if (isInputActive) return;

    // Tab switching
    if (input === '1') setActiveTab(0);
    if (input === '2') setActiveTab(1);
    if (input === '3') setActiveTab(2);
    if (input === '4') setActiveTab(3);
    if (input === '5') setActiveTab(4);
    if (input === '6') setActiveTab(5);
    if (input === '7') setActiveTab(6);

    // Quit
    if (input === 'q' || input === 'Q') {
      exit();
    }

    // Ctrl+C also quits
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  // Tab-specific help text
  const getHelpText = (): string => {
    switch (activeTab) {
      case 0:
        return '↑↓: Navigate  Enter: Details  N: New  E: Edit  D: Delete';
      case 1:
        return '↑↓: Navigate  Enter: Select  S: Edit Thesis  R: Run  B: Back  ESC: Cancel';
      case 2:
        return '↑↓: Navigate  Enter: Details  F: Filter  R: Refresh  B: Back';
      case 3:
        return '↑↓: Navigate  Enter: Expand/Collapse  V: Details  E: Expand All  C: Collapse  B: Back';
      case 4:
        return '↑↓: Navigate  Enter: Details  F: Filter  E: Explain  D: Dismiss  C: Critical  B: Back';
      case 5:
        return '↑↓: Navigate  Enter: Details  N: New Test  R: Refresh  D: Delete  B: Back';
      case 6:
        return '↑↓: Navigate  Enter: Select  R: Refresh  C: Calculate  A: Auto-refresh  B: Back';
      default:
        return '1-7: Switch Tabs  Q: Quit  ?: Help';
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Header serverUrl={serverUrl} isOnline={isOnline} />

      {/* Tab Bar */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color={activeTab === 0 ? 'cyan' : 'gray'}>[1] Deals</Text>
        <Text> </Text>
        <Text color={activeTab === 1 ? 'cyan' : 'gray'}>[2] Research</Text>
        <Text> </Text>
        <Text color={activeTab === 2 ? 'cyan' : 'gray'}>[3] Evidence</Text>
        <Text> </Text>
        <Text color={activeTab === 3 ? 'cyan' : 'gray'}>[4] Hypotheses</Text>
        <Text> </Text>
        <Text color={activeTab === 4 ? 'yellow' : 'gray'}>[5] Contra</Text>
        <Text> </Text>
        <Text color={activeTab === 5 ? 'red' : 'gray'}>[6] Stress</Text>
        <Text> </Text>
        <Text color={activeTab === 6 ? 'cyan' : 'gray'}>[7] Monitor</Text>
        <Text> </Text>
        <Text color="red">[Q]</Text>
      </Box>

      {/* Content Area */}
      <Box flexGrow={1} paddingX={1} paddingY={1}>
        {activeTab === 0 && <EngagementsTab serverUrl={serverUrl} authToken={authToken} />}
        {activeTab === 1 && <ResearchTab serverUrl={serverUrl} authToken={authToken} />}
        {activeTab === 2 && <EvidenceTab serverUrl={serverUrl} authToken={authToken} />}
        {activeTab === 3 && <HypothesisTab serverUrl={serverUrl} authToken={authToken} />}
        {activeTab === 4 && <ContradictionTab serverUrl={serverUrl} authToken={authToken} />}
        {activeTab === 5 && <StressTestTab serverUrl={serverUrl} authToken={authToken} />}
        {activeTab === 6 && <MonitorTab serverUrl={serverUrl} authToken={authToken} />}
      </Box>

      <Footer helpText={getHelpText()} />
    </Box>
  );
}

export function App({ serverUrl, authToken }: AppProps): React.ReactElement {
  return (
    <InputProvider>
      <AppContent serverUrl={serverUrl} authToken={authToken} />
    </InputProvider>
  );
}
