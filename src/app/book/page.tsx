"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Clock, ArrowRight, User, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Interviewer {
  uid: string;
  name: string | null;
  email: string;
  image: string | null;
  hasAvailability: boolean;
}

export default function BookPage() {
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchInterviewers = async () => {
      try {
        const usersRef = collection(db, "users");
        const interviewersQuery = query(usersRef, where("role", "==", "INTERVIEWER"));
        const usersSnapshot = await getDocs(interviewersQuery);

        const interviewersData: Interviewer[] = [];

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          
          // Check if interviewer has any availability set
          const availabilityRef = collection(db, "users", userDoc.id, "availability");
          const availabilitySnapshot = await getDocs(availabilityRef);
          const hasAvailability = availabilitySnapshot.docs.length > 0;

          interviewersData.push({
            uid: userDoc.id,
            name: userData.name,
            email: userData.email,
            image: userData.image,
            hasAvailability,
          });
        }

        setInterviewers(interviewersData);
      } catch (error) {
        console.error("Error fetching interviewers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewers();
  }, []);

  const filteredInterviewers = interviewers.filter(
    (interviewer) =>
      interviewer.name?.toLowerCase().includes(search.toLowerCase()) ||
      interviewer.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
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

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 pt-20 sm:pt-24">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
            <span className="text-white/70">Find your perfect interviewer</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-4">Book an Interview</h1>
          <p className="text-white/50 text-sm sm:text-lg px-4 sm:px-0">
            Choose an interviewer and schedule a time
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 sm:mb-10">
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search interviewers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 pl-11 sm:pl-14 pr-4 sm:pr-6 text-white text-sm sm:text-lg placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>

        {/* Interviewers List */}
        {filteredInterviewers.length === 0 ? (
          <div className="rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/20" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No interviewers found</h3>
            <p className="text-sm sm:text-base text-white/40">
              {search
                ? "Try a different search term"
                : "No interviewers are available at the moment"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredInterviewers.map((interviewer) => (
              <Link
                key={interviewer.uid}
                href={`/book/${interviewer.uid}`}
                className="block"
              >
                <div className="group rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 sm:p-6 hover:border-violet-500/50 hover:bg-white/[0.07] transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 sm:gap-5">
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-white/10 group-hover:ring-violet-500/30 transition-all">
                      <AvatarImage src={interviewer.image || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-base sm:text-xl">
                        {(interviewer.name || interviewer.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-xl text-white group-hover:text-violet-300 transition-colors truncate">
                        {interviewer.name || interviewer.email}
                      </h3>
                      <p className="text-white/40 text-xs sm:text-sm truncate">{interviewer.email}</p>
                      
                      <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium ${
                          interviewer.hasAvailability 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-white/10 text-white/40"
                        }`}>
                          {interviewer.hasAvailability ? "Available" : "No availability"}
                        </span>
                      </div>
                    </div>

                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 group-hover:bg-violet-500/20 flex items-center justify-center transition-all flex-shrink-0">
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/30 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
