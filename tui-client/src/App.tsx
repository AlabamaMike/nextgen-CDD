import React, { useState } from 'react';
import { Box, Text } from 'ink';

interface AppProps {
  serverUrl: string;
}

export function App({ serverUrl }: AppProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor="blue" paddingX={1}>
        <Text bold>Thesis Validator TUI</Text>
        <Text> | </Text>
        <Text color="gray">Server: {serverUrl}</Text>
        <Text> | </Text>
        <Text color="green">✓ Online</Text>
      </Box>

      {/* Tab Bar */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color={activeTab === 0 ? 'cyan' : 'gray'}>[1] Engagements</Text>
        <Text>  </Text>
        <Text color={activeTab === 1 ? 'cyan' : 'gray'}>[2] Research</Text>
        <Text>  </Text>
        <Text color={activeTab === 2 ? 'cyan' : 'gray'}>[3] Evidence</Text>
        <Text>  </Text>
        <Text color={activeTab === 3 ? 'cyan' : 'gray'}>[4] Hypothesis</Text>
        <Text>  </Text>
        <Text color={activeTab === 4 ? 'cyan' : 'gray'}>[5] Monitor</Text>
        <Text>  </Text>
        <Text color="red">[Q] Quit</Text>
      </Box>

      {/* Content Area */}
      <Box flexGrow={1} paddingX={1} paddingY={1}>
        {activeTab === 0 && <Text>Engagements Tab - Coming Soon</Text>}
        {activeTab === 1 && <Text>Research Tab - Coming Soon</Text>}
        {activeTab === 2 && <Text>Evidence Tab - Coming Soon</Text>}
        {activeTab === 3 && <Text>Hypothesis Tab - Coming Soon</Text>}
        {activeTab === 4 && <Text>Monitor Tab - Coming Soon</Text>}
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          ↑↓: Navigate  Enter: Select  /: Search  ?: Help
        </Text>
      </Box>
    </Box>
  );
}
