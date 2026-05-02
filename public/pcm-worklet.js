// PCM capture worklet — runs in a dedicated audio thread.
//
// Captures the mono mic input, linear-interpolation downsamples it from the
// AudioContext rate (typically 48 kHz) to 16 kHz, converts to signed 16-bit,
// and posts ~100 ms chunks back to the main thread for the WebSocket pump.
//
// This bypasses MediaRecorder/WebM entirely so Deepgram sees raw `linear16`
// — the encoding it parses most reliably across browsers.
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    // `sampleRate` is a global in AudioWorklet scope — the AudioContext rate.
    this.ratio = sampleRate / this.targetRate;
    this.cursor = 0;
    this.buffer = [];
    // 100 ms of audio at 16 kHz = 1600 samples per emitted chunk.
    this.flushSize = 1600;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    // Linear-interpolate downsample.
    let i = this.cursor;
    while (i < channel.length) {
      const idx = Math.floor(i);
      const frac = i - idx;
      const a = channel[idx];
      const b = idx + 1 < channel.length ? channel[idx + 1] : a;
      const s = a + (b - a) * frac;
      this.buffer.push(s < -1 ? -1 : s > 1 ? 1 : s);
      i += this.ratio;
    }
    this.cursor = i - channel.length;

    while (this.buffer.length >= this.flushSize) {
      const chunk = this.buffer.splice(0, this.flushSize);
      const out = new Int16Array(chunk.length);
      for (let j = 0; j < chunk.length; j++) {
        // Scale [-1, 1] → [-32768, 32767]
        out[j] = Math.max(-32768, Math.min(32767, Math.round(chunk[j] * 32767)));
      }
      this.port.postMessage(out.buffer, [out.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorklet);
