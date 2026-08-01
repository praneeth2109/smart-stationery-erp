/**
 * Paytm & PhonePe Soundbox Style Audio Payment Speaker Alert
 * Uses Web Speech Synthesis & Web Audio API chime
 */

export function speakPaymentAlert(
  amount: number,
  customerName?: string,
  paymentMethod: "CASH" | "UPI" = "CASH"
) {
  if (typeof window === "undefined") return;

  // 1. Play digital audio chime synthesizer beep
  playChimeTone();

  // 2. Speak voice alert after short 250ms delay
  setTimeout(() => {
    if (!("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const formattedAmount = Math.round(amount);
    const methodText = paymentMethod === "UPI" ? "UPI QR Scan" : "Cash";
    const nameText = customerName ? ` from ${customerName}` : "";

    const text = `Payment of ${formattedAmount} rupees received${nameText} via ${methodText} on R R Stationery P O S!`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a clear natural English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.includes("en-IN") ||
        v.lang.includes("en-US") ||
        v.lang.includes("en-GB")
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, 250);
}

export function playChimeTone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Pleasant Paytm soundbox dual chime frequency (587.33Hz -> 880Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio context autoplay restrictions gracefully
  }
}
