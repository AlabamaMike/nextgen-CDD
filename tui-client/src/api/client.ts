import axios, { type AxiosInstance } from 'axios';
import type {
  Engagement,
  EngagementFilters,
  CreateEngagementRequest,
  UpdateEngagementRequest,
  ResearchJob,
  ResearchConfig,
  ResearchResults,
  HealthStatus,
  SystemMetrics,
  APIError,
  HypothesisData,
  CausalEdge,
  CreateHypothesisRequest,
  UpdateHypothesisRequest,
  CreateEdgeRequest,
  HypothesisTreeResponse,
  EvidenceData,
  EvidenceFilters,
  CreateEvidenceRequest,
  UpdateEvidenceRequest,
  EvidenceStats,
  ContradictionData,
  ContradictionFilters,
  ContradictionStats,
  CreateContradictionRequest,
  ResolveContradictionRequest,
  StressTestData,
  StressTestStats,
  StartStressTestRequest,
  ResearchQualityMetrics,
  MetricData,
  MetricType,
  SkillData,
  SkillFilters,
  SkillExecuteRequest,
  SkillExecuteResult,
  SkillTemplate,
  ComparableData,
  DocumentData,
  DocumentFilters,
  DocumentUploadResponse,
  TeamMember,
  AddTeamMemberRequest,
  TeamResponse,
} from '../types/api.js';

export class ThesisValidatorClient {
  public readonly baseURL: string;
  private readonly http: AxiosInstance;

  constructor(baseURL: string, authToken?: string) {
    this.baseURL = baseURL;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    this.http = axios.create({
      baseURL,
      timeout: 30000,
      headers,
    });

    // Add response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data) {
          const apiError: APIError = error.response.data;
          throw new Error(apiError.message || apiError.error);
        }
        throw error;
      }
    );
  }

  /**
   * Health check
   */
  async getHealth(): Promise<HealthStatus> {
    const response = await this.http.get<HealthStatus>('/health');
    return response.data;
  }

  /**
   * Get system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    const response = await this.http.get<SystemMetrics>('/metrics');
    return response.data;
  }

  /**
   * List engagements
   */
  async getEngagements(filters?: EngagementFilters): Promise<Engagement[]> {
    const response = await this.http.get<{ engagements: Engagement[] }>(
      '/api/v1/engagements',
      { params: filters }
    );
    return response.data.engagements;
  }

  /**
   * Get single engagement
   */
  async getEngagement(id: string): Promise<Engagement> {
    const response = await this.http.get<{ engagement: Engagement }>(
      `/api/v1/engagements/${id}`
    );
    return response.data.engagement;
  }

  /**
   * Create engagement
   */
  async createEngagement(data: CreateEngagementRequest): Promise<Engagement> {
    const response = await this.http.post<{ engagement: Engagement }>(
      '/api/v1/engagements',
      data
    );
    return response.data.engagement;
  }

  /**
   * Update engagement
   */
  async updateEngagement(id: string, data: UpdateEngagementRequest): Promise<Engagement> {
    const response = await this.http.patch<{ engagement: Engagement }>(
      `/api/v1/engagements/${id}`,
      data
    );
    return response.data.engagement;
  }

  /**
   * Delete engagement
   */
  async deleteEngagement(id: string): Promise<void> {
    await this.http.delete(`/api/v1/engagements/${id}`);
  }

  /**
   * Start research workflow
   * Backend expects thesis to be already submitted via the /thesis endpoint,
   * but we'll pass the thesis config along
   */
  async startResearch(engagementId: string, thesis: string, config?: Partial<ResearchConfig>): Promise<{ job_id: string; status: string }> {
    // First submit the thesis
    await this.http.post(
      `/api/v1/engagements/${engagementId}/thesis`,
      { thesis_statement: thesis }
    );

    // Then start research
    const response = await this.http.post<{ job_id: string; message: string }>(
      `/api/v1/engagements/${engagementId}/research`,
      {
        depth: config?.searchDepth ?? 'standard',
        include_comparables: true,
        max_sources: 20,
      }
    );
    return { job_id: response.data.job_id, status: 'started' };
  }

  /**
   * Get research job status
   */
  async getResearchJob(_engagementId: string, jobId: string): Promise<ResearchJob> {
    // The backend returns job info at /api/v1/engagements/jobs/:jobId
    const response = await this.http.get<{
      job_id: string;
      engagement_id: string;
      type: string;
      status: string;
      progress: number;
      started_at: number;
      completed_at?: number;
      error?: string;
      result?: unknown;
    }>(`/api/v1/engagements/jobs/${jobId}`);

    const now = Date.now();
    // Map to ResearchJob format
    const job: ResearchJob = {
      id: response.data.job_id,
      engagement_id: response.data.engagement_id,
      status: response.data.status as ResearchJob['status'],
      config: {},
      created_at: response.data.started_at ?? now,
      updated_at: response.data.completed_at ?? now,
    };

    // Add optional fields only if they have values
    if (response.data.started_at !== undefined) {
      job.started_at = response.data.started_at;
    }
    if (response.data.completed_at !== undefined) {
      job.completed_at = response.data.completed_at;
    }
    if (response.data.result !== undefined) {
      job.results = response.data.result as ResearchResults;
    }

    return job;
  }

  /**
   * Get WebSocket URL for research progress
   */
  getResearchProgressWsUrl(jobId: string, token?: string): string {
    const wsBaseUrl = this.baseURL.replace(/^http/, 'ws');
    const url = `${wsBaseUrl}/research/jobs/${jobId}/progress`;
    if (token) {
      return `${url}?token=${token}`;
    }
    return url;
  }

  // ============== Hypothesis Methods ==============

  /**
   * Get all hypotheses for an engagement (with causal edges)
   */
  async getHypotheses(engagementId: string): Promise<HypothesisTreeResponse> {
    const response = await this.http.get<HypothesisTreeResponse>(
      `/api/v1/engagements/${engagementId}/hypotheses`
    );
    return response.data;
  }

  /**
   * Get a single hypothesis
   */
  async getHypothesis(engagementId: string, hypothesisId: string): Promise<HypothesisData> {
    const response = await this.http.get<{ hypothesis: HypothesisData }>(
      `/api/v1/engagements/${engagementId}/hypotheses/${hypothesisId}`
    );
    return response.data.hypothesis;
  }

  /**
   * Create a new hypothesis
   */
  async createHypothesis(engagementId: string, data: CreateHypothesisRequest): Promise<HypothesisData> {
    const response = await this.http.post<{ hypothesis: HypothesisData }>(
      `/api/v1/engagements/${engagementId}/hypotheses`,
      data
    );
    return response.data.hypothesis;
  }

  /**
   * Update a hypothesis
   */
  async updateHypothesis(
    engagementId: string,
    hypothesisId: string,
    data: UpdateHypothesisRequest
  ): Promise<HypothesisData> {
    const response = await this.http.patch<{ hypothesis: HypothesisData }>(
      `/api/v1/engagements/${engagementId}/hypotheses/${hypothesisId}`,
      data
    );
    return response.data.hypothesis;
  }

  /**
   * Delete a hypothesis
   */
  async deleteHypothesis(engagementId: string, hypothesisId: string): Promise<void> {
    await this.http.delete(`/api/v1/engagements/${engagementId}/hypotheses/${hypothesisId}`);
  }

  /**
   * Create a causal edge between hypotheses
   */
  async createHypothesisEdge(
    engagementId: string,
    sourceHypothesisId: string,
    data: CreateEdgeRequest
  ): Promise<CausalEdge> {
    const response = await this.http.post<{ edge: CausalEdge }>(
      `/api/v1/engagements/${engagementId}/hypotheses/${sourceHypothesisId}/edges`,
      data
    );
    return response.data.edge;
  }

  /**
   * Delete a causal edge
   */
  async deleteHypothesisEdge(engagementId: string, edgeId: string): Promise<void> {
    await this.http.delete(`/api/v1/engagements/${engagementId}/hypothesis-edges/${edgeId}`);
  }

  // ============== Evidence Methods ==============

  /**
   * Get evidence for an engagement
   */
  async getEvidence(engagementId: string, filters?: EvidenceFilters): Promise<EvidenceData[]> {
    const response = await this.http.get<{ evidence: EvidenceData[] }>(
      `/api/v1/engagements/${engagementId}/evidence`,
      { params: filters }
    );
    return response.data.evidence;
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(engagementId: string): Promise<EvidenceStats> {
    const response = await this.http.get<{ stats: EvidenceStats }>(
      `/api/v1/engagements/${engagementId}/evidence/stats`
    );
    return response.data.stats;
  }

  /**
   * Get a single evidence item
   */
  async getEvidenceById(engagementId: string, evidenceId: string): Promise<EvidenceData> {
    const response = await this.http.get<{ evidence: EvidenceData }>(
      `/api/v1/engagements/${engagementId}/evidence/${evidenceId}`
    );
    return response.data.evidence;
  }

  /**
   * Create evidence manually
   */
  async createEvidence(engagementId: string, data: CreateEvidenceRequest): Promise<EvidenceData> {
    const response = await this.http.post<{ evidence: EvidenceData }>(
      `/api/v1/engagements/${engagementId}/evidence`,
      data
    );
    return response.data.evidence;
  }

  /**
   * Update evidence
   */
  async updateEvidence(
    engagementId: string,
    evidenceId: string,
    data: UpdateEvidenceRequest
  ): Promise<EvidenceData> {
    const response = await this.http.patch<{ evidence: EvidenceData }>(
      `/api/v1/engagements/${engagementId}/evidence/${evidenceId}`,
      data
    );
    return response.data.evidence;
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(engagementId: string, evidenceId: string): Promise<void> {
    await this.http.delete(`/api/v1/engagements/${engagementId}/evidence/${evidenceId}`);
  }

  /**
   * Link evidence to hypothesis
   */
  async linkEvidenceToHypothesis(
    engagementId: string,
    evidenceId: string,
    hypothesisId: string,
    relevanceScore?: number
  ): Promise<void> {
    await this.http.post(
      `/api/v1/engagements/${engagementId}/evidence/${evidenceId}/hypotheses`,
      { hypothesisId, relevanceScore }
    );
  }

  /**
   * Unlink evidence from hypothesis
   */
  async unlinkEvidenceFromHypothesis(
    engagementId: string,
    evidenceId: string,
    hypothesisId: string
  ): Promise<void> {
    await this.http.delete(
      `/api/v1/engagements/${engagementId}/evidence/${evidenceId}/hypotheses/${hypothesisId}`
    );
  }

  // ============== Contradiction Methods ==============

  /**
   * Get contradictions for an engagement
   */
  async getContradictions(
    engagementId: string,
    filters?: ContradictionFilters
  ): Promise<ContradictionData[]> {
    const response = await this.http.get<{ contradictions: ContradictionData[] }>(
      `/api/v1/engagements/${engagementId}/contradictions`,
      { params: filters }
    );
    return response.data.contradictions;
  }

  /**
   * Get contradiction statistics
   */
  async getContradictionStats(engagementId: string): Promise<ContradictionStats> {
    const response = await this.http.get<{ stats: ContradictionStats }>(
      `/api/v1/engagements/${engagementId}/contradictions/stats`
    );
    return response.data.stats;
  }

  /**
   * Get a single contradiction
   */
  async getContradiction(
    engagementId: string,
    contradictionId: string
  ): Promise<ContradictionData> {
    const response = await this.http.get<{ contradiction: ContradictionData }>(
      `/api/v1/engagements/${engagementId}/contradictions/${contradictionId}`
    );
    return response.data.contradiction;
  }

  /**
   * Create a contradiction manually
   */
  async createContradiction(
    engagementId: string,
    data: CreateContradictionRequest
  ): Promise<ContradictionData> {
    const response = await this.http.post<{ contradiction: ContradictionData }>(
      `/api/v1/engagements/${engagementId}/contradictions`,
      data
    );
    return response.data.contradiction;
  }

  /**
   * Resolve a contradiction
   */
  async resolveContradiction(
    engagementId: string,
    contradictionId: string,
    data: ResolveContradictionRequest
  ): Promise<ContradictionData> {
    const response = await this.http.post<{ contradiction: ContradictionData }>(
      `/api/v1/engagements/${engagementId}/contradictions/${contradictionId}/resolve`,
      data
    );
    return response.data.contradiction;
  }

  /**
   * Mark contradiction as critical
   */
  async markContradictionCritical(
    engagementId: string,
    contradictionId: string
  ): Promise<ContradictionData> {
    const response = await this.http.post<{ contradiction: ContradictionData }>(
      `/api/v1/engagements/${engagementId}/contradictions/${contradictionId}/critical`
    );
    return response.data.contradiction;
  }

  /**
   * Delete a contradiction
   */
  async deleteContradiction(engagementId: string, contradictionId: string): Promise<void> {
    await this.http.delete(
      `/api/v1/engagements/${engagementId}/contradictions/${contradictionId}`
    );
  }

  // ============== Stress Test Methods ==============

  /**
   * Get stress tests for an engagement
   */
  async getStressTests(
    engagementId: string,
    filters?: { status?: string; limit?: number }
  ): Promise<StressTestData[]> {
    const response = await this.http.get<{ stressTests: StressTestData[] }>(
      `/api/v1/engagements/${engagementId}/stress-tests`,
      { params: filters }
    );
    return response.data.stressTests;
  }

  /**
   * Get stress test statistics
   */
  async getStressTestStats(engagementId: string): Promise<StressTestStats> {
    const response = await this.http.get<{ stats: StressTestStats }>(
      `/api/v1/engagements/${engagementId}/stress-tests/stats`
    );
    return response.data.stats;
  }

  /**
   * Get a single stress test
   */
  async getStressTest(
    engagementId: string,
    stressTestId: string
  ): Promise<StressTestData> {
    const response = await this.http.get<{ stressTest: StressTestData }>(
      `/api/v1/engagements/${engagementId}/stress-tests/${stressTestId}`
    );
    return response.data.stressTest;
  }

  /**
   * Start a new stress test
   */
  async startStressTest(
    engagementId: string,
    data?: StartStressTestRequest
  ): Promise<StressTestData> {
    const response = await this.http.post<{ stressTest: StressTestData }>(
      `/api/v1/engagements/${engagementId}/stress-tests`,
      data ?? { intensity: 'moderate' }
    );
    return response.data.stressTest;
  }

  /**
   * Delete a stress test
   */
  async deleteStressTest(engagementId: string, stressTestId: string): Promise<void> {
    await this.http.delete(
      `/api/v1/engagements/${engagementId}/stress-tests/${stressTestId}`
    );
  }

  // ============== Metrics Methods ==============

  /**
   * Get current research quality metrics
   */
  async getResearchMetrics(engagementId: string): Promise<ResearchQualityMetrics> {
    const response = await this.http.get<{ metrics: ResearchQualityMetrics }>(
      `/api/v1/engagements/${engagementId}/metrics`
    );
    return response.data.metrics;
  }

  /**
   * Get metric history for a specific type
   */
  async getMetricHistory(
    engagementId: string,
    metricType: MetricType,
    limit = 50
  ): Promise<MetricData[]> {
    const response = await this.http.get<{ history: MetricData[] }>(
      `/api/v1/engagements/${engagementId}/metrics/history`,
      { params: { metric_type: metricType, limit } }
    );
    return response.data.history ?? [];
  }

  /**
   * Get all latest metrics
   */
  async getAllLatestMetrics(
    engagementId: string
  ): Promise<Record<MetricType, MetricData | null>> {
    const response = await this.http.get<{ latest: Record<MetricType, MetricData | null> }>(
      `/api/v1/engagements/${engagementId}/metrics/history`
    );
    return response.data.latest ?? ({} as Record<MetricType, MetricData | null>);
  }

  /**
   * Calculate and record metrics
   */
  async calculateMetrics(engagementId: string): Promise<ResearchQualityMetrics> {
    const response = await this.http.post<{ metrics: ResearchQualityMetrics }>(
      `/api/v1/engagements/${engagementId}/metrics/calculate`,
      {} // Empty body required when Content-Type is application/json
    );
    return response.data.metrics;
  }

  // ============== Skills Methods ==============

  /**
   * Get skills list
   */
  async getSkills(filters?: SkillFilters): Promise<{ skills: SkillData[]; total: number }> {
    const response = await this.http.get<{ skills: SkillData[]; total: number; limit: number; offset: number }>(
      '/api/v1/skills',
      { params: filters }
    );
    return { skills: response.data.skills, total: response.data.total };
  }

  /**
   * Get skill by ID
   */
  async getSkill(skillId: string): Promise<SkillData> {
    const response = await this.http.get<{ skill: SkillData }>(
      `/api/v1/skills/${skillId}`
    );
    return response.data.skill;
  }

  /**
   * Execute a skill
   */
  async executeSkill(skillId: string, request: SkillExecuteRequest): Promise<SkillExecuteResult> {
    const response = await this.http.post<SkillExecuteResult>(
      `/api/v1/skills/${skillId}/execute`,
      request
    );
    return response.data;
  }

  /**
   * Search comparables
   */
  async searchComparables(
    query: string,
    options?: { sector?: string; deal_type?: string; min_relevance?: number; limit?: number }
  ): Promise<ComparableData[]> {
    const response = await this.http.get<{ comparables: ComparableData[]; count: number }>(
      '/api/v1/skills/comparables',
      { params: { query, ...options } }
    );
    return response.data.comparables;
  }

  /**
   * Get skill templates
   */
  async getSkillTemplates(): Promise<{ templates: SkillTemplate[] }> {
    const response = await this.http.get<{ templates: SkillTemplate[] }>(
      '/api/v1/skills/templates'
    );
    return response.data;
  }

  /**
   * Get comparables by sector
   */
  async getComparablesBySector(sector: string): Promise<ComparableData[]> {
    const response = await this.http.get<{ comparables: ComparableData[] }>(
      `/api/v1/skills/comparables/sectors/${encodeURIComponent(sector)}`
    );
    return response.data.comparables;
  }

  /**
   * Get comparable methodologies
   */
  async getComparableMethodologies(): Promise<{ methodologies: string[] }> {
    const response = await this.http.get<{ methodologies: string[] }>(
      '/api/v1/skills/comparables/methodologies'
    );
    return response.data;
  }

  // ============== Document Methods ==============

  /**
   * Get documents for an engagement
   */
  async getDocuments(engagementId: string, filters?: DocumentFilters): Promise<DocumentData[]> {
    const response = await this.http.get<{ documents: DocumentData[] }>(
      `/api/v1/engagements/${engagementId}/documents`,
      { params: filters }
    );
    return response.data.documents;
  }

  /**
   * Get a single document
   */
  async getDocument(engagementId: string, documentId: string): Promise<DocumentData> {
    const response = await this.http.get<{ document: DocumentData }>(
      `/api/v1/engagements/${engagementId}/documents/${documentId}`
    );
    return response.data.document;
  }

  /**
   * Upload a document (for use with FormData)
   * Note: In a TUI context, this would be called with a file path
   * The actual upload requires multipart/form-data which axios handles
   */
  async uploadDocument(
    engagementId: string,
    file: File | Blob,
    filename: string
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, filename);

    const response = await this.http.post<DocumentUploadResponse>(
      `/api/v1/engagements/${engagementId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(engagementId: string, documentId: string): Promise<void> {
    await this.http.delete(`/api/v1/engagements/${engagementId}/documents/${documentId}`);
  }

  // ============== Team Management Methods ==============

  /**
   * Add a team member to an engagement
   */
  async addTeamMember(
    engagementId: string,
    data: AddTeamMemberRequest
  ): Promise<TeamResponse> {
    const response = await this.http.post<TeamResponse>(
      `/api/v1/engagements/${engagementId}/team`,
      data
    );
    return response.data;
  }

  /**
   * Remove a team member from an engagement
   */
  async removeTeamMember(engagementId: string, userId: string): Promise<TeamResponse> {
    const response = await this.http.delete<TeamResponse>(
      `/api/v1/engagements/${engagementId}/team/${userId}`
    );
    return response.data;
  }

  /**
   * Get team members for an engagement
   * Note: Team info is included in engagement details, this is a convenience method
   */
  async getTeamMembers(engagementId: string): Promise<TeamMember[]> {
    const response = await this.http.get<{ team: TeamMember[] }>(
      `/api/v1/engagements/${engagementId}/team`
    );
    return response.data.team;
  }
}
