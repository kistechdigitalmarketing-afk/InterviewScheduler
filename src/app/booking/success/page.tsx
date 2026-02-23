"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Video,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";

interface BookingData {
  id: string;
  startTime: Date;
  endTime: Date;
  eventTypeTitle: string;
  interviewerName: string | null;
  interviewerEmail: string;
  applicantName: string;
  applicantEmail: string;
  meetingLink: string | null;
  notes: string | null;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const synced = searchParams.get("synced") === "true";

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingSnapshot = await getDoc(bookingRef);

        if (bookingSnapshot.exists()) {
          const data = bookingSnapshot.data();
          setBooking({
            id: bookingSnapshot.id,
            startTime:
              data.startTime instanceof Timestamp
                ? data.startTime.toDate()
                : new Date(data.startTime),
            endTime:
              data.endTime instanceof Timestamp
                ? data.endTime.toDate()
                : new Date(data.endTime),
            eventTypeTitle: data.eventTypeTitle || "Interview",
            interviewerName: data.interviewerName,
            interviewerEmail: data.interviewerEmail,
            applicantName: data.applicantName,
            applicantEmail: data.applicantEmail,
            meetingLink: data.meetingLink || null,
            notes: data.notes || null,
          });
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-12 text-center max-w-md">
          <h3 className="text-xl font-semibold text-white mb-2">
            Booking not found
          </h3>
          <p className="text-white/40 mb-6">
            The booking you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Link href="/">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all">
              Go Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

      <div className="relative rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-12 text-center max-w-lg w-full">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl shadow-emerald-500/30">
          <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">
          Interview Scheduled!
        </h2>
        <p className="text-sm sm:text-base text-white/50 mb-6 sm:mb-8">
          Your interview has been confirmed
        </p>

        {/* Booking Details */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 text-left space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base">
                {booking.eventTypeTitle}
              </p>
              <p className="text-xs sm:text-sm text-white/50 truncate">
                {format(booking.startTime, "EEE, MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
            <p className="text-sm sm:text-base text-white/70">
              {format(booking.startTime, "h:mm a")} -{" "}
              {format(booking.endTime, "h:mm a")}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
            <p className="text-sm sm:text-base text-white/70 truncate">
              {booking.interviewerName || booking.interviewerEmail}
            </p>
          </div>
          {booking.meetingLink && (
            <div className="flex items-center gap-3 sm:gap-4">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <a
                href={booking.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm sm:text-base text-violet-400 hover:text-violet-300 truncate"
              >
                {booking.meetingLink}
              </a>
            </div>
          )}
        </div>

        {/* Google Calendar Sync Button */}
        {synced ? (
          <div className="w-full rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 mb-6">
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Added to Google Calendar</span>
            </div>
          </div>
        ) : (
          <a
            href={`/api/google/auth?bookingId=${bookingId}`}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:shadow-lg mb-6"
            style={{ backgroundColor: "#4285F4" }}
          >
            <CalendarPlus className="w-5 h-5" />
            Sync with My Calendar
          </a>
        )}

        <Link href="/">
          <button className="w-full px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all">
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050507] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}
