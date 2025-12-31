# Quick Start Guide - Elaboració Module

## 🚀 Getting Started

### Prerequisites

- Firebase project configured
- Firebase emulators installed
- Node.js 22+ installed
- Google Cloud project with Vertex AI enabled

### 1. Install Dependencies

#### Backend (Functions)

```bash
cd functions
npm install
```

#### Frontend (Aina)

```bash
cd aina
npm install
```

### 2. Start Firebase Emulators

```bash
cd functions
firebase emulators:start
```

This will start:

- Functions emulator on port 5001
- Storage emulator on port 9199
- Firestore emulator on port 8080
- Auth emulator on port 9099

### 3. Start Frontend Development Server

In a new terminal:

```bash
cd aina
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Test the Elaboració Module

1. Open your browser and navigate to `http://localhost:5173`
2. Login (if required)
3. Navigate to "Elaboració Decrets" in the sidebar
4. Click "Seleccionar arxiu" and choose a PDF file
5. Click "Analitzar" to start processing
6. Wait for the extraction to complete (10-30 seconds)
7. Review the extracted data displayed in organized cards

## 🧪 Testing

### Test with Sample PDF

You can test with any PDF document that contains subvencio information. The AI will extract:

- Project information
- Entity details
- Budget (income and expenses)
- Declarations
- Contact information
- And much more!

### Expected Flow

1. **Upload** (0-50% progress): PDF uploads to Firebase Storage
2. **Processing** (50-100% progress): Genkit analyzes the PDF with Gemini 2.0 Flash
3. **Results**: Structured data displayed in the UI

## 🔍 Debugging

### Check Function Logs

```bash
# In the emulator terminal, you'll see logs like:
[functions] > Starting subvencio extraction { filePath: 'uploads/subvencio/...' }
[functions] > Downloaded file from storage { size: 123456 }
[functions] > Successfully extracted subvencio data
```

### Check Frontend Console

Open browser DevTools and check the Console for:

```javascript
📤 Uploading and extracting subvencio data: document.pdf
✅ Subvencio data extracted successfully: {...}
```

### Common Issues

#### Function not found

- Make sure functions are built: `cd functions && npm run build`
- Check that emulators are running
- Verify the function is exported in `functions/src/elaboracio/index.ts`

#### CORS errors

- The function has CORS enabled by default
- Check browser console for specific CORS errors
- Verify Firebase configuration

#### Upload fails

- Check Storage emulator is running
- Verify file is a valid PDF
- Check file size (max depends on Storage configuration)

#### Extraction timeout

- Large PDFs may take longer to process
- Check Vertex AI quota
- Verify network connectivity

## 📊 Monitoring

### Firebase Emulator UI

Access at `http://localhost:4000` when emulators are running:

- View Storage files
- Check Functions logs
- Monitor Firestore data

### Function Performance

Typical processing times:

- Small PDF (< 1MB): 10-15 seconds
- Medium PDF (1-5MB): 15-25 seconds
- Large PDF (> 5MB): 25-40 seconds

## 🎯 Next Steps

Once the basic functionality is working:

1. **Add Export Features**

   - Export to JSON
   - Export to Excel
   - Generate PDF reports

2. **Enable Editing**

   - Allow users to correct extracted data
   - Save to Firestore for persistence

3. **Add Template Generation**

   - Create decree templates
   - Pre-fill with extracted data

4. **Batch Processing**
   - Process multiple PDFs at once
   - Bulk export capabilities

## 🛠️ Development Commands

### Build Functions

```bash
cd functions
npm run build
```

### Watch Mode (Auto-rebuild)

```bash
cd functions
npm run build:watch
```

### Deploy to Production

```bash
cd functions
npm run deploy
```

### Run Frontend Tests

```bash
cd aina
npm run test
```

## 📝 File Structure

```
CODE/
├── functions/
│   └── src/
│       └── elaboracio/
│           ├── index.ts                    # Exports Cloud Functions
│           └── lib/
│               └── routes/
│                   └── extractSubvencio.ts # Main extraction logic
└── aina/
    └── src/
        └── modules/
            └── elaboracio/
                ├── components/
                │   ├── SubvencioUploader.tsx      # Upload UI
                │   └── SubvencioDataDisplay.tsx   # Display results
                ├── lib/
                │   └── apiService.ts              # API client
                ├── pages/
                │   └── Module2.jsx                # Main page
                ├── types/
                │   └── index.ts                   # TypeScript types
                ├── README.md                      # Documentation
                └── EXAMPLE_RESPONSE.json          # Sample output
```

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] Firebase emulators running
- [ ] Frontend dev server running
- [ ] Can access the Elaboració page
- [ ] Can upload a PDF file
- [ ] Extraction completes successfully
- [ ] Data is displayed correctly
- [ ] No errors in console

## 🆘 Support

If you encounter issues:

1. Check the logs in the emulator terminal
2. Check browser DevTools console
3. Verify all dependencies are installed
4. Ensure Firebase project is properly configured
5. Check that Vertex AI is enabled in your Google Cloud project

## 🎉 You're Ready!

The Elaboració module is now fully functional and ready to extract structured data from PDF subvencio applications using AI!
