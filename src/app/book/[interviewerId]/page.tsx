"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format, addMinutes, isSameDay, isFuture } from "date-fns";
import { doc, getDoc, collection, getDocs, addDoc, query, where, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
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
  ExternalLink,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const INTERVIEW_DURATION = 30; // Default interview duration in minutes

interface InterviewerData {
  uid: string;
  name: string | null;
  email: string;
  image: string | null;
  meetingLink: string | null;
}

interface TimeSlot {
  time: string;
  formatted: string;
}

interface AvailabilitySlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
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

export default function BookingPage({
  params,
}: {
  params: Promise<{ interviewerId: string }>;
}) {
  const { interviewerId } = use(params);
  const router = useRouter();
  const { user, userData } = useAuth();
  const [interviewer, setInterviewer] = useState<InterviewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<"date" | "details" | "confirmed" | "has-booking">("date");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [existingBooking, setExistingBooking] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
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
          });
        }

        const availabilityRef = collection(db, "users", interviewerId, "availability");
        const availabilitySnapshot = await getDocs(availabilityRef);
        const availabilityData = availabilitySnapshot.docs.map((doc) => ({
          date: doc.id,
          slots: doc.data().slots || [],
        })) as DayAvailability[];
        setAvailability(availabilityData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [interviewerId]);

  // Check if applicant already has an active booking
  useEffect(() => {
    const checkExistingBooking = async () => {
      if (!user) return;

      try {
        const bookingsRef = collection(db, "bookings");
        const bookingsQuery = query(
          bookingsRef,
          where("applicantId", "==", user.uid),
          where("status", "in", ["CONFIRMED", "PENDING"])
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        // Find any future booking
        const futureBooking = bookingsSnapshot.docs.find((doc) => {
          const data = doc.data();
          const startTime = data.startTime?.toDate();
          return startTime && isFuture(startTime);
        });

        if (futureBooking) {
          const data = futureBooking.data();
          setExistingBooking({
            id: futureBooking.id,
            ...data,
            startTime: data.startTime?.toDate(),
            endTime: data.endTime?.toDate(),
          });
          setStep("has-booking");
        }
      } catch (error) {
        console.error("Error checking existing booking:", error);
      }
    };

    checkExistingBooking();
  }, [user]);

  useEffect(() => {
    if (userData) {
      setFormData((prev) => ({
        ...prev,
        name: userData.name || "",
        email: userData.email || "",
      }));
    }
  }, [userData]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate) return;

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

        for (const slot of dayAvailability.slots) {
          // Use the slot's duration or default to INTERVIEW_DURATION
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
  }, [selectedDate, interviewerId, availability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || !interviewer) return;

    setSubmitting(true);

    try {
      // Find the selected slot to get its duration
      const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
      const dayAvailability = availability.find((a) => a.date === dateStr);
      const selectedSlotTime = new Date(selectedTime);
      const selectedSlot = dayAvailability?.slots.find((s) => {
        const [hours, minutes] = s.startTime.split(":").map(Number);
        return hours === selectedSlotTime.getHours() && minutes === selectedSlotTime.getMinutes();
      });
      
      const duration = selectedSlot?.duration || INTERVIEW_DURATION;
      const startTime = new Date(selectedTime);
      const endTime = addMinutes(startTime, duration);

      // Check if this email already has an active booking
      const bookingsRef = collection(db, "bookings");
      const emailQuery = query(
        bookingsRef,
        where("applicantEmail", "==", formData.email),
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
        applicantId: user?.uid || null,
        applicantName: formData.name,
        applicantEmail: formData.email,
        startTime,
        endTime,
        duration,
        notes: formData.notes || null,
        meetingLink: interviewer.meetingLink || null,
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
        meetingLink: interviewer.meetingLink,
      });
      setStep("confirmed");
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const availableDates = availability.map((a) => new Date(a.date));

  // Get selected slot duration for display
  const getSelectedSlotDuration = () => {
    if (!selectedDate || !selectedTime) return INTERVIEW_DURATION;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const dayAvailability = availability.find((a) => a.date === dateStr);
    const selectedSlotTime = new Date(selectedTime);
    const selectedSlot = dayAvailability?.slots.find((s) => {
      const [hours, minutes] = s.startTime.split(":").map(Number);
      return hours === selectedSlotTime.getHours() && minutes === selectedSlotTime.getMinutes();
    });
    return selectedSlot?.duration || INTERVIEW_DURATION;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!interviewer) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-12 text-center max-w-md">
          <h3 className="text-xl font-semibold text-white mb-2">Interviewer not found</h3>
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        
        <div className="relative rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-12 text-center max-w-lg w-full">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/30">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">You Already Have a Booking</h2>
          <p className="text-white/50 mb-8">
            You can only have one active interview at a time. Cancel your existing booking to schedule a new one.
          </p>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-left space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <CalendarIcon className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-semibold text-white">Current Interview</p>
                <p className="text-sm text-white/50">
                  {existingBooking.startTime && format(existingBooking.startTime, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-amber-400" />
              <p className="text-white/70">
                {existingBooking.startTime && format(existingBooking.startTime, "h:mm a")} - {existingBooking.endTime && format(existingBooking.endTime, "h:mm a")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <User className="w-5 h-5 text-amber-400" />
              <p className="text-white/70">
                {existingBooking.interviewerName || existingBooking.interviewerEmail}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={cancelExistingBooking}
              disabled={cancelling}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50"
            >
              {cancelling ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Cancel Existing & Book New
                </>
              )}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
            >
              Go to Dashboard
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
        
        <div className="relative rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-12 text-center max-w-lg w-full">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Interview Scheduled!</h2>
          <p className="text-white/50 mb-8">
            Your interview has been confirmed
          </p>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-left space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <CalendarIcon className="w-5 h-5 text-violet-400" />
              <div>
                <p className="font-semibold text-white">Interview</p>
                <p className="text-sm text-white/50">
                  {format(booking.startTime, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-violet-400" />
              <p className="text-white/70">
                {format(booking.startTime, "h:mm a")} - {format(booking.endTime, "h:mm a")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <User className="w-5 h-5 text-violet-400" />
              <p className="text-white/70">
                {booking.interviewerName || booking.interviewerEmail}
              </p>
            </div>
          </div>

          {booking.meetingLink && (
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mb-4 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <Video className="w-5 h-5" />
              Join Meeting
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all"
          >
            Go to Dashboard
          </button>
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

      <div className="relative max-w-5xl mx-auto px-4 py-12 pt-24">
        <button
          onClick={() => router.push("/book")}
          className="mb-8 px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to interviewers
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar - Interviewer Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-14 w-14 ring-2 ring-white/10">
                  <AvatarImage src={interviewer.image || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-lg">
                    {(interviewer.name || interviewer.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">
                    {interviewer.name || interviewer.email}
                  </p>
                  <p className="text-sm text-white/40">Interviewer</p>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mb-5" />

              <h2 className="text-2xl font-bold text-white mb-2">Interview Session</h2>
              <p className="text-white/40 text-sm mb-5">
                Book a time slot for your interview
              </p>

              {selectedDate && selectedTime && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm font-medium text-white/50 mb-3">
                    Selected Time
                  </p>
                  <div className="rounded-xl bg-violet-500/20 border border-violet-500/30 p-4">
                    <p className="font-semibold text-violet-300">
                      {format(new Date(selectedTime), "EEEE, MMMM d")}
                    </p>
                    <p className="text-sm text-violet-400">
                      {format(new Date(selectedTime), "h:mm a")} -{" "}
                      {format(addMinutes(new Date(selectedTime), getSelectedSlotDuration()), "h:mm a")}
                    </p>
                    <p className="text-xs text-violet-400/70 mt-1">
                      {getSelectedSlotDuration()} minutes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === "date" ? (
              <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">Select a Date & Time</h2>
                  <p className="text-white/40 text-sm mt-1">
                    Green dates have available slots
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-8">
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
                          <h3 className="font-semibold text-white mb-4">
                            {format(selectedDate, "EEEE, MMMM d")}
                          </h3>
                          {loadingSlots ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="text-center py-12 text-white/40">
                              <Clock className="w-8 h-8 mx-auto mb-3 text-white/20" />
                              <p>No available slots</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                              {slots.map((slot) => (
                                <button
                                  key={slot.time}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={cn(
                                    "px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                    selectedTime === slot.time
                                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
                                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                                  )}
                                >
                                  {slot.formatted}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-white/40">
                          <p>Select a date to see available times</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedTime && (
                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                      <button
                        onClick={() => setStep("details")}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">Enter Your Details</h2>
                  <p className="text-white/40 text-sm mt-1">
                    Please provide your information to complete the booking
                  </p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Your Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                          className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="you@example.com"
                          className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">
                        Additional Notes (Optional)
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-white/30" />
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Any additional information..."
                          className="w-full min-h-[120px] rounded-xl bg-white/5 border border-white/10 pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setStep("date")}
                        className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium flex items-center gap-2 hover:bg-white/10 transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50"
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
