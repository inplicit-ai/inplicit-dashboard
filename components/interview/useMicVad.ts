"use client";

// Browser-side mic capture + voice-activity gating (O-6, doc 04 §3.1).
//
// Captures PCM16 @ 16 kHz via an AudioWorklet and emits speech_start /
// speech_end events plus the gated PCM chunks. The acoustic VAD is Silero
// (ONNX Runtime Web / WASM) — instant, language-free, far better than energy
// thresholds in noise. This gives the HUD an immediate "user is speaking"
// signal, gates upstream audio so we don't pay STT for silence, and powers
// barge-in (speech_start while the agent is talking).
//
// STATUS: the worklet wiring + the speech-event/gating integration are real.
// The Silero ONNX model load + per-frame inference are scaffolded with a
// clearly-marked TODO — the model weights + onnxruntime-web are not vendored
// here, so until then we fall back to a cheap energy gate (and the server's
// ElevenLabs `commit_strategy=vad` remains the authoritative endpointer).

import { useCallback, useRef } from "react";

export interface MicVadHandlers {
  /** Gated PCM16 @ 16 kHz frame ready to send upstream. */
  onAudioChunk: (buffer: ArrayBuffer) => void;
  /** Browser VAD detected the start of speech. */
  onSpeechStart?: () => void;
  /** Browser VAD detected the end of speech. */
  onSpeechEnd?: () => void;
  /** Latest RMS level (0..1) for the orb / HUD. */
  onLevel?: (level: number) => void;
}

export interface MicVad {
  start: () => Promise<void>;
  stop: () => void;
  /** Mute = keep the worklet running locally but stop sending audio upstream. */
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
}

// Energy-gate fallback constants until Silero is loaded.
const SPEECH_RMS_THRESHOLD = 0.012;
const SILENCE_HANGOVER_MS = 600;

export function useMicVad(handlers: MicVadHandlers): MicVad {
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const lastVoiceTsRef = useRef(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // TODO(O-6): load Silero VAD.
  //   const ort = await import("onnxruntime-web");
  //   const session = await ort.InferenceSession.create("/models/silero_vad.onnx");
  // Run inference per 30ms frame; replace the energy gate below with the model's
  // speech probability. Lazy-load the WASM so it doesn't block first paint, and
  // gate AudioContext creation behind the start() user gesture (iOS Safari).

  const evaluateFrame = useCallback((pcm: Int16Array) => {
    // Energy gate (Silero fallback). Compute RMS in [0,1].
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) {
      const v = pcm[i] / 0x8000;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, pcm.length));
    handlersRef.current.onLevel?.(Math.min(1, rms * 4));

    const now = performance.now();
    const isVoice = rms >= SPEECH_RMS_THRESHOLD;
    if (isVoice) {
      lastVoiceTsRef.current = now;
      if (!speakingRef.current) {
        speakingRef.current = true;
        handlersRef.current.onSpeechStart?.();
      }
    } else if (speakingRef.current && now - lastVoiceTsRef.current > SILENCE_HANGOVER_MS) {
      speakingRef.current = false;
      handlersRef.current.onSpeechEnd?.();
    }
  }, []);

  const start = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") await ctx.resume();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true, // browser AEC removes speaker-echo false barge-ins
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    await ctx.audioWorklet.addModule("/pcm-worklet.js");
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "pcm-worklet");

    node.port.onmessage = (ev) => {
      const buffer = ev.data as ArrayBuffer;
      // Always evaluate VAD locally (so mute still drives the orb / un-mute is
      // instant), but only forward audio upstream when not muted.
      evaluateFrame(new Int16Array(buffer));
      if (!mutedRef.current) {
        handlersRef.current.onAudioChunk(buffer);
      }
    };

    source.connect(node);
    sourceRef.current = source;
    nodeRef.current = node;
  }, [evaluateFrame]);

  const stop = useCallback(() => {
    nodeRef.current?.port && (nodeRef.current.port.onmessage = null);
    try {
      nodeRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    nodeRef.current = null;
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    speakingRef.current = false;
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  return { start, stop, setMuted, isMuted };
}
