# InterviewSync - Interview Scheduling Platform

A modern, Cal.com-style interview scheduling application built with Next.js 15 and Firebase, where both interviewers and applicants can manage their schedules and book interviews seamlessly.

## Features

### For Interviewers
- **Availability Management**: Set your weekly availability with customizable time slots
- **Event Types**: Create different interview types (Technical, HR, Final Round, etc.) with varying durations
- **Dashboard**: View upcoming interviews, today's schedule, and past meetings
- **Shareable Links**: Get a unique booking link to share with applicants

### For Applicants
- **Browse Interviewers**: Find available interviewers and their interview types
- **Easy Booking**: Select a date and time slot that works for you
- **Instant Confirmation**: Receive immediate booking confirmation with meeting details

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth + Firestore)
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** with Email/Password provider
4. Enable **Firestore Database**
5. Get your configuration:
   - Go to Project Settings > General > Your apps > Add web app
   - Copy the Firebase config values

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd interview_scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file with your Firebase config:
```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Firestore Security Rules

Add these rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Availability subcollection
      match /availability/{dayId} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Event types subcollection
      match /eventTypes/{eventId} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (resource.data.interviewerId == request.auth.uid || 
         resource.data.applicantId == request.auth.uid ||
         resource.data.applicantEmail == request.auth.token.email);
      allow create: if true;
      allow update, delete: if request.auth != null && 
        (resource.data.interviewerId == request.auth.uid || 
         resource.data.applicantId == request.auth.uid);
    }
  }
}
```

## Project Structure

```
src/
├── app/
│   ├── availability/       # Availability settings page
│   ├── book/               # Booking flow pages
│   ├── dashboard/          # User dashboard
│   ├── event-types/        # Event type management
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── calendar.tsx        # Date picker calendar
│   ├── navbar.tsx          # Navigation bar
│   ├── providers.tsx       # Context providers
│   └── time-slots.tsx      # Time slot selector
├── contexts/
│   └── auth-context.tsx    # Firebase auth context
├── lib/
│   ├── firebase.ts         # Firebase client config
│   ├── firebase-admin.ts   # Firebase admin config
│   └── utils.ts            # Utility functions
```

## Usage

### As an Interviewer

1. Register with the "Interviewer" role
2. Set your weekly availability in the Availability page
3. Create event types for different interview formats
4. Share your booking link with applicants
5. Manage bookings from your dashboard

### As an Applicant

1. Register with the "Applicant" role (or book without an account)
2. Browse available interviewers at `/book`
3. Select an interview type
4. Choose a date and time slot
5. Enter your details and confirm the booking

## License

MIT License - feel free to use this project for your own purposes.
