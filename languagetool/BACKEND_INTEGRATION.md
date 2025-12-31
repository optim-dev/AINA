# LanguageTool Backend Integration

## Overview

The LanguageTool functionality has been moved to a Firebase Cloud Function to improve security and maintainability. The frontend no longer needs to know about the LanguageTool container location.

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React App)    │
└────────┬────────┘
         │ Firebase Callable Function
         │ checkLanguageTool({ text, language, level })
         ▼
┌─────────────────────────┐
│  Firebase Functions     │
│  (Backend)              │
│  - Validates input      │
│  - Calls LanguageTool   │
│  - Returns results      │
└────────┬────────────────┘
         │ HTTP POST
         │ /v2/check
         ▼
┌─────────────────────────┐
│  LanguageTool Container │
│  (Docker / Cloud Run)   │
│  Port 8010              │
└─────────────────────────┘
```

## Changes Made

### 1. Backend (Firebase Functions)

**File:** `functions/src/kit/index.ts`

Created a new Firebase callable function `checkLanguageTool`:

```typescript
export const checkLanguageTool = functions.https.onCall(async (data, context) => {
	const { text, language = "ca", level = "default" } = data

	// Validation
	if (!text || typeof text !== "string" || text.trim().length === 0) {
		throw new functions.https.HttpsError("invalid-argument", "Text is required")
	}

	// Call LanguageTool
	const response = await fetch(`${LANGUAGETOOL_URL}/v2/check`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ language, level, text }),
	})

	return await response.json()
})
```

**Features:**

- ✅ Input validation
- ✅ Error handling with proper Firebase error codes
- ✅ Logging for monitoring
- ✅ Configurable via environment variables

### 2. Frontend Components

**Files Updated:**

- `aina/src/modules/kit/pages/CorreccioOrtografica.jsx`
- `aina/src/modules/kit/pages/ProcessamentVertical.jsx`

**Changes:**

- Removed direct `fetch()` calls to LanguageTool
- Added Firebase Functions imports
- Replaced API calls with Firebase callable function

**Before:**

```javascript
const response = await fetch("http://localhost:8010/v2/check", {
	method: "POST",
	body: formData,
})
const data = await response.json()
```

**After:**

```javascript
const checkLanguageTool = httpsCallable(functions, "checkLanguageTool")
const result = await checkLanguageTool({
	text: inputText,
	language: "ca",
	level: level,
})
const data = result.data
```

### 3. Environment Configuration

**Backend Configuration:**

`functions/.env.dev`:

```bash
# Local development - use host.docker.internal to reach Docker container
LANGUAGETOOL_URL=http://host.docker.internal:8010
```

`functions/.env.prod`:

```bash
# Production - Cloud Run URL
LANGUAGETOOL_URL=https://languagetool-catalan-xxxxx-ew.a.run.app
```

**Frontend Configuration:**

No LanguageTool URLs needed - removed from:

- `aina/.env.development`
- `aina/.env.production`
- `aina/.env.example`

## Benefits

### Security

- 🔒 Frontend doesn't expose backend infrastructure details
- 🔒 LanguageTool container URL is hidden from client
- 🔒 Can add authentication/rate limiting at function level

### Maintainability

- 🔧 Single point to update LanguageTool configuration
- 🔧 Environment-specific configuration (dev/prod) managed in one place
- 🔧 Easy to switch between local Docker and Cloud Run

### Monitoring

- 📊 Centralized logging in Firebase Functions
- 📊 Track usage, errors, and performance
- 📊 Can add analytics and metrics easily

### Flexibility

- ⚡ Can add caching layer in the function
- ⚡ Can batch requests if needed
- ⚡ Can implement retry logic
- ⚡ Can add custom preprocessing/postprocessing

## Testing

### Local Development

1. **Start LanguageTool Container:**

   ```bash
   cd languagetool
   docker compose up -d
   ```

2. **Start Firebase Emulators:**

   ```bash
   cd functions
   npm run serve
   ```

3. **Start Frontend:**

   ```bash
   cd aina
   npm run dev
   ```

4. **Test the Integration:**
   - Open the app in browser
   - Navigate to "Correcció Ortogràfica" or "Processament Vertical"
   - Enter some Catalan text with errors
   - Click "Enviar" / "Processar"
   - Verify corrections are displayed

### Production

1. **Deploy LanguageTool to Cloud Run** (see main README.md)

2. **Update Production Environment:**

   ```bash
   # In functions/.env.prod
   LANGUAGETOOL_URL=https://your-cloud-run-url.run.app
   ```

3. **Deploy Firebase Functions:**

   ```bash
   cd functions
   firebase deploy --only functions:checkLanguageTool
   ```

4. **Test from Production Frontend:**
   - Use the production app
   - Test the same workflow

## Troubleshooting

### Error: "LanguageTool service is not available"

**Cause:** LanguageTool container is not running or not accessible

**Solution:**

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs

# Restart if needed
docker compose restart
```

### Error: "Failed to process text with LanguageTool"

**Cause:** Network error or malformed request

**Solution:**

1. Check Firebase Functions logs:

   ```bash
   firebase functions:log
   ```

2. Verify environment variable is set:

   ```bash
   echo $LANGUAGETOOL_URL
   ```

3. Test LanguageTool directly:
   ```bash
   curl -X POST "http://localhost:8010/v2/check" \
     -d "language=ca" \
     -d "text=Això es una prova."
   ```

### Functions Emulator Can't Reach Docker Container

**Cause:** `host.docker.internal` doesn't resolve

**Solutions:**

**macOS/Windows:**

```bash
# Should work by default with Docker Desktop
LANGUAGETOOL_URL=http://host.docker.internal:8010
```

**Linux:**

```bash
# Use host network or bridge IP
LANGUAGETOOL_URL=http://172.17.0.1:8010
# or
LANGUAGETOOL_URL=http://localhost:8010
```

**Alternative - Run Everything Without Docker:**

```bash
# Run LanguageTool directly
java -jar languagetool-server.jar --port 8010

# Then use
LANGUAGETOOL_URL=http://localhost:8010
```

## Migration Notes

### For Existing Deployments

If you have an existing deployment with the old frontend-to-LanguageTool architecture:

1. **Deploy the new Firebase Function first:**

   ```bash
   firebase deploy --only functions:checkLanguageTool
   ```

2. **Test the function in production:**

   ```bash
   # Use Firebase console or CLI to test
   ```

3. **Deploy the updated frontend:**

   ```bash
   firebase deploy --only hosting
   ```

4. **No breaking changes** - The function returns the same data structure

### Rollback Plan

If issues occur:

1. **Keep the old environment variables** in frontend (commented)
2. **Can quickly revert frontend** to direct API calls
3. **Function can be removed** without breaking old frontend code

## Future Improvements

### Caching

Add Redis/Firestore caching to avoid repeated calls for same text:

```typescript
// Check cache first
const cached = await getFromCache(textHash)
if (cached) return cached

// Call LanguageTool
const result = await callLanguageTool(text)

// Cache result
await saveToCache(textHash, result)
```

### Rate Limiting

Implement per-user rate limiting:

```typescript
const userId = context.auth?.uid
if (await isRateLimited(userId)) {
	throw new functions.https.HttpsError("resource-exhausted", "Too many requests")
}
```

### Batch Processing

Add support for multiple texts in one call:

```typescript
export const checkLanguageToolBatch = functions.https.onCall(async (data) => {
	const { texts } = data
	const results = await Promise.all(texts.map((text) => checkSingleText(text)))
	return results
})
```

### Analytics

Track usage patterns:

```typescript
await logToAnalytics({
	event: "languagetool_check",
	userId: context.auth?.uid,
	textLength: text.length,
	errorsFound: result.matches.length,
	timestamp: Date.now(),
})
```

## Contact

For questions or issues related to this integration, check:

- Firebase Functions logs: `firebase functions:log`
- LanguageTool logs: `docker compose logs`
- Frontend console: Browser DevTools
