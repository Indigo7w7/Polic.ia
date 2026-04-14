/**
 * tts.ts — Text-to-Speech nativo via Web Speech API
 * Sin dependencias de servidor. Usa synthétiseur del navegador.
 * Idioma por defecto: es-PE (español peruano)
 */

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Lee un texto en voz alta.
 * Si ya hay lectura en curso, la detiene primero.
 */
export function speak(
  text: string,
  options: {
    lang?: string;
    rate?: number;   // 0.5 - 2.0 (default 0.95)
    pitch?: number;  // 0 - 2 (default 1)
    volume?: number; // 0 - 1 (default 1)
    onEnd?: () => void;
  } = {}
): void {
  if (!isTTSAvailable()) {
    console.warn('[TTS] Web Speech API no disponible en este navegador.');
    return;
  }

  // Detener cualquier lectura en curso
  window.speechSynthesis.cancel();

  // Limpiar el texto de HTML y caracteres especiales
  const cleanText = text
    .replace(/<[^>]*>/g, ' ')  // quitar HTML
    .replace(/\{[^}]*\}/g, '') // quitar plantillas ANKI
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = options.lang ?? 'es-PE';
  utterance.rate = options.rate ?? 0.95;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;

  // Intentar usar una voz en español si está disponible
  const voices = window.speechSynthesis.getVoices();
  const spanishVoice = voices.find(v =>
    v.lang.startsWith('es') && (v.name.includes('Female') || v.name.includes('Paulina') || v.name.includes('Monica'))
  ) || voices.find(v => v.lang.startsWith('es'));

  if (spanishVoice) utterance.voice = spanishVoice;

  if (options.onEnd) utterance.onend = options.onEnd;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/** Detiene cualquier lectura en curso */
export function stopTTS(): void {
  if (isTTSAvailable()) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

/** Retorna true si hay lectura activa */
export function isSpeaking(): boolean {
  return isTTSAvailable() && window.speechSynthesis.speaking;
}

/**
 * Carga las voces disponibles (asíncrono en Chrome).
 * Llama a este hook al montar el componente.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isTTSAvailable()) { resolve([]); return; }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    // Chrome carga las voces de forma diferida
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}
