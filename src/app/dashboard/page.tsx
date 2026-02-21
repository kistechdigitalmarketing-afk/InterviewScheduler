"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isPast, isToday, isFuture } from "date-fns";
import { collection, query, where, getDocs } from "firebase/firestore";
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
  Copy,
  Check,
  Link as LinkIcon,
  Save,
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
  const { user, userData, loading: authLoading, updateUserData } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [linkSaved, setLinkSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const bookingsRef = collection(db, "bookings");
        let bookingsData: Booking[] = [];

        const interviewerQuery = query(
          bookingsRef,
          where("interviewerId", "==", user.uid)
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
          where("applicantId", "==", user.uid)
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

    if (user && userData) {
      fetchData();
    }
  }, [user, userData]);

  const upcomingBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.startTime && isFuture(b.startTime)
  );
  const todayBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.startTime && isToday(b.startTime)
  );
  const pastBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.endTime && isPast(b.endTime)
  );

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/book/${user?.uid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Initialize meeting link from userData
  useEffect(() => {
    if (userData?.meetingLink) {
      setMeetingLink(userData.meetingLink);
    }
  }, [userData?.meetingLink]);

  const saveMeetingLink = async () => {
    if (!updateUserData) return;
    setSavingLink(true);
    try {
      await updateUserData({ meetingLink: meetingLink || null });
      setLinkSaved(true);
      setTimeout(() => setLinkSaved(false), 2000);
    } catch (error) {
      console.error("Error saving meeting link:", error);
    } finally {
      setSavingLink(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !userData) return null;

  const isInterviewer = userData.role === "INTERVIEWER";

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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">
                Welcome back, {userData.name?.split(" ")[0] || "there"}! 👋
              </h1>
              <p className="text-white/50">
                {isInterviewer
                  ? "Manage your availability and upcoming interviews"
                  : "View your scheduled interviews and book new ones"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/50">Today&apos;s Interviews</p>
                <p className="text-3xl font-bold text-white">{todayBookings.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/50">Upcoming</p>
                <p className="text-3xl font-bold text-white">{upcomingBookings.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/30">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/50">Completed</p>
                <p className="text-3xl font-bold text-white">{pastBookings.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Interviews */}
            <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Upcoming Interviews</h2>
                {!isInterviewer && (
                  <Link href="/book">
                    <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all">
                      <Plus className="w-4 h-4" />
                      Book New
                    </button>
                  </Link>
                )}
              </div>
              <div className="p-6">
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/40">No upcoming interviews</p>
                    {!isInterviewer && (
                      <Link href="/book">
                        <button className="mt-4 text-violet-400 hover:text-violet-300 text-sm font-medium flex items-center gap-1 mx-auto">
                          Book an interview <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className="group flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div
                          className="w-1.5 h-full min-h-[100px] rounded-full"
                          style={{ backgroundColor: booking.eventTypeColor || "#a855f7" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-white text-lg">
                                {booking.eventTypeTitle || "Interview"}
                              </h4>
                              <div className="flex items-center gap-2 mt-2 text-sm text-white/50">
                                <Calendar className="w-4 h-4" />
                                {booking.startTime && format(booking.startTime, "EEEE, MMMM d")}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-white/50">
                                <Clock className="w-4 h-4" />
                                {booking.startTime && format(booking.startTime, "h:mm a")} -{" "}
                                {booking.endTime && format(booking.endTime, "h:mm a")}
                              </div>
                            </div>
                            <span className={cn(
                              "px-3 py-1 rounded-lg text-xs font-medium",
                              booking.status === "CONFIRMED" && "bg-emerald-500/20 text-emerald-400",
                              booking.status === "PENDING" && "bg-amber-500/20 text-amber-400",
                              booking.status === "CANCELLED" && "bg-red-500/20 text-red-400"
                            )}>
                              {booking.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-4">
                            <Avatar className="h-9 w-9 ring-2 ring-white/10">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
                                {isInterviewer
                                  ? (booking.applicantName || booking.applicantEmail || "A").charAt(0)
                                  : (booking.interviewerName || booking.interviewerEmail || "I").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <p className="font-medium text-white">
                                {isInterviewer
                                  ? booking.applicantName || booking.applicantEmail
                                  : booking.interviewerName || booking.interviewerEmail}
                              </p>
                              <p className="text-white/40">
                                {isInterviewer ? "Applicant" : "Interviewer"}
                              </p>
                            </div>
                          </div>

                          {booking.meetingLink && (
                            <a
                              href={booking.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/30 transition-colors"
                            >
                              <Video className="w-4 h-4" />
                              Join Meeting
                              <ExternalLink className="w-3 h-3" />
                            </a>
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
          <div className="space-y-6">
            {/* Meeting Link Settings (Interviewer only) */}
            {isInterviewer && (
              <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Meeting Link</h3>
                      <p className="text-xs text-white/50">Shown to applicants after booking</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="url"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://zoom.us/j/... or Google Meet link"
                        className="w-full h-11 rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={saveMeetingLink}
                      disabled={savingLink}
                      className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
                    >
                      {savingLink ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : linkSaved ? (
                        <>
                          <Check className="w-4 h-4" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Share Link (Interviewer only) */}
            {isInterviewer && (
              <div className="rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 backdrop-blur-xl overflow-hidden">
                <div className="p-6">
                  <h3 className="font-bold text-white mb-2">Share Your Booking Link</h3>
                  <p className="text-sm text-white/60 mb-4">
                    Let applicants book time with you directly
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-black/20 border border-white/10 text-sm text-white/70 mb-4">
                    <span className="truncate flex-1">
                      {typeof window !== "undefined" ? window.location.origin : ""}/book/{user.uid}
                    </span>
                  </div>
                  <button
                    onClick={copyLink}
                    className="w-full px-4 py-3 rounded-xl bg-white text-violet-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-violet-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
