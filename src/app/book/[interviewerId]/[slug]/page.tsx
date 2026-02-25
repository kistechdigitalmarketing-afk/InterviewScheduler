"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, addMinutes, isSameDay, isFuture } from "date-fns";
import { doc, getDoc, collection, getDocs, addDoc, query, where, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Video,
  AlertTriangle,
  XCircle,
  Phone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const INTERVIEW_DURATION = 30;

interface InterviewerData {
  uid: string;
  name: string | null;
  email: string;
  image: string | null;
  meetingLink: string | null;
  organizationName: string | null;
}

interface EventType {
  id: string;
  title: string;
  slug: string;
  description: string;
  color: string;
  meetingLink?: string;
}

interface TimeSlot {
  time: string;
  formatted: string;
  duration: number;
  eventTypeId?: string;
}

interface AvailabilitySlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  eventTypeId?: string;
}

interface DayAvailability {
  date: string;
  slots: AvailabilitySlot[];
}

interface Booking {
  id: string;
  startTime: Date;
  endTime: Date;
  interviewerName: string | null;
  interviewerEmail: string;
  meetingLink: string | null;
  organizationName: string | null;
  bookingId?: string;
}

// Dark Calendar Component
function DarkCalendar({
  selected,
  onSelect,
  highlightedDates = [],
}: {
  selected?: Date;
  onSelect?: (date: Date) => void;
  highlightedDates?: Date[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  const isHighlighted = (date: Date) => {
    return highlightedDates.some((d) => isSameDay(d, date));
  };

  const isPast = (date: Date) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return date < todayStart;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-white/40 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-10" />;
          }

          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const hasSlots = isHighlighted(day);
          const disabled = isPast(day) || !hasSlots;

          return (
            <button
              key={day.toISOString()}
              onClick={() => !disabled && onSelect?.(day)}
              disabled={disabled}
              className={cn(
                "h-10 rounded-lg text-sm font-medium transition-all duration-200 relative",
                disabled && "text-white/20 cursor-not-allowed",
                !disabled && isSelected
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
                  : !disabled && hasSlots
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  : "text-white/50",
                isToday && !isSelected && !disabled && "ring-1 ring-violet-500/50"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function EventBookingPage({
  params,
}: {
  params: Promise<{ interviewerId: string; slug: string }>;
}) {
  const { interviewerId, slug } = use(params);
  const router = useRouter();
  const [interviewer, setInterviewer] = useState<InterviewerData | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [selectedSlotData, setSelectedSlotData] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<"date" | "details" | "confirmed" | "has-booking">("date");
  const [checkEmail, setCheckEmail] = useState("");
  const [checkingBooking, setCheckingBooking] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [existingBooking, setExistingBooking] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellingConfirmed, setCancellingConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const interviewerDoc = await getDoc(doc(db, "users", interviewerId));
        if (interviewerDoc.exists()) {
          const data = interviewerDoc.data();
          setInterviewer({
            uid: interviewerId,
            name: data.name,
            email: data.email,
            image: data.image,
            meetingLink: data.meetingLink || null,
            organizationName: data.organizationName || null,
          });
        }

        // Fetch event type by slug
        const eventTypesRef = collection(db, "users", interviewerId, "eventTypes");
        const eventTypesSnapshot = await getDocs(eventTypesRef);
        const foundEventType = eventTypesSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }) as EventType)
          .find((e) => e.slug === slug);
        
        if (foundEventType) {
          setEventType(foundEventType);
        }

        const availabilityRef = collection(db, "users", interviewerId, "availability");
        const availabilitySnapshot = await getDocs(availabilityRef);
        const availabilityData = availabilitySnapshot.docs.map((doc) => ({
          date: doc.id,
          slots: doc.data().slots || [],
        })) as DayAvailability[];
        
        setAvailability(availabilityData);

        // Check for existing booking on page load using URL search params
        let emailParam: string | null = null;
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          emailParam = urlParams.get('email');
        }
        if (emailParam) {
          const bookingsRef = collection(db, "bookings");
          const emailQuery = query(
            bookingsRef,
            where("applicantEmail", "==", emailParam),
            where("interviewerId", "==", interviewerId),
            where("status", "in", ["CONFIRMED", "PENDING"])
          );
          const emailBookingsSnapshot = await getDocs(emailQuery);
          
          const existingFutureBooking = emailBookingsSnapshot.docs.find((doc) => {
            const data = doc.data();
            const bookingStartTime = data.startTime?.toDate();
            return bookingStartTime && isFuture(bookingStartTime);
          });

          if (existingFutureBooking) {
            const data = existingFutureBooking.data();
            setExistingBooking({
              id: existingFutureBooking.id,
              ...data,
              startTime: data.startTime?.toDate(),
              endTime: data.endTime?.toDate(),
            });
            setStep("has-booking");
            return;
          }
        }
        setStep("date");
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [interviewerId, slug]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !eventType) return;

      setLoadingSlots(true);
      setSelectedTime(undefined);

      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const dayAvailability = availability.find((a) => a.date === dateStr);

        if (!dayAvailability || dayAvailability.slots.length === 0) {
          setSlots([]);
          setLoadingSlots(false);
          return;
        }

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const bookingsRef = collection(db, "bookings");
        const bookingsQuery = query(
          bookingsRef,
          where("interviewerId", "==", interviewerId),
          where("startTime", ">=", startOfDay),
          where("startTime", "<=", endOfDay)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const existingBookings = bookingsSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              status: data.status as string,
              startTime: data.startTime?.toDate() as Date,
              endTime: data.endTime?.toDate() as Date,
            };
          })
          .filter((b) => b.status !== "CANCELLED");

        const now = new Date();
        const availableSlots: TimeSlot[] = [];

        // Filter slots by this specific event type
        const filteredDaySlots = dayAvailability.slots.filter(
          (slot) => slot.eventTypeId === eventType.id
        );

        for (const slot of filteredDaySlots) {
          const slotDuration = slot.duration || INTERVIEW_DURATION;
          
          const [hours, minutes] = slot.startTime.split(":").map(Number);
          const slotDate = new Date(selectedDate);
          slotDate.setHours(hours, minutes, 0, 0);

          if (slotDate <= now) continue;

          const slotEnd = addMinutes(slotDate, slotDuration);

          const hasConflict = existingBookings.some((booking: any) => {
            return (
              (slotDate >= booking.startTime && slotDate < booking.endTime) ||
              (slotEnd > booking.startTime && slotEnd <= booking.endTime) ||
              (slotDate <= booking.startTime && slotEnd >= booking.endTime)
            );
          });

          if (!hasConflict) {
            availableSlots.push({
              time: slotDate.toISOString(),
              formatted: format(slotDate, "h:mm a"),
              duration: slotDuration,
              eventTypeId: slot.eventTypeId,
            });
          }
        }

        setSlots(availableSlots);
      } catch (error) {
        console.error("Error fetching slots:", error);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, interviewerId, availability, eventType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !interviewer || !selectedSlotData || !eventType) return;

    setSubmitting(true);

    try {
      const duration = selectedSlotData.duration || INTERVIEW_DURATION;
      const startTime = new Date(selectedTime);
      const endTime = addMinutes(startTime, duration);

      // Check if this email already has an active booking with this interviewer
      const bookingsRef = collection(db, "bookings");
      const emailQuery = query(
        bookingsRef,
        where("applicantEmail", "==", formData.email),
        where("interviewerId", "==", interviewerId),
        where("status", "in", ["CONFIRMED", "PENDING"])
      );
      const emailBookingsSnapshot = await getDocs(emailQuery);
      
      const existingFutureBooking = emailBookingsSnapshot.docs.find((doc) => {
        const data = doc.data();
        const bookingStartTime = data.startTime?.toDate();
        return bookingStartTime && isFuture(bookingStartTime);
      });

      if (existingFutureBooking) {
        const data = existingFutureBooking.data();
        setExistingBooking({
          id: existingFutureBooking.id,
          ...data,
          startTime: data.startTime?.toDate(),
          endTime: data.endTime?.toDate(),
        });
        setStep("has-booking");
        return;
      }

      const bookingData = {
        interviewerId,
        interviewerName: interviewer.name,
        interviewerEmail: interviewer.email,
        applicantId: null,
        applicantName: formData.name,
        applicantEmail: formData.email,
        applicantPhone: formData.phone || null,
        startTime,
        endTime,
        duration,
        eventTypeId: eventType.id,
        eventTypeTitle: eventType.title,
        eventTypeColor: eventType.color || "#6366f1",
        notes: formData.notes || null,
        meetingLink: eventType.meetingLink || null,
        status: "CONFIRMED",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "bookings"), bookingData);

      setBooking({
        id: docRef.id,
        startTime,
        endTime,
        interviewerName: interviewer.name,
        interviewerEmail: interviewer.email,
        meetingLink: eventType.meetingLink || null,
        organizationName: interviewer.organizationName,
        bookingId: docRef.id,
      });
      // Update URL with email parameter for future booking detection (without navigation)
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.pathname}?email=${encodeURIComponent(formData.email)}`;
        window.history.replaceState({}, '', newUrl);
      }
      setStep("confirmed");
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter available dates based on this event type
  const availableDates = useMemo(() => {
    if (!eventType) return [];
    return availability
      .filter((a) => a.slots.some((slot) => slot.eventTypeId === eventType.id))
      .map((a) => new Date(a.date));
  }, [availability, eventType]);

  const getSelectedSlotDuration = () => {
    return selectedSlotData?.duration || INTERVIEW_DURATION;
  };

  const checkExistingBooking = async (email: string) => {
    setCheckingBooking(true);
    try {
      const bookingsRef = collection(db, "bookings");
      const emailQuery = query(
        bookingsRef,
        where("applicantEmail", "==", email),
        where("interviewerId", "==", interviewerId),
        where("status", "in", ["CONFIRMED", "PENDING"])
      );
      const emailBookingsSnapshot = await getDocs(emailQuery);
      
      const existingFutureBooking = emailBookingsSnapshot.docs.find((doc) => {
        const data = doc.data();
        const bookingStartTime = data.startTime?.toDate();
        return bookingStartTime && isFuture(bookingStartTime);
      });

      if (existingFutureBooking) {
        const data = existingFutureBooking.data();
        setExistingBooking({
          id: existingFutureBooking.id,
          ...data,
          startTime: data.startTime?.toDate(),
          endTime: data.endTime?.toDate(),
        });
        setStep("has-booking");
      }
    } catch (error) {
      console.error("Error checking booking:", error);
    } finally {
      setCheckingBooking(false);
    }
  };

  const cancelExistingBooking = async () => {
    if (!existingBooking) return;
    
    setCancelling(true);
    try {
      await updateDoc(doc(db, "bookings", existingBooking.id), {
        status: "CANCELLED",
      });
      setExistingBooking(null);
      setStep("date");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const cancelConfirmedBooking = async () => {
    if (!booking?.id) return;
    
    setCancellingConfirmed(true);
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "CANCELLED",
      });
      // Reset to date selection
      setBooking(null);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setSelectedSlotData(null);
      setFormData({ name: "", email: "", phone: "", notes: "" });
      setStep("date");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setCancellingConfirmed(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!interviewer || !eventType) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-12 text-center max-w-md">
          <h3 className="text-xl font-semibold text-white mb-2">Event not found</h3>
          <p className="text-white/40 mb-6">
            This booking link may be invalid or expired
          </p>
          <button
            onClick={() => router.push("/book")}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            Browse Interviewers
          </button>
        </div>
      </div>
    );
  }

  // Has existing booking step
  if (step === "has-booking" && existingBooking) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
        
        <div className="relative rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-12 text-center max-w-lg w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl shadow-violet-500/30">
            <CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Your Scheduled Interview</h2>
          <p className="text-sm sm:text-base text-white/50 mb-6 sm:mb-8">
            You already have a booking with this interviewer.
          </p>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 text-left space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm sm:text-base">Interview</p>
                <p className="text-xs sm:text-sm text-white/50 truncate">
                  {existingBooking.startTime && format(existingBooking.startTime, "EEE, MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <p className="text-sm sm:text-base text-white/70">
                {existingBooking.startTime && format(existingBooking.startTime, "h:mm a")} - {existingBooking.endTime && format(existingBooking.endTime, "h:mm a")}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <p className="text-sm sm:text-base text-white/70 truncate">
                {existingBooking.interviewerName || existingBooking.interviewerEmail}
              </p>
            </div>
          </div>

          {existingBooking.meetingLink && (
            <div className="w-full rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 mb-6">
              <div className="flex items-start gap-3 mb-3">
                <Video className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-white mb-1">Meeting Link</p>
                  <p className="text-xs sm:text-sm text-white/50">
                    Please use the link below to join your interview at the scheduled time.
                  </p>
                </div>
              </div>
              <a
                href={existingBooking.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all truncate text-center"
              >
                {existingBooking.meetingLink}
              </a>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={cancelExistingBooking}
              disabled={cancelling}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50"
            >
              {cancelling ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Cancel & Book New</span>
                </>
              )}
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white text-sm sm:text-base font-medium hover:bg-white/10 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmed step
  if (step === "confirmed" && booking) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
        
        <div className="relative rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-12 text-center max-w-lg w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Interview Scheduled!</h2>
          <p className="text-sm sm:text-base text-white/50 mb-6 sm:mb-8">
            Your interview has been confirmed
          </p>

          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 text-left space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm sm:text-base">{eventType.title}</p>
                <p className="text-xs sm:text-sm text-white/50 truncate">
                  {format(booking.startTime, "EEE, MMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <p className="text-sm sm:text-base text-white/70">
                {format(booking.startTime, "h:mm a")} - {format(booking.endTime, "h:mm a")}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <p className="text-sm sm:text-base text-white/70 truncate">
                {booking.organizationName || booking.interviewerName || booking.interviewerEmail}
              </p>
            </div>
          </div>

          {booking.meetingLink ? (
            <div className="w-full rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 mb-6">
              <div className="flex items-start gap-3 mb-3">
                <Video className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-white mb-1">Meeting Link</p>
                  <p className="text-xs sm:text-sm text-white/50">
                    Please use the link below to join your interview at the scheduled time.
                  </p>
                </div>
              </div>
              <a
                href={booking.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all truncate text-center"
              >
                {booking.meetingLink}
              </a>
            </div>
          ) : (
            <div className="w-full rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-medium text-white mb-1">Meeting Details Pending</p>
                  <p className="text-xs sm:text-sm text-white/50">
                    The meeting link and additional details will be communicated to you via email within 1-2 business days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Information Message */}
          <div className="w-full rounded-xl sm:rounded-2xl bg-violet-500/10 border border-violet-500/30 p-4 sm:p-5 mb-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm sm:text-base font-medium text-white mb-1">Important</p>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                  Save this meeting link or use the same booking link and check with your email to access the meeting details.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-6 sm:mt-8">
            <button
              onClick={() => {
                // Try to close the window/tab first
                window.close();
                // If window.close() doesn't work (browsers block it for security),
                // redirect to blank page as fallback - this effectively "closes" the view
                setTimeout(() => {
                  window.location.href = 'about:blank';
                }, 100);
              }}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
            >
              Close
            </button>
            <button
              onClick={cancelConfirmedBooking}
              disabled={cancellingConfirmed}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm sm:text-base font-medium flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all disabled:opacity-50"
            >
              {cancellingConfirmed ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Cancel Booking</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
      
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-12">
        <button
          onClick={() => router.push(`/book/${interviewerId}`)}
          className="mb-4 sm:mb-8 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all events
        </button>

        {/* Check Booking Banner */}
        {step === "date" && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-white/70">
                Already booked? Check your scheduled interview
              </p>
            </div>
            <button
              onClick={() => setShowCheckModal(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs sm:text-sm font-medium hover:bg-violet-500/30 transition-all whitespace-nowrap"
            >
              Check Booking
            </button>
          </div>
        )}

        {/* Check Booking Modal */}
        {showCheckModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="relative rounded-2xl sm:rounded-3xl bg-[#050507] border border-white/10 backdrop-blur-xl p-6 sm:p-12 max-w-md w-full">
              <button
                onClick={() => {
                  setShowCheckModal(false);
                  setCheckEmail("");
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>

              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Check Your Booking</h2>
                <p className="text-sm sm:text-base text-white/50">
                  Enter your email to view your scheduled interview
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (checkEmail) {
                    checkExistingBooking(checkEmail);
                    setShowCheckModal(false);
                  }
                }}
                className="space-y-4 sm:space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-white/70">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                    <input
                      type="email"
                      value={checkEmail}
                      onChange={(e) => setCheckEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 pl-10 sm:pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCheckModal(false);
                      setCheckEmail("");
                    }}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white text-sm sm:text-base font-medium hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={checkingBooking || !checkEmail}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50"
                  >
                    {checkingBooking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        Check Booking
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Sidebar - Interviewer Info & Event Details */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Interviewer Card */}
              <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <Avatar className="h-10 w-10 sm:h-14 sm:w-14 ring-2 ring-white/10">
                    <AvatarImage src={interviewer.image || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm sm:text-lg">
                      {(interviewer.organizationName || interviewer.name || interviewer.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm sm:text-base truncate">
                      {interviewer.organizationName || interviewer.name || interviewer.email}
                    </p>
                    <p className="text-xs sm:text-sm text-white/40">
                      {interviewer.organizationName ? "Organization" : "Interviewer"}
                    </p>
                  </div>
                </div>

                <div 
                  className="w-full h-1 sm:h-1.5 rounded-full mb-4 sm:mb-5"
                  style={{ backgroundColor: eventType.color || "#8b5cf6" }}
                />

                <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">{eventType.title}</h2>
                {eventType.description && (
                  <p className="text-white/40 text-xs sm:text-sm">
                    {eventType.description}
                  </p>
                )}
              </div>

              {/* Selected Time Summary */}
              {selectedDate && selectedTime && selectedSlotData && (
                <div className="rounded-2xl sm:rounded-3xl bg-violet-500/10 border border-violet-500/30 backdrop-blur-xl p-4 sm:p-6">
                  <p className="text-xs sm:text-sm font-medium text-white/50 mb-2 sm:mb-3">
                    Selected Time
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold text-violet-300 text-sm sm:text-base">
                      {format(new Date(selectedTime), "EEE, MMM d")}
                    </p>
                    <p className="text-xs sm:text-sm text-violet-400">
                      {format(new Date(selectedTime), "h:mm a")} -{" "}
                      {format(addMinutes(new Date(selectedTime), getSelectedSlotDuration()), "h:mm a")}
                    </p>
                    <p className="text-[10px] sm:text-xs text-violet-400/70">
                      {getSelectedSlotDuration()} minutes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 order-1 lg:order-2 space-y-4 sm:space-y-6">
            {step === "date" ? (
              <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-white/10">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Select a Date & Time</h2>
                  <p className="text-white/40 text-xs sm:text-sm mt-1">
                    Green dates have available slots for {eventType.title}
                  </p>
                </div>
                <div className="p-4 sm:p-6">
                  {/* Guide Message */}
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-xs sm:text-sm text-emerald-400 text-center">
                      💡 Click on highlighted days to schedule them the time slots properly
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                    {/* Calendar */}
                    <DarkCalendar
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      highlightedDates={availableDates}
                    />

                    {/* Time Slots */}
                    <div>
                      {selectedDate ? (
                        <>
                          <h3 className="font-semibold text-white text-sm sm:text-base mb-3 sm:mb-4">
                            {format(selectedDate, "EEE, MMM d")}
                          </h3>
                          {loadingSlots ? (
                            <div className="flex items-center justify-center py-8 sm:py-12">
                              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 animate-spin" />
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 text-white/40">
                              <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-white/20" />
                              <p className="text-sm">No available slots</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto pr-2">
                              {slots.map((slot) => (
                                <button
                                  key={slot.time}
                                  onClick={() => {
                                    setSelectedTime(slot.time);
                                    setSelectedSlotData(slot);
                                  }}
                                  className={cn(
                                    "px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 text-left",
                                    selectedTime === slot.time
                                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
                                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                                  )}
                                >
                                  <span className="block">{slot.formatted}</span>
                                  <span className="text-[10px] opacity-70">{slot.duration} min</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-white/40 py-8">
                          <p className="text-sm">Select a date to see times</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTime && (
                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 flex justify-end">
                      <button
                        onClick={() => setStep("details")}
                        className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-white/10">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Enter Your Details</h2>
                  <p className="text-white/40 text-xs sm:text-sm mt-1">
                    Provide your information to complete booking
                  </p>
                </div>
                <div className="p-4 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-white/70">Your Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                        <input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                          className="w-full h-11 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 pl-10 sm:pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-white/70">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="you@example.com"
                          className="w-full h-11 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 pl-10 sm:pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-white/70">Phone Number (Optional)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder=""
                          className="w-full h-11 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 pl-10 sm:pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-white/70">
                        Additional Notes (Optional)
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 sm:left-4 top-3 sm:top-4 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Any additional information..."
                          className="w-full min-h-[100px] sm:min-h-[120px] rounded-lg sm:rounded-xl bg-white/5 border border-white/10 pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setStep("date")}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white text-sm sm:text-base font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-all order-2 sm:order-1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50 order-1 sm:order-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scheduling...
                          </>
                        ) : (
                          <>
                            Schedule Interview
                            <CheckCircle2 className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
