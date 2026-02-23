import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/googleCalendar';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const interviewerId = searchParams.get('interviewerId');

    if (!interviewerId) {
      return NextResponse.redirect(
        new URL('/error?message=Missing+interviewer+ID', request.url)
      );
    }

    const redirectUri = process.env.GOOGLE_INTERVIEWER_REDIRECT_URI;
    console.log('GOOGLE_INTERVIEWER_REDIRECT_URI:', redirectUri);
    console.log('All GOOGLE env vars:', Object.keys(process.env).filter(k => k.startsWith('GOOGLE')));
    
    if (!redirectUri) {
      console.error('GOOGLE_INTERVIEWER_REDIRECT_URI not configured');
      return NextResponse.redirect(new URL('/error?message=OAuth+not+configured', request.url));
    }

    // Generate OAuth URL with interviewerId as state
    const authUrl = generateAuthUrl(redirectUri, interviewerId);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error in Google interviewer auth route:', error);
    return NextResponse.redirect(new URL('/error?message=Authentication+failed', request.url));
  }
}
