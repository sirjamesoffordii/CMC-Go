import { useLocation } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function WhyInvitationsMatter() {
  const [, setLocation] = useLocation();
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Handle ESC key to close modal or navigate back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If doc modal is open, close it first
        if (isDocModalOpen) {
          setIsDocModalOpen(false);
          e.preventDefault();
          return;
        }
        // Otherwise, navigate back to home
        setLocation("/");
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDocModalOpen, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 md:p-12">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6 sm:mb-8">
            What is CMC Go?
          </h1>

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-8 sm:mb-10">
            <p className="text-lg sm:text-xl text-slate-700 leading-relaxed">
              CMC Go as a way to coordinate toward CMC. It's a
              map-first web app that replaces spreadsheets with a shared visual,
              helping leaders at every level see who's been personally invited,
              surfacing who needs support, and bringing clarity to each person's
              decision journey.
            </p>
          </div>

          <div className="mb-8 sm:mb-10 border-t border-slate-200 pt-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-4">
              Why Personal Invitations Still Matter
            </h2>
            <p className="text-lg sm:text-xl text-slate-700 leading-relaxed">
              Inviting people personally ensures that people not only know about
              an opportunity, but understand why it matters. It brings clarity
              around where they are in the decision process and what support or
              steps they need to move forward, and most of all, it communicates
              to them that they matter.
            </p>
          </div>

          {/* Section Title */}
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-6 sm:mb-8 border-b border-slate-200 pb-3">
            A healthy invitation should include...
          </h2>

          {/* Points */}
          <div className="space-y-8 sm:space-y-10">
            {/* Point 1 */}
            <div className="border-l-4 border-red-600 pl-4 sm:pl-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3 sm:mb-4">
                1. Why them attending CMC matters
              </h3>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
                Share why you believe CMC would be meaningful for this person,
                and meaningful to Chi Alpha. For me, its tied to{" "}
                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
                >
                  The Word God Gave Me For CMC
                </button>
              </p>
            </div>

            {/* Point 2 */}
            <div className="border-l-4 border-red-600 pl-4 sm:pl-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3 sm:mb-4">
                2. Event details
              </h3>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-3 sm:mb-4">
                Share the practical information they need to make a real
                decision:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base sm:text-lg text-slate-700 ml-4">
                <li>Location</li>
                <li>Dates</li>
                <li>Cost</li>
              </ul>
            </div>

            {/* Point 3 */}
            <div className="border-l-4 border-red-600 pl-4 sm:pl-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3 sm:mb-4">
                3. Potential needs and support
              </h3>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-3 sm:mb-4">
                Name what might make this difficult and let them know support
                may be available and that they don't have to figure this out
                alone.
              </p>
              <ul className="list-disc list-inside space-y-2 text-base sm:text-lg text-slate-700 ml-4">
                <li>Financial concerns</li>
                <li>Transportation</li>
                <li>Scheduling conflicts</li>
              </ul>
            </div>

            {/* Point 4 */}
            <div className="border-l-4 border-red-600 pl-4 sm:pl-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3 sm:mb-4">
                4. Invite them and ask for a response
              </h3>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-3 sm:mb-4">
                Make the invitation clear and ask them for a response.
              </p>
              <div className="bg-slate-50 rounded-r-lg p-4 sm:p-6 my-4 sm:my-6">
                <p className="text-lg sm:text-xl font-medium text-slate-900 italic">
                  "So, where are you at right now?"
                </p>
              </div>
            </div>

            {/* Point 5 */}
            <div className="border-l-4 border-red-600 pl-4 sm:pl-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3 sm:mb-4">
                5. Personal warmth and sincerity
              </h3>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-3 sm:mb-4">
                Let them know:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base sm:text-lg text-slate-700 ml-4">
                <li>you'd genuinely love to have them there</li>
                <li>regardless of their response, the relationship matters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Google Doc Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85dvh] sm:h-[90vh] flex flex-col max-h-[calc(100dvh-16px)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2">
              <h2 className="text-base sm:text-xl font-semibold text-slate-900 truncate">
                The Word God Gave Me For CMC
              </h2>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content - Google Doc iframe */}
            <div className="flex-1 overflow-hidden min-h-0">
              <iframe
                src="https://docs.google.com/document/d/1vo23ldjIphJSz7tvj8h3FQoAtREvzUh31A5zJ__M81I/preview?usp=sharing&embedded=true"
                className="w-full h-full border-0"
                title="The Word God Gave Me For CMC"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
