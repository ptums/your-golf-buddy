import React from "react";

interface NavigationButtonProps {
  onClick: () => void;
  disabled: boolean;
  direction: "previous" | "next";
  className?: string;
}

const NavigationButton: React.FC<NavigationButtonProps> = ({
  onClick,
  disabled,
  direction,
  className = "",
}) => {
  const isPrevious = direction === "previous";
  const ariaLabel = isPrevious ? "Previous hole" : "Next hole";

  const iconPath = isPrevious ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer shadow-lg ${className}`}
      aria-label={ariaLabel}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
    </button>
  );
};

export default NavigationButton;
