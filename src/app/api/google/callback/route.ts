import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
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
    const bookingId = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/error?message=Google+authorization+denied`, request.url)
      );
    }

    if (!code || !bookingId) {
      return NextResponse.redirect(
        new URL('/error?message=Missing+authorization+code+or+booking+ID', request.url)
      );
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri) {
      console.error('GOOGLE_REDIRECT_URI not configured');
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

    // Fetch booking from Firestore
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnapshot = await getDoc(bookingRef);

    if (!bookingSnapshot.exists()) {
      return NextResponse.redirect(
        new URL('/error?message=Booking+not+found', request.url)
      );
    }

    const data = bookingSnapshot.data();

    // Convert Firestore Timestamps to JS Dates
    const booking: BookingData = {
      interviewerId: data.interviewerId,
      interviewerName: data.interviewerName,
      interviewerEmail: data.interviewerEmail,
      applicantName: data.applicantName,
      applicantEmail: data.applicantEmail,
      startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime),
      endTime: data.endTime instanceof Timestamp ? data.endTime.toDate() : new Date(data.endTime),
      duration: data.duration,
      eventTypeTitle: data.eventTypeTitle || 'Interview',
      notes: data.notes || null,
      meetingLink: data.meetingLink || null,
      status: data.status,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    };

    // Create authenticated client and add event to calendar
    const auth = createAuthenticatedClient(tokens.access_token, tokens.refresh_token);

    try {
      await createCalendarEvent(auth, booking);
    } catch (calendarError) {
      console.error('Calendar event creation error:', calendarError);
      return NextResponse.redirect(
        new URL('/error?message=Failed+to+create+calendar+event', request.url)
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/booking/success?bookingId=${bookingId}&synced=true`, request.url)
    );
  } catch (error) {
    console.error('Error in Google callback route:', error);
    return NextResponse.redirect(
      new URL('/error?message=An+unexpected+error+occurred', request.url)
    );
  }
}
