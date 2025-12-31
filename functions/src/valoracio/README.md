# Valoració Backend - Firebase Functions

Backend implementation for the Valoració (Tender Evaluation) module using Firebase Cloud Functions.

## Overview

This backend provides AI-powered tender evaluation services with the following capabilities:

- **File Upload & Processing**: Extract text from PDF, DOCX, and TXT files
- **Lot Extraction**: Automatically identify and extract tender lots from specification documents
- **Lot Evaluation**: Evaluate proposals against evaluation criteria using AI
- **Proposal Comparison**: Compare multiple proposals and generate rankings

## Architecture

The backend is structured as a set of Firebase Cloud Functions with Express.js routing:

```
functions/src/valoracio/
├── index.ts                    # Main Firebase Functions exports
└── lib/
    ├── middleware/
    │   ├── errorHandler.ts     # Error handling middleware
    │   └── validation.ts       # Request validation
    ├── routes/
    │   ├── upload.ts           # File upload and text extraction
    │   ├── extractLots.ts      # Lot extraction from specs
    │   ├── evaluateLot.ts      # Proposal evaluation
    │   └── compareProposals.ts # Proposal comparison
    ├── types/
    │   └── index.ts            # TypeScript type definitions
    └── utils/
        ├── errors.ts           # Custom error classes
        ├── languagePrompts.ts  # Multi-language support
        └── companyExtractor.ts # Company name extraction
```

## API Endpoints

All endpoints are exposed under the `valoracioApi` function and support multi-language processing (ca, es, en).

### 1. Upload Files

**POST** `/api/upload`

Upload and process specification or proposal documents.

**Request Body:**

```json
{
  "type": "specification" | "proposal",
  "files": [/* multipart/form-data files */]
}
```

**Response:**

```json
{
	"success": true,
	"files": [
		{
			"name": "document.pdf",
			"content": "extracted text...",
			"type": "specification",
			"success": true,
			"extractedLength": 15000
		}
	],
	"summary": {
		"total": 1,
		"successful": 1,
		"failed": 0
	}
}
```

### 2. Extract Lots

**POST** `/api/:lang/extract-lots`

Extract tender lots from specification documents.

**Parameters:**

- `lang`: Language code (ca, es, en)

**Request Body:**

```json
{
	"specifications": [
		{
			"name": "spec.pdf",
			"content": "document content...",
			"type": "specification"
		}
	]
}
```

**Response:**

```json
[
	{
		"lotNumber": 1,
		"title": "Lot Title",
		"description": "Optional description"
	}
]
```

### 3. Evaluate Lot

**POST** `/api/:lang/evaluate-lot`

Evaluate proposals for a specific lot.

**Parameters:**

- `lang`: Language code (ca, es, en)

**Request Body:**

```json
{
  "specifications": [...],
  "proposals": [...],
  "lotInfo": {
    "lotNumber": 1,
    "title": "Lot Title"
  }
}
```

**Response:**

```json
{
	"lotNumber": 1,
	"lotTitle": "Lot Title",
	"evaluations": [
		{
			"lotNumber": 1,
			"lotTitle": "Lot Title",
			"proposalName": "Proposal.pdf",
			"companyName": "Company S.L.",
			"hasProposal": true,
			"criteria": [
				{
					"criterion": "Technical Approach",
					"score": "COMPLEIX_EXITOSAMENT",
					"justification": "...",
					"strengths": ["..."],
					"improvements": ["..."],
					"references": ["..."]
				}
			],
			"summary": "Overall evaluation summary",
			"recommendation": "Recommendation text"
		}
	],
	"extractedCriteria": 8,
	"processingTime": 1234567890
}
```

### 4. Compare Proposals

**POST** `/api/:lang/compare-proposals`

Compare multiple evaluated proposals for a lot.

**Parameters:**

- `lang`: Language code (ca, es, en)

**Request Body:**

```json
{
  "specifications": [...],
  "lotInfo": {...},
  "evaluatedProposals": [...]
}
```

**Response:**

```json
{
  "comparison": {
    "lotNumber": 1,
    "lotTitle": "Lot Title",
    "proposalNames": ["Proposal1", "Proposal2"],
    "companyNames": ["Company A", "Company B"],
    "criteriaComparisons": [...],
    "globalRanking": [
      {
        "proposalName": "Proposal1",
        "companyName": "Company A",
        "position": 1,
        "overallScore": "Excepcional",
        "strengths": ["..."],
        "weaknesses": ["..."],
        "recommendation": "..."
      }
    ],
    "summary": "Comparison summary"
  },
  "timestamp": "2025-10-27T..."
}
```

## Environment Variables

LLM calls are handled through the centralized LLMService. Ensure your environment variables are configured in:

- `functions/.env.local` (development)
- `functions/.env.aina-demostradors` (production)

Required variables:

```bash
PROJECT_ID=aina-demostradors
BQ_DATASET=aina_logs_dev  # or aina_logs_prod
```

## Deployment

### Deploy all functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Deploy specific function:

```bash
firebase deploy --only functions:valoracioApi
```

## Development

### Local testing with Firebase Emulator:

```bash
# In root directory
firebase emulators:start
```

### Build and watch:

```bash
cd functions
npm run build:watch
```

## Dependencies

Main dependencies:

- `firebase-functions` & `firebase-admin` - Firebase Cloud Functions
- `express` - Web framework
- `multer` - File upload handling
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `zod` - Request validation
- `cors`, `helmet`, `compression` - Security & performance

## AI Model

Uses the centralized **LLMService** (via `getGeminiService()`) for:

- Lot extraction from specifications
- Criteria identification
- Proposal evaluation
- Comparative analysis

All LLM calls go through `LLMService.ts` for unified observability and logging.

## Error Handling

All endpoints use centralized error handling with custom error classes:

- `AppError` - General application errors
- `ValidationError` - Input validation errors
- `NotFoundError` - Resource not found
- `UnauthorizedError` - Authentication errors

## Timeout & Memory Configuration

- **Upload**: 300s, 1GB memory
- **Extract Lots**: 300s, 1GB memory
- **Evaluate Lot**: 540s, 2GB memory (processing intensive)
- **Compare Proposals**: 300s, 1GB memory

## Limitations

- Max file size: 10MB per file
- Max files per upload: 10 files
- Max pages per PDF: 100 pages
- Max criteria per lot: 8 criteria
- Request body limit: 50MB

## Notes

- All routes support Catalan (ca), Spanish (es), and English (en)
- Company names are automatically extracted from proposals when possible
- The system uses fallback extraction if AI identification fails
- All responses are in JSON format
- CORS is enabled for all origins in production (configure as needed)

## Reference Implementation

This implementation is based on the standalone server in:
`aina/functions_valoracio_oferts/`

The Firebase Functions version maintains the same API contract while leveraging Firebase's infrastructure for scalability and serverless deployment.
