"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const { isOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "reconnected" message briefly
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline]);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium transition-all duration-300 ${
        isOffline
          ? "bg-amber-500 text-white"
          : "bg-green-500 text-white"
      }`}
      role="alert"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <span>אין חיבור לאינטרנט - חלק מהפעולות לא יעבדו</span>
        </>
      ) : (
        <>
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>החיבור חזר!</span>
        </>
      )}
    </div>
  );
}
