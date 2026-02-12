import { MenuPanel } from "@/components/ui/menu-panel";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { X } from "lucide-react";

interface WhatIsCmcGoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "What is CMC Go?" panel — shown via hamburger menu or toolbar button.
 * Consistent MenuPanel layout: white/black/red accent.
 */
export function WhatIsCmcGoPanel({ open, onOpenChange }: WhatIsCmcGoPanelProps) {
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  return (
    <>
      <MenuPanel
        open={open}
        onOpenChange={onOpenChange}
        title="What is CMC Go?"
        icon={<Calendar className="w-4 h-4" />}
        maxWidth="1020px"
      >
        <div className="space-y-5">
          {/* Introduction */}
          <p className="text-base text-gray-700 leading-relaxed">
            CMC Go as a way to coordinate toward CMC. It's a map-first web app
            that replaces spreadsheets with a shared visual, helping leaders at
            every level see who's been personally invited, surfacing who needs
            support, and bringing clarity to each person's decision journey.
          </p>

          <hr className="border-gray-200" />

          {/* Why Personal Invitations */}
          <div>
            <h3 className="text-xl font-semibold text-black mb-2">
              Why Personal Invitations Still Matter
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Inviting people personally ensures that people not only know about an
              opportunity, but understand why it matters. It brings clarity around
              where they are in the decision process and what support or steps they
              need to move forward, and most of all, it communicates to them that
              they matter.
            </p>
          </div>

          <hr className="border-gray-200" />

          {/* Section Title */}
          <h3 className="text-lg font-semibold text-black pb-2 border-b border-gray-200">
            A healthy invitation should include…
          </h3>

          {/* Points — 2-column grid on wider viewports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Point 1 */}
            <div className="border-l-4 border-red-600 pl-4">
              <h4 className="text-base font-semibold text-black mb-1">
                1. Why them attending CMC matters
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Share why you believe CMC would be meaningful for this person, and
                meaningful to Chi Alpha. For me, its tied to{" "}
                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
                >
                  The word God gave Sir James for CMC
                </button>
              </p>
            </div>

            {/* Point 2 */}
            <div className="border-l-4 border-red-600 pl-4">
              <h4 className="text-base font-semibold text-black mb-1">
                2. Event details
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed mb-1">
                Share the practical information they need to make a real decision:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-700 ml-2">
                <li>Location</li>
                <li>Dates</li>
                <li>Cost</li>
              </ul>
            </div>

            {/* Point 3 */}
            <div className="border-l-4 border-red-600 pl-4">
              <h4 className="text-base font-semibold text-black mb-1">
                3. Potential needs and support
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed mb-1">
                Name what might make this difficult and let them know support may
                be available and that they don't have to figure this out alone.
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-700 ml-2">
                <li>Financial concerns</li>
                <li>Transportation</li>
                <li>Scheduling conflicts</li>
              </ul>
            </div>

            {/* Point 4 */}
            <div className="border-l-4 border-red-600 pl-4">
              <h4 className="text-base font-semibold text-black mb-1">
                4. Invite them and ask for a response
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed mb-1">
                Make the invitation clear and ask them for a response.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 my-1">
                <p className="text-sm font-medium text-black italic">
                  "So, where are you at right now?"
                </p>
              </div>
            </div>

            {/* Point 5 — spans full width */}
            <div className="border-l-4 border-red-600 pl-4 md:col-span-2">
              <h4 className="text-base font-semibold text-black mb-1">
                5. Personal warmth and sincerity
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed mb-1">
                Let them know:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-700 ml-2">
                <li>you'd genuinely love to have them there</li>
                <li>
                  regardless of their response, the relationship matters
                </li>
              </ul>
            </div>
          </div>
        </div>
      </MenuPanel>

      {/* Google Doc Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85dvh] sm:h-[90vh] flex flex-col max-h-[calc(100dvh-16px)]">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2">
              <h2 className="text-base sm:text-xl font-semibold text-black truncate">
                The Word God Gave Me For CMC
              </h2>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
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
    </>
  );
}
