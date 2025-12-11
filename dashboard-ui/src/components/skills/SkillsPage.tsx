/**
 * Skills Library page with category filtering and search
 */
import { useState } from 'react';
import { Search, Loader2, Sparkles, Filter } from 'lucide-react';
import { useSkills } from '../../hooks/useSkills';
import { SkillDetail } from './SkillDetail';
import { SkillExecuteModal } from './SkillExecuteModal';
import type { Skill, SkillCategory } from '../../types/api';

const categoryLabels: Record<SkillCategory, string> = {
  market_sizing: 'Market Sizing',
  competitive: 'Competitive',
  financial: 'Financial',
  risk: 'Risk',
  operational: 'Operational',
  regulatory: 'Regulatory',
  customer: 'Customer',
  technology: 'Technology',
  general: 'General',
};

const categoryColors: Record<SkillCategory, string> = {
  market_sizing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  competitive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  financial: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  risk: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  operational: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  regulatory: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  customer: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  technology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  general: 'bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300',
};

export function SkillsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [executeSkill, setExecuteSkill] = useState<Skill | null>(null);

  const { data, isLoading, error } = useSkills({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    query: searchQuery || undefined,
  });

  const skills = data?.skills ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Skills Library</h1>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-surface-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as SkillCategory | 'all')}
              className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Skills List */}
        <div className={`${selectedSkill ? 'w-1/2' : 'w-full'} overflow-y-auto p-4 transition-all`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <p>Failed to load skills</p>
              <p className="text-sm">{String(error)}</p>
            </div>
          ) : skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-surface-500 dark:text-surface-400">
              <Sparkles className="h-12 w-12 mb-3 opacity-50" />
              <p>No skills found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => setSelectedSkill(skill)}
                  className={`p-4 rounded-lg border text-left transition-all hover:shadow-md ${
                    selectedSkill?.id === skill.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-surface-900 dark:text-white">
                      {skill.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[skill.category]}`}>
                      {categoryLabels[skill.category]}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2 mb-3">
                    {skill.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
                    <span>v{skill.version}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${
                        skill.successRate >= 0.9
                          ? 'text-green-600 dark:text-green-400'
                          : skill.successRate >= 0.7
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {Math.round(skill.successRate * 100)}% success
                      </span>
                      <span>{skill.usageCount} uses</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedSkill && (
          <div className="w-1/2 border-l border-surface-200 dark:border-surface-700 overflow-y-auto">
            <SkillDetail
              skill={selectedSkill}
              onExecute={() => setExecuteSkill(selectedSkill)}
              onClose={() => setSelectedSkill(null)}
            />
          </div>
        )}
      </div>

      {/* Execute Modal */}
      {executeSkill && (
        <SkillExecuteModal
          skill={executeSkill}
          onClose={() => setExecuteSkill(null)}
        />
      )}
    </div>
  );
}
