/**
 * Component for displaying real-time research progress via WebSocket
 */
import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useResearchProgress, useResearchJob } from '../../hooks/useResearch';

interface ResearchProgressProps {
  engagementId: string;
  jobId: string;
  onComplete?: () => void;
}

export function ResearchProgress({ engagementId, jobId, onComplete }: ResearchProgressProps) {
  const { events, isConnected } = useResearchProgress(jobId);
  const { data: job } = useResearchJob(engagementId, jobId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Call onComplete when job finishes
  useEffect(() => {
    if (job && (job.status === 'completed' || job.status === 'failed') && onComplete) {
      onComplete();
    }
  }, [job, onComplete]);

  const getStatusIcon = () => {
    if (!job) return <Loader2 className="h-5 w-5 animate-spin text-primary-500" />;

    switch (job.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-primary-500" />;
      default:
        return <Activity className="h-5 w-5 text-surface-400" />;
    }
  };

  const getStatusText = () => {
    if (!job) return 'Initializing...';

    switch (job.status) {
      case 'pending':
        return 'Queued';
      case 'running':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return job.status;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white">
              Research Status: {getStatusText()}
            </h3>
            {job?.progress !== undefined && job.status === 'running' && (
              <div className="mt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    {job.progress}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {isConnected && job?.status === 'running' && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        )}
      </div>

      {/* Progress Events */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-4 py-2 border-b border-surface-200 dark:border-surface-700">
          <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Progress Log
          </h4>
        </div>

        <div
          ref={scrollRef}
          className="h-96 overflow-y-auto bg-white dark:bg-surface-900 p-4 space-y-2"
        >
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-full text-surface-400 dark:text-surface-600">
              <p className="text-sm">Waiting for progress updates...</p>
            </div>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className="flex gap-3 text-sm border-l-2 border-surface-200 dark:border-surface-700 pl-3 py-1"
              >
                <span className="text-surface-400 dark:text-surface-600 font-mono text-xs">
                  {formatTimestamp(event.timestamp)}
                </span>
                <span className="flex-1 text-surface-700 dark:text-surface-300">
                  {event.message}
                </span>
                {event.progress !== undefined && (
                  <span className="text-surface-500 dark:text-surface-500 font-medium">
                    {event.progress}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Error Display */}
      {job?.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
            Error
          </h4>
          <p className="text-sm text-red-600 dark:text-red-400">{job.error}</p>
        </div>
      )}
    </div>
  );
}
