import { google, calendar_v3 } from 'googleapis';

// Booking data type (with Timestamps already converted to Dates)
export interface BookingData {
  interviewerId: string;
  interviewerName: string | null;
  interviewerEmail: string;
  applicantName: string;
  applicantEmail: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  eventTypeTitle: string;
  notes: string | null;
  meetingLink: string | null;
  status: string;
  createdAt: Date;
}

// Type for the OAuth2 client from googleapis
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * Creates and returns a configured Google OAuth2 client
 */
export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret);
}

/**
 * Generates a Google OAuth authorization URL
 * @param redirectUri - The redirect URI after authorization
 * @param state - State parameter to pass through the OAuth flow (e.g., bookingId)
 */
export function generateAuthUrl(redirectUri: string, state: string): string {
  const oauth2Client = getOAuthClient();

  const scopes = ['https://www.googleapis.com/auth/calendar.events'];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state,
    redirect_uri: redirectUri,
    prompt: 'consent', // Force consent to get refresh token
  });

  return authUrl;
}

/**
 * Creates a calendar event on the user's primary Google Calendar
 * @param auth - Authenticated OAuth2 client
 * @param booking - Booking data
 */
export async function createCalendarEvent(
  auth: OAuth2Client,
  booking: BookingData
): Promise<calendar_v3.Schema$Event> {
  const calendar = google.calendar({ version: 'v3', auth });

  // Build description
  let description = '';
  if (booking.meetingLink) {
    description += `Meeting Link: ${booking.meetingLink}\n\n`;
  }
  if (booking.notes) {
    description += `Notes: ${booking.notes}`;
  }

  const event: calendar_v3.Schema$Event = {
    summary: booking.eventTypeTitle,
    description: description || undefined,
    location: booking.meetingLink || undefined,
    start: {
      dateTime: booking.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: booking.endTime.toISOString(),
      timeZone: 'UTC',
    },
    attendees: [
      { email: booking.applicantEmail, displayName: booking.applicantName },
      { email: booking.interviewerEmail, displayName: booking.interviewerName || 'Interviewer' },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all', // Send email notifications to attendees
  });

  return response.data;
}

/**
 * Exchanges an authorization code for tokens
 * @param code - Authorization code from OAuth callback
 * @param redirectUri - The redirect URI used in the initial auth request
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('Failed to get access token');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || undefined,
  };
}

/**
 * Creates an authenticated OAuth2 client with tokens
 * @param accessToken - Access token
 * @param refreshToken - Optional refresh token
 */
export function createAuthenticatedClient(
  accessToken: string,
  refreshToken?: string
): OAuth2Client {
  const oauth2Client = getOAuthClient();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

