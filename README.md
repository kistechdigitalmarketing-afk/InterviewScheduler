# InterviewSync - Interview Scheduling Platform

A  interview scheduling application built with Next.js 15 and Firebase, where both interviewers and applicants can manage their schedules and book interviews seamlessly.

## Features

### For Interviewers
- **Availability Management**: Set your weekly availability with customizable time slots
- **Dashboard**: View upcoming interviews, today's schedule, and past meetings
- **Shareable Links**: Get a unique booking link to share with applicants

### For Applicants
- **Browse Interviewers**: Find available interviewers and their interview types
- **Easy Booking**: Select a date and time slot that works for you
- **Instant Confirmation**: Receive immediate booking confirmation with meeting details

### Email Notifications
- **Confirmation Emails**: Both interviewer and applicant receive confirmation emails when a booking is made
- **Calendar Attachment**: .ics file attached to easily add the interview to any calendar app
- **Meeting Links**: Direct access to video meeting links in all emails



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

# Brevo Email (for notifications)
BREVO_API_KEY=your-brevo-api-key
SENDER_EMAIL=noreply@yourdomain.com
SENDER_NAME=Interview Scheduler
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
│   ├── sendBookingEmail.ts # Email utility (Brevo + .ics)
│   └── utils.ts            # Utility functions
```

## Email Notifications Setup

This app uses [Brevo](https://brevo.com) (formerly Sendinblue) for email notifications with .ics calendar attachments.

### Setup Steps:
1. Sign up at [brevo.com](https://brevo.com) (free tier: 300 emails/day)
2. Go to SMTP & API → API Keys → Generate a new API key
3. Add `BREVO_API_KEY` to your environment variables
4. Set `SENDER_EMAIL` and `SENDER_NAME` for the "from" field

### Features:
- **Confirmation emails** sent to both parties when booking is created
- **.ics calendar attachment** for easy calendar integration
- Clean, professional email templates
