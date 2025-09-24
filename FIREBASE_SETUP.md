# Firebase Authentication Setup

This AI Diary app uses Firebase Authentication for user management. Follow these steps to set up Firebase:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "ai-diary")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Click and toggle "Enable"
   - **Google**: Click, toggle "Enable", and add your project's domain

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon in sidebar)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (`</>`)
4. Register your app with a nickname
5. Copy the configuration object

## 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in your Firebase configuration values:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

## 5. Configure Authorized Domains

1. In Firebase Console, go to Authentication > Settings
2. In the "Authorized domains" tab, add:
   - `localhost` (for development)
   - Your production domain (when deployed)

## 6. Test the Integration

1. Start your development server: `npm run dev`
2. Try signing up with email/password
3. Try signing in with Google (should open Google account selection popup)
4. Check Firebase Console > Authentication > Users to see registered users

## Features Included

- ✅ Email/Password authentication
- ✅ Google Sign-In with popup
- ✅ User state management
- ✅ Protected routes
- ✅ Toast notifications for auth events
- ✅ Automatic redirect after authentication
- ✅ Sign out functionality

The Google Sign-In button will open the actual Google account selection popup when properly configured!
