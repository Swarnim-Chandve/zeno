# 🎮 Quick Quiz Bypass - Skip to Game Immediately

## 🚀 **IMMEDIATE SOLUTION: Skip All Connections**

### **Step 1: Enable Quick Test Mode**
1. **Open browser console** (F12) in both browsers
2. **Type this command** in both consoles:
   ```javascript
   localStorage.setItem('quick-test-mode', 'true')
   ```
3. **Refresh both browsers**

### **Step 2: Test the Game**
1. **Both browsers**: Click "Demo Mode"
2. **Game will start immediately** - no waiting for connections!

## 🔧 **Alternative: Direct URL Method**

### **Step 1: Use This URL in Both Browsers**
```
http://localhost:3000/?quick-test=true
```

### **Step 2: Game Starts Immediately**
- No WebSocket connections
- No waiting for lobby creation
- Direct to math quiz!

## 🎯 **What This Does**
- ✅ Bypasses all WebSocket connections
- ✅ Skips lobby creation/joining
- ✅ Goes directly to the math quiz
- ✅ Perfect for testing the game mechanics

## 🎮 **Expected Behavior**
- ✅ Math questions appear immediately
- ✅ 30-second timer per question
- ✅ Score tracking works
- ✅ Game completion works

## 🚀 **Quick Commands**
```javascript
// Enable quick test mode
localStorage.setItem('quick-test-mode', 'true')

// Or use direct URL
http://localhost:3000/?quick-test=true
```

This will get you straight to the quiz without any connection issues!
