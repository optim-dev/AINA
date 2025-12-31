# Elaboració Module - Subvencio Data Extraction

## Overview

This module enables automatic extraction of structured data from PDF subvencio (grant) applications using Google's Gemini 2.0 Flash with multimodal capabilities.

## Architecture

### Backend (Firebase Functions)

#### 1. **extractSubvencio Cloud Function** (`functions/src/elaboracio/lib/routes/extractSubvencio.ts`)

- **Technology**: Genkit with Vertex AI + Gemini 2.0 Flash
- **Input**: Firebase Storage path to a PDF file
- **Output**: Structured JSON data with all subvencio fields
- **Features**:
  - Multimodal PDF processing (direct PDF analysis without text extraction)
  - Structured output with Zod schema validation
  - Comprehensive field extraction (60+ fields organized in 11 categories)
  - Temperature set to 0.1 for consistent extraction
  - Max output tokens: 8192

#### 2. **Data Schema**

The function extracts the following categories of information:

- **Subvenció**: Project details, budget, municipality
- **Ens Públic**: Applicant entity information, contacts
- **Modalitat d'Execució**: Execution modality
- **Documentació Adjunta**: Attached documents checklist
- **Destinació Final**: Final beneficiaries
- **Memòria d'Actuació**: Project description and objectives
- **Pressupost**: Detailed budget (income and expenses)
- **Declaració Responsable**: Responsible declarations
- **Excepcionalitat**: Exceptional cases
- **Autoritzacions**: Authorizations
- **Protecció de Dades**: Data protection information
- **Destinatari Final**: Final recipient

### Frontend (React)

#### 1. **Module2.jsx** (`aina/src/modules/elaboracio/pages/Module2.jsx`)

Main page component that orchestrates the flow:

- File upload
- Progress tracking
- Error handling
- Results display

#### 2. **SubvencioUploader.tsx** (`aina/src/modules/elaboracio/components/SubvencioUploader.tsx`)

File upload component with:

- PDF file selection
- Upload progress bar
- Visual feedback during processing
- File size display

#### 3. **SubvencioDataDisplay.tsx** (`aina/src/modules/elaboracio/components/SubvencioDataDisplay.tsx`)

Comprehensive display component showing:

- All extracted fields in organized cards
- Currency formatting for amounts
- Checkboxes for boolean declarations
- Budget breakdown (income/expenses)
- Attached documents badges
- Responsive layout

#### 4. **API Service** (`aina/src/modules/elaboracio/lib/apiService.ts`)

Service layer that:

- Uploads PDF to Firebase Storage
- Calls the Cloud Function
- Handles progress callbacks
- Returns structured data

#### 5. **Type Definitions** (`aina/src/modules/elaboracio/types/index.ts`)

TypeScript interfaces for all data structures

## How It Works

### User Flow

1. **Upload**: User selects a PDF file of a subvencio application
2. **Storage**: File is uploaded to Firebase Storage (`uploads/subvencio/`)
3. **Processing**: Cloud Function downloads the PDF and sends it to Gemini 2.0 Flash
4. **Extraction**: AI analyzes the PDF and extracts structured data
5. **Display**: Results are shown in organized cards on the frontend

### Technical Flow

```
Frontend (React)
  ↓
  Upload PDF to Storage
  ↓
Firebase Storage
  ↓
  Call Cloud Function (extractSubvencio)
  ↓
Genkit + Vertex AI
  ↓
  Download PDF from Storage
  ↓
  Convert to Base64
  ↓
  Send to Gemini 2.0 Flash (multimodal)
  ↓
  Parse structured JSON response
  ↓
Return to Frontend
  ↓
Display in UI
```

## Key Features

### 1. **Multimodal Processing**

- Direct PDF analysis without OCR or text extraction
- Better handling of complex layouts, tables, and forms
- More accurate data extraction

### 2. **Structured Output**

- Zod schema ensures type safety
- All 60+ fields properly typed
- Consistent data structure

### 3. **Progress Tracking**

- 0-50%: File upload
- 50-100%: AI processing
- Visual progress bar with status messages

### 4. **Comprehensive Data Display**

- Organized into logical sections
- Currency formatting
- Expandable/collapsible cards
- Mobile-responsive

### 5. **Error Handling**

- Upload errors
- Processing errors
- Network errors
- User-friendly error messages

## Usage

### Starting the Application

1. **Start Firebase Emulators**:

```bash
cd functions
firebase emulators:start
```

2. **Start Frontend**:

```bash
cd aina
npm run dev
```

3. **Navigate to Elaboració Module**:

- Open the application in browser
- Go to "Elaboració Decrets" section
- Upload a PDF subvencio application
- Wait for processing
- View extracted data

## Configuration

### Environment Variables

Make sure these are set in your Firebase project:

- `GOOGLE_GENAI_API_KEY`: Google AI API key (or use Vertex AI)
- Firebase Storage bucket configured

### Firebase Functions

The `extractSubvencio` function is exported in:

- `functions/src/elaboracio/index.ts`
- `functions/src/index.ts`

## Future Enhancements

1. **Export Options**:

   - Export to JSON
   - Export to Excel
   - Generate PDF report

2. **Edit Capability**:

   - Allow users to edit extracted data
   - Save corrections for future reference

3. **Template Management**:

   - Pre-fill decree templates with extracted data
   - Custom field mapping

4. **Batch Processing**:

   - Process multiple PDFs at once
   - Bulk export

5. **Training Data**:
   - Save user corrections to improve accuracy
   - Fine-tune model with actual documents

## Dependencies

### Backend

- `genkit`: ^1.21.0
- `@genkit-ai/vertexai`: ^1.21.0
- `@genkit-ai/firebase`: ^1.21.0
- `firebase-admin`: ^12.6.0
- `firebase-functions`: ^6.0.1
- `zod`: ^3.22.4

### Frontend

- React
- Firebase SDK (storage, functions)
- Tailwind CSS
- Lucide icons

## Notes

- The extraction prompt is in Catalan to match the document language
- Processing time: typically 10-30 seconds depending on PDF complexity
- Maximum file size: limited by Firebase Storage configuration
- Supported format: PDF only

## Troubleshooting

### Function not found

Make sure to rebuild and deploy:

```bash
cd functions
npm run build
firebase deploy --only functions
```

### CORS errors

Ensure CORS is enabled in the Cloud Function:

```typescript
export const extractSubvencio = onCallGenkit(
	{
		cors: true,
		// ...
	},
	extractSubvencioFlow
)
```

### Slow processing

- Check internet connection
- Verify Vertex AI quota
- Monitor function logs for errors

## Success! ✅

The elaboracio module now:

1. ✅ Starts the same as valoracio with PDF import
2. ✅ Uses Genkit with Vertex AI Gemini 2.0 Flash
3. ✅ Processes PDFs with multimodal capabilities
4. ✅ Extracts all 60+ structured fields
5. ✅ Displays results in a comprehensive UI
6. ✅ Returns the LLM result to the frontend
