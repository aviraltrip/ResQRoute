import React from "react";

export const STAT_CARD_COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string; iconBg: string }
> = {
  emerald: {
    bg: "bg-emerald-50/50",
    text: "text-emerald-900",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
  },
  red: {
    bg: "bg-red-50/50",
    text: "text-red-900",
    border: "border-red-100",
    iconBg: "bg-red-100",
  },
  blue: {
    bg: "bg-blue-50/50",
    text: "text-blue-900",
    border: "border-blue-100",
    iconBg: "bg-blue-100",
  },
  slate: {
    bg: "bg-slate-50/50",
    text: "text-slate-900",
    border: "border-slate-200",
    iconBg: "bg-slate-100",
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
      className={`bg-white border ${theme.border} rounded-2xl p-5 flex flex-col shadow-sm relative overflow-hidden group`}
    >
      <div
        className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${theme.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`}
      />

      <div className="flex justify-between items-start mb-2 relative z-10">
        <div
          className={`p-2.5 rounded-xl ${theme.iconBg} shadow-sm border border-white`}
        >
          {icon}
        </div>
        <h3
          className={`text-3xl font-black tracking-tighter ${theme.text} transition-all`}
        >
          {value}
        </h3>
      </div>
      <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-500 font-bold mt-auto relative z-10">
        {label}
      </p>
    </div>
  );
}
