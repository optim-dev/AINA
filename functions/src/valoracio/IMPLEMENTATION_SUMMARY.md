# Valoració Backend Implementation Summary

## Overview

Created a complete Firebase Cloud Functions backend for the Valoració (Tender Evaluation) module based on the standalone server implementation in `aina/functions_valoracio_oferts/`.

## Files Created

### 1. Directory Structure

```
functions/src/valoracio/
├── index.ts                          # Firebase Functions exports (UPDATED)
├── README.md                         # Documentation (NEW)
└── lib/
    ├── middleware/
    │   ├── errorHandler.ts           # Error handling (NEW)
    │   └── validation.ts             # Request validation (NEW)
    ├── routes/
    │   ├── upload.ts                 # File upload & extraction (NEW)
    │   ├── extractLots.ts            # Lot extraction (NEW)
    │   ├── evaluateLot.ts            # Proposal evaluation (NEW)
    │   └── compareProposals.ts       # Proposal comparison (NEW)
    ├── types/
    │   └── index.ts                  # Type definitions (NEW)
    └── utils/
        ├── errors.ts                 # Custom errors (NEW)
        ├── languagePrompts.ts        # Language support (NEW)
        └── companyExtractor.ts       # Company extraction (NEW)
```

### 2. Package Dependencies (Added to functions/package.json)

**Runtime Dependencies:**

- `@google/genai@^1.9.0` - Google Gemini AI SDK
- `compression@^1.7.4` - Response compression
- `cors@^2.8.5` - CORS middleware
- `helmet@^7.1.0` - Security headers
- `mammoth@^1.6.0` - DOCX text extraction
- `multer@^1.4.5-lts.1` - File upload handling
- `pdf-parse@^1.1.1` - PDF text extraction
- `zod@^3.22.4` - Schema validation

**Dev Dependencies:**

- `@types/compression@^1.8.1`
- `@types/cors@^2.8.17`
- `@types/express@^4.17.21`
- `@types/multer@^1.4.11`
- `@types/node@^22.10.5`
- `@types/pdf-parse@^1.1.4`

## Implementation Details

### Core Features

1. **File Processing** (`routes/upload.ts`)

   - Supports PDF, DOCX, DOC, TXT files
   - Extracts and cleans text content
   - Multi-file upload (max 10 files, 10MB each)

2. **Lot Extraction** (`routes/extractLots.ts`)

   - AI-powered lot identification
   - Multi-language support (CA, ES, EN)
   - Fallback extraction logic

3. **Proposal Evaluation** (`routes/evaluateLot.ts`)

   - Context-aware evaluation
   - Automatic company name extraction
   - Criteria-based scoring system
   - Three-tier scoring: INSUFICIENT, REGULAR, COMPLEIX_EXITOSAMENT

4. **Proposal Comparison** (`routes/compareProposals.ts`)
   - Multi-proposal ranking
   - Criterion-by-criterion analysis
   - Global ranking with justifications

### API Endpoints

All endpoints exported as Firebase Cloud Functions:

1. **Main API**: `valoracioApi` - Single function with Express routing
2. **Individual Functions** (alternative deployment):
   - `uploadFiles` - File upload endpoint
   - `extractLots` - Lot extraction endpoint
   - `evaluateLot` - Evaluation endpoint
   - `compareProposals` - Comparison endpoint

### Configuration

**Function Settings:**

- Upload: 300s timeout, 1GB memory
- Extract Lots: 300s timeout, 1GB memory
- Evaluate Lot: 540s timeout, 2GB memory (most intensive)
- Compare Proposals: 300s timeout, 1GB memory

**Required Environment Variables:**

- `PROJECT_ID` - Google Cloud Project ID
- `BQ_DATASET` - BigQuery dataset for logging

_Note: LLM calls are handled through the centralized LLMService which manages API credentials internally._

### Middleware

1. **Error Handling** (`middleware/errorHandler.ts`)

   - Custom error classes
   - Development vs production error responses
   - Request logging

2. **Validation** (`middleware/validation.ts`)
   - Zod schema validation
   - Upload type validation
   - Request body validation

### Type Safety

Complete TypeScript type definitions in `lib/types/index.ts`:

- FileContent, LotInfo, EvaluationCriteria
- LotEvaluation, ProposalComparison
- Request/Response interfaces
- Utility types and constants

### Multi-Language Support

Language-specific prompts and responses for:

- Catalan (ca) - default
- Spanish (es)
- English (en)

## Deployment Instructions

### 1. Configure Environment

Ensure your `functions/.env.local` (development) or `functions/.env.aina-demostradors` (production) has the required variables.

### 2. Build Functions

```bash
cd functions
npm run build
```

### 3. Deploy

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy valoracio only
firebase deploy --only functions:valoracioApi
```

### 4. Test Locally

```bash
# From project root
firebase emulators:start
```

## Integration with Frontend

The frontend module at `aina/src/modules/valoracio/` should be updated to call the Firebase Functions endpoints:

**Before (standalone server):**

```javascript
const API_URL = "http://localhost:3001/api"
```

**After (Firebase Functions):**

```javascript
const API_URL = "https://region-project-id.cloudfunctions.net/valoracioApi/api"
// or
const API_URL = getFunctions().httpsCallable("valoracioApi")
```

## Key Differences from Standalone Server

1. **Architecture**: Express app wrapped in Firebase Cloud Functions
2. **Deployment**: Serverless instead of traditional server
3. **Scaling**: Auto-scaling handled by Firebase
4. **Authentication**: Can integrate with Firebase Auth
5. **CORS**: Simplified with `cors({origin: true})`

## Testing Checklist

- [ ] Upload PDF files
- [ ] Upload DOCX files
- [ ] Extract lots from specifications
- [ ] Evaluate single lot with proposals
- [ ] Compare multiple proposals
- [ ] Test Catalan language prompts
- [ ] Test Spanish language prompts
- [ ] Test English language prompts
- [ ] Error handling for invalid files
- [ ] Error handling for missing API key

## Next Steps

1. **Set up GEMINI_API_KEY** in Firebase Functions config
2. **Deploy functions** to Firebase
3. **Update frontend** API endpoints
4. **Test end-to-end** workflow
5. **Monitor performance** and costs
6. **Set up logging** and error tracking
7. **Configure CORS** for specific domains (production)

## Notes

- The implementation maintains API compatibility with the standalone server
- All AI prompts are preserved from the original implementation
- Error handling is consistent across all endpoints
- The code follows Firebase Functions best practices
- TypeScript strict mode is enabled for type safety

## Reference

Original implementation: `aina/functions_valoracio_oferts/`
Firebase Functions docs: https://firebase.google.com/docs/functions
