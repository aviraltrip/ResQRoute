"use client"

import * as React from "react";
import { LazyMotion, domAnimation, m, Variants, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface AnimatedCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badgeText?: string;
  href: string;
  className?: string;
  delay?: number;
}

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export const AnimatedCard = ({
  title,
  description,
  icon,
  badgeText,
  href,
  className,
  delay = 0,
}: AnimatedCardProps) => {
  const shouldReduceMotion = useReducedMotion();

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
    visible: { opacity: 1, y: 0, transition: { duration: shouldReduceMotion ? 0.01 : 0.6, delay: shouldReduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <Link href={href} className="block w-full focus:outline-none focus:ring-4 focus:ring-blue-500/50 rounded-[24px]">
      <LazyMotion features={domAnimation}>
        <m.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={shouldReduceMotion ? {} : { y: -5, transition: { duration: 0.2 } }}
          className={cn(
            "group relative w-full overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 flex flex-col justify-between h-full transition-all hover:shadow-xl hover:border-blue-200",
            className
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/50 to-white pointer-events-none" />
          
          <div className="relative z-10">
            <m.div variants={ITEM_VARIANTS} className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-zinc-50 rounded-[16px] flex items-center justify-center text-zinc-700 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm border border-zinc-100 group-hover:border-blue-500 group-hover:shadow-blue-200">
                {icon}
              </div>
              {badgeText && (
                <span className="inline-block rounded-full bg-red-50 border border-red-100 px-3 py-1 text-[11px] font-bold text-red-600 uppercase tracking-widest">
                  {badgeText}
                </span>
              )}
            </m.div>

            <m.h2
              variants={ITEM_VARIANTS}
              className="mb-3 text-2xl font-bold tracking-tight text-zinc-900"
            >
              {title}
            </m.h2>
            <m.p variants={ITEM_VARIANTS} className="mb-6 text-zinc-500 leading-relaxed text-sm">
              {description}
            </m.p>
          </div>
          
          <m.div variants={ITEM_VARIANTS} className="relative z-10 mt-auto pt-5 border-t border-zinc-100 flex items-center text-zinc-400 font-semibold group-hover:text-blue-600 group-hover:translate-x-2 transition-all duration-300 uppercase tracking-widest text-xs">
            Launch Module <ArrowRight className="ml-2 w-4 h-4" />
          </m.div>
        </m.div>
      </LazyMotion>
    </Link>
  );
};

