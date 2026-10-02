import React from "react";
import { ShieldAlert } from "lucide-react";

export default function StaffLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col font-sans overflow-hidden">
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-red-600 animate-pulse" />
          </div>
          <div>
            <div className="h-5 w-48 bg-zinc-200 rounded animate-pulse mb-1.5" />
            <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-32 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-zinc-200 rounded-lg animate-pulse" />
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 z-10">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 h-28 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="w-9 h-9 bg-zinc-100 rounded-xl animate-pulse" />
                  <div className="w-8 h-8 bg-zinc-200 rounded animate-pulse" />
                </div>
                <div className="w-20 h-3 bg-zinc-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl flex-1 p-6">
            <div className="w-40 h-5 bg-zinc-200 rounded animate-pulse mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="border border-zinc-100 rounded-xl p-4 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-full animate-pulse" />
                  <div className="w-20 h-4 bg-zinc-200 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-zinc-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="bg-white border border-zinc-200 rounded-2xl flex-1 p-5">
            <div className="w-36 h-5 bg-zinc-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-zinc-50 border border-zinc-100 rounded-xl p-3 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
