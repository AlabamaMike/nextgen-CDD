/**
 * API Routes Exports
 */

export {
  registerEngagementRoutes,
  getEngagement,
  updateEngagement,
} from './engagements.js';

// Use in-memory research implementation (research.js) instead of BullMQ/PostgreSQL (research-bullmq.js)
// since engagements are stored in-memory
export {
  registerResearchRoutes,
} from './research.js';

export {
  registerEvidenceRoutes,
} from './evidence.js';

export {
  registerSkillsRoutes,
} from './skills.js';

export {
  registerHypothesesRoutes,
} from './hypotheses.js';

export {
  registerContradictionRoutes,
} from './contradictions.js';

export {
  registerMetricsRoutes,
} from './metrics.js';

export {
  registerStressTestRoutes,
} from './stress-tests.js';

export {
  registerExpertCallRoutes,
} from './expert-calls.js';
