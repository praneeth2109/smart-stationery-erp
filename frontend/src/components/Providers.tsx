"use client";

import { AuthProvider } from "@/hooks/useAuth";
import SplashIntro from "@/components/SplashIntro";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SplashIntro />
      {children}
    </AuthProvider>
  );
}
