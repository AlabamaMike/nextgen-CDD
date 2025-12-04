/**
 * Form for creating or editing engagements
 */
import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import type { Engagement } from '../../types/api';

interface EngagementFormProps {
  engagement?: Engagement;
  onSubmit: (data: EngagementFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface EngagementFormData {
  target_company: string;
  sector?: string;
  description?: string;
  deal_size?: number;
  lead_partner?: string;
  status: 'draft' | 'active' | 'in_review' | 'completed';
}

export function EngagementForm({ engagement, onSubmit, onCancel, isSubmitting }: EngagementFormProps) {
  const [formData, setFormData] = useState<EngagementFormData>({
    target_company: engagement?.target_company || '',
    sector: engagement?.sector || '',
    description: engagement?.description || '',
    deal_size: engagement?.deal_size || undefined,
    lead_partner: engagement?.lead_partner || '',
    status: engagement?.status || 'draft',
  });

  useEffect(() => {
    if (engagement) {
      setFormData({
        target_company: engagement.target_company,
        sector: engagement.sector || '',
        description: engagement.description || '',
        deal_size: engagement.deal_size || undefined,
        lead_partner: engagement.lead_partner || '',
        status: engagement.status,
      });
    }
  }, [engagement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof EngagementFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Target Company */}
      <div>
        <label htmlFor="target_company" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          Target Company <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="target_company"
          value={formData.target_company}
          onChange={(e) => handleChange('target_company', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                   bg-white dark:bg-surface-800 text-surface-900 dark:text-white
                   placeholder-surface-400 dark:placeholder-surface-500
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="e.g., Acme Corporation"
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Sector */}
      <div>
        <label htmlFor="sector" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          Sector
        </label>
        <select
          id="sector"
          value={formData.sector}
          onChange={(e) => handleChange('sector', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                   bg-white dark:bg-surface-800 text-surface-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="">Select a sector</option>
          <option value="Technology">Technology</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Financial Services">Financial Services</option>
          <option value="Consumer">Consumer</option>
          <option value="Industrial">Industrial</option>
          <option value="Energy">Energy</option>
          <option value="Real Estate">Real Estate</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                   bg-white dark:bg-surface-800 text-surface-900 dark:text-white
                   placeholder-surface-400 dark:placeholder-surface-500
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                   resize-none"
          placeholder="Brief description of the engagement..."
          disabled={isSubmitting}
        />
      </div>

      {/* Deal Size and Lead Partner */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="deal_size" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Deal Size (USD millions)
          </label>
          <input
            type="number"
            id="deal_size"
            value={formData.deal_size || ''}
            onChange={(e) => handleChange('deal_size', e.target.value ? parseFloat(e.target.value) : '')}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                     bg-white dark:bg-surface-800 text-surface-900 dark:text-white
                     placeholder-surface-400 dark:placeholder-surface-500
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., 50"
            min="0"
            step="0.1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="lead_partner" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Lead Partner
          </label>
          <input
            type="text"
            id="lead_partner"
            value={formData.lead_partner}
            onChange={(e) => handleChange('lead_partner', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                     bg-white dark:bg-surface-800 text-surface-900 dark:text-white
                     placeholder-surface-400 dark:placeholder-surface-500
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., John Smith"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                   bg-white dark:bg-surface-800 text-surface-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="in_review">In Review</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
        <button
          type="submit"
          disabled={isSubmitting || !formData.target_company.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                   bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 dark:disabled:bg-surface-700
                   text-white disabled:text-surface-500 dark:disabled:text-surface-500
                   font-medium transition-colors"
        >
          <Save className="h-5 w-5" />
          {engagement ? 'Update Engagement' : 'Create Engagement'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                   bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300
                   hover:bg-surface-50 dark:hover:bg-surface-700
                   font-medium transition-colors flex items-center gap-2"
        >
          <X className="h-5 w-5" />
          Cancel
        </button>
      </div>
    </form>
  );
}
