"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import SwingTipsData from "@/lib/swing-tips.json";

const ClubTitle = dynamic(
  () => import("@/components/ImprovementTemplate/ClubTitle")
);
const PageTitle = dynamic(
  () => import("@/components/ImprovementTemplate/PageTitle")
);

interface LieAdjustment {
  target: string;
  grip?: {
    numerOfPositions: number[];
    position: number[];
  };
  swing: string;
}

interface LieAdjustments {
  teeBox?: LieAdjustment;
  fairway?: LieAdjustment;
  rough?: LieAdjustment;
  bunker?: LieAdjustment;
  green?: LieAdjustment;
  fringe?: LieAdjustment;
  uneven?: LieAdjustment;
  uphillLie?: LieAdjustment;
  downhillLie?: LieAdjustment;
}

interface SwingTip {
  club: string;
  ballPosition: {
    numerOfPositions: number[];
    position: number;
  };
  stanceWidth: {
    numerOfPositions: number[];
    position: number[];
  };
  weightDistribution: {
    numerOfPositions: number[];
    position: number[];
  };
  notes: string;
  lieAdjustments: LieAdjustments;
}

const SwingTips = () => {
  const tips: SwingTip[] = SwingTipsData as unknown as SwingTip[];
  const [selectedClub, setSelectedClub] = useState<SwingTip | null>(null);

  const handleClubSelect = (club: string) => {
    const clubData = tips.find((tip) => tip.club === club);
    if (clubData) {
      setSelectedClub(clubData);
    }

    // Scroll to top to show the drill card
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex-col mx-auto p-1">
      {selectedClub && (
        <div className="mb-10">
          <div className="flex-1 p-6 flex flex-col justify-center">
            <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-amber-100 relative">
              <ClubTitle title={selectedClub?.club} />

              <div className="space-y-6">
                <span className="block text-slate-900 mb-4 font-bold text-lg">
                  Ball Position
                </span>
                <div className="flex space-x-3">
                  {selectedClub?.ballPosition.numerOfPositions.map((n) => {
                    return (
                      <span
                        key={n}
                        className={`orange-marble-base w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 ${
                          n === selectedClub?.ballPosition.position
                            ? "bg-orange-600 text-white shadow-lg"
                            : n === 2 || n === 4 || n === 6
                            ? "bg-orange-200 text-slate-800 hover:bg-orange-300 border-2 border-orange-300"
                            : "bg-orange-100 text-slate-800 hover:bg-orange-200 border-2 border-orange-200"
                        }`}
                        aria-label={`foot position ${n}`}
                      >
                        {n === 2 ? (
                          <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                            <span className="text-sm">R</span>
                          </div>
                        ) : n === 6 ? (
                          <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                            <span className="text-sm">L</span>
                          </div>
                        ) : n === 4 ? (
                          <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                            <span className="text-xs">C</span>
                          </div>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
                <span className="block text-slate-900 mb-4 font-bold text-lg">
                  Stance Width
                </span>
                <div className="flex space-x-3">
                  {selectedClub?.stanceWidth.numerOfPositions.map((n) => {
                    return (
                      <span
                        key={n}
                        className={`orange-marble-base w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 ${
                          selectedClub?.stanceWidth.position.includes(n)
                            ? "bg-orange-600 text-white shadow-lg"
                            : n === 2 || n === 4 || n === 6
                            ? "bg-orange-200 text-slate-800 hover:bg-orange-300 border-2 border-orange-300"
                            : "bg-orange-100 text-slate-800 hover:bg-orange-200 border-2 border-orange-200"
                        }`}
                        aria-label={`foot position ${n}`}
                      >
                        {n === 2 ? (
                          <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                            <span className="text-sm">R</span>
                          </div>
                        ) : n === 6 ? (
                          <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                            <span className="text-sm">L</span>
                          </div>
                        ) : n === 4 ? (
                          <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                            <span className="text-xs">C</span>
                          </div>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
                <span className="block text-slate-900 mb-4 font-bold text-lg">
                  Weight Distribution
                </span>
                <div className="flex space-x-3">
                  {selectedClub?.weightDistribution.numerOfPositions.map(
                    (n) => {
                      return (
                        <span
                          key={n}
                          className={`orange-marble-base w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 ${
                            selectedClub?.weightDistribution.position.includes(
                              n
                            )
                              ? "bg-orange-600 text-white shadow-lg"
                              : n === 2 || n === 4 || n === 6
                              ? "bg-orange-200 text-slate-800 hover:bg-orange-300 border-2 border-orange-300"
                              : "bg-orange-100 text-slate-800 hover:bg-orange-200 border-2 border-orange-200"
                          }`}
                          aria-label={`foot position ${n}`}
                        >
                          {n === 2 ? (
                            <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                              <span className="text-sm">R</span>
                            </div>
                          ) : n === 6 ? (
                            <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                              <span className="text-xs">L</span>
                            </div>
                          ) : n === 4 ? (
                            <div className="flex flex-col items-center justify-center space-y-0 font-normal">
                              <span className="text-xs">C</span>
                            </div>
                          ) : null}
                        </span>
                      );
                    }
                  )}
                </div>
                <span className="block text-slate-900 mb-4 font-bold text-lg">
                  Lie Adjustments
                </span>
                <div className="space-y-4">
                  {Object.entries(selectedClub?.lieAdjustments || {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="border-1 border-orange-200 rounded-lg p-4 shadow-sm"
                      >
                        <h4 className="text-md font-semibold text-slate-800 mb-3 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </h4>

                        {/* Target */}
                        <div className="mb-3">
                          <span className="text-sm font-medium text-slate-700">
                            Target:{" "}
                          </span>
                          <span className="text-sm text-slate-600">
                            {value.target}
                          </span>
                        </div>

                        {/* Grip */}
                        {value.grip && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-slate-700">
                              Grip:{" "}
                            </span>
                            <div className="flex space-x-2 mt-1">
                              {value.grip.numerOfPositions.map((n: number) => (
                                <span
                                  key={n}
                                  className={`orange-marble-base w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 ${
                                    value.grip.position.includes(n)
                                      ? "bg-orange-600 text-white shadow-lg"
                                      : "bg-orange-100 text-slate-800 hover:bg-orange-200 border-2 border-orange-200"
                                  }`}
                                  aria-label={`grip position ${n}`}
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Swing */}
                        <div>
                          <span className="text-sm font-medium text-slate-700">
                            Swing:{" "}
                          </span>
                          <span className="text-sm text-slate-600">
                            {value.swing}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8 flex flex-col justify-center items-center w-full">
        <PageTitle
          title="Swing Tips"
          description="Select a club to see the swing tips for that club."
        />

        <div className="space-y-4 w-full max-w-lg">
          {tips.map((tip) => (
            <label
              key={tip.club}
              className={`flex items-center justify-center w-full text-black py-3 rounded font-bold cursor-pointer text-center transition-all duration-200 ${
                selectedClub?.club === tip.club
                  ? "bg-orange-500 active:bg-orange-300"
                  : "bg-white hover:shadow-md border-2 border-slate-300 hover:border-orange-300"
              }`}
            >
              <input
                type="radio"
                name="club"
                value={tip.club}
                checked={selectedClub?.club === tip.club}
                onChange={(e) => handleClubSelect(e.target.value)}
                className="sr-only"
              />
              <span className="font-bold text-xl">{tip.club}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwingTips;
