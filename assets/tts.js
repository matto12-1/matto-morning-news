// assets/tts.js — 읽어주기(Web Speech API). 무료·오프라인·브라우저 내장.
export const isSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

let current = null;

export function speak(text, { onStart, onEnd } = {}) {
  if (!isSupported()) return false;
  stop();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = "ko-KR";
  u.rate = 0.95;
  u.pitch = 1.05;
  u.onstart = () => onStart?.();
  u.onend = () => { current = null; onEnd?.(); };
  u.onerror = () => { current = null; onEnd?.(); };
  current = u;
  window.speechSynthesis.speak(u);
  return true;
}

export function stop() {
  if (isSupported()) window.speechSynthesis.cancel();
  current = null;
}

export function isSpeaking() {
  return isSupported() && window.speechSynthesis.speaking;
}
