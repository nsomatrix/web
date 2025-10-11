# Cloudflare CORS Fix Guide

## The Issue
You're seeing these console errors because Cloudflare is automatically injecting Web Analytics beacon script with outdated integrity hashes.

## Solution 1: Disable Web Analytics (Recommended)
1. Log into your Cloudflare dashboard
2. Select your domain (nsomatrix.stream)
3. Go to **Analytics & Logs** → **Web Analytics**
4. Toggle **OFF** the "Enable Web Analytics" option
5. Clear your browser cache and reload your site

## Solution 2: Update Cloudflare Settings
If you want to keep Web Analytics:
1. In Cloudflare dashboard, go to **Speed** → **Optimization**
2. Turn OFF "Auto Minify" for JavaScript
3. Go to **Security** → **Settings**
4. Set Security Level to "Medium" or "Low"
5. Clear cache and test

## Solution 3: Add CSP Header (Advanced)
Add this to your site's Content Security Policy:
```
script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com;
```

## Verification
After applying any solution:
1. Clear browser cache (Ctrl+Shift+R)
2. Open Developer Console
3. The CORS errors should be gone

The errors don't break your site functionality - Firebase auth and other features work fine.