import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { ThesisValidatorClient } from '../../api/client.js';
import { useEngagements } from '../../hooks/useAPI.js';
import { useInputContext } from '../../context/InputContext.js';
import type { DocumentData, DocumentFormat, DocumentStatus } from '../../types/api.js';

interface DocumentsTabProps {
  serverUrl: string;
  authToken?: string | undefined;
}

type ViewMode = 'select_engagement' | 'list' | 'detail' | 'upload';
type StatusFilter = 'all' | DocumentStatus;

function getFormatIcon(format: DocumentFormat): string {
  switch (format) {
    case 'pdf': return '[P]';
    case 'docx': return '[W]';
    case 'xlsx': return '[X]';
    case 'pptx': return '[S]';
    case 'html': return '[H]';
    case 'image': return '[I]';
    case 'unknown': return '[?]';
  }
}

function getFormatColor(format: DocumentFormat): string {
  switch (format) {
    case 'pdf': return 'red';
    case 'docx': return 'blue';
    case 'xlsx': return 'green';
    case 'pptx': return 'yellow';
    case 'html': return 'cyan';
    case 'image': return 'magenta';
    case 'unknown': return 'gray';
  }
}

function getStatusColor(status: DocumentStatus): string {
  switch (status) {
    case 'pending': return 'yellow';
    case 'processing': return 'cyan';
    case 'completed': return 'green';
    case 'failed': return 'red';
  }
}

function getStatusIcon(status: DocumentStatus): string {
  switch (status) {
    case 'pending': return '...';
    case 'processing': return '>>>';
    case 'completed': return '[+]';
    case 'failed': return '[X]';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function DocumentsTab({ serverUrl, authToken }: DocumentsTabProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('select_engagement');
  const [selectedEngagementIndex, setSelectedEngagementIndex] = useState(0);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filePath, setFilePath] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { isInputActive, setInputActive } = useInputContext();
  const { engagements, loading: engLoading, error: engError } = useEngagements(serverUrl, authToken);

  const apiClient = useMemo(
    () => new ThesisValidatorClient(serverUrl, authToken),
    [serverUrl, authToken]
  );

  // Load documents when engagement is selected
  useEffect(() => {
    if (!selectedEngagementId) return;

    const loadDocuments = async () => {
      try {
        setLoading(true);
        const docs = await apiClient.getDocuments(selectedEngagementId);
        setDocuments(docs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    void loadDocuments();
  }, [apiClient, selectedEngagementId]);

  // Handle text input active state
  useEffect(() => {
    setInputActive(viewMode === 'upload');
    return () => setInputActive(false);
  }, [viewMode, setInputActive]);

  // Filter documents by status
  const filteredDocuments = statusFilter === 'all'
    ? documents
    : documents.filter(d => d.status === statusFilter);

  const selectedDocument = filteredDocuments[selectedIndex];

  // Cycle through filters
  const cycleFilter = () => {
    const filters: StatusFilter[] = ['all', 'pending', 'processing', 'completed', 'failed'];
    const currentIdx = filters.indexOf(statusFilter);
    const nextIdx = (currentIdx + 1) % filters.length;
    setStatusFilter(filters[nextIdx]!);
    setSelectedIndex(0);
  };

  // Refresh documents
  const refresh = async () => {
    if (!selectedEngagementId) return;
    try {
      setLoading(true);
      const docs = await apiClient.getDocuments(selectedEngagementId);
      setDocuments(docs);
      setMessage('Documents refreshed');
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const handleDelete = async () => {
    if (!selectedEngagementId || !selectedDocument) return;

    try {
      setIsDeleting(true);
      await apiClient.deleteDocument(selectedEngagementId, selectedDocument.id);
      setMessage(`Deleted: ${selectedDocument.filename}`);
      // Adjust selection if needed
      if (selectedIndex >= filteredDocuments.length - 1 && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      await refresh();
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Failed to delete'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Keyboard input
  useInput((input, key) => {
    if (isInputActive && viewMode !== 'upload') return;

    // Clear message on any input
    if (message && viewMode !== 'upload') setMessage(null);

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
      if (key.downArrow && selectedIndex < filteredDocuments.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.return && selectedDocument) {
        setViewMode('detail');
      }
      if (input === 'f' || input === 'F') {
        cycleFilter();
      }
      if (input === 'r' || input === 'R') {
        void refresh();
      }
      if (input === 'u' || input === 'U') {
        setViewMode('upload');
        setFilePath('');
      }
      if (input === 'd' || input === 'D') {
        if (selectedDocument && !isDeleting) {
          void handleDelete();
        }
      }
      if (input === 'b' || input === 'B' || key.escape) {
        setViewMode('select_engagement');
        setSelectedEngagementId(null);
        setSelectedIndex(0);
        setDocuments([]);
      }
    } else if (viewMode === 'detail') {
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('list');
      }
    } else if (viewMode === 'upload') {
      if (key.escape) {
        setViewMode('list');
        setFilePath('');
      }
    }
  });

  // Handle upload submission
  const handleUploadSubmit = async () => {
    if (!filePath.trim() || !selectedEngagementId) {
      setMessage('Please enter a file path');
      return;
    }

    // Note: In a real TUI, we'd read the file from disk using Node.js fs
    // For now, we show a message about the limitation
    setMessage('File upload requires server-side file handling. Use the web dashboard or CLI for file uploads.');
    setViewMode('list');
    setFilePath('');
  };

  // Loading state
  if (engLoading || loading) {
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

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press B to go back</Text>
      </Box>
    );
  }

  // Select engagement view
  if (viewMode === 'select_engagement') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Select an Engagement</Text>
        <Text color="gray">Manage documents uploaded to a deal</Text>
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

  // Upload view
  if (viewMode === 'upload') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Upload Document</Text>
        <Text color="gray">Enter the path to the file you want to upload</Text>
        <Text>{''}</Text>

        <Box marginY={1}>
          <Text>File path: </Text>
          <TextInput
            value={filePath}
            onChange={setFilePath}
            onSubmit={handleUploadSubmit}
            placeholder="/path/to/document.pdf"
          />
        </Box>

        {message && (
          <Box marginY={1}>
            <Text color={message.startsWith('Error') ? 'red' : 'yellow'}>{message}</Text>
          </Box>
        )}

        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color="gray">[Enter] Upload  [ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Detail view
  if (viewMode === 'detail' && selectedDocument) {
    const doc = selectedDocument;
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Document Details</Text>
        <Text color="gray">Press B or ESC to go back</Text>
        <Text>{''}</Text>

        <Box flexDirection="column" marginY={1}>
          <Box>
            <Text bold>Filename: </Text>
            <Text>{doc.filename}</Text>
          </Box>
          <Box>
            <Text bold>Original: </Text>
            <Text>{doc.originalFilename}</Text>
          </Box>
          <Box>
            <Text bold>Format: </Text>
            <Text color={getFormatColor(doc.format)}>
              {getFormatIcon(doc.format)} {doc.format.toUpperCase()}
            </Text>
          </Box>
          <Box>
            <Text bold>Size: </Text>
            <Text>{formatFileSize(doc.sizeBytes)}</Text>
          </Box>
          <Box>
            <Text bold>Status: </Text>
            <Text color={getStatusColor(doc.status)}>
              {getStatusIcon(doc.status)} {doc.status}
            </Text>
          </Box>
          <Box>
            <Text bold>MIME Type: </Text>
            <Text color="gray">{doc.mimeType}</Text>
          </Box>
          <Box>
            <Text bold>Uploaded: </Text>
            <Text>{new Date(doc.createdAt).toLocaleString()}</Text>
          </Box>
          {doc.processedAt && (
            <Box>
              <Text bold>Processed: </Text>
              <Text>{new Date(doc.processedAt).toLocaleString()}</Text>
            </Box>
          )}
          {doc.evidenceCount !== undefined && (
            <Box>
              <Text bold>Evidence Extracted: </Text>
              <Text color="green">{doc.evidenceCount} items</Text>
            </Box>
          )}
          {doc.errorMessage && (
            <Box>
              <Text bold>Error: </Text>
              <Text color="red">{doc.errorMessage}</Text>
            </Box>
          )}
          {doc.extractedText && (
            <>
              <Text>{''}</Text>
              <Text bold>Extracted Text Preview:</Text>
              <Box marginLeft={2} marginTop={1}>
                <Text wrap="wrap" color="gray">
                  {truncate(doc.extractedText, 500)}
                </Text>
              </Box>
            </>
          )}
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
        <Text bold color="cyan">Documents</Text>
        <Text color="gray"> - {selectedEng?.name} ({filteredDocuments.length} files)</Text>
        <Text color="yellow"> Filter: {statusFilter}</Text>
      </Box>

      {/* Message */}
      {message && (
        <Box marginBottom={1}>
          <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>
        </Box>
      )}

      {filteredDocuments.length === 0 ? (
        <Box marginY={1}>
          <Text color="yellow">
            {statusFilter === 'all'
              ? 'No documents uploaded yet. Press U to upload a document.'
              : `No ${statusFilter} documents. Press F to change filter.`}
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginY={1}>
          {/* Table header */}
          <Box marginBottom={1}>
            <Box width={5}><Text bold>Fmt</Text></Box>
            <Box width={35}><Text bold>Filename</Text></Box>
            <Box width={10}><Text bold>Size</Text></Box>
            <Box width={12}><Text bold>Status</Text></Box>
          </Box>
          <Text color="gray">{'─'.repeat(65)}</Text>

          {filteredDocuments.map((doc, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={doc.id}>
                <Text color={isSelected ? 'cyan' : 'white'}>
                  {isSelected ? '>' : ' '}
                </Text>
                <Box width={4}>
                  <Text color={getFormatColor(doc.format)}>{getFormatIcon(doc.format)}</Text>
                </Box>
                <Box width={35}>
                  <Text color={isSelected ? 'cyan' : 'white'}>
                    {truncate(doc.filename, 33)}
                  </Text>
                </Box>
                <Box width={10}>
                  <Text color="gray">{formatFileSize(doc.sizeBytes)}</Text>
                </Box>
                <Box width={12}>
                  <Text color={getStatusColor(doc.status)}>
                    {getStatusIcon(doc.status)} {doc.status}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" paddingX={1}>
        <Text color="gray">
          [^v] Navigate  [Enter] Details  [U] Upload  [D] Delete  [F] Filter  [R] Refresh  [B] Back
        </Text>
      </Box>
    </Box>
  );
}
