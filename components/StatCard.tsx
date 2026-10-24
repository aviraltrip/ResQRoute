import React from "react";

export const STAT_CARD_COLOR_MAP: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    iconBg: string;
    iconColor: string;
    accent: string;
  }
> = {
  emerald: {
    bg: "bg-white",
    text: "text-zinc-900",
    border: "border-zinc-200/80 hover:border-emerald-300",
    iconBg: "bg-emerald-50 border border-emerald-100/80",
    iconColor: "text-emerald-600",
    accent: "bg-emerald-500",
  },
  red: {
    bg: "bg-white",
    text: "text-zinc-900",
    border: "border-zinc-200/80 hover:border-red-300",
    iconBg: "bg-red-50 border border-red-100/80",
    iconColor: "text-red-600",
    accent: "bg-red-500",
  },
  blue: {
    bg: "bg-white",
    text: "text-zinc-900",
    border: "border-zinc-200/80 hover:border-blue-300",
    iconBg: "bg-blue-50 border border-blue-100/80",
    iconColor: "text-blue-600",
    accent: "bg-blue-500",
  },
  slate: {
    bg: "bg-white",
    text: "text-zinc-900",
    border: "border-zinc-200/80 hover:border-zinc-300",
    iconBg: "bg-zinc-100 border border-zinc-200/80",
    iconColor: "text-zinc-600",
    accent: "bg-zinc-400",
  },
};

export interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}

export default function StatCard({
  icon,
  value,
  label,
  color,
}: StatCardProps) {
  const theme = STAT_CARD_COLOR_MAP[color] || STAT_CARD_COLOR_MAP.slate;

  return (
    <div
      className={`relative bg-white border ${theme.border} rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden group`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${theme.accent}`} />

      <div className="flex justify-between items-start mb-3">
        <div
          className={`p-2.5 rounded-xl ${theme.iconBg} ${theme.iconColor} shadow-2xs transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>
        <span
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 tabular-nums font-sans"
        >
          {value}
        </span>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mt-auto">
        {label}
      </p>
    </div>
  );
}
