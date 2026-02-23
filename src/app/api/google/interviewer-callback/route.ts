import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  exchangeCodeForTokens,
  createAuthenticatedClient,
  createCalendarEvent,
  BookingData,
} from '@/lib/googleCalendar';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const interviewerId = searchParams.get('state'); // interviewerId is passed as state
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/error?message=Google+authorization+denied`, request.url)
      );
    }

    if (!code || !interviewerId) {
      return NextResponse.redirect(
        new URL('/error?message=Missing+authorization+code+or+interviewer+ID', request.url)
      );
    }

    const redirectUri = process.env.GOOGLE_INTERVIEWER_REDIRECT_URI;
    if (!redirectUri) {
      console.error('GOOGLE_INTERVIEWER_REDIRECT_URI not configured');
      return NextResponse.redirect(new URL('/error?message=OAuth+not+configured', request.url));
    }

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, redirectUri);
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError);
      return NextResponse.redirect(
        new URL('/error?message=Failed+to+exchange+authorization+code', request.url)
      );
    }

    // Store tokens in Firestore under users/{interviewerId}/googleCalendar
    try {
      const tokenRef = doc(db, 'users', interviewerId, 'googleCalendar', 'credentials');
      await setDoc(tokenRef, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        connected: true,
        connectedAt: new Date(),
      });
    } catch (storeError) {
      console.error('Error storing tokens:', storeError);
      return NextResponse.redirect(
        new URL('/error?message=Failed+to+save+calendar+connection', request.url)
      );
    }

    // Create authenticated client
    const auth = createAuthenticatedClient(tokens.access_token, tokens.refresh_token);

    // Fetch all existing bookings for this interviewer and sync them
    try {
      const bookingsRef = collection(db, 'bookings');
      const bookingsQuery = query(
        bookingsRef,
        where('interviewerId', '==', interviewerId),
        where('status', '==', 'CONFIRMED')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      // Sync each booking to Google Calendar
      const syncPromises = bookingsSnapshot.docs.map(async (bookingDoc) => {
        const data = bookingDoc.data();
        
        // Skip past bookings
        const startTime = data.startTime instanceof Timestamp 
          ? data.startTime.toDate() 
          : new Date(data.startTime);
        
        if (startTime < new Date()) {
          return; // Skip past bookings
        }

        const booking: BookingData = {
          interviewerId: data.interviewerId,
          interviewerName: data.interviewerName,
          interviewerEmail: data.interviewerEmail,
          applicantName: data.applicantName,
          applicantEmail: data.applicantEmail,
          startTime,
          endTime: data.endTime instanceof Timestamp ? data.endTime.toDate() : new Date(data.endTime),
          duration: data.duration,
          eventTypeTitle: data.eventTypeTitle || 'Interview',
          notes: data.notes || null,
          meetingLink: data.meetingLink || null,
          status: data.status,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        };

        try {
          await createCalendarEvent(auth, booking);
          console.log(`Synced booking ${bookingDoc.id} to Google Calendar`);
        } catch (calendarError) {
          console.error(`Failed to sync booking ${bookingDoc.id}:`, calendarError);
        }
      });

      await Promise.all(syncPromises);
      console.log(`Synced ${bookingsSnapshot.docs.length} bookings for interviewer ${interviewerId}`);
    } catch (syncError) {
      console.error('Error syncing existing bookings:', syncError);
      // Don't fail - tokens are saved, just log the error
    }

    // Redirect to dashboard with success indicator
    return NextResponse.redirect(
      new URL('/dashboard?synced=true', request.url)
    );
  } catch (error) {
    console.error('Error in Google interviewer callback route:', error);
    return NextResponse.redirect(
      new URL('/error?message=An+unexpected+error+occurred', request.url)
    );
  }
}
