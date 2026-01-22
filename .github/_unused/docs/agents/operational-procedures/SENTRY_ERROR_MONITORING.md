# Sentry Error Monitoring Setup

## Overview

Sentry is configured for error monitoring and tracking in CMC-Go. It captures unhandled exceptions, errors, and provides real-time alerts for production issues.

**Status**: ✅ **ACTIVE & WORKING** (as of Jan 5, 2026)

## Architecture

### Server-Side Initialization

Sentry is initialized in `server/_core/sentry.ts` and called at the very start of the application in `server/_core/index.ts` **BEFORE any other imports**.

**Location**: `server/_core/index.ts` (Lines 1-3)
```
// Initialize Sentry FIRST - must be before any other imports
import { initSentry } from "./sentry";
initSentry();
```

### Configuration

**File**: `server/_core/sentry.ts`

Sentry is configured with the following settings:

- **DSN**: Retrieved from `process.env.SENTRY_DSN` environment variable
- - **Environment**: Auto-detects from `process.env.NODE_ENV` (development or production)
  - - **Trace Sample Rate**: Production environment samples 10% of transactions for performance monitoring
    - - **Console Integration**: Automatically captures console errors at "error" level
      - - **Fallback**: If SENTRY_DSN is not configured, the app logs a warning but continues operating
       
        - ### Error Handling
       
        - **File**: `server/_core/errorHandler.ts`
       
        - Provides structured error handling utilities with:
       
        - - `AppError` interface: Standard error structure with code, message, statusCode, and details
          - - `StructuredError` class: Extends Error with proper error formatting
            - - `sanitizeErrorForLogging()`: Removes PII (Personally Identifiable Information) before logging
              - - Sentry integration: Automatically captures and sanitizes errors before sending to Sentry
               
                - ## Configuration Required
               
                - ### Environment Variable
               
                - Set the `SENTRY_DSN` environment variable for your Sentry project:
               
                - ```bash
                  export SENTRY_DSN="https://[key]@sentry.io/[projectId]"
                  ```

                  This DSN should be obtained from your Sentry project settings.

                  ### Railway Deployment

                  Add the `SENTRY_DSN` to Railway environment variables:

                  1. Navigate to Service Settings
                  2. 2. Go to Variables tab
                     3. 3. Add `SENTRY_DSN` with your Sentry DSN value
                       
                        4. ## Monitoring & Alerts
                       
                        5. ### Accessing Sentry Dashboard
                       
                        6. 1. Go to [https://sentry.io](https://sentry.io)
                           2. 2. Navigate to the CMC-Go project
                              3. 3. View the Issues Feed to see all captured errors
                                
                                 4. ### Current Errors Being Tracked
                                
                                 5. As of the latest deployment, Sentry is successfully capturing:
                                 6. - Database connection errors
                                    - - HTTP 500 errors
                                      - - Unhandled exceptions
                                        - - Validation errors
                                          - - Runtime exceptions
                                           
                                            - ## Error Flow
                                           
                                            - 1. **Error Occurs** in application code
                                              2. 2. **Error Captured** by Sentry middleware or error handler
                                                 3. 3. **Error Sanitized** to remove PII via `sanitizeErrorForLogging()`
                                                    4. 4. **Error Logged** to Sentry dashboard
                                                       5. 5. **Alert Triggered** (if configured) for critical errors
                                                         
                                                          6. ## Development vs Production
                                                         
                                                          7. - **Development Environment**: Errors are logged to console and Sentry (if DSN configured)
                                                             - - **Production Environment**:
                                                               -   - Full error tracking enabled
                                                                   -   - 10% of transactions sampled for performance monitoring
                                                                       -   - Console errors automatically captured
                                                                           -   - Stack traces preserved for debugging
                                                                            
                                                                               - ## Best Practices
                                                                            
                                                                               - 1. **Always initialize Sentry first** - Must be before any other imports
                                                                                 2. 2. **Use StructuredError** for application errors with proper error codes
                                                                                    3. 3. **Sanitize sensitive data** - Use `sanitizeErrorForLogging()` for user/auth data
                                                                                       4. 4. **Check Sentry regularly** - Monitor the Issues Feed for emerging patterns
                                                                                          5. 5. **Respond to alerts** - Set up alerts for critical errors in production
                                                                                            
                                                                                             6. ## Testing
                                                                                            
                                                                                             7. To verify Sentry is working:
                                                                                            
                                                                                             8. 1. Deploy the application
                                                                                                2. 2. Trigger an error in the application
                                                                                                   3. 3. Check the Sentry dashboard within 1-5 minutes
                                                                                                      4. 4. Error should appear in the Issues Feed with stack trace, environment, and timestamp
                                                                                                        
                                                                                                         5. ## Troubleshooting
                                                                                                        
                                                                                                         6. ### Errors Not Appearing in Sentry
                                                                                                        
                                                                                                         7. 1. **Check SENTRY_DSN** - Ensure the environment variable is set correctly
                                                                                                            2. 2. **Check Network** - Verify the application can reach sentry.io
                                                                                                               3. 3. **Check Console** - Look for initialization warnings in application logs
                                                                                                                  4. 4. **Redeploy** - Changes to environment variables require redeployment
                                                                                                                    
                                                                                                                     5. ### Too Many Errors
                                                                                                                    
                                                                                                                     6. - Adjust the `tracesSampleRate` in `server/_core/sentry.ts` to a lower percentage
                                                                                                                        - - Implement error filtering to exclude known non-critical errors
                                                                                                                          - - Configure Sentry project settings to ignore specific errors
                                                                                                                           
                                                                                                                            - ## Related Files
                                                                                                                           
                                                                                                                            - - `server/_core/sentry.ts` - Sentry initialization and configuration
                                                                                                                              - - `server/_core/errorHandler.ts` - Error handling utilities with Sentry integration
                                                                                                                                - - `server/_core/index.ts` - Application entry point (Sentry init call location)
                                                                                                                                 
                                                                                                                                  - ## Recent Updates
                                                                                                                                 
                                                                                                                                  - - **Jan 5, 2026**: Sentry successfully capturing production errors and displaying on dashboard
                                                                                                                                    - - **11 hours ago**: Error monitoring implementation completed
                                                                                                                                      - 
