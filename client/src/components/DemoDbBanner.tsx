/**
 * Demo DB Banner Component
 * 
 * Displays a banner when connected to Railway staging demo DB.
 * Only shown in development (never in production).
 */

import { useEffect, useState } from "react";

export function DemoDbBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [connectionPath, setConnectionPath] = useState<string | null>(null);

  useEffect(() => {
    // Only check in development - never show in production
    if (import.meta.env.PROD || import.meta.env.MODE === "production") {
      return;
    }

    // Check if connected to demo DB via API
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        // Show banner if connected to demo DB (ok: true and isDemoDb or connectionPath exists)
        if (data.ok && (data.isDemoDb || data.connectionPath)) {
          setShowBanner(true);
          if (data.connectionPath) {
            setConnectionPath(data.connectionPath);
          }
        }
      })
      .catch(() => {
        // Silently fail - banner is non-critical
      });
  }, []);

  if (!showBanner) {
    return null;
  }

  const pathText = connectionPath === 'proxy' ? 'PUBLIC PROXY' : 
                  connectionPath === 'internal' ? 'INTERNAL' : '';

  return (
    <div className="bg-yellow-500 text-black text-center py-2 px-4 text-sm font-semibold border-b border-yellow-600 z-50 sticky top-0">
      <div>⚠️ CONNECTED TO RAILWAY STAGING DEMO DB</div>
      {pathText && <div className="text-xs mt-1">Connection path: {pathText}</div>}
    </div>
  );
}
