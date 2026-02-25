"use client";

import { ReactNode, useEffect } from "react";
import { AuthProvider } from "@/contexts/auth-context";

// Component to unregister service workers in development
function ServiceWorkerUnregister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().then((success) => {
              if (success) {
                console.log('Service worker unregistered');
              }
            });
          });
        });
      }
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerUnregister />
      {children}
    </AuthProvider>
  );
}
