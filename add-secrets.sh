#!/bin/bash

# Add GitHub secrets from .env file
# Make sure you're logged in with: gh auth login

gh secret set FIREBASE_API_KEY --body "AIzaSyDp8p_wgeKO_WJAyewYiZhc3en7kF6RXs0"
gh secret set FIREBASE_AUTH_DOMAIN --body "nsomatrix-web.firebaseapp.com"
gh secret set FIREBASE_PROJECT_ID --body "nsomatrix-web"
gh secret set FIREBASE_STORAGE_BUCKET --body "nsomatrix-web.firebasestorage.app"
gh secret set FIREBASE_MESSAGING_SENDER_ID --body "320519296982"
gh secret set FIREBASE_APP_ID --body "1:320519296982:web:1ab1b009aeaf7755b13677"
gh secret set FIREBASE_MEASUREMENT_ID --body "G-GK3J5PZW85"
gh secret set SUPABASE_URL --body "https://pshuqmmkxmwgmvhuaujn.supabase.co"
gh secret set SUPABASE_ANON_KEY --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaHVxbW1reG13Z212aHVauWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNzI4NDIsImV4cCI6MjA2NDg0ODg0Mn0.SiJ9fEjW-e-x8DOREhuS1snrAe-IuBeE5r3tNzjtPFw"

echo "All secrets added successfully!"