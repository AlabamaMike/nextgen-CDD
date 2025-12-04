# E2E Verification - Research Workflow

This document outlines the manual end-to-end testing steps for the research workflow implementation.

## Prerequisites

### 1. Infrastructure Running

Ensure the following services are running:

```bash
# PostgreSQL database
# Check status:
docker ps | grep postgres || systemctl status postgresql

# Redis
# Check status:
docker ps | grep redis || systemctl status redis
```

### 2. Database Initialized

```bash
# Run migrations to create research tables
npm run db:migrate

# Verify tables exist:
# - research_jobs
# - hypotheses
# - evidence_items
```

### 3. Backend Server Running

```bash
# Start the API server
npm run dev

# Verify health check
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":...,"version":"1.0.0"}
```

### 4. Research Worker Running

Open a separate terminal and start the BullMQ worker:

```bash
cd thesis-validator
npm run worker
# or
node --loader tsx src/workers/research-worker.ts
```

## Test Scenarios

### Scenario 1: Start a Research Job

**Goal**: Verify that a research job can be created and queued.

1. Create a test engagement:

```bash
# Using the API
curl -X POST http://localhost:3000/api/v1/engagements \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Engagement",
    "client_name": "Test Client",
    "deal_type": "buyout",
    "target_company": {
      "name": "TechCorp Inc",
      "description": "Enterprise software company",
      "industry": "Technology",
      "geography": "North America"
    },
    "investment_thesis": "Strong market position with growth potential"
  }'
```

Save the returned `id` for the next step.

2. Start a research job:

```bash
ENGAGEMENT_ID="<id-from-step-1>"

curl -X POST "http://localhost:3000/api/v1/engagements/$ENGAGEMENT_ID/research" \
  -H "Content-Type: application/json" \
  -d '{
    "thesis": "AI will revolutionize enterprise software over the next 5 years, creating new market opportunities and disrupting traditional vendors",
    "config": {
      "maxHypotheses": 3,
      "enableDeepDive": false,
      "confidenceThreshold": 70,
      "searchDepth": "quick"
    }
  }'
```

**Expected Response**:
```json
{
  "job_id": "uuid",
  "status": "queued",
  "started_at": null
}
```

### Scenario 2: Check Job Status

**Goal**: Verify job status updates as it progresses.

```bash
JOB_ID="<job-id-from-scenario-1>"
ENGAGEMENT_ID="<engagement-id>"

curl "http://localhost:3000/api/v1/engagements/$ENGAGEMENT_ID/research/$JOB_ID"
```

**Expected Responses** (status changes over time):
- Initial: `"status": "queued"`
- Processing: `"status": "running"`
- Complete: `"status": "completed"`, `"confidence_score": 0-100`, `"results": {...}`
- On error: `"status": "failed"`, `"error_message": "..."`

### Scenario 3: WebSocket Progress Streaming

**Goal**: Verify real-time progress events via WebSocket.

Use a WebSocket client (like `wscat` or browser dev tools):

```bash
# Install wscat if needed
npm install -g wscat

# Connect to progress stream
wscat -c "ws://localhost:3000/research/jobs/$JOB_ID/progress?token=test-token"
```

**Expected Events** (in order):
1. Connection confirmation:
```json
{
  "type": "connected",
  "payload": { "jobId": "uuid", "timestamp": 1234567890 }
}
```

2. Status updates:
```json
{
  "type": "progress",
  "payload": {
    "type": "status_update",
    "jobId": "uuid",
    "timestamp": 1234567890,
    "data": { "status": "running", "message": "Research job started", "progress": 10 }
  }
}
```

3. Phase transitions:
```json
{
  "type": "progress",
  "payload": {
    "type": "phase_start",
    "data": { "phase": "research", "message": "Executing research workflow" }
  }
}
```

4. Completion:
```json
{
  "type": "progress",
  "payload": {
    "type": "completed",
    "data": { "status": "completed", "confidence": 85.5, "verdict": "proceed" }
  }
}
```

### Scenario 4: Database Persistence

**Goal**: Verify research results are stored in the database.

After a job completes successfully, check the database:

```sql
-- Check research job record
SELECT id, status, confidence_score, results::text
FROM research_jobs
WHERE id = '<job-id>';

-- Check generated hypotheses
SELECT statement, priority, validation_status
FROM hypotheses
WHERE job_id = '<job-id>';

-- Check evidence items
SELECT type, content, confidence
FROM evidence_items
WHERE job_id = '<job-id>'
LIMIT 10;
```

**Expected**:
- Job record with `status = 'completed'`
- Multiple hypothesis records (up to `maxHypotheses` config value)
- Multiple evidence items linked to the job
- Results JSON containing verdict, summary, key findings

### Scenario 5: Error Handling

**Goal**: Verify graceful error handling.

Test invalid inputs:

```bash
# 1. Thesis too short (< 10 characters)
curl -X POST "http://localhost:3000/api/v1/engagements/$ENGAGEMENT_ID/research" \
  -H "Content-Type: application/json" \
  -d '{"thesis": "Short"}'

# Expected: 400 Bad Request with validation error

# 2. Non-existent engagement
curl -X POST "http://localhost:3000/api/v1/engagements/00000000-0000-0000-0000-000000000000/research" \
  -H "Content-Type: application/json" \
  -d '{"thesis": "Valid thesis but bad engagement ID"}'

# Expected: 404 Not Found

# 3. Invalid config
curl -X POST "http://localhost:3000/api/v1/engagements/$ENGAGEMENT_ID/research" \
  -H "Content-Type: application/json" \
  -d '{
    "thesis": "Valid thesis",
    "config": {"maxHypotheses": 100}
  }'

# Expected: 400 Bad Request (maxHypotheses max is 10)
```

## Integration Test

Run the automated integration test suite:

```bash
# Run all tests
npm test

# Run only the research workflow integration test
npm test tests/research-workflow.test.ts
```

**Note**: Integration tests require:
- PostgreSQL running and accessible
- Redis running and accessible
- Clean database state (tests create/cleanup their own data)

## Verification Checklist

- [ ] Backend server starts without errors
- [ ] Health endpoint responds
- [ ] Research worker starts and connects to queue
- [ ] Research job can be created via API
- [ ] Job status changes from queued → running → completed
- [ ] WebSocket streams progress events in real-time
- [ ] Results are persisted to database (jobs, hypotheses, evidence)
- [ ] Invalid requests return appropriate error codes
- [ ] Worker handles job failures gracefully
- [ ] Integration tests pass

## Common Issues

### Port Already in Use
```bash
# Kill existing servers
pkill -f "tsx watch"

# Or find and kill specific process
lsof -ti:3000 | xargs kill -9
```

### Redis Connection Error
```bash
# Verify Redis is running
redis-cli ping
# Expected: PONG

# If not running, start it
docker start redis
# or
systemctl start redis
```

### Database Connection Error
```bash
# Check PostgreSQL is running and accessible
psql -h localhost -U postgres -d thesis_validator -c "\dt"

# Verify connection string in .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=thesis_validator
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

### Worker Not Processing Jobs
```bash
# Check BullMQ queue in Redis
redis-cli KEYS "bull:research-jobs:*"

# Check worker logs for errors
# Worker should log: "[ResearchWorker] Started, waiting for jobs..."
```

## Success Criteria

The research workflow is considered successfully implemented when:

1. ✅ API endpoints accept and validate research requests
2. ✅ Jobs are queued in BullMQ (Redis)
3. ✅ Worker processes jobs asynchronously
4. ✅ Conductor executes adaptive research workflow
5. ✅ Progress events stream via WebSocket
6. ✅ Results persist to PostgreSQL database
7. ✅ Error cases return appropriate HTTP codes
8. ✅ Integration tests pass
