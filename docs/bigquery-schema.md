# BigQuery Schema: LLM Interaction Logs

This document describes the BigQuery schema used for logging LLM (Large Language Model) interactions in the Aina project.

## Overview

All LLM interactions (Gemini, Salamandra, etc.) are logged to BigQuery for observability, analytics, and cost tracking. The logging is implemented via the `LLMService` class with a pluggable callback mechanism.

## Configuration

| Setting      | Default Value        | Environment Variable |
| ------------ | -------------------- | -------------------- |
| Dataset ID   | `aina_mvp_metrics`   | `BQ_DATASET`         |
| Table ID     | `llm_logs`           | -                    |
| Location     | `EU`                 | -                    |
| Partitioning | Daily by `timestamp` | -                    |

## Schema Definition

### Table: `llm_logs`

| Column              | Type      | Mode     | Description                                                                                                             |
| ------------------- | --------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `request_id`        | STRING    | REQUIRED | Unique identifier for the request. Format: `req_{timestamp}_{random}`                                                   |
| `timestamp`         | TIMESTAMP | REQUIRED | When the request was initiated (ISO 8601 format)                                                                        |
| `provider`          | STRING    | REQUIRED | LLM provider identifier. Values: `gemini`, `salamandra`, `gemini-2.5-flash`, `gemini-2.5-pro`, `salamandra-7b-instruct` |
| `model_version`     | STRING    | REQUIRED | Full model version string (e.g., `gemini-2.5-flash`, `BSC-LT/salamandra-7b-instruct`)                                   |
| `user_id`           | STRING    | NULLABLE | User identifier for the request (for user-level analytics)                                                              |
| `session_id`        | STRING    | NULLABLE | Session identifier for grouping related requests                                                                        |
| `prompt`            | STRING    | NULLABLE | The user's input prompt text                                                                                            |
| `system_prompt`     | STRING    | NULLABLE | System prompt/instructions if provided                                                                                  |
| `response`          | STRING    | NULLABLE | The LLM's generated response text                                                                                       |
| `prompt_tokens`     | INTEGER   | NULLABLE | Number of tokens in the prompt                                                                                          |
| `completion_tokens` | INTEGER   | NULLABLE | Number of tokens in the completion/response                                                                             |
| `total_tokens`      | INTEGER   | NULLABLE | Total tokens used (prompt + completion)                                                                                 |
| `latency_ms`        | INTEGER   | NULLABLE | Request latency in milliseconds                                                                                         |
| `error`             | STRING    | NULLABLE | Error message if the request failed                                                                                     |
| `error_stack`       | STRING    | NULLABLE | Error stack trace if available                                                                                          |
| `cost_estimate_usd` | FLOAT     | NULLABLE | Estimated cost in USD based on token usage                                                                              |
| `options_json`      | STRING    | NULLABLE | Serialized JSON of request options (see below)                                                                          |
| `context_json`      | STRING    | NULLABLE | Serialized JSON of additional context metadata                                                                          |

### Options JSON Structure

The `options_json` field contains serialized `LLMRequestOptions`:

```json
{
	"maxTokens": 1600,
	"temperature": 0.7,
	"topP": 0.95,
	"topK": 40,
	"stopSequences": ["<|im_end|>"]
}
```

### Context JSON Structure

The `context_json` field can contain arbitrary metadata:

```json
{
	"module": "elaboracio",
	"feature": "text_generation",
	"custom_field": "any_value"
}
```

## Setup

### Initial Setup (One-time)

Call the `setupBigQuery` function during deployment or initialization:

```typescript
import { setupBigQuery } from "./shared/BigQueryLogger"

// With defaults
await setupBigQuery()

// With explicit configuration
await setupBigQuery("aina-demostradors", "aina_mvp_metrics", "llm_logs")
```

This function is idempotent - it will create the dataset and table if they don't exist, and silently continue if they already exist.

### Using the Logger

```typescript
import { getSalamandraService } from "./shared/LLMService"
import { createBigQueryLogger, setupBigQuery } from "./shared/BigQueryLogger"

// Ensure table exists (call once at startup)
await setupBigQuery("aina-demostradors")

// Configure the LLM service with BigQuery logging
const llmService = getSalamandraService()
llmService.setLogCallback(createBigQueryLogger("aina-demostradors"))

// Now all calls are automatically logged
const response = await llmService.callModel({
	prompt: "Hola, com estàs?",
	userId: "user123",
	sessionId: "session456",
})
```

## Querying the Data

### Recent Requests

```sql
SELECT
  request_id,
  timestamp,
  provider,
  latency_ms,
  total_tokens,
  cost_estimate_usd,
  error
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE DATE(timestamp) = CURRENT_DATE()
ORDER BY timestamp DESC
LIMIT 100
```

### Daily Aggregates

```sql
SELECT
  DATE(timestamp) as date,
  provider,
  COUNT(*) as total_requests,
  COUNTIF(error IS NULL) as successful_requests,
  COUNTIF(error IS NOT NULL) as failed_requests,
  SUM(total_tokens) as total_tokens,
  AVG(latency_ms) as avg_latency_ms,
  SUM(cost_estimate_usd) as total_cost_usd
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date, provider
ORDER BY date DESC, provider
```

### User Activity

```sql
SELECT
  user_id,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_estimate_usd) as total_cost,
  AVG(latency_ms) as avg_latency_ms
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE user_id IS NOT NULL
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 50
```

### Error Analysis

```sql
SELECT
  error,
  provider,
  COUNT(*) as error_count,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE error IS NOT NULL
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY error, provider
ORDER BY error_count DESC
```

### Cost by Provider (Last 30 days)

```sql
SELECT
  provider,
  model_version,
  COUNT(*) as requests,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(cost_estimate_usd) as total_cost_usd,
  AVG(cost_estimate_usd) as avg_cost_per_request
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY provider, model_version
ORDER BY total_cost_usd DESC
```

## Programmatic Queries

The `BigQueryLogger.ts` module provides helper functions for querying:

```typescript
import { queryRecentLogs, getLogStatistics } from "./shared/BigQueryLogger"

// Get recent logs with filters
const logs = await queryRecentLogs("aina-demostradors", "aina_mvp_metrics", "llm_logs", 50, {
	userId: "user123",
	provider: "salamandra",
	onlyErrors: false,
})

// Get aggregated statistics
const stats = await getLogStatistics("aina-demostradors", "aina_mvp_metrics", "llm_logs", new Date("2024-12-01"), new Date("2024-12-31"))

console.log(stats)
// {
//   totalRequests: 1500,
//   successfulRequests: 1480,
//   failedRequests: 20,
//   totalTokens: 2500000,
//   avgLatencyMs: 850,
//   totalCostUsd: 45.50,
//   byProvider: {
//     'gemini-2.5-flash': { count: 1000, tokens: 1800000, cost: 35.00 },
//     'salamandra-7b-instruct': { count: 500, tokens: 700000, cost: 0 }
//   }
// }
```

## Cost Tracking

### Pricing (December 2024)

| Provider                 | Input (per 1M tokens) | Output (per 1M tokens) |
| ------------------------ | --------------------- | ---------------------- |
| Gemini 2.5 Flash         | $0.15                 | $0.60                  |
| Gemini 2.5 Pro           | $1.25                 | $10.00                 |
| Salamandra (self-hosted) | $0.00\*               | $0.00\*                |

\*Salamandra costs are compute-based (Vertex AI endpoint), not token-based.

### Monthly Cost Estimation Query

```sql
SELECT
  FORMAT_TIMESTAMP('%Y-%m', timestamp) as month,
  SUM(cost_estimate_usd) as total_cost,
  SUM(total_tokens) as total_tokens,
  COUNT(*) as total_requests
FROM `aina-demostradors.aina_mvp_metrics.llm_logs`
GROUP BY month
ORDER BY month DESC
```

## Data Retention & Partitioning

- **Partitioning**: The table is partitioned by `timestamp` (daily) for efficient queries
- **Retention**: Configure via BigQuery table expiration if needed
- **Location**: EU region for GDPR compliance

### Setting Table Expiration (Optional)

```sql
ALTER TABLE `aina-demostradors.aina_mvp_metrics.llm_logs`
SET OPTIONS (
  partition_expiration_days = 365
)
```

## REST API Endpoints

The following HTTP endpoints are available for querying BigQuery data:

### `GET /bigQueryStats`

Get aggregated LLM statistics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date string | Filter logs from this date |
| `endDate` | ISO date string | Filter logs until this date |

**Example:**

```bash
# Get all-time stats
curl https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryStats

# Get stats for December 2024
curl "https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryStats?startDate=2024-12-01&endDate=2024-12-31"
```

**Response:**

```json
{
	"status": "success",
	"data": {
		"totalRequests": 1500,
		"successfulRequests": 1480,
		"failedRequests": 20,
		"totalTokens": 2500000,
		"avgLatencyMs": 850,
		"totalCostUsd": 45.5,
		"byProvider": {
			"gemini-2.5-flash": { "count": 1000, "tokens": 1800000, "cost": 35.0 },
			"salamandra-7b-instruct": { "count": 500, "tokens": 700000, "cost": 0 }
		}
	}
}
```

### `GET /bigQueryLogs`

Query recent LLM interaction logs with filters.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Max rows to return (max: 1000) |
| `userId` | string | - | Filter by user ID |
| `sessionId` | string | - | Filter by session ID |
| `provider` | string | - | Filter by provider (e.g., `gemini-2.5-flash`) |
| `startDate` | ISO date | - | Filter logs from this date |
| `endDate` | ISO date | - | Filter logs until this date |
| `onlyErrors` | boolean | false | Only return failed requests |

**Examples:**

```bash
# Get last 10 logs
curl "https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryLogs?limit=10"

# Get logs for a specific user
curl "https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryLogs?userId=user123"

# Get only errors
curl "https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryLogs?onlyErrors=true&limit=50"

# Get Salamandra logs from last week
curl "https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryLogs?provider=salamandra-7b-instruct&startDate=2024-12-08"
```

### `GET /bigQueryHealth`

Check if the BigQuery table exists and is accessible.

**Example:**

```bash
curl https://europe-west4-aina-demostradors.cloudfunctions.net/bigQueryHealth
```

**Response:**

```json
{
	"status": "healthy",
	"table": {
		"projectId": "aina-demostradors",
		"datasetId": "aina_mvp_metrics",
		"tableId": "llm_logs",
		"exists": true
	},
	"timestamp": "2024-12-15T10:30:00.000Z"
}
```

### `POST /bigQuerySetup`

Create the BigQuery dataset and table if they don't exist. This is an admin endpoint.

**Example:**

```bash
curl -X POST https://europe-west4-aina-demostradors.cloudfunctions.net/bigQuerySetup
```

**Response:**

```json
{
	"status": "success",
	"message": "BigQuery setup completed",
	"result": {
		"datasetId": "aina_mvp_metrics",
		"tableId": "llm_logs",
		"datasetCreated": false,
		"tableCreated": true
	}
}
```

## Related Files

- `/functions/src/shared/BigQueryLogger.ts` - BigQuery logging implementation
- `/functions/src/shared/bigQueryApi.ts` - REST API endpoints
- `/functions/src/shared/LLMService.ts` - LLM service with logging callback support
