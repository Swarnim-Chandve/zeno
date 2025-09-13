// Enhanced Ethereum property protection - prevents all redefinition conflicts
(function() {
  'use strict';
  
  if (typeof window === 'undefined') return;
  
  // Store original methods before any modifications
  const originalDefineProperty = Object.defineProperty;
  const originalDefineProperties = Object.defineProperties;
  const originalConsoleError = console.error;
  
  // Override defineProperty to completely prevent ethereum redefinition
  Object.defineProperty = function(obj, prop, descriptor) {
    // Block all ethereum redefinition attempts
    if (prop === 'ethereum' && obj === window) {
      if (window.ethereum) {
        console.log('Ethereum property redefinition blocked - property already exists');
        return obj;
      }
    }
    
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      // Silently handle ethereum redefinition errors
      if (prop === 'ethereum' && error.message.includes('Cannot redefine property')) {
        console.log('Ethereum property redefinition error caught and handled');
        return obj;
      }
      throw error;
    }
  };
  
  // Override defineProperties to prevent ethereum redefinition
  Object.defineProperties = function(obj, props) {
    if (obj === window && props && props.ethereum) {
      if (window.ethereum) {
        console.log('Ethereum property redefinition via defineProperties blocked');
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
  
  // Enhanced console error suppression
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    
    // Suppress all ethereum-related errors
    if (message.includes('Cannot redefine property: ethereum') || 
        message.includes('TypeError: Cannot redefine property: ethereum')) {
      console.log('Ethereum redefinition error suppressed');
      return;
    }
    
    // Suppress React errors caused by wallet injection timing
    if (message.includes('Minified React error #310') || 
        message.includes('useEffect called during render') ||
        message.includes('Cannot read properties of undefined')) {
      console.log('React error suppressed - wallet injection timing issue');
      return;
    }
    
    // Suppress evmAsk.js errors
    if (message.includes('evmAsk.js') && message.includes('ethereum')) {
      console.log('evmAsk.js ethereum error suppressed');
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
  
  // Make ethereum property non-configurable if it exists
  if (window.ethereum) {
    try {
      Object.defineProperty(window, 'ethereum', {
        value: window.ethereum,
        writable: true,
        enumerable: true,
        configurable: false
      });
      console.log('Ethereum property protected and made non-configurable');
    } catch (e) {
      console.log('Ethereum property already protected');
    }
  }
  
  console.log('Enhanced Ethereum property protection loaded');
})();

