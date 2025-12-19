/**
 * Component for uploading and processing expert call transcripts
 * Supports single file, multiple files, and pasted text
 */
import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, X, Plus, Calendar, Files, Trash2 } from 'lucide-react';

interface FileWithContent {
  name: string;
  content: string;
  size: number;
}

interface TranscriptUploadProps {
  onSubmit: (data: {
    transcript: string;
    filename?: string;
    callDate?: string;
    speakerLabels?: Record<string, string>;
    focusAreas?: string[];
  }) => void;
  onBatchSubmit?: (data: {
    transcripts: Array<{
      transcript: string;
      filename?: string;
    }>;
    focusAreas?: string[];
  }) => void;
  isProcessing?: boolean;
}

export function TranscriptUpload({ onSubmit, onBatchSubmit, isProcessing }: TranscriptUploadProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [transcript, setTranscript] = useState('');
  const [currentFilename, setCurrentFilename] = useState<string | undefined>();
  const [callDate, setCallDate] = useState('');
  const [speakerLabels, setSpeakerLabels] = useState<Array<{ key: string; value: string }>>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [newFocusArea, setNewFocusArea] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Batch mode state
  const [selectedFiles, setSelectedFiles] = useState<FileWithContent[]>([]);

  const handleSingleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setTranscript(content);
      setCurrentFilename(file.name);
    };
    reader.readAsText(file);
  }, []);

  const handleMultiFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to array and read all files
    const fileArray = Array.from(files);

    const readFile = (file: File): Promise<FileWithContent> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            content: e.target?.result as string,
            size: file.size,
          });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    };

    try {
      const loadedFiles = await Promise.all(fileArray.map(readFile));

      setSelectedFiles((prev) => {
        // Deduplicate by filename
        const existingNames = new Set(prev.map((f) => f.name));
        const uniqueNewFiles = loadedFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...uniqueNewFiles];
      });
    } catch (error) {
      console.error('Error reading files:', error);
    }

    // Reset the input so the same files can be selected again if needed
    event.target.value = '';
  }, []);

  const removeFile = (filename: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== filename));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    const data: {
      transcript: string;
      filename?: string;
      callDate?: string;
      speakerLabels?: Record<string, string>;
      focusAreas?: string[];
    } = { transcript };

    if (currentFilename) {
      data.filename = currentFilename;
    }

    if (callDate) {
      data.callDate = callDate;
    }

    // Convert speaker labels array to record
    if (speakerLabels.length > 0) {
      const labels: Record<string, string> = {};
      speakerLabels.forEach(({ key, value }) => {
        if (key && value) labels[key] = value;
      });
      if (Object.keys(labels).length > 0) {
        data.speakerLabels = labels;
      }
    }

    // Add focus areas if any
    if (focusAreas.length > 0) {
      data.focusAreas = focusAreas;
    }

    onSubmit(data);

    // Clear form after submission
    setTranscript('');
    setCurrentFilename(undefined);
    setCallDate('');
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !onBatchSubmit) return;

    const data: {
      transcripts: Array<{
        transcript: string;
        filename?: string;
      }>;
      focusAreas?: string[];
    } = {
      transcripts: selectedFiles.map((f) => ({
        transcript: f.content,
        filename: f.name,
      })),
    };

    if (focusAreas.length > 0) {
      data.focusAreas = focusAreas;
    }

    onBatchSubmit(data);

    // Clear files after submission
    setSelectedFiles([]);
  };

  const addSpeakerLabel = () => {
    setSpeakerLabels([...speakerLabels, { key: '', value: '' }]);
  };

  const removeSpeakerLabel = (index: number) => {
    setSpeakerLabels(speakerLabels.filter((_, i) => i !== index));
  };

  const updateSpeakerLabel = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...speakerLabels];
    updated[index] = { ...updated[index]!, [field]: value };
    setSpeakerLabels(updated);
  };

  const addFocusArea = () => {
    if (newFocusArea.trim() && !focusAreas.includes(newFocusArea.trim())) {
      setFocusAreas([...focusAreas, newFocusArea.trim()]);
      setNewFocusArea('');
    }
  };

  const removeFocusArea = (area: string) => {
    setFocusAreas(focusAreas.filter((a) => a !== area));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
          Upload Transcripts
        </h3>

        {/* Mode Toggle */}
        {onBatchSubmit && (
          <div className="flex rounded-lg border border-surface-300 dark:border-surface-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-600'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-1" />
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'batch'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-600'
              }`}
            >
              <Files className="h-4 w-4 inline mr-1" />
              Batch
            </button>
          </div>
        )}
      </div>

      {mode === 'single' ? (
        /* Single File Mode */
        <form onSubmit={handleSingleSubmit}>
          {/* Call Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Call Date
            </label>
            <input
              type="datetime-local"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              disabled={isProcessing}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              Optional - will be auto-detected from transcript if not provided
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-8 w-8 text-surface-400 mb-2" />
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-surface-400">TXT, VTT, or SRT files</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".txt,.vtt,.srt"
                onChange={handleSingleFileUpload}
                disabled={isProcessing}
              />
            </label>
            {currentFilename && (
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                Selected: <span className="font-medium">{currentFilename}</span>
              </p>
            )}
          </div>

          {/* Transcript Text Area */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Or paste transcript text
            </label>
            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setCurrentFilename(undefined);
              }}
              placeholder="Speaker 1: Hello, thank you for joining us today...
Speaker 2: Thank you for having me..."
              rows={10}
              disabled={isProcessing}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              Supports formats: "Speaker: Text" or "[Speaker] Text"
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline mb-4"
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 mb-4 p-4 rounded-lg bg-surface-50 dark:bg-surface-700/50">
              {/* Speaker Labels */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Speaker Labels (Optional)
                </label>
                <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
                  Map generic speaker names to actual names
                </p>
                {speakerLabels.map((label, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={label.key}
                      onChange={(e) => updateSpeakerLabel(index, 'key', e.target.value)}
                      placeholder="Speaker 1"
                      className="flex-1 px-3 py-2 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm"
                    />
                    <span className="self-center text-surface-500">=</span>
                    <input
                      type="text"
                      value={label.value}
                      onChange={(e) => updateSpeakerLabel(index, 'value', e.target.value)}
                      placeholder="John Smith (CEO)"
                      className="flex-1 px-3 py-2 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpeakerLabel(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSpeakerLabel}
                  className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add speaker label
                </button>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Focus Areas (Optional)
                </label>
                <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
                  Topics to pay special attention to during analysis
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {focusAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeFocusArea(area)}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFocusArea}
                    onChange={(e) => setNewFocusArea(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFocusArea())}
                    placeholder="e.g., pricing strategy, market size"
                    className="flex-1 px-3 py-2 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={addFocusArea}
                    className="px-3 py-2 rounded bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-300 text-sm hover:bg-surface-300 dark:hover:bg-surface-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Character Count & Submit */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500 dark:text-surface-400">
              {transcript.length.toLocaleString()} characters
            </span>
            <button
              type="submit"
              disabled={!transcript.trim() || isProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 text-white disabled:text-surface-500 font-medium transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Process Transcript
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Batch Mode */
        <form onSubmit={handleBatchSubmit}>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
            Upload multiple transcript files at once. Duplicates will be automatically detected and skipped.
            Interviewee names, titles, and dates will be parsed from file names and content.
          </p>

          {/* Multi-File Upload */}
          <div className="mb-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Files className="h-8 w-8 text-surface-400 mb-2" />
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  <span className="font-medium">Click to select files</span> or drag and drop
                </p>
                <p className="text-xs text-surface-400">Select multiple TXT, VTT, or SRT files</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".txt,.vtt,.srt"
                multiple
                onChange={handleMultiFileUpload}
                disabled={isProcessing}
              />
            </label>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Selected Files ({selectedFiles.length})
                </span>
                <button
                  type="button"
                  onClick={clearAllFiles}
                  className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-lg divide-y divide-surface-200 dark:divide-surface-700">
                {selectedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-2 hover:bg-surface-50 dark:hover:bg-surface-700/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-surface-400 flex-shrink-0" />
                      <span className="text-sm text-surface-700 dark:text-surface-300 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-surface-400 flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className="p-1 text-surface-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus Areas (shared for batch) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Focus Areas (Optional)
            </label>
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
              Applied to all transcripts in this batch
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {focusAreas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300"
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => removeFocusArea(area)}
                    className="hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFocusArea}
                onChange={(e) => setNewFocusArea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFocusArea())}
                placeholder="e.g., pricing strategy, market size"
                className="flex-1 px-3 py-2 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm"
              />
              <button
                type="button"
                onClick={addFocusArea}
                className="px-3 py-2 rounded bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-300 text-sm hover:bg-surface-300 dark:hover:bg-surface-500"
              >
                Add
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500 dark:text-surface-400">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || isProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 text-white disabled:text-surface-500 font-medium transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Files className="h-5 w-5" />
                  Process All ({selectedFiles.length})
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
