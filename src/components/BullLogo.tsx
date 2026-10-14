import React from "react";

interface BullLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export const BullLogo: React.FC<BullLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-9 h-9",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  const textSizes = {
    sm: "text-base font-bold tracking-wider",
    md: "text-xl font-extrabold tracking-wider",
    lg: "text-3xl font-black tracking-widest",
    xl: "text-5xl font-black tracking-widest",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Bull Head Icon Badge */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-500/20`}
      >
        <div className="w-full h-full bg-[#0d0d12] rounded-[10px] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3/4 h-3/4 text-amber-400"
          >
            {/* Bull horns & fierce head silhouette */}
            <path d="M3 5c2 0 4 3 4 6" />
            <path d="M21 5c-2 0-4 3-4 6" />
            <path d="M7 11c0 5 2.5 8 5 8s5-3 5-8" />
            <path d="M9 14h.01" />
            <path d="M15 14h.01" />
            <path d="M10 18l2 2 2-2" />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`gold-gradient-text uppercase font-sans ${textSizes[size]}`}>
            THE BIG BULL
          </span>
          <span className="text-[10px] uppercase tracking-widest text-amber-500/80 font-semibold -mt-1 hidden sm:block">
            Think Smart • Play Strategic
          </span>
        </div>
      )}
    </div>
  );
};
