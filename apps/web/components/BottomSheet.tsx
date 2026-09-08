export default function BottomSheet({
  handleCallback,
  label,
  position = "fixed bottom-0 left-0",
  colorClasses = "bg-orange-500 active:bg-orange-300",
}: {
  handleCallback: () => void;
  label: string;
  position?: string;
  colorClasses?: string;
}) {
  return (
    <div className={`${position} w-full p-4 `}>
      <button
        onClick={handleCallback}
        className={`w-full ${colorClasses} text-black py-3 rounded font-bold cursor-pointer`}
      >
        {label}
      </button>
    </div>
  );
}
