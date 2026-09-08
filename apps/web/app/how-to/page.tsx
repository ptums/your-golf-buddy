import Link from "next/link";

export const metadata = {
  title: "How to use Your Golf Buddy",
};

const steps = [
  {
    title: "1. Set up your profile",
    body: "On your first visit the app asks for a username and your date of birth. There's no email, password, or account — it just labels the data stored on this device.",
  },
  {
    title: "2. Add a course",
    body: "Type the course name. As you type, nearby golf courses are suggested — tap one, or just type it in yourself. Then choose 9 or 18 holes.",
  },
  {
    title: "3. Play the round",
    body: "For each hole, enter the par, your score, and your putts. Your running total updates as you go.",
  },
  {
    title: "4. Finish up",
    body: "Add a note about the round — the weather, how it felt, anything worth remembering — and save. You'll see your final score.",
  },
  {
    title: "5. Review your rounds",
    body: "The Games screen lists every round you've played, with its course and score, so you can watch your progress over time.",
  },
  {
    title: "6. Work on your game",
    body: "Swing Tips has club-by-club setup guidance — ball position, stance width, and how to adjust for different lies. Practice Drills gives you focused drills for each club.",
  },
  {
    title: "7. Sync across devices (optional)",
    body: "Everything is saved on your device and works fully offline. Turn on sync in Settings to back your rounds up and pick them up on another device.",
  },
];

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            How to use Your Golf Buddy
          </h1>
          <p className="text-slate-600">
            Track your scores, keep notes, and build a feel for your clubs — a
            round at a time.
          </p>
        </div>

        <ol className="space-y-4">
          {steps.map((step) => (
            <li
              key={step.title}
              className="bg-white rounded-xl shadow-lg border-2 border-amber-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-1">
                {step.title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="text-center text-sm text-slate-600">
          Your data never leaves your device unless you turn on sync. No ads, no
          tracking.
        </p>

        <div className="text-center">
          <Link
            href="/games"
            className="inline-block bg-orange-500 text-white font-bold rounded-full px-6 py-3 hover:bg-orange-600 transition-colors"
          >
            Start a round
          </Link>
        </div>
      </div>
    </div>
  );
}
