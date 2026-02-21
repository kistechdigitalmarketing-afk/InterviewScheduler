"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabledDays?: number[];
  highlightedDates?: Date[];
  className?: string;
  allowPastDates?: boolean;
}

export function Calendar({
  selected,
  onSelect,
  disabledDays = [],
  highlightedDates = [],
  className,
  allowPastDates = true,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDay).fill(null);

  const isDisabled = (date: Date) => {
    const dayOfWeek = date.getDay();
    const isPastDate = !allowPastDates && isBefore(date, startOfDay(new Date()));
    return disabledDays.includes(dayOfWeek) || isPastDate;
  };

  const isHighlighted = (date: Date) => {
    return highlightedDates.some((d) => isSameDay(d, date));
  };

  return (
    <div className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-slate-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="h-10" />
        ))}
        {days.map((day) => {
          const disabled = isDisabled(day);
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentDay = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const highlighted = isHighlighted(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !disabled && onSelect?.(day)}
              disabled={disabled}
              className={cn(
                "h-10 w-full rounded-lg text-sm font-medium transition-all duration-200 relative",
                isCurrentMonth ? "text-slate-900" : "text-slate-300",
                disabled && "text-slate-300 cursor-not-allowed",
                !disabled && !isSelected && "hover:bg-violet-50",
                isSelected &&
                  "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25",
                isCurrentDay && !isSelected && "ring-2 ring-violet-500 ring-offset-2",
                highlighted && !isSelected && "bg-emerald-100 text-emerald-700 font-semibold"
              )}
            >
              {format(day, "d")}
              {highlighted && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
