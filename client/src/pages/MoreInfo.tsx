import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function MoreInfo() {
  const [, setLocation] = useLocation();

  // Calculate days until CMC - dynamic counter that updates
  const [daysUntilCMC, setDaysUntilCMC] = useState(() => {
    const cmcDate = new Date("2026-07-06");
    const today = new Date();
    return Math.abs(
      Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );
  });

  useEffect(() => {
    const updateDaysUntilCMC = () => {
      const cmcDate = new Date("2026-07-06");
      const today = new Date();
      const days = Math.abs(
        Math.ceil((cmcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );
      setDaysUntilCMC(days);
    };

    updateDaysUntilCMC();
    const interval = setInterval(updateDaysUntilCMC, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle ESC key to navigate back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocation("/");
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Map
        </Button>

        {/* Hero Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="relative h-[300px]">
            <img
              src="/cmc-2026-hero.png"
              alt="CMC 2026"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h1 className="text-5xl font-bold mb-2 drop-shadow-lg">
                CMC 2026
              </h1>
              <p className="text-xl drop-shadow-md">
                Campus Missions Conference
              </p>
              <div className="mt-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur-sm">
                {daysUntilCMC} days until CMC
              </div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Event Details
          </h2>

          <div className="space-y-6">
            {/* Date & Time */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Date & Time
                </h3>
                <p className="text-gray-700">Monday, July 6, 2026 • 12:00am</p>
                <p className="text-gray-700">to</p>
                <p className="text-gray-700">
                  Friday, July 10, 2026 • 11:30pm CDT
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Location
                </h3>
                <p className="text-blue-600 font-semibold text-lg">
                  Arizona Grand Resort
                </p>
                <p className="text-gray-700">8000 South Arizona Grand E</p>
                <p className="text-gray-700">Phoenix, AZ 85044</p>
              </div>
            </div>
          </div>
        </div>

        {/* About CMC */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">About CMC</h2>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-4">
              The Campus Missions Conference (CMC) is Chi Alpha's premier annual
              gathering, bringing together students, staff, and leaders from
              across the nation for a transformative week of worship, teaching,
              and mission mobilization.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="flex items-start gap-3">
                <Users className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Who Should Attend
                  </h4>
                  <p className="text-gray-600 text-sm">
                    College students, campus missionaries, directors, and anyone
                    passionate about reaching campuses for Christ.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Registration
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Early bird registration opens soon. Contact your campus
                    director for group rates and scholarship opportunities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
