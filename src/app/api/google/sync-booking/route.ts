import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  createAuthenticatedClient,
  createCalendarEvent,
  BookingData,
} from '@/lib/googleCalendar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, interviewerId } = body;

    if (!bookingId || !interviewerId) {
      return NextResponse.json(
        { success: false, error: 'Missing bookingId or interviewerId' },
        { status: 400 }
      );
    }

    // Check if interviewer has connected Google Calendar
    const tokenRef = doc(db, 'users', interviewerId, 'googleCalendar', 'credentials');
    const tokenDoc = await getDoc(tokenRef);

    if (!tokenDoc.exists() || !tokenDoc.data()?.connected) {
      return NextResponse.json({
        success: false,
        error: 'Interviewer has not connected Google Calendar',
        notConnected: true,
      });
    }

    const tokens = tokenDoc.data();

    // Fetch booking from Firestore
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnapshot = await getDoc(bookingRef);

    if (!bookingSnapshot.exists()) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
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
      return NextResponse.json({
        success: true,
        message: 'Booking synced to Google Calendar',
      });
    } catch (calendarError) {
      console.error('Calendar event creation error:', calendarError);
      return NextResponse.json(
        { success: false, error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in sync-booking API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
