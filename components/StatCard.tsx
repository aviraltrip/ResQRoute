import React from "react";

export const STAT_CARD_COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string; iconBg: string; glow: string; topBorder: string; badgeBg: string; badgeText: string }
> = {
  emerald: {
    bg: "bg-emerald-950/20",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    glow: "rgba(16, 185, 129, 0.12)",
    topBorder: "from-emerald-500/80 to-emerald-400/20",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-300",
  },
  red: {
    bg: "bg-red-950/25",
    text: "text-red-400",
    border: "border-red-500/30",
    iconBg: "bg-red-500/10 text-red-400 border border-red-500/30",
    glow: "rgba(239, 68, 68, 0.15)",
    topBorder: "from-red-500/90 to-red-400/20",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-300",
  },
  blue: {
    bg: "bg-sky-950/20",
    text: "text-sky-400",
    border: "border-sky-500/30",
    iconBg: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
    glow: "rgba(14, 165, 233, 0.12)",
    topBorder: "from-sky-500/80 to-sky-400/20",
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-300",
  },
  slate: {
    bg: "bg-zinc-900/60",
    text: "text-zinc-200",
    border: "border-zinc-800",
    iconBg: "bg-zinc-800/80 text-zinc-400 border border-zinc-700/60",
    glow: "rgba(148, 163, 184, 0.05)",
    topBorder: "from-zinc-600/80 to-zinc-800/20",
    badgeBg: "bg-zinc-800/60",
    badgeText: "text-zinc-400",
  },
};

export interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  subtitle?: string;
  trend?: string;
}

export default function StatCard({
  icon,
  value,
  label,
  color,
  subtitle,
  trend,
}: StatCardProps) {
  const theme = STAT_CARD_COLOR_MAP[color] || STAT_CARD_COLOR_MAP.slate;

  return (
    <div
      className={`relative bg-zinc-900/85 backdrop-blur-md border ${theme.border} rounded-xl p-4 flex flex-col justify-between overflow-hidden shadow-lg group transition-all duration-300 hover:border-zinc-600 hover:shadow-xl`}
    >
      {/* Top accent beam */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${theme.topBorder}`}
      />

      {/* Ambient background glow */}
      <div
        className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 opacity-40 group-hover:opacity-75"
        style={{ backgroundColor: theme.glow }}
      />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className={`p-2 rounded-lg ${theme.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div className="text-right">
          <span className={`text-3xl font-mono font-bold tracking-tight ${theme.text}`}>
            {value}
          </span>
          {trend && (
            <span className={`block text-[10px] font-mono uppercase tracking-wider ${theme.badgeText}`}>
              {trend}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 pt-1 border-t border-zinc-800/60 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold font-mono">
          {label}
        </p>
        {subtitle && (
          <span className="text-[10px] text-zinc-500 font-mono">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
