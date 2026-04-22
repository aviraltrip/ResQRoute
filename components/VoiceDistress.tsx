"use client";

import React, { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { submitVoiceDistress } from "@/app/actions";

export default function VoiceDistress({ token }: { token: string }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    setSummary(null);
    setTranscript(null);
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
          setTranscript(res.transcript);
          setSummary(res.summary);
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

  const status = recording
    ? "Recording... tap the button to stop"
    : processing
      ? "Transcribing & summarizing..."
      : "Tap the mic and speak. AI summarizes for staff.";

  return (
    <section className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-center flex flex-col items-center">
      <h3 className="font-semibold text-white mb-1">Distress Intercom</h3>
      <p className="text-xs text-neutral-400 mb-5">{status}</p>

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

      <div className="w-full bg-black/50 p-3 rounded-xl border border-white/5 text-left min-h-[64px]">
        {error ? (
          <p className="text-sm text-red-400 font-medium">{error}</p>
        ) : summary ? (
          <>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">
              Sent to Staff
            </p>
            <p className="text-sm text-neutral-100 font-semibold leading-relaxed">
              &ldquo;{summary}&rdquo;
            </p>
            {transcript && transcript !== summary && (
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                Transcript: {transcript}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500 italic font-medium leading-relaxed">
            Your summarized distress message will appear here after recording.
          </p>
        )}
      </div>
    </section>
  );
}
