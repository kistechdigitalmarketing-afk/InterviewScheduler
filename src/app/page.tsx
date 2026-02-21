"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Users,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

// Custom hook for scroll animations
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = ref.current?.querySelectorAll(
      ".animate-on-scroll, .stagger-children, .animate-scale-in, .animate-slide-left, .animate-slide-right"
    );
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
}

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description:
      "Set your availability once and let applicants book time slots that work for both parties.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Clock,
    title: "Time Zone Aware",
    description:
      "Automatic time zone detection ensures everyone sees the correct meeting times.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Multiple interviewers can manage their schedules independently on one platform.",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    icon: Zap,
    title: "Instant Confirmation",
    description:
      "Automatic confirmations and reminders keep everyone on the same page.",
    gradient: "from-amber-500 to-orange-500",
  },
];

const benefits = [
  "No more back-and-forth emails",
  "Reduce no-shows with reminders",
  "Professional booking experience",
  "Works with your calendar",
];

export default function HomePage() {
  const { user } = useAuth();
  const scrollRef = useScrollAnimation();

  return (
    <div ref={scrollRef} className="min-h-screen bg-[#050507] text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/30 via-[#050507] to-[#050507]" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
              <span className="text-white/70">Scheduling made simple</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold tracking-tight mb-6 sm:mb-8 leading-[0.95] sm:leading-[0.9]">
              Schedule interviews
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
                without the hassle
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/50 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Connect interviewers and applicants with a seamless
              booking experience. Set your availability, share your link, and let
              the scheduling happen automatically.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16 px-4 sm:px-0">
              {user ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <button className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-base sm:text-lg hover:shadow-2xl hover:shadow-violet-500/30 transition-all duration-300 flex items-center justify-center gap-3">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              ) : (
                <>
                  <Link href="/register" className="w-full sm:w-auto">
                    <button className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-base sm:text-lg hover:shadow-2xl hover:shadow-violet-500/30 transition-all duration-300 flex items-center justify-center gap-3">
                      Get Started Free
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                  <Link href="/book" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base sm:text-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                      Book an Interview
                    </button>
                  </Link>
                </>
              )}
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-4 sm:gap-8 px-4 sm:px-0">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-white/40">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating elements - hidden on mobile */}
        <div className="hidden md:flex absolute top-40 left-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 backdrop-blur-sm items-center justify-center animate-float">
          <Calendar className="w-8 h-8 text-violet-400" />
        </div>
        <div className="hidden md:flex absolute top-60 right-20 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 backdrop-blur-sm items-center justify-center animate-float" style={{ animationDelay: "2s" }}>
          <Clock className="w-6 h-6 text-cyan-400" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20 animate-on-scroll">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 px-4 sm:px-0">
              Everything you need for
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
                seamless scheduling
              </span>
            </h2>
            <p className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto px-4 sm:px-0">
              Powerful features designed to make interview scheduling effortless
              for both interviewers and applicants.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 stagger-children">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-500"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-white">{feature.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
                
                {/* Hover glow effect */}
                <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 -z-10`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20 animate-on-scroll">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6">
              How it <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">works</span>
            </h2>
            <p className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto px-4 sm:px-0">
              Get started in minutes with our simple three-step process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 stagger-children">
            {[
              {
                step: "01",
                title: "Set Your Availability",
                description: "Interviewers define their available hours for different interview formats.",
                gradient: "from-violet-500 to-purple-500",
              },
              {
                step: "02",
                title: "Share Your Link",
                description: "Share your unique booking link with applicants or embed it on your careers page.",
                gradient: "from-fuchsia-500 to-pink-500",
              },
              {
                step: "03",
                title: "Get Booked",
                description: "Applicants pick a time that works for them, and both parties receive instant confirmation.",
                gradient: "from-orange-500 to-amber-500",
              },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                {index < 2 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent -translate-x-1/2" />
                )}
                <div className={`inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${item.gradient} text-white text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 lg:mb-8 shadow-2xl`}>
                  {item.step}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 text-white">{item.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm sm:text-base">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] p-8 sm:p-12 lg:p-24 animate-scale-in">
            {/* Background */}
            <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem]" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aC0ydi00aDJ2NHptMC02di00aC0ydjRoMnptLTYgNmgtNHYyaDR2LTJ6bTAtNmgtNHYyaDR2LTJ6bTAtNmgtNHYyaDR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            
            <div className="relative text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
                Ready to streamline
                <br />
                your interviews?
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-white/50 mb-8 sm:mb-12 max-w-2xl mx-auto px-4 sm:px-0">
                Join thousands of companies scheduling interviews efficiently.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link href="/register" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-base sm:text-lg hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300">
                    Start for Free
                  </button>
                </Link>
                <Link href="/book" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-base sm:text-lg hover:bg-white/10 transition-all duration-300">
                    Browse Interviewers
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/30">
              © 2026 All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
