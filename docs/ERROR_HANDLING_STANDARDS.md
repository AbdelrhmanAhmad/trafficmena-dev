/**
 * Error Handling Standards Documentation
 * 
 * This document outlines the standardized error handling patterns used across the TrafficMENA application.
 * All components should follow these patterns for consistent user experience.
 */

## Standardized Error Handling Pattern

### 1. Import the Error Handler
```typescript
import { useErrorHandler } from '@/utils/errorHandling';
```

### 2. Initialize in Component
```typescript
const { handleError } = useErrorHandler();
```

### 3. Use in Try-Catch Blocks
```typescript
try {
  const { data, error } = await supabaseCall();
  
  if (error) {
    handleError(error);
    // Optional: Show user-friendly message
    return;
  }
  
  // Success logic
} catch (error) {
  handleError(error);
  // Optional: Show fallback UI
}
```

### 4. Benefits of Standardized Approach
- Consistent error logging across the application
- Centralized error message formatting
- Better error categorization (network, auth, validation, etc.)
- Improved debugging and monitoring capabilities
- Consistent user experience

### 5. Components Now Following Standard Pattern
✅ src/pages/Index.tsx - Converted from inline console.error
✅ src/pages/SignIn.tsx - Converted from inline console.error  
✅ src/pages/signup/Step5.tsx - Converted from inline console.error
✅ src/pages/admin/meetups.tsx - Already using standard
✅ src/pages/admin/users.tsx - Already using standard
✅ src/pages/admin/products.tsx - Already using standard
✅ src/pages/Meetups.tsx - Already using standard
✅ src/pages/Products.tsx - Already using standard

### 6. Error Handler Features
- Automatic Supabase error categorization
- User-friendly error message generation
- Error details preservation for debugging
- Support for custom fallback messages

### 7. Usage Examples

#### Basic Error Handling
```typescript
if (error) {
  handleError(error);
  return;
}
```

#### With Custom Fallback Message
```typescript
if (error) {
  const appError = handleError(error, 'Failed to load data');
  toast({
    title: "Error",
    description: appError.message,
    variant: "destructive",
  });
  return;
}
```

#### In Catch Blocks
```typescript
} catch (error) {
  const appError = handleError(error);
  setErrorState(appError.message);
}
```