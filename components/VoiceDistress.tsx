"use client";

import React, { useRef, useState } from "react";
import { Mic, Square, Loader2, Send, Type } from "lucide-react";
import { submitVoiceDistress, submitTextDistress } from "@/app/actions";

type Mode = "voice" | "text";

type TriageResult = {
  transcript: string;
  summary: string;
  severity: number;
  category: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  medical: "Medical",
  mobility: "Mobility",
  fire_exposure: "Fire / Smoke",
  structural: "Structural",
  panic: "Panic",
};

const CATEGORY_STYLES: Record<string, string> = {
  medical: "bg-rose-50 text-rose-700 border-rose-200",
  mobility: "bg-amber-50 text-amber-700 border-amber-200",
  fire_exposure: "bg-orange-50 text-orange-700 border-orange-200",
  structural: "bg-violet-50 text-violet-700 border-violet-200",
  panic: "bg-red-50 text-red-700 border-red-200",
};

function severityStyle(sev: number) {
  if (sev >= 5) return "bg-red-50 text-red-700 border-red-200";
  if (sev >= 4) return "bg-orange-50 text-orange-700 border-orange-200";
  if (sev >= 3) return "bg-amber-50 text-amber-700 border-amber-200";
  if (sev >= 2) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function VoiceDistress({ token }: { token: string }) {
  const [mode, setMode] = useState<Mode>("voice");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function resetOutput() {
    setError(null);
    setResult(null);
  }

  async function start() {
    resetOutput();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "distress.webm");
          const res = await submitVoiceDistress(token, fd);
          setResult(res);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to process voice");
        }
        setProcessing(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access denied");
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    resetOutput();
    setProcessing(true);
    try {
      const res = await submitTextDistress(token, text);
      setResult(res);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
    setProcessing(false);
  }

  const status = recording
    ? "Recording... tap the button to stop"
    : processing
      ? mode === "voice"
        ? "Transcribing & triaging..."
        : "Triaging your message..."
      : mode === "voice"
        ? "Tap the mic and speak. AI summarizes for staff."
        : "Describe your situation. AI categorizes it for staff.";

  return (
    <section className="bg-white border border-zinc-200 rounded-3xl p-5 text-center flex flex-col items-center shadow-sm">
      <h3 className="font-semibold text-zinc-900 mb-1">Distress Intercom</h3>
      <p className="text-xs text-zinc-500 mb-4">{status}</p>

      <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-zinc-200 rounded-full p-1 mb-5 w-full max-w-[240px]">
        <button
          onClick={() => {
            setMode("voice");
            resetOutput();
          }}
          disabled={recording || processing}
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-full transition-all ${
            mode === "voice"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-900"
          } disabled:opacity-50`}
        >
          <Mic className="w-3.5 h-3.5" /> Voice
        </button>
        <button
          onClick={() => {
            setMode("text");
            resetOutput();
          }}
          disabled={recording || processing}
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-full transition-all ${
            mode === "text"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-900"
          } disabled:opacity-50`}
        >
          <Type className="w-3.5 h-3.5" /> Type
        </button>
      </div>

      {mode === "voice" ? (
        <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
          {recording && <div className="absolute inset-0 bg-red-500/25 rounded-full animate-ping" />}
          <button
            onClick={recording ? stop : start}
            disabled={processing}
            className="relative w-16 h-16 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/25 text-white focus:outline-none focus:scale-95 transition-all disabled:opacity-60"
          >
            {processing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : recording ? (
              <Square className="w-7 h-7 fill-white" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={sendText} className="w-full mb-4 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={processing}
            rows={3}
            placeholder="e.g., Smoke coming under the door, I can't breathe well..."
            className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={processing || !text.trim()}
            className="flex items-center justify-center gap-2 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm shadow-md shadow-red-500/25 transition-all"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send to Staff
              </>
            )}
          </button>
        </form>
      )}

      <div className="w-full bg-slate-50 p-3 rounded-xl border border-zinc-200 text-left min-h-[64px]">
        {error ? (
          <p className="text-sm text-red-600 font-medium">{error}</p>
        ) : result ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">
                Sent to Staff
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${severityStyle(result.severity)}`}
                >
                  Sev {result.severity}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                    CATEGORY_STYLES[result.category] ?? CATEGORY_STYLES.panic
                  }`}
                >
                  {CATEGORY_LABEL[result.category] ?? result.category}
                </span>
              </div>
            </div>
            <p className="text-sm text-zinc-900 font-semibold leading-relaxed">
              &ldquo;{result.summary}&rdquo;
            </p>
            {result.transcript && result.transcript !== result.summary && (
              <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                {mode === "voice" ? "Transcript" : "Original"}: {result.transcript}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-400 italic font-medium leading-relaxed">
            {mode === "voice"
              ? "Your summarized distress message will appear here after recording."
              : "Your triaged message will appear here after sending."}
          </p>
        )}
      </div>
    </section>
  );
}
