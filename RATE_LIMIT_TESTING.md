# Rate Limiting Testing Guide

## What Was Implemented

- **Limit**: 10 downloads per hour
- **Storage**: localStorage (persists across page refreshes)
- **Shared**: Both mods.html and deprecated.html share the same limit
- **Reset**: Automatically resets after 1 hour from the oldest download

---

## How to Test

### Test 1: Basic Rate Limiting

1. **Open your browser** and go to `mods.html` or `deprecated.html`
2. **Click download** on any file - it should work normally
3. **Repeat 9 more times** (total 10 downloads)
4. **Try an 11th download** - you should see an alert:
   ```
   ⚠️ Download Limit Reached
   
   You've reached the maximum of 10 downloads per hour.
   
   Please try again in 59 minutes.
   ```

### Test 2: Check localStorage

1. **Open DevTools** (F12 or Right-click → Inspect)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → `http://localhost:8080` (or your domain)
4. Look for key: `mod_downloads_history`
5. You'll see an array of timestamps like:
   ```json
   [1730000000000, 1730000005000, 1730000010000, ...]
   ```

### Test 3: Cross-Page Limit

1. Download 5 files from `mods.html`
2. Navigate to `deprecated.html`
3. Try to download 6 more files
4. On the 11th total download, you'll hit the limit
5. **This proves the limit is shared across both pages**

### Test 4: Console Warnings

1. Open **DevTools Console** (F12 → Console tab)
2. Download files until you have 3 or fewer remaining
3. You'll see messages like:
   ```
   Downloads remaining: 3/10
   Downloads remaining: 2/10
   Downloads remaining: 1/10
   ```

### Test 5: Time-Based Reset

**Option A: Wait 1 hour (slow)**
- After hitting the limit, wait 1 hour
- The oldest download will expire
- You can download 1 more file

**Option B: Manual time manipulation (fast)**
1. Hit the rate limit (10 downloads)
2. Open DevTools → Application → Local Storage
3. Click on `mod_downloads_history`
4. Copy the array value
5. Subtract 3600000 (1 hour in ms) from the first timestamp
6. Save the modified array
7. Try downloading again - it should work!

### Test 6: Clear Rate Limit

To reset your downloads instantly:

**Method 1: Via DevTools**
1. DevTools → Application → Local Storage
2. Right-click `mod_downloads_history` → Delete
3. Refresh the page
4. You can download again

**Method 2: Via Console**
```javascript
localStorage.removeItem('mod_downloads_history');
console.log('Rate limit cleared!');
```

**Method 3: Clear All Site Data**
1. DevTools → Application
2. Click "Clear site data" button
3. Refresh page

---

## Testing Different Limits

Want to test with different limits? Temporarily modify the code:

### Test with 3 downloads per 5 minutes:
```javascript
// In constructor of both files
this.maxDownloadsPerHour = 3;
this.rateLimitWindow = 300000; // 5 minutes
```

### Test with 2 downloads per 30 seconds:
```javascript
this.maxDownloadsPerHour = 2;
this.rateLimitWindow = 30000; // 30 seconds
```

---

## Expected Behaviors

✅ **Should work:**
- First 10 downloads work normally
- Downloads are tracked in localStorage
- Limit persists across page refreshes
- Limit is shared between mods and deprecated pages
- After 1 hour, oldest downloads expire and you can download again

❌ **Should be blocked:**
- 11th download within 1 hour
- Any download after hitting the limit
- Shows clear error message with time remaining

---

## Advanced Testing: Simulate Multiple Users

Rate limiting is per-browser (localStorage is per-origin):

1. **Test in Chrome** - download 10 files
2. **Open Firefox** - you can download 10 more (different browser = different localStorage)
3. **Open Chrome Incognito** - you can download 10 more (incognito = separate localStorage)

This shows the limitation of client-side rate limiting - it's per-browser session.

---

## Debugging Tips

### Check current download count:
```javascript
// Paste in console
const stored = localStorage.getItem('mod_downloads_history');
const downloads = stored ? JSON.parse(stored) : [];
const now = Date.now();
const recent = downloads.filter(t => now - t < 3600000);
console.log(`Downloads used: ${recent.length}/10`);
console.log(`Downloads remaining: ${10 - recent.length}`);
```

### Check time until reset:
```javascript
const stored = localStorage.getItem('mod_downloads_history');
const downloads = stored ? JSON.parse(stored) : [];
if (downloads.length > 0) {
  const oldest = Math.min(...downloads);
  const now = Date.now();
  const timeLeft = 3600000 - (now - oldest);
  const minutes = Math.ceil(timeLeft / 60000);
  console.log(`Reset in ${minutes} minutes`);
}
```

### Force trigger rate limit (for testing):
```javascript
// Add 10 fake downloads
const fakeDownloads = Array(10).fill(Date.now());
localStorage.setItem('mod_downloads_history', JSON.stringify(fakeDownloads));
console.log('Rate limit triggered! Try downloading now.');
```

---

## Production Recommendations

Current settings:
- ✅ Good for preventing accidental spam
- ✅ Reasonable limit for normal users
- ⚠️ Can be bypassed by clearing localStorage
- ⚠️ Can be bypassed by using different browsers

If you need stronger protection, consider:
1. Backend rate limiting (IP-based)
2. User authentication + Firebase tracking
3. Cloudflare rate limiting
4. Combination of client + server-side limits
