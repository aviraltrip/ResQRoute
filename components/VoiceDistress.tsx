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
  medical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  mobility: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  fire_exposure: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  structural: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  panic: "bg-red-500/15 text-red-300 border-red-500/30",
};

function severityStyle(sev: number) {
  if (sev >= 5) return "bg-red-500/20 text-red-200 border-red-500/40";
  if (sev >= 4) return "bg-orange-500/20 text-orange-200 border-orange-500/40";
  if (sev >= 3) return "bg-amber-500/20 text-amber-200 border-amber-500/40";
  if (sev >= 2) return "bg-yellow-500/20 text-yellow-200 border-yellow-500/40";
  return "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";
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
    <section className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-center flex flex-col items-center">
      <h3 className="font-semibold text-white mb-1">Distress Intercom</h3>
      <p className="text-xs text-neutral-400 mb-4">{status}</p>

      <div className="grid grid-cols-2 gap-1 bg-black/40 border border-white/10 rounded-full p-1 mb-5 w-full max-w-[240px]">
        <button
          onClick={() => {
            setMode("voice");
            resetOutput();
          }}
          disabled={recording || processing}
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-full transition-all ${
            mode === "voice"
              ? "bg-white/10 text-white shadow-inner"
              : "text-neutral-400 hover:text-neutral-200"
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
              ? "bg-white/10 text-white shadow-inner"
              : "text-neutral-400 hover:text-neutral-200"
          } disabled:opacity-50`}
        >
          <Type className="w-3.5 h-3.5" /> Type
        </button>
      </div>

      {mode === "voice" ? (
        <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
          {recording && <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />}
          <button
            onClick={recording ? stop : start}
            disabled={processing}
            className="relative w-16 h-16 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] text-white focus:outline-none focus:scale-95 transition-all disabled:opacity-60"
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
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-red-500/40 resize-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={processing || !text.trim()}
            className="flex items-center justify-center gap-2 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
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

      <div className="w-full bg-black/50 p-3 rounded-xl border border-white/5 text-left min-h-[64px]">
        {error ? (
          <p className="text-sm text-red-400 font-medium">{error}</p>
        ) : result ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
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
            <p className="text-sm text-neutral-100 font-semibold leading-relaxed">
              &ldquo;{result.summary}&rdquo;
            </p>
            {result.transcript && result.transcript !== result.summary && (
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                {mode === "voice" ? "Transcript" : "Original"}: {result.transcript}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500 italic font-medium leading-relaxed">
            {mode === "voice"
              ? "Your summarized distress message will appear here after recording."
              : "Your triaged message will appear here after sending."}
          </p>
        )}
      </div>
    </section>
  );
}
