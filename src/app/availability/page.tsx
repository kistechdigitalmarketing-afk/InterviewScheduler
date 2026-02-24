"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isSameDay } from "date-fns";
import { Clock, Loader2, Check, Plus, X, Trash2, CalendarDays, Sparkles, ChevronDown, Building2, Copy, CheckCircle2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventType {
  id: string;
  title: string;
  slug: string;
  description: string;
  color: string;
  meetingLink?: string;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  eventTypeId?: string;
}

interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function formatTimeFromParts(hour: string, minute: string): string {
  return `${hour}:${minute}`;
}

function getMinutesBetween(startTime: string, endTime: string): number {
  const [startHours, startMins] = startTime.split(":").map(Number);
  const [endHours, endMins] = endTime.split(":").map(Number);
  return (endHours * 60 + endMins) - (startHours * 60 + startMins);
}

// Premium Dark Calendar Component
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

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <h2 className="text-lg sm:text-2xl font-bold text-white">
          {format(currentMonth, "MMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            ‹
          </button>
          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-white/40 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-12" />;
          }

          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const hasSlots = isHighlighted(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect?.(day)}
              className={cn(
                "h-12 rounded-xl text-sm font-medium transition-all duration-300 relative group",
                isSelected
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 scale-105"
                  : hasSlots
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
                isToday && !isSelected && "ring-2 ring-violet-500/50"
              )}
            >
              {format(day, "d")}
              {hasSlots && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AvailabilityContent() {
  const { userData, loading: authLoading, organizationId, initOrganization } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get("eventId") || "";
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>(preselectedEventId);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [showCompletedPopup, setShowCompletedPopup] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize organization on load
  useEffect(() => {
    if (!userData && !authLoading) {
      initOrganization();
    }
  }, [userData, authLoading, initOrganization]);

  // Pre-select event type from URL query param after event types load
  useEffect(() => {
    if (preselectedEventId && eventTypes.length > 0) {
      const exists = eventTypes.find((e) => e.id === preselectedEventId);
      if (exists) {
        setSelectedEventTypeId(preselectedEventId);
      }
    }
  }, [preselectedEventId, eventTypes]);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      try {
        // Fetch availability
        const availabilityRef = collection(db, "users", organizationId, "availability");
        const snapshot = await getDocs(availabilityRef);
        
        const availabilityData = snapshot.docs.map((doc) => ({
          date: doc.id,
          slots: doc.data().slots || [],
        })) as DayAvailability[];
        
        setAvailability(availabilityData);

        // Fetch event types
        const eventTypesRef = collection(db, "users", organizationId, "eventTypes");
        const eventTypesSnapshot = await getDocs(eventTypesRef);
        const eventTypesData = eventTypesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EventType[];
        setEventTypes(eventTypesData.filter(e => e.title));

        // Fetch organization name from user data
        if (userData?.organizationName) {
          setOrganizationName(userData.organizationName);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchData();
    }
  }, [organizationId, userData]);

  const getSelectedDateAvailability = (): DayAvailability | undefined => {
    if (!selectedDate) return undefined;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return availability.find((a) => a.date === dateStr);
  };

  const addTimeSlot = async () => {
    if (!organizationId || !selectedDate) return;

    const newSlotStartTime = formatTimeFromParts(startHour, startMinute);
    const newSlotEndTime = formatTimeFromParts(endHour, endMinute);

    // Validate event type selection
    if (!selectedEventTypeId) {
      alert("Please select an event type for this time slot!");
      return;
    }

    // Validate times
    if (newSlotStartTime >= newSlotEndTime) {
      alert("End time must be after start time!");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const duration = getMinutesBetween(newSlotStartTime, newSlotEndTime);
    
    const newSlot: TimeSlot = {
      id: generateId(),
      startTime: newSlotStartTime,
      endTime: newSlotEndTime,
      duration,
      eventTypeId: selectedEventTypeId || undefined,
    };

    const existingDay = availability.find((a) => a.date === dateStr);
    const existingSlots = existingDay?.slots || [];
    
    const hasOverlap = existingSlots.some((slot) => {
      return (
        (newSlotStartTime >= slot.startTime && newSlotStartTime < slot.endTime) ||
        (newSlotEndTime > slot.startTime && newSlotEndTime <= slot.endTime) ||
        (newSlotStartTime <= slot.startTime && newSlotEndTime >= slot.endTime)
      );
    });

    if (hasOverlap) {
      alert("This time slot overlaps with an existing slot!");
      return;
    }

    setSaving(true);

    try {
      const updatedSlots = [...existingSlots, newSlot].sort((a, b) => 
        a.startTime.localeCompare(b.startTime)
      );

      await setDoc(doc(db, "users", organizationId, "availability", dateStr), {
        slots: updatedSlots,
      });

      setAvailability((prev) => {
        const existing = prev.find((a) => a.date === dateStr);
        if (existing) {
          return prev.map((a) => 
            a.date === dateStr ? { ...a, slots: updatedSlots } : a
          );
        }
        return [...prev, { date: dateStr, slots: updatedSlots }];
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error adding time slot:", error);
    } finally {
      setSaving(false);
    }
  };

  const removeTimeSlot = async (slotId: string) => {
    if (!organizationId || !selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const existingDay = availability.find((a) => a.date === dateStr);
    if (!existingDay) return;

    setSaving(true);

    try {
      const updatedSlots = existingDay.slots.filter((s) => s.id !== slotId);

      if (updatedSlots.length === 0) {
        await deleteDoc(doc(db, "users", organizationId, "availability", dateStr));
        setAvailability((prev) => prev.filter((a) => a.date !== dateStr));
      } else {
        await setDoc(doc(db, "users", organizationId, "availability", dateStr), {
          slots: updatedSlots,
        });
        setAvailability((prev) =>
          prev.map((a) => (a.date === dateStr ? { ...a, slots: updatedSlots } : a))
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error removing time slot:", error);
    } finally {
      setSaving(false);
    }
  };

  const clearDayAvailability = async () => {
    if (!organizationId || !selectedDate) return;
    if (!confirm("Clear all slots for this day?")) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setSaving(true);

    try {
      await deleteDoc(doc(db, "users", organizationId, "availability", dateStr));
      setAvailability((prev) => prev.filter((a) => a.date !== dateStr));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error clearing availability:", error);
    } finally {
      setSaving(false);
    }
  };

  const datesWithAvailability = availability.map((a) => new Date(a.date));
  const selectedDayData = getSelectedDateAvailability();
  const selectedEventType = eventTypes.find((e) => e.id === selectedEventTypeId);
  const preselectedEventType = eventTypes.find((e) => e.id === preselectedEventId);
  const newSlotStartTime = formatTimeFromParts(startHour, startMinute);
  const newSlotEndTime = formatTimeFromParts(endHour, endMinute);
  const calculatedDuration = getMinutesBetween(newSlotStartTime, newSlotEndTime);

  const saveOrganizationName = async () => {
    if (!organizationId) return;
    setSavingOrg(true);
    try {
      await updateDoc(doc(db, "users", organizationId), {
        organizationName: organizationName.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving organization name:", error);
    } finally {
      setSavingOrg(false);
    }
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!organizationId) return null;

  return (
    <div className="min-h-screen bg-[#050507] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
      
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pt-24 sm:pt-28">
        {/* Contextual Banner for Event Flow */}
        {preselectedEventType && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-4 sm:p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm sm:text-base text-white font-semibold">
                Set availability for &quot;{preselectedEventType.title}&quot;
              </p>
              <p className="text-xs sm:text-sm text-white/50">
                Select dates on the calendar and add time slots for this event type.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Availability</h1>
                <p className="text-sm sm:text-base text-white/50">Configure your schedule</p>
              </div>
            </div>
            <button
              onClick={() => setShowCompletedPopup(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </button>
          </div>
        </div>

        {/* Organization Name Section */}
        <div className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
            <h2 className="text-base sm:text-lg font-semibold text-white">Organization Name</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/40 mb-4">
            This name will be shown to applicants instead of your personal name
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g., Acme Corporation, TechStart Inc."
              className="flex-1 h-11 sm:h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            <button
              onClick={saveOrganizationName}
              disabled={savingOrg}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50"
            >
              {savingOrg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Calendar Card */}
          <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-white/10">
              <div className="flex items-center gap-2 sm:gap-3">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                <h2 className="text-base sm:text-lg font-semibold text-white">Select Date</h2>
              </div>
              <p className="text-xs sm:text-sm text-white/40 mt-1">Green dates have slots configured</p>
            </div>
            
            <DarkCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              highlightedDates={datesWithAvailability}
            />
          </div>

          {/* Time Slots Card */}
          <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-white">
                      {selectedDate ? format(selectedDate, "EEE, MMM d") : "Time Slots"}
                    </h2>
                    <p className="text-xs sm:text-sm text-white/40">
                      {selectedDate ? "Manage availability" : "Select a date first"}
                    </p>
                  </div>
                </div>
                {saving && <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />}
                {saved && <Check className="w-5 h-5 text-emerald-400" />}
              </div>
            </div>

            <div className="p-6">
              {!selectedDate ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="w-10 h-10 text-white/20" />
                  </div>
                  <p className="text-white/40">Select a date from the calendar</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Add New Slot */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-5">
                    <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Add Time Slot
                    </h4>
                    
                    {/* Event Type Selection - Required */}
                    <div>
                      <label className="text-xs text-white/50 mb-3 block">Event Type *</label>
                      {eventTypes.length > 0 ? (
                        <div className="relative">
                          <select
                            value={selectedEventTypeId}
                            onChange={(e) => setSelectedEventTypeId(e.target.value)}
                            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 pr-10 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-[#0a0a0f]">Select an event type</option>
                            {eventTypes.map((eventType) => (
                              <option key={eventType.id} value={eventType.id} className="bg-[#0a0a0f]">
                                {eventType.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                          <p className="mb-2">You need to create an event type first</p>
                          <Link href="/events" className="text-xs text-amber-300 hover:text-amber-200 font-medium">
                            Go to Events →
                          </Link>
                        </div>
                      )}
                    </div>
                    
                    {/* Time Selection - Start & End */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-white/50 mb-3 block">Start Time</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={startHour}
                              onChange={(e) => setStartHour(e.target.value)}
                              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 pr-8 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer text-center"
                            >
                              {HOURS.map((hour) => (
                                <option key={hour} value={hour} className="bg-[#0a0a0f]">
                                  {hour}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                          </div>
                          <span className="text-white/50 text-lg font-bold">:</span>
                          <div className="relative flex-1">
                            <select
                              value={startMinute}
                              onChange={(e) => setStartMinute(e.target.value)}
                              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 pr-8 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer text-center"
                            >
                              {MINUTES.map((minute) => (
                                <option key={minute} value={minute} className="bg-[#0a0a0f]">
                                  {minute}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-white/50 mb-3 block">End Time</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={endHour}
                              onChange={(e) => setEndHour(e.target.value)}
                              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 pr-8 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer text-center"
                            >
                              {HOURS.map((hour) => (
                                <option key={hour} value={hour} className="bg-[#0a0a0f]">
                                  {hour}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                          </div>
                          <span className="text-white/50 text-lg font-bold">:</span>
                          <div className="relative flex-1">
                            <select
                              value={endMinute}
                              onChange={(e) => setEndMinute(e.target.value)}
                              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 pr-8 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer text-center"
                            >
                              {MINUTES.map((minute) => (
                                <option key={minute} value={minute} className="bg-[#0a0a0f]">
                                  {minute}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview & Add */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-8 rounded-full"
                          style={{ backgroundColor: selectedEventType?.color || "#8b5cf6" }}
                        />
                        <div>
                          <p className="text-white font-semibold">
                            {newSlotStartTime} → {newSlotEndTime}
                          </p>
                          <p className="text-xs text-white/40">
                            {calculatedDuration > 0 ? `${calculatedDuration} minutes` : "Invalid time range"}
                            {selectedEventType && ` • ${selectedEventType.title}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={addTimeSlot}
                        disabled={saving || calculatedDuration <= 0}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Existing Slots */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                        Scheduled ({selectedDayData?.slots.length || 0})
                      </h4>
                      {selectedDayData && selectedDayData.slots.length > 0 && (
                        <button
                          onClick={clearDayAvailability}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear all
                        </button>
                      )}
                    </div>

                    {!selectedDayData || selectedDayData.slots.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-2xl">
                        <Clock className="w-8 h-8 mx-auto mb-3 text-white/20" />
                        <p className="text-white/40 text-sm">No slots for this day</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDayData.slots.map((slot) => {
                          const slotEventType = slot.eventTypeId ? eventTypes.find((e) => e.id === slot.eventTypeId) : null;
                          return (
                            <div
                              key={slot.id}
                              className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200"
                            >
                              <div className="flex items-center gap-4">
                                <div 
                                  className="w-1.5 h-12 rounded-full"
                                  style={{ backgroundColor: slotEventType?.color || "#8b5cf6" }}
                                />
                                <div>
                                  <p className="text-white font-semibold text-lg">
                                    {slot.startTime} - {slot.endTime}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white/70">
                                      {slot.duration} min
                                    </span>
                                    {slotEventType && (
                                      <span 
                                        className="inline-block px-2 py-0.5 rounded-md text-xs font-medium text-white"
                                        style={{ backgroundColor: `${slotEventType.color}40` }}
                                      >
                                        {slotEventType.title}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => removeTimeSlot(slot.id)}
                                className="w-10 h-10 rounded-xl bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completed Popup Modal - Event-specific booking links */}
      {showCompletedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCompletedPopup(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#0a0a12] border border-white/10 shadow-2xl shadow-violet-500/10 p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Share Booking Link with Applicant
              </h3>
              <p className="text-sm sm:text-base text-white/50">
                Copy the booking link for the specific event type you want to share.
              </p>
            </div>

            {eventTypes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/40 mb-4">No event types created yet</p>
                <Link href="/events">
                  <button className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/30 transition-all">
                    Create Event Types →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {eventTypes.map((eventType) => (
                  <div
                    key={eventType.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: eventType.color || "#8b5cf6" }}
                      />
                      <span className="font-semibold text-white">{eventType.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-xs text-white/60 truncate">
                        {typeof window !== "undefined" ? window.location.origin : ""}/book/{organizationId}/{eventType.slug}
                      </div>
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/book/${organizationId}/${eventType.slug}`;
                          navigator.clipboard.writeText(link);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-3 py-2 rounded-lg bg-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/30 transition-all flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowCompletedPopup(false)}
              className="w-full mt-4 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium text-sm hover:bg-white/10 hover:text-white transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050507] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AvailabilityContent />
    </Suspense>
  );
}
