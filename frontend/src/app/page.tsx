"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center font-ledger text-xs text-steel-400">
      Loading RR Stationery ERP...
    </div>
  );
}
