// Ethereum property redefinition fix - must run before any wallet extensions
(function() {
  'use strict';
  
  if (typeof window === 'undefined') return;
  
  // Store the original defineProperty
  const originalDefineProperty = Object.defineProperty;
  
  // Override defineProperty to handle ethereum property conflicts
  Object.defineProperty = function(obj, prop, descriptor) {
    // If trying to define ethereum on window and it already exists
    if (prop === 'ethereum' && obj === window) {
      if (window.ethereum) {
        console.log('Preventing ethereum property redefinition - property already exists');
        return obj; // Don't redefine, just return the object
      }
    }
    
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      // If redefinition fails, just return the object
      console.warn('Property redefinition failed:', prop, error);
      return obj;
    }
  };
  
  // Also override defineProperties for completeness
  const originalDefineProperties = Object.defineProperties;
  Object.defineProperties = function(obj, props) {
    if (obj === window && props.ethereum) {
      if (window.ethereum) {
        console.log('Preventing ethereum property redefinition via defineProperties');
        return obj;
      }
    }
    
    try {
      return originalDefineProperties.call(this, obj, props);
    } catch (error) {
      console.warn('Properties redefinition failed:', error);
      return obj;
    }
  };
  
  // Prevent ethereum property from being redefined by making it non-configurable
  if (window.ethereum) {
    try {
      Object.defineProperty(window, 'ethereum', {
        value: window.ethereum,
        writable: true,
        enumerable: true,
        configurable: false // This prevents redefinition
      });
    } catch (e) {
      // Ignore if already non-configurable
    }
  }
  
  console.log('Ethereum property protection loaded');
})();
