# Valoració d'Ofertes Module - Migration Status

## Overview

This document tracks the migration of the `next_valoracio_ofertes` Next.js application to the `valoracio` module within the main Vite/React application.

## ✅ Completed Components

### Core Infrastructure

- **Types** (`types/index.js`) - All TypeScript types converted to JSDoc comments
- **Strings** (`lib/strings.js`) - All Catalan translations from `ca.json` extracted and ready to use
- **File Utils** (`lib/fileUtils.js`) - File processing utilities (normalize filenames, encoding detection, etc.)
- **API Service** (`lib/apiService.js`) - API service with commented backend calls
- **useFileProcessing** (`lib/useFileProcessing.js`) - Custom hooks for file processing and drag-and-drop

### UI Components

- **Tooltip** (`components/Tooltip.jsx`) - Reusable tooltip component
- **CollapsibleSection** (`components/CollapsibleSection.jsx`) - Collapsible section with icon and badge support
- **BasicInfoForm** (`components/BasicInfoForm.jsx`) - Form for basic tender information
- **FileUploadSection** (`components/FileUploadSection.jsx`) - File upload with drag-and-drop, progress tracking
- **Header** (`components/Header.jsx`) - Application header with reset functionality
- **OptimEvaluator** (`pages/OptimEvaluator.jsx`) - Main page component with state management and lots extraction logic

## 🚧 Pending Components

The following components from the Next.js version still need to be ported:

### Proposal Management

- **ProposalUploadSection** - Upload proposals for each lot
  - Should allow selecting lot and uploading multiple files per lot
  - Display proposals grouped by lot

### Evaluation Components

- **EvaluationControl** - Control buttons for starting evaluation

  - "Evaluate All Lots" button with validation
  - Display counts of proposals and lots

- **LotEvaluationButtons** - Individual lot evaluation buttons
  - Grid of buttons for each lot
  - Show evaluation status (evaluated, evaluating, not evaluated)
  - Enable/disable based on form validity

### Loaders/Progress Indicators

- **ProgressiveEvaluationLoader** - Show progress when evaluating all lots

  - Display current lot being evaluated
  - Progress bar
  - Animation

- **SingleLotEvaluationLoader** - Show progress for single lot evaluation

  - Simpler version for individual lots

- **ComparisonLoader** - Show progress when comparing proposals
  - Display comparison in progress

### Results Display

- **IndividualLotResults** - Display results for individually evaluated lots

  - Show results for each lot evaluated separately
  - Download individual PDFs
  - Comparison button for lots with multiple proposals

- **EvaluationResults** - Display complete evaluation results

  - Summary statistics
  - Download all reports
  - Display results per lot

- **LotEvaluation** - Display evaluation for a single lot

  - Show all proposals for that lot
  - Criteria evaluation
  - Download buttons
  - Comparison component

- **ProposalEvaluation** - Display evaluation for a single proposal

  - Criteria breakdown
  - Scores with color coding
  - Strengths and improvements
  - References

- **ComparisonComponent** - Display comparison between multiple proposals
  - Ranking table
  - Criteria comparison
  - Executive summary
  - Download comparison PDF

## Backend Integration Points

All backend calls are commented in `lib/apiService.js`. When implementing the backend, these methods need to be uncommented and properly connected:

1. **uploadFiles** - Upload and process documents (PDF, DOC, DOCX)
2. **extractLots** - Extract lot information from specifications
3. **evaluateSingleLot** - Evaluate proposals for a single lot
4. **evaluateAllLots** - Orchestrate evaluation of all lots
5. **compareProposals** - Compare multiple proposals within a lot
6. **healthCheck** - API health check

## Key Differences from Next.js Version

1. **No Internationalization (i18n)** - All strings are hardcoded in Catalan from `STRINGS` constant
2. **No Server Components** - Everything is client-side React
3. **Vite instead of Next.js** - Using `import.meta.env` instead of `process.env`
4. **No TypeScript** - All types converted to JSDoc comments
5. **Backend calls commented** - Need Firebase Functions or external API implementation

## Usage

```javascript
import { Valoracio } from "@/modules/valoracio"

// In your component
;<Valoracio />
```

## Next Steps

1. Create remaining components (starting with ProposalUploadSection)
2. Implement PDF generation functionality (port from pdfGenerator.ts)
3. Connect to backend API (Firebase Functions or other)
4. Test full evaluation workflow
5. Add error handling and edge cases
6. Optimize performance for large documents

## Testing Checklist

- [ ] File upload (specifications)
- [ ] Lot extraction from specifications
- [ ] Proposal upload per lot
- [ ] Single lot evaluation
- [ ] All lots evaluation
- [ ] Proposal comparison
- [ ] PDF generation (individual)
- [ ] PDF generation (comparison)
- [ ] PDF generation (all reports)
- [ ] Error handling
- [ ] Loading states
- [ ] Reset functionality

## Notes

- The current implementation has a functional foundation with file upload, basic form, and lot extraction logic
- The main state management is in place in OptimEvaluator.jsx
- All helper functions and utilities are ready to use
- The component structure mirrors the Next.js version for easier porting
