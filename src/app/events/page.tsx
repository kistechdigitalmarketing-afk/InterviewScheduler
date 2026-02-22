"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Calendar,
  Clock,
  Loader2,
  Check,
  Plus,
  X,
  Trash2,
  Sparkles,
  FileText,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventType {
  id: string;
  title: string;
  slug: string;
  description: string;
  color: string;
  isActive: boolean;
}

const COLORS = [
  { value: "#6366f1", name: "Indigo" },
  { value: "#8b5cf6", name: "Violet" },
  { value: "#d946ef", name: "Fuchsia" },
  { value: "#ec4899", name: "Pink" },
  { value: "#f43f5e", name: "Rose" },
  { value: "#ef4444", name: "Red" },
  { value: "#f97316", name: "Orange" },
  { value: "#eab308", name: "Yellow" },
  { value: "#22c55e", name: "Green" },
  { value: "#14b8a6", name: "Teal" },
  { value: "#06b6d4", name: "Cyan" },
  { value: "#3b82f6", name: "Blue" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function EventsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    color: "#6366f1",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!authLoading && userData?.role !== "INTERVIEWER") {
      router.push("/dashboard");
    }
  }, [authLoading, user, userData, router]);

  useEffect(() => {
    const fetchEventTypes = async () => {
      if (!user) return;

      try {
        const eventTypesRef = collection(db, "users", user.uid, "eventTypes");
        const snapshot = await getDocs(eventTypesRef);

        const eventTypesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EventType[];

        setEventTypes(eventTypesData);
      } catch (error) {
        console.error("Error fetching event types:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && userData?.role === "INTERVIEWER") {
      fetchEventTypes();
    }
  }, [user, userData]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      color: "#6366f1",
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleEdit = (eventType: EventType) => {
    setFormData({
      title: eventType.title,
      description: eventType.description || "",
      color: eventType.color,
    });
    setEditingEvent(eventType);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim()) return;

    setSaving(true);

    try {
      const eventId = editingEvent?.id || generateId();
      const slug = generateSlug(formData.title);

      const eventData: Omit<EventType, "id"> = {
        title: formData.title.trim(),
        slug,
        description: formData.description.trim(),
        color: formData.color,
        isActive: true,
      };

      await setDoc(doc(db, "users", user.uid, "eventTypes", eventId), eventData);

      if (editingEvent) {
        setEventTypes((prev) =>
          prev.map((e) => (e.id === eventId ? { id: eventId, ...eventData } : e))
        );
      } else {
        setEventTypes((prev) => [...prev, { id: eventId, ...eventData }]);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      resetForm();
    } catch (error) {
      console.error("Error saving event type:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this event type?")) return;

    setSaving(true);

    try {
      await deleteDoc(doc(db, "users", user.uid, "eventTypes", eventId));
      setEventTypes((prev) => prev.filter((e) => e.id !== eventId));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error deleting event type:", error);
    } finally {
      setSaving(false);
    }
  };

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
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pt-20 sm:pt-24">
        {/* Header */}
        <div className="mb-6 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Event Types
              </h1>
              <p className="text-sm sm:text-base text-white/50">
                Create interview types for applicants to book
              </p>
            </div>
          </div>
        </div>

        {/* Add New Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Event Type
          </button>
        )}

        {/* Form */}
        {showForm && (
          <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden mb-6 sm:mb-8">
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  {editingEvent ? "Edit Event Type" : "New Event Type"}
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-white/70 mb-2 block">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Technical Interview, HR Screening"
                  className="w-full h-11 sm:h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-white/70 mb-2 block">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what this interview type is about..."
                  className="w-full min-h-[100px] rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-white/70 mb-3 block">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: color.value })
                      }
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all duration-200",
                        formData.color === color.value
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#050507] scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.title.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingEvent ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Event Types List */}
        <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-white/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Your Event Types ({eventTypes.length})
              </h2>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {eventTypes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 mb-2">No event types yet</p>
                <p className="text-white/30 text-sm">
                  Create your first event type to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventTypes.map((eventType) => (
                  <div
                    key={eventType.id}
                    className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-3 h-12 rounded-full"
                        style={{ backgroundColor: eventType.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          {eventType.title}
                        </h3>
                        {eventType.description && (
                          <p className="text-white/40 text-sm mt-0.5 line-clamp-1">
                            {eventType.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-white/40">
                            /{eventType.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleEdit(eventType)}
                        className="px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-sm font-medium transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(eventType.id)}
                        className="w-9 h-9 rounded-lg bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
