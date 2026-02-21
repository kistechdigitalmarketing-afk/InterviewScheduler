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

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-white/70">Find your perfect interviewer</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Book an Interview</h1>
          <p className="text-white/50 text-lg">
            Choose an interviewer and schedule a time that works for you
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search interviewers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pl-14 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all text-lg"
          />
        </div>

        {/* Interviewers List */}
        {filteredInterviewers.length === 0 ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No interviewers found</h3>
            <p className="text-white/40">
              {search
                ? "Try a different search term"
                : "No interviewers are available at the moment"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInterviewers.map((interviewer) => (
              <Link
                key={interviewer.uid}
                href={`/book/${interviewer.uid}`}
                className="block"
              >
                <div className="group rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 hover:border-violet-500/50 hover:bg-white/[0.07] transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-5">
                    <Avatar className="h-16 w-16 ring-2 ring-white/10 group-hover:ring-violet-500/30 transition-all">
                      <AvatarImage src={interviewer.image || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xl">
                        {(interviewer.name || interviewer.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-white group-hover:text-violet-300 transition-colors">
                        {interviewer.name || interviewer.email}
                      </h3>
                      <p className="text-white/40 text-sm">{interviewer.email}</p>
                      
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          interviewer.hasAvailability 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-white/10 text-white/40"
                        }`}>
                          {interviewer.hasAvailability ? "Available" : "No availability set"}
                        </span>
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-violet-500/20 flex items-center justify-center transition-all">
                      <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
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
