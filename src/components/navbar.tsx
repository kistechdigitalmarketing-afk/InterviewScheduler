"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Calendar, LogOut, Settings, LayoutDashboard, Menu, X, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";

export function Navbar() {
  const { user, userData, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Hide navbar on booking pages (for applicants)
  if (pathname?.startsWith("/book/")) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050507]/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            ) : (
              <>
                <Link href="/dashboard">
                  <button className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                </Link>
                <Link href="/events">
                  <button className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Events
                  </button>
                </Link>
                <Link href="/availability">
                  <button className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Availability
                  </button>
                </Link>
                {user && (
                  <div className="flex items-center gap-3 pl-4 ml-2 border-l border-white/10">
                    <Avatar className="h-8 w-8 ring-2 ring-white/10">
                      <AvatarImage src={userData?.image || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
                        {userData?.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => signOut()}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 flex items-center justify-center transition-all duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
              </Link>
              <Link href="/events" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Events
                </button>
              </Link>
              <Link href="/availability" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Availability
                </button>
              </Link>
              {user && (
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
