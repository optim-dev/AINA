# Health Check System

This directory contains health monitoring functions for the Aina application.

## Functions

### `healthCheck`

Callable function that performs comprehensive health checks on all Firebase services.

**Usage:**

```typescript
const healthCheck = httpsCallable(functions, "healthCheck")
const result = await healthCheck()
```

**Response:**

```json
{
	"success": true,
	"message": "Health check completed",
	"data": {
		"timestamp": "2025-10-28T10:30:00.000Z",
		"status": "healthy",
		"responseTime": "245ms",
		"services": {
			"firestore": {
				"status": "healthy",
				"message": "Connected and responding"
			},
			"storage": {
				"status": "healthy",
				"message": "Connected and accessible"
			},
			"auth": {
				"status": "healthy",
				"message": "User authenticated: uid123"
			}
		}
	}
}
```

### `systemStatus`

Callable function that provides detailed status information about all application modules.

**Usage:**

```typescript
const systemStatus = httpsCallable(functions, "systemStatus")
const result = await systemStatus()
```

**Response:**

```json
{
	"success": true,
	"data": {
		"timestamp": "2025-10-28T10:30:00.000Z",
		"modules": {
			"valoracio": {
				"status": "healthy",
				"collections": {
					"valoracions": 5
				}
			},
			"elaboracio": {
				"status": "healthy",
				"collections": {
					"decrets": 3
				}
			},
			"kit": {
				"status": "healthy",
				"collections": {
					"linguistic_resources": 10
				}
			}
		}
	}
}
```

## Status Values

- **healthy**: Service is operational
- **warning**: Service is functional but has minor issues
- **error**: Service is unavailable or experiencing critical issues
- **degraded**: Overall system status when one or more services have errors

## Integration with Dashboard

The health check functions are integrated with the main Dashboard component located at:
`aina/src/pages/Dashboard.jsx`

The Dashboard automatically checks:

- **Firebase Services**: Auth, Firestore, Storage, Functions
- **Application Modules**: Valoració, Elaboració, Kit

Health checks run automatically on page load and can be manually triggered using the refresh button.

## Development

To test the health check functions locally with the Firebase emulator:

```bash
cd functions
npm run build
firebase emulators:start
```

Then access the Dashboard at `http://localhost:5173` (or your configured Vite port).

## Monitoring

The health check system provides:

- Real-time status monitoring
- Color-coded visual indicators (green/yellow/red)
- Detailed error messages for debugging
- Response time tracking
- Service-level granularity

## Error Handling

The functions are designed to fail gracefully:

- Individual service failures don't crash the entire health check
- Missing collections show warnings instead of errors
- Unauthenticated users receive warnings but not errors
- Missing health check function results in a warning status
