# Google Identity Services Authentication Setup

This AI Diary app uses Google Identity Services for user authentication. Follow these steps to set up Google authentication:

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter your project name (e.g., "ai-diary")
4. Click "Create"

## 2. Enable Google Identity Services API

1. In your Google Cloud project, go to "APIs & Services" → "Library"
2. Search for "Google Identity Services API"
3. Click on it and press "Enable"

## 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" for user type
   - Fill in app name: "AI Diary"
   - Add your email as developer contact
   - Save and continue through the steps
4. For Application type, select "Web application"
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - Your production domain (when deployed)
6. Click "Create"
7. Copy the Client ID (it ends with `.apps.googleusercontent.com`)

## 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in your Google Client ID:

\`\`\`env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1012905635753-l3u1o1d71qdks04esim4l8q83d3gnsle.apps.googleusercontent.com
\`\`\`

## 5. Configure OAuth Consent Screen (Optional)

1. Go to "APIs & Services" → "OAuth consent screen"
2. Add your app logo, privacy policy, and terms of service URLs
3. Add test users if your app is in testing mode

## 6. Test the Integration

1. Start your development server: `npm run dev`
2. Try signing in with Google (should open Google account selection popup)
3. Check the browser console for user information logs
4. Verify the dashboard shows your Google profile information

## Features Included

- ✅ Google Sign-In with popup (real Google account selection)
- ✅ User profile information (name, email, picture)
- ✅ User state management with localStorage persistence
- ✅ Protected routes
- ✅ Toast notifications for auth events
- ✅ Automatic redirect after authentication
- ✅ Sign out functionality
- ✅ Console logging of user info for development

## Important Notes

- The Google Sign-In button will show "Google Client ID Required" until you configure the environment variable
- Email/password authentication is currently UI-only (dummy functions)
- User information is logged to the console after successful Google sign-in
- The app uses localStorage to persist user sessions

The Google Sign-In button will open the actual Google account selection popup when properly configured!
\`\`\`

```typescriptreact file="FIREBASE_SETUP.md" isDeleted="true"
...deleted...
