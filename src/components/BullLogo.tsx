import React from "react";

interface BullLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  variant?: "blue" | "white";
}

export const BullLogo: React.FC<BullLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
  variant = "blue",
}) => {
  const iconSizes = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-9 h-9 rounded-xl",
    lg: "w-12 h-12 rounded-2xl",
    xl: "w-16 h-16 rounded-2xl",
  };

  const textSizes = {
    sm: "text-sm font-bold tracking-tight",
    md: "text-lg font-black tracking-tight",
    lg: "text-2xl font-black tracking-tight",
    xl: "text-4xl font-black tracking-tight",
  };

  const isWhite = variant === "white";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Bull Head Icon Badge */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 ${
          isWhite
            ? "bg-white text-blue-600 shadow-blue-900/10"
            : "bg-blue-600 text-white shadow-blue-500/20"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3/5 h-3/5"
        >
          {/* Minimalist Bull Horns & Head */}
          <path d="M3 5c2 0 4 3 4 6" />
          <path d="M21 5c-2 0-4 3-4 6" />
          <path d="M7 11c0 5 2.5 8 5 8s5-3 5-8" />
          <path d="M9 14h.01" />
          <path d="M15 14h.01" />
          <path d="M10 18l2 2 2-2" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span
            className={`font-sans tracking-tight uppercase leading-none ${textSizes[size]} ${
              isWhite ? "text-white" : "text-slate-900"
            }`}
          >
            THE BIG BULL
          </span>
          <span
            className={`text-[10px] font-medium tracking-wide mt-0.5 leading-none hidden sm:block ${
              isWhite ? "text-blue-100" : "text-blue-600 font-semibold"
            }`}
          >
            Championship Arena
          </span>
        </div>
      )}
    </div>
  );
};
