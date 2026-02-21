"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isSameDay } from "date-fns";
import { Clock, Loader2, Check, Plus, X, Trash2, CalendarDays, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

const DURATIONS = [
  { value: 15, label: "15 min", color: "from-cyan-500 to-blue-500" },
  { value: 30, label: "30 min", color: "from-violet-500 to-purple-500" },
  { value: 60, label: "60 min", color: "from-rose-500 to-pink-500" },
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">
          {format(currentMonth, "MMMM yyyy")}
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

export default function AvailabilityPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newSlotTime, setNewSlotTime] = useState("09:00");
  const [newSlotDuration, setNewSlotDuration] = useState(30);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!authLoading && userData?.role !== "INTERVIEWER") {
      router.push("/dashboard");
    }
  }, [authLoading, user, userData, router]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!user) return;

      try {
        const availabilityRef = collection(db, "users", user.uid, "availability");
        const snapshot = await getDocs(availabilityRef);
        
        const availabilityData = snapshot.docs.map((doc) => ({
          date: doc.id,
          slots: doc.data().slots || [],
        })) as DayAvailability[];
        
        setAvailability(availabilityData);
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && userData?.role === "INTERVIEWER") {
      fetchAvailability();
    }
  }, [user, userData]);

  const getSelectedDateAvailability = (): DayAvailability | undefined => {
    if (!selectedDate) return undefined;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return availability.find((a) => a.date === dateStr);
  };

  const addTimeSlot = async () => {
    if (!user || !selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const endTime = addMinutesToTime(newSlotTime, newSlotDuration);
    
    const newSlot: TimeSlot = {
      id: generateId(),
      startTime: newSlotTime,
      endTime,
      duration: newSlotDuration,
    };

    const existingDay = availability.find((a) => a.date === dateStr);
    const existingSlots = existingDay?.slots || [];
    
    const hasOverlap = existingSlots.some((slot) => {
      return (
        (newSlotTime >= slot.startTime && newSlotTime < slot.endTime) ||
        (endTime > slot.startTime && endTime <= slot.endTime) ||
        (newSlotTime <= slot.startTime && endTime >= slot.endTime)
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

      await setDoc(doc(db, "users", user.uid, "availability", dateStr), {
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
    if (!user || !selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const existingDay = availability.find((a) => a.date === dateStr);
    if (!existingDay) return;

    setSaving(true);

    try {
      const updatedSlots = existingDay.slots.filter((s) => s.id !== slotId);

      if (updatedSlots.length === 0) {
        await deleteDoc(doc(db, "users", user.uid, "availability", dateStr));
        setAvailability((prev) => prev.filter((a) => a.date !== dateStr));
      } else {
        await setDoc(doc(db, "users", user.uid, "availability", dateStr), {
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
    if (!user || !selectedDate) return;
    if (!confirm("Clear all slots for this day?")) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setSaving(true);

    try {
      await deleteDoc(doc(db, "users", user.uid, "availability", dateStr));
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
  const selectedDuration = DURATIONS.find((d) => d.value === newSlotDuration);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || userData?.role !== "INTERVIEWER") return null;

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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Availability</h1>
              <p className="text-white/50">Configure your interview schedule</p>
            </div>
          </div>
          
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Calendar Card */}
          <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">Select Date</h2>
              </div>
              <p className="text-sm text-white/40 mt-1">Green dates have slots configured</p>
            </div>
            
            <DarkCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              highlightedDates={datesWithAvailability}
            />
          </div>

          {/* Time Slots Card */}
          <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-violet-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Time Slots"}
                    </h2>
                    <p className="text-sm text-white/40">
                      {selectedDate ? "Manage your availability" : "Select a date first"}
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
                    
                    {/* Time Selection */}
                    <div>
                      <label className="text-xs text-white/50 mb-3 block">Start Time</label>
                      <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                        {TIME_OPTIONS.map((time) => (
                          <button
                            key={time}
                            onClick={() => setNewSlotTime(time)}
                            className={cn(
                              "px-2 py-2 text-xs rounded-lg font-medium transition-all duration-200",
                              newSlotTime === time
                                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                            )}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration Selection */}
                    <div>
                      <label className="text-xs text-white/50 mb-3 block">Duration</label>
                      <div className="grid grid-cols-3 gap-3">
                        {DURATIONS.map((dur) => (
                          <button
                            key={dur.value}
                            onClick={() => setNewSlotDuration(dur.value)}
                            className={cn(
                              "px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200",
                              newSlotDuration === dur.value
                                ? `bg-gradient-to-r ${dur.color} text-white shadow-lg`
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                            )}
                          >
                            {dur.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview & Add */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-8 rounded-full bg-gradient-to-b",
                          selectedDuration?.color || "from-violet-500 to-fuchsia-500"
                        )} />
                        <div>
                          <p className="text-white font-semibold">
                            {newSlotTime} → {addMinutesToTime(newSlotTime, newSlotDuration)}
                          </p>
                          <p className="text-xs text-white/40">{newSlotDuration} minutes</p>
                        </div>
                      </div>
                      <button
                        onClick={addTimeSlot}
                        disabled={saving}
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
                          const duration = DURATIONS.find((d) => d.value === slot.duration);
                          return (
                            <div
                              key={slot.id}
                              className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200"
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-1.5 h-12 rounded-full bg-gradient-to-b",
                                  duration?.color || "from-violet-500 to-fuchsia-500"
                                )} />
                                <div>
                                  <p className="text-white font-semibold text-lg">
                                    {slot.startTime} - {slot.endTime}
                                  </p>
                                  <span className={cn(
                                    "inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r text-white mt-1",
                                    duration?.color || "from-violet-500 to-fuchsia-500"
                                  )}>
                                    {slot.duration} min
                                  </span>
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
