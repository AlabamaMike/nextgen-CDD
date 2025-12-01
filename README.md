# Thesis Validator

A multi-agent AI system for private equity commercial and technical due diligence. Thesis Validator helps investment teams validate, pressure-test, and learn from investment theses using specialized AI agents.

## Overview

Thesis Validator automates and enhances the due diligence process by deploying a team of specialized AI agents that work together to:

- **Build and refine investment hypotheses** from initial thesis documents
- **Gather and validate evidence** from multiple sources (web, documents, market data)
- **Identify contradictions** and risks in the investment thesis
- **Find comparable companies** and market benchmarks
- **Synthesize expert insights** from call transcripts and interviews
- **Stress-test assumptions** with rigorous analysis

The system maintains persistent memory across deals, learning from past analyses to improve future diligence efforts.

## Features

### Specialized AI Agents

| Agent | Purpose |
|-------|---------|
| **Conductor** | Orchestrates the overall diligence workflow and coordinates other agents |
| **Hypothesis Builder** | Breaks down investment theses into testable hypotheses |
| **Evidence Gatherer** | Collects and validates evidence from multiple sources |
| **Contradiction Hunter** | Identifies inconsistencies and risks in the thesis |
| **Comparables Finder** | Discovers comparable companies and market benchmarks |
| **Expert Synthesizer** | Extracts insights from expert calls and interviews |

### Workflows

- **Research Workflow** - Comprehensive research and evidence gathering
- **Stress Test Workflow** - Rigorous assumption testing and risk analysis
- **Expert Call Workflow** - Processing and synthesizing expert interviews
- **Closeout Workflow** - Final report generation and findings consolidation

### Memory Systems

- **Deal Memory** - Per-deal context, hypotheses, and evidence
- **Institutional Memory** - Cross-deal learnings and pattern recognition
- **Market Intelligence** - Industry data, trends, and benchmarks
- **Reflexion Store** - Agent self-improvement and error correction
- **Skill Library** - Reusable analytical patterns and best practices

### Tools & Integrations

- **Web Search** - Tavily-powered web research
- **Document Parser** - PDF, DOCX, and text extraction
- **Transcript Processor** - Expert call transcript analysis
- **Credibility Scorer** - Source reliability assessment
- **Embeddings** - OpenAI text-embedding-3-large for semantic search
- **Market Data** - Alpha Vantage financial data integration

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Dashboard UI                                    │
│                         (React + Vite + TailwindCSS)                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ REST / WebSocket
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                            Thesis Validator API                              │
│                              (Fastify + JWT)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Conductor  │──│  Hypothesis │──│  Evidence   │──│  Contradiction      │ │
│  │    Agent    │  │   Builder   │  │  Gatherer   │  │     Hunter          │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐                                           │
│  │ Comparables │  │   Expert    │                                           │
│  │   Finder    │  │ Synthesizer │                                           │
│  └─────────────┘  └─────────────┘                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Memory Layer                                    │
│  ┌───────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────────────────┐│
│  │   Deal    │  │Institutional │  │   Market   │  │ Reflexion + Skills     ││
│  │  Memory   │  │   Memory     │  │Intelligence│  │                        ││
│  └───────────┘  └──────────────┘  └────────────┘  └────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│                            Infrastructure                                    │
│  ┌───────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────────────────┐│
│  │  Claude   │  │   Redis      │  │ PostgreSQL │  │    Vector Store        ││
│  │(Vertex AI)│  │  (BullMQ)    │  │            │  │    (Ruvector)          ││
│  └───────────┘  └──────────────┘  └────────────┘  └────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend (`thesis-validator/`)

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode, ESM)
- **Framework**: Fastify 4
- **AI**: Claude via Anthropic SDK or Vertex AI
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7 + BullMQ
- **Vector Store**: Ruvector
- **Validation**: Zod

### Frontend (`dashboard-ui/`)

- **Framework**: React 19
- **Build**: Vite 7
- **Styling**: TailwindCSS 4
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- API Keys:
  - Anthropic API key (or GCP project with Vertex AI)
  - OpenAI API key (for embeddings)
  - Tavily API key (for web search)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/nextgen-CDD.git
   cd nextgen-CDD
   ```

2. **Start infrastructure**

   ```bash
   cd thesis-validator
   docker-compose up -d
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Install dependencies and start backend**

   ```bash
   npm install
   npm run db:init      # Initialize vector database
   npm run seed:skills  # Seed skill library
   npm run dev          # Start development server
   ```

5. **Start frontend** (in a new terminal)

   ```bash
   cd dashboard-ui
   npm install
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Health: http://localhost:3000/health

## Project Structure

```
nextgen-CDD/
├── thesis-validator/           # Backend service
│   ├── src/
│   │   ├── agents/            # AI agents (conductor, hypothesis-builder, etc.)
│   │   ├── api/               # Fastify REST & WebSocket API
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── middleware/    # Auth, validation middleware
│   │   │   └── websocket/     # Real-time updates
│   │   ├── config/            # Environment configuration
│   │   ├── memory/            # Vector memory systems
│   │   ├── models/            # Zod schemas and types
│   │   ├── services/          # LLM provider abstraction
│   │   ├── tools/             # External integrations
│   │   └── workflows/         # Business workflow orchestration
│   ├── scripts/               # Database init, seeding scripts
│   ├── tests/                 # Vitest unit tests
│   ├── Dockerfile             # Production container
│   ├── docker-compose.yml     # Local development stack
│   └── cloudbuild.yaml        # GCP CI/CD pipeline
│
├── dashboard-ui/              # Frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── layout/        # App shell, navigation
│   │   │   ├── main/          # Primary views
│   │   │   ├── sidebar/       # Side panels
│   │   │   └── context/       # React context providers
│   │   └── assets/            # Static assets
│   └── vite.config.ts         # Vite configuration
│
├── docs/                      # Documentation
│   └── deployment.md          # GCP deployment guide
│
└── CLAUDE.md                  # AI assistant instructions
```

## Development

### Backend Commands

```bash
cd thesis-validator

npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run start        # Run production build
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
npm run typecheck    # Type-check only
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run db:init      # Initialize database
npm run seed:skills  # Seed skill library
```

### Frontend Commands

```bash
cd dashboard-ui

npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Running Tests

```bash
cd thesis-validator
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
```

## Configuration

### Environment Variables

Create a `.env` file in `thesis-validator/` based on `.env.example`:

```bash
# LLM Provider (choose one)
LLM_PROVIDER=anthropic              # or 'vertex-ai'
ANTHROPIC_API_KEY=sk-ant-...        # Required if using anthropic

# Vertex AI (if LLM_PROVIDER=vertex-ai)
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_CLOUD_REGION=us-central1

# Required APIs
OPENAI_API_KEY=sk-...               # For embeddings
TAVILY_API_KEY=tvly-...             # For web search

# Infrastructure
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/thesis_validator

# API Server
API_PORT=3000
API_HOST=0.0.0.0
JWT_SECRET=your-secret-key-32-chars
CORS_ORIGINS=http://localhost:5173

# Feature Flags
ENABLE_REFLEXION_MEMORY=true
ENABLE_SKILL_LIBRARY=true
ENABLE_PROVENANCE_CERTIFICATES=true
```

### LLM Provider Options

**Option 1: Direct Anthropic API**
```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

**Option 2: Google Cloud Vertex AI**
```bash
LLM_PROVIDER=vertex-ai
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1
# Uses Application Default Credentials (ADC)
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for comprehensive GCP deployment instructions including:

- Cloud Run deployment
- Cloud SQL and Memorystore setup
- Secret Manager configuration
- CI/CD with Cloud Build
- Frontend hosting with Cloud CDN
- Monitoring and troubleshooting

### Quick Deploy

```bash
cd thesis-validator

# Build and push to Artifact Registry
gcloud builds submit --config=cloudbuild.yaml

# Or deploy manually
docker build -t thesis-validator .
gcloud run deploy thesis-validator --image=thesis-validator
```

## API Overview

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/auth/login` | Authenticate user |
| `POST` | `/api/deals` | Create new deal |
| `GET` | `/api/deals/:id` | Get deal details |
| `POST` | `/api/deals/:id/hypotheses` | Generate hypotheses |
| `POST` | `/api/deals/:id/research` | Start research workflow |
| `POST` | `/api/deals/:id/stress-test` | Run stress test |
| `GET` | `/api/deals/:id/evidence` | Get gathered evidence |
| `GET` | `/api/deals/:id/contradictions` | Get identified risks |

### WebSocket Events

Connect to `/ws` for real-time updates:

- `agent:status` - Agent status changes
- `evidence:found` - New evidence discovered
- `hypothesis:updated` - Hypothesis confidence changes
- `workflow:progress` - Workflow step completion

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run linting (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- TypeScript strict mode
- ESLint + Prettier for formatting
- Conventional commits
- JSDoc comments for public APIs

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Support

For questions or issues, please open a GitHub issue or contact the development team.
