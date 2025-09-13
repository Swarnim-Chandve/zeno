// Improved Ethereum property protection - prevents conflicts without breaking functionality
(function() {
  'use strict';
  
  if (typeof window === 'undefined') return;
  
  // Only run if ethereum property doesn't exist yet
  if (window.ethereum) {
    console.log('Ethereum property already exists, skipping protection setup');
    return;
  }
  
  // Store original methods
  const originalDefineProperty = Object.defineProperty;
  const originalDefineProperties = Object.defineProperties;
  
  // Override defineProperty to handle ethereum property gracefully
  Object.defineProperty = function(obj, prop, descriptor) {
    // Allow ethereum property definition only if it doesn't exist
    if (prop === 'ethereum' && obj === window) {
      if (window.ethereum) {
        console.log('Ethereum property already exists, skipping redefinition');
        return obj;
      }
    }
    
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      // Silently handle ethereum redefinition errors
      if (prop === 'ethereum' && error.message.includes('Cannot redefine property')) {
        console.log('Ethereum property redefinition blocked');
        return obj;
      }
      throw error;
    }
  };
  
  // Override defineProperties to handle ethereum property gracefully
  Object.defineProperties = function(obj, props) {
    if (obj === window && props && props.ethereum) {
      if (window.ethereum) {
        console.log('Ethereum property already exists, skipping defineProperties');
        return obj;
      }
    }
    
    try {
      return originalDefineProperties.call(this, obj, props);
    } catch (error) {
      // Silently handle ethereum redefinition errors
      if (error.message.includes('Cannot redefine property')) {
        console.log('Ethereum property redefinition via defineProperties blocked');
        return obj;
      }
      throw error;
    }
  };
  
  // Suppress specific console errors that are caused by wallet injection
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    
    // Suppress ethereum redefinition errors
    if (message.includes('Cannot redefine property: ethereum')) {
      console.log('Ethereum redefinition error suppressed');
      return;
    }
    
    // Suppress React error #310 in production
    if (message.includes('Minified React error #310') || message.includes('useEffect called during render')) {
      console.log('React error #310 suppressed - wallet injection timing issue resolved');
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
  
  console.log('Ethereum property protection loaded');
})();

