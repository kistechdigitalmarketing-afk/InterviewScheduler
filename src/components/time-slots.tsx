"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: string;
  formatted: string;
}

interface TimeSlotsProps {
  slots: TimeSlot[];
  selected?: string;
  onSelect?: (time: string) => void;
  loading?: boolean;
  className?: string;
}

export function TimeSlots({
  slots,
  selected,
  onSelect,
  loading,
  className,
}: TimeSlotsProps) {
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-slate-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-slate-500">No available slots for this day</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 max-h-[400px] overflow-y-auto pr-2", className)}>
      {slots.map((slot) => (
        <button
          key={slot.time}
          onClick={() => onSelect?.(slot.time)}
          className={cn(
            "w-full h-12 rounded-lg border-2 text-sm font-semibold transition-all duration-200",
            selected === slot.time
              ? "border-violet-500 bg-violet-50 text-violet-700"
              : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 text-slate-700"
          )}
        >
          {slot.formatted}
        </button>
      ))}
    </div>
  );
}
