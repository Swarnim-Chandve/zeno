// Ethereum property redefinition fix - must run before any wallet extensions
(function() {
  'use strict';
  
  if (typeof window === 'undefined') return;
  
  // Store the original defineProperty
  const originalDefineProperty = Object.defineProperty;
  
  // Override defineProperty to handle ethereum property conflicts
  Object.defineProperty = function(obj, prop, descriptor) {
    // If trying to define ethereum on window and it already exists
    if (prop === 'ethereum' && obj === window && window.ethereum) {
      console.log('Preventing ethereum property redefinition');
      return obj; // Don't redefine, just return the object
    }
    
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      // If redefinition fails, just return the object
      console.warn('Property redefinition failed:', prop, error);
      return obj;
    }
  };
  
  console.log('Ethereum property protection loaded');
})();
