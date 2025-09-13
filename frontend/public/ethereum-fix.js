// Enhanced Ethereum property protection - prevents all redefinition attempts
(function() {
  'use strict';
  
  if (typeof window === 'undefined') return;
  
  // Store original methods
  const originalDefineProperty = Object.defineProperty;
  const originalDefineProperties = Object.defineProperties;
  const originalSetPrototypeOf = Object.setPrototypeOf;
  
  // Enhanced defineProperty override
  Object.defineProperty = function(obj, prop, descriptor) {
    // Block ethereum redefinition attempts
    if (prop === 'ethereum' && obj === window) {
      if (window.ethereum) {
        console.log('Blocking ethereum property redefinition - property already exists');
        return obj;
      }
    }
    
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      console.warn('Property redefinition failed:', prop, error.message);
      return obj;
    }
  };
  
  // Enhanced defineProperties override
  Object.defineProperties = function(obj, props) {
    if (obj === window && props && props.ethereum) {
      if (window.ethereum) {
        console.log('Blocking ethereum property redefinition via defineProperties');
        return obj;
      }
    }
    
    try {
      return originalDefineProperties.call(this, obj, props);
    } catch (error) {
      console.warn('Properties redefinition failed:', error.message);
      return obj;
    }
  };
  
  // Protect against prototype manipulation
  Object.setPrototypeOf = function(obj, prototype) {
    if (obj === window && prototype && prototype.ethereum) {
      if (window.ethereum) {
        console.log('Blocking ethereum prototype manipulation');
        return obj;
      }
    }
    
    try {
      return originalSetPrototypeOf.call(this, obj, prototype);
    } catch (error) {
      console.warn('Prototype manipulation failed:', error.message);
      return obj;
    }
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
      console.log('Ethereum property protected successfully');
    } catch (e) {
      console.log('Ethereum property already protected');
    }
  }
  
  // Monitor for injection attempts
  let injectionAttempts = 0;
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0] && args[0].includes && args[0].includes('Cannot redefine property: ethereum')) {
      injectionAttempts++;
      console.log(`Ethereum injection attempt #${injectionAttempts} blocked`);
      return;
    }
    originalConsoleError.apply(console, args);
  };
  
  console.log('Enhanced Ethereum property protection loaded');
})();

