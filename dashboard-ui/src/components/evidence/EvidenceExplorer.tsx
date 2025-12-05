/**
 * Evidence Explorer - Browse and filter evidence
 */
import { useState, useMemo } from 'react';
import { Search, Filter, FileText, Globe, User, Database, FileCheck, DollarSign } from 'lucide-react';
import { useEvidence, useEvidenceStats } from '../../hooks/useEvidence';
import type { Evidence, EvidenceSourceType, EvidenceSentiment, EvidenceFilters } from '../../types/api';

interface EvidenceExplorerProps {
  engagementId: string;
  onSelectEvidence?: (evidence: Evidence) => void;
  selectedEvidenceId?: string | null;
}

const sourceTypeIcons: Record<EvidenceSourceType, React.ReactNode> = {
  web: <Globe className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  expert: <User className="h-4 w-4" />,
  data: <Database className="h-4 w-4" />,
  filing: <FileCheck className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
};

const sourceTypeLabels: Record<EvidenceSourceType, string> = {
  web: 'Web',
  document: 'Document',
  expert: 'Expert',
  data: 'Data',
  filing: 'Filing',
  financial: 'Financial',
};

const sentimentColors: Record<EvidenceSentiment, string> = {
  supporting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  contradicting: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function EvidenceExplorer({
  engagementId,
  onSelectEvidence,
  selectedEvidenceId,
}: EvidenceExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EvidenceFilters>({ limit: 50 });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useEvidence(engagementId, filters);
  const { data: statsData } = useEvidenceStats(engagementId);

  const filteredEvidence = useMemo(() => {
    if (!data?.evidence) return [];
    if (!searchQuery) return data.evidence;

    const query = searchQuery.toLowerCase();
    return data.evidence.filter(
      (e) =>
        e.content.toLowerCase().includes(query) ||
        e.sourceTitle?.toLowerCase().includes(query) ||
        e.sourceAuthor?.toLowerCase().includes(query)
    );
  }, [data?.evidence, searchQuery]);

  const handleFilterChange = (key: keyof EvidenceFilters, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading evidence: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      {statsData?.stats && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {statsData.stats.totalCount}
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Supporting</span>
              <div className="font-semibold text-green-600">
                {statsData.stats.bySentiment['supporting'] || 0}
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Contradicting</span>
              <div className="font-semibold text-red-600">
                {statsData.stats.bySentiment['contradicting'] || 0}
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Avg Credibility</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {Math.round((statsData.stats.averageCredibility || 0) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg flex items-center gap-2 ${
              showFilters
                ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-3 gap-3">
            <select
              value={filters.sourceType || ''}
              onChange={(e) => handleFilterChange('sourceType', e.target.value as EvidenceSourceType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Sources</option>
              {Object.entries(sourceTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={filters.sentiment || ''}
              onChange={(e) => handleFilterChange('sentiment', e.target.value as EvidenceSentiment)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Sentiments</option>
              <option value="supporting">Supporting</option>
              <option value="neutral">Neutral</option>
              <option value="contradicting">Contradicting</option>
            </select>

            <select
              value={filters.minCredibility?.toString() || ''}
              onChange={(e) => handleFilterChange('minCredibility', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Any Credibility</option>
              <option value="0.8">High (80%+)</option>
              <option value="0.5">Medium (50%+)</option>
              <option value="0.3">Low (30%+)</option>
            </select>
          </div>
        )}
      </div>

      {/* Evidence List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading evidence...</div>
        ) : filteredEvidence.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery || Object.keys(filters).length > 1
              ? 'No evidence matches your filters'
              : 'No evidence collected yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEvidence.map((evidence) => (
              <button
                key={evidence.id}
                onClick={() => onSelectEvidence?.(evidence)}
                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  selectedEvidenceId === evidence.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400">
                    {sourceTypeIcons[evidence.sourceType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentColors[evidence.sentiment]}`}>
                        {evidence.sentiment}
                      </span>
                      {evidence.credibility !== null && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(evidence.credibility * 100)}% credible
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                      {evidence.content}
                    </p>
                    {evidence.sourceTitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {evidence.sourceTitle}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
