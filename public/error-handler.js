// Global error handler to prevent stack traces from being exposed to DevTools
window.addEventListener('error', (event) => {
  if (event.error?.stack) {
    // Check if this is a URI malformed error from DevTools
    if (event.error.message?.includes('URI malformed')) {
      event.preventDefault();
      console.warn('Suppressed URI malformed error from DevTools');
      return false;
    }
  }
});

// Also handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('URI malformed')) {
    event.preventDefault();
    console.warn('Suppressed URI malformed error from DevTools');
    return false;
  }
});
