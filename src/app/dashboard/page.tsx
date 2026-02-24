"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isPast, isToday, isFuture } from "date-fns";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Calendar,
  Clock,
  Video,
  ArrowRight,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CalendarDays,
  Settings,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  applicantName: string | null;
  applicantEmail: string;
  applicantPhone: string | null;
  meetingLink: string | null;
  notes: string | null;
  eventTypeTitle: string;
  eventTypeDuration: number;
  eventTypeColor: string;
  interviewerId: string;
  interviewerName: string | null;
  interviewerEmail: string;
}

export default function DashboardPage() {
  const { userData, loading: authLoading, organizationId, initOrganization } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Initialize organization on load
  useEffect(() => {
    if (!userData && !authLoading) {
      initOrganization();
    }
  }, [userData, authLoading, initOrganization]);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      try {
        const bookingsRef = collection(db, "bookings");
        let bookingsData: Booking[] = [];

        const interviewerQuery = query(
          bookingsRef,
          where("interviewerId", "==", organizationId)
        );
        const interviewerSnapshot = await getDocs(interviewerQuery);
        
        interviewerSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          bookingsData.push({
            id: doc.id,
            ...data,
            startTime: data.startTime?.toDate(),
            endTime: data.endTime?.toDate(),
          } as Booking);
        });

        const applicantQuery = query(
          bookingsRef,
          where("applicantId", "==", organizationId)
        );
        const applicantSnapshot = await getDocs(applicantQuery);
        
        applicantSnapshot.docs.forEach((doc) => {
          if (!bookingsData.find(b => b.id === doc.id)) {
            const data = doc.data();
            bookingsData.push({
              id: doc.id,
              ...data,
              startTime: data.startTime?.toDate(),
              endTime: data.endTime?.toDate(),
            } as Booking);
          }
        });

        bookingsData.sort((a, b) => {
          if (!a.startTime || !b.startTime) return 0;
          return a.startTime.getTime() - b.startTime.getTime();
        });

        setBookings(bookingsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId && userData) {
      fetchData();
    }
  }, [organizationId, userData]);

  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "upcoming" | "completed">("all");

  const deleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
      return;
    }
    
    setDeletingId(bookingId);
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Failed to delete booking. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    setDeletingId(bookingId);
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "CANCELLED",
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
      );
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.startTime && isFuture(b.startTime)
  );
  const todayBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.startTime && isToday(b.startTime)
  );
  const pastBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.endTime && isPast(b.endTime)
  );

  // Get filtered bookings based on active filter
  const getFilteredBookings = () => {
    switch (activeFilter) {
      case "today":
        return todayBookings;
      case "upcoming":
        return upcomingBookings;
      case "completed":
        return pastBookings;
      default:
        return upcomingBookings;
    }
  };

  const filteredBookings = getFilteredBookings();


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Default to interviewer view if no user logged in
  const isInterviewer = !userData || userData.role === "INTERVIEWER";

  return (
    <div className="min-h-screen bg-[#050507] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
      
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pt-24 sm:pt-28">
        {/* Header */}
        <div className="mb-6 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  Welcome back! 👋
                </h1>
                <p className="text-sm sm:text-base text-white/50">
                  {isInterviewer
                    ? "Manage your availability and interviews"
                    : "View your scheduled interviews"}
                </p>
              </div>
            </div>
            {isInterviewer && (
              <Link href="/availability">
                <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all">
                  <Plus className="w-4 h-4" />
                  Add Your Schedule
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards - Clickable Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-12">
          <button
            onClick={() => setActiveFilter("today")}
            className={cn(
              "rounded-xl sm:rounded-2xl bg-white/5 border backdrop-blur-sm p-4 sm:p-6 transition-all duration-200 text-left",
              activeFilter === "today" 
                ? "border-violet-500/50 ring-2 ring-violet-500/20" 
                : "border-white/10 hover:border-white/20"
            )}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Calendar className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-white/50">Today</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{todayBookings.length}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter("upcoming")}
            className={cn(
              "rounded-xl sm:rounded-2xl bg-white/5 border backdrop-blur-sm p-4 sm:p-6 transition-all duration-200 text-left",
              activeFilter === "upcoming" 
                ? "border-emerald-500/50 ring-2 ring-emerald-500/20" 
                : "border-white/10 hover:border-white/20"
            )}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-white/50">Upcoming</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{upcomingBookings.length}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveFilter("completed")}
            className={cn(
              "rounded-xl sm:rounded-2xl bg-white/5 border backdrop-blur-sm p-4 sm:p-6 transition-all duration-200 text-left",
              activeFilter === "completed" 
                ? "border-slate-500/50 ring-2 ring-slate-500/20" 
                : "border-white/10 hover:border-white/20"
            )}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/30">
                <Clock className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-white/50">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{pastBookings.length}</p>
              </div>
            </div>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Interviews List */}
            <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {activeFilter === "today" && "Today's Interviews"}
                  {activeFilter === "upcoming" && "Upcoming Interviews"}
                  {activeFilter === "completed" && "Completed Interviews"}
                  {activeFilter === "all" && "Upcoming Interviews"}
                </h2>
                {!isInterviewer && (
                  <Link href="/book">
                    <button className="w-full sm:w-auto px-4 py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all">
                      <Plus className="w-4 h-4" />
                      Book New
                    </button>
                  </Link>
                )}
              </div>
              <div className="p-4 sm:p-6">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white/20" />
                    </div>
                    <p className="text-sm sm:text-base text-white/40">
                      {activeFilter === "today" && "No interviews today"}
                      {activeFilter === "upcoming" && "No upcoming interviews"}
                      {activeFilter === "completed" && "No completed interviews"}
                      {activeFilter === "all" && "No upcoming interviews"}
                    </p>
                    {!isInterviewer && (
                      <Link href="/book">
                        <button className="mt-3 sm:mt-4 text-violet-400 hover:text-violet-300 text-xs sm:text-sm font-medium flex items-center gap-1 mx-auto">
                          Book an interview <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {filteredBookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className="group flex items-start gap-3 sm:gap-4 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div
                          className="w-1 sm:w-1.5 h-full min-h-[80px] sm:min-h-[100px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: booking.eventTypeColor || "#a855f7" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-white text-sm sm:text-lg truncate">
                                {booking.eventTypeTitle || "Interview"}
                              </h4>
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/50">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">{booking.startTime && format(booking.startTime, "EEE, MMM d")}</span>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 text-xs sm:text-sm text-white/50">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {booking.startTime && format(booking.startTime, "h:mm a")} -{" "}
                                {booking.endTime && format(booking.endTime, "h:mm a")}
                              </div>
                            </div>
                            <span className={cn(
                              "px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium flex-shrink-0",
                              booking.status === "CONFIRMED" && "bg-emerald-500/20 text-emerald-400",
                              booking.status === "PENDING" && "bg-amber-500/20 text-amber-400",
                              booking.status === "CANCELLED" && "bg-red-500/20 text-red-400"
                            )}>
                              {booking.status === "CONFIRMED" ? "CONF" : booking.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                            <Avatar className="h-7 w-7 sm:h-9 sm:w-9 ring-2 ring-white/10 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs sm:text-sm">
                                {isInterviewer
                                  ? (booking.applicantName || booking.applicantEmail || "A").charAt(0)
                                  : (booking.interviewerName || booking.interviewerEmail || "I").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-xs sm:text-sm min-w-0 flex-1">
                              <p className="font-medium text-white truncate">
                                {isInterviewer
                                  ? booking.applicantName || booking.applicantEmail
                                  : booking.interviewerName || booking.interviewerEmail}
                              </p>
                              <p className="text-white/40">
                                {isInterviewer ? "Applicant" : "Interviewer"}
                              </p>
                              {isInterviewer && booking.applicantPhone && (
                                <div className="flex items-center gap-1 mt-1 text-white/50">
                                  <Phone className="w-3 h-3" />
                                  <span>{booking.applicantPhone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {booking.meetingLink && (
                            <a
                              href={booking.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-violet-500/20 text-violet-400 text-xs sm:text-sm font-medium hover:bg-violet-500/30 transition-colors"
                            >
                              <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                              Join Meeting
                              <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </a>
                          )}

                          {/* Action Buttons */}
                          {isInterviewer && (
                            <div className="flex items-center gap-2 mt-3 sm:mt-4">
                              {booking.status !== "CANCELLED" && (
                                <button
                                  onClick={() => cancelBooking(booking.id)}
                                  disabled={deletingId === booking.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={() => deleteBooking(booking.id)}
                                disabled={deletingId === booking.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                {deletingId === booking.id ? (
                                  <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Links (Interviewer only) */}
            {isInterviewer && (
              <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="p-4 sm:p-6">
                  <h3 className="font-bold text-white text-sm sm:text-base mb-3 sm:mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    <Link href="/events">
                      <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 text-left">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                          <CalendarDays className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Event Types</p>
                          <p className="text-xs text-white/40">Create interview types</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
                      </button>
                    </Link>
                    <Link href="/availability">
                      <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 text-left">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                          <Settings className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Availability</p>
                          <p className="text-xs text-white/40">Set your schedule</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
