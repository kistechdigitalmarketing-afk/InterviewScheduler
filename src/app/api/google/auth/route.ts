import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/googleCalendar';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.redirect(new URL('/error?message=Missing+booking+ID', request.url));
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri) {
      console.error('GOOGLE_REDIRECT_URI not configured');
      return NextResponse.redirect(new URL('/error?message=OAuth+not+configured', request.url));
    }

    // Generate OAuth URL with bookingId as state
    const authUrl = generateAuthUrl(redirectUri, bookingId);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error in Google auth route:', error);
    return NextResponse.redirect(new URL('/error?message=Authentication+failed', request.url));
  }
}
