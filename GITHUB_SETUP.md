# GitHub Pages Environment Setup

## 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

```

## 2. Enable GitHub Pages

1. Go to Settings → Pages
2. Source: GitHub Actions
3. Save

## 3. Deploy

Push to main branch - GitHub Actions will automatically deploy with your secrets injected.

## 4. Local Development

Create `.env` file (ignored by git):
```
FIREBASE_API_KEY=your_key_here
# ... other variables
```

The app will use fallback values from config.js for local development.