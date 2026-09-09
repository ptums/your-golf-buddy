import Link from "next/link";
import ScreenHeader from "@/components/broadsheet/ScreenHeader";

export const metadata = {
  title: "How to use Your Golf Buddy",
};

const steps = [
  {
    title: "Set up your profile",
    body: "On your first visit the app asks for a username and your date of birth. There's no email, password, or account — it just labels the data stored on this device.",
  },
  {
    title: "Add a course",
    body: "Type the course name. As you type, nearby golf courses are suggested — tap one, or just type it in yourself. Then choose 9 or 18 holes.",
  },
  {
    title: "Play the round",
    body: "For each hole, enter the par, your strokes, and your putts — in any order, or leave one blank. Your running total updates as you go.",
  },
  {
    title: "Move between holes",
    body: "The scorecard bar at the top drops down to show every hole; tap any of them to jump there. Use the hole keys at the bottom to step forward and back.",
  },
  {
    title: "Review your rounds",
    body: "The Rounds screen groups every round by course, so you can watch your game trend. Swipe a round left to delete it.",
  },
  {
    title: "Work on your game",
    body: "Swing tips has club-by-club setup guidance. Practice drills gives you focused drills for each club. Both work offline.",
  },
  {
    title: "Sync across devices (optional)",
    body: "Everything is saved on your device and works fully offline. Turn on sync in Settings to back your rounds up and pick them up on another device.",
  },
];

export default function HowToPage() {
  return (
    <div className="mx-auto w-full max-w-[430px]">
      <ScreenHeader label="How to" status="Works offline" />

      <div className="px-5 pt-[22px]">
        <h1 className="text-[42px] leading-[0.92]">Using Your Golf Buddy</h1>
        <p className="bs-note mt-[10px]">
          Track your scores, keep notes, build a feel for your clubs — a round at
          a time.
        </p>
      </div>

      <ol className="flex flex-col gap-4 px-5 pt-6">
        {steps.map((step, i) => (
          <li key={step.title} className="bs-box p-4">
            <div className="mb-1 flex items-center gap-[10px]">
              <span className="font-serif text-[20px] font-semibold">{i + 1}</span>
              <h2 className="text-[17px]">{step.title}</h2>
            </div>
            <p className="bs-note text-[13px]">{step.body}</p>
          </li>
        ))}
      </ol>

      <p className="bs-note px-5 pt-4 text-[13px]">
        Your data never leaves your device unless you turn on sync. No ads, no
        tracking.
      </p>

      <div className="mt-[26px] border-t-4 border-[var(--bs-ink)] px-5 pb-6 pt-4">
        <Link
          href="/games"
          className="bs-key bs-key-ink h-[66px] w-full text-[18px] no-underline"
        >
          Your rounds →
        </Link>
      </div>
    </div>
  );
}
