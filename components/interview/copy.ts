// Interview-room copy + language helpers (O-6, doc 04 §6).
//
// The participant picks the interview language before the call; it drives STT,
// TTS, and the system prompt server-side. UI strings here are localized to the
// chosen interview language (NOT the dashboard `NEXT_LOCALE` cookie — this is a
// public, participant-facing surface). Per the i18n constraint, no room copy is
// hardcoded inline in components; it all lives in this single map.

export type Lang = "de" | "en" | "fr" | "es";

export const DEFAULT_LANG: Lang = "de";

/** Languages offered in the picker, gated to what the STT+TTS pair supports. */
export const SUPPORTED_LANGS: readonly Lang[] = ["de", "en", "fr", "es"] as const;

export const LANG_NATIVE: Record<Lang, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
};

export const LANG_FLAG: Record<Lang, string> = {
  de: "🇩🇪",
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
};

export function normalizeLang(raw: string | undefined | null): Lang {
  const tag = raw?.slice(0, 2).toLowerCase();
  if (tag && (SUPPORTED_LANGS as readonly string[]).includes(tag)) {
    return tag as Lang;
  }
  return DEFAULT_LANG;
}

/** Best-effort default from the browser. */
export function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  return normalizeLang(navigator.language);
}

interface RoomCopy {
  preflightEyebrow: string;
  preflightTitle: string;
  preflightBody: string;
  aiNotice: string;
  micNotice: string;
  languageLabel: string;
  start: string;
  connecting: string;
  preferText: string;
  // HUD / status
  status: Record<"idle" | "listening" | "thinking" | "speaking", string>;
  connected: string;
  reconnecting: string;
  paused: string;
  // controls
  voiceOn: string;
  voiceOff: string;
  toChat: string;
  toVoice: string;
  pause: string;
  resume: string;
  end: string;
  remaining: string;
  // dialogs / views
  endConfirmTitle: string;
  endConfirmBody: string;
  cancel: string;
  confirmEnd: string;
  endedEyebrow: string;
  endedTitle: string;
  endedBody: string;
  resumeEyebrow: string;
  resumeTitle: string;
  resumeBody: (mins: number) => string;
  resumeCta: string;
  composerPlaceholder: string;
  send: string;
  transcriptEmpty: string;
}

const COPY: Record<Lang, RoomCopy> = {
  de: {
    preflightEyebrow: "Interview",
    preflightTitle: "Bereit für ein Gespräch?",
    preflightBody:
      "Du sprichst gleich mit einem KI-Interviewagenten. Das Gespräch dauert etwa 20–30 Minuten und ist vollständig anonym.",
    aiNotice: "Hinweis: Dieses Gespräch wird von einer KI geführt, nicht von einem Menschen.",
    micNotice:
      "Wir verwenden dein Mikrofon nur während dieses Gesprächs. Audio wird nicht gespeichert, nur die Transkription für die anonyme Auswertung.",
    languageLabel: "Sprache",
    start: "Mikrofon erlauben & starten",
    connecting: "Verbindung wird aufgebaut …",
    preferText: "Lieber tippen",
    status: {
      idle: "Bereit",
      listening: "Hört zu",
      thinking: "Denkt nach",
      speaking: "Spricht",
    },
    connected: "Verbunden",
    reconnecting: "Verbinde neu …",
    paused: "Pausiert",
    voiceOn: "Mikrofon an",
    voiceOff: "Mikrofon stumm",
    toChat: "Zu Chat wechseln",
    toVoice: "Sprachmodus",
    pause: "Pause",
    resume: "Fortsetzen",
    end: "Beenden",
    remaining: "verbleibend",
    endConfirmTitle: "Interview wirklich beenden?",
    endConfirmBody:
      "Wenn du jetzt beendest, wird das Gespräch abgeschlossen und kann nicht fortgesetzt werden.",
    cancel: "Abbrechen",
    confirmEnd: "Beenden",
    endedEyebrow: "Abgeschlossen",
    endedTitle: "Vielen Dank!",
    endedBody:
      "Das Interview ist abgeschlossen. Deine Antworten werden anonym ausgewertet. Du kannst dieses Fenster jetzt schließen.",
    resumeEyebrow: "Pausiert",
    resumeTitle: "Willkommen zurück",
    resumeBody: (m) =>
      `Du warst etwa ${m} Minuten im Gespräch. Deine Antworten sind gespeichert — wir können genau dort weitermachen.`,
    resumeCta: "Interview fortsetzen",
    composerPlaceholder: "Antworte hier …",
    send: "Senden",
    transcriptEmpty: "Hier erscheint dein Verlauf.",
  },
  en: {
    preflightEyebrow: "Interview",
    preflightTitle: "Ready for a conversation?",
    preflightBody:
      "You're about to talk with an AI interview agent. The conversation takes around 20–30 minutes and is fully anonymous.",
    aiNotice: "Note: this conversation is conducted by an AI, not a human.",
    micNotice:
      "We only use your microphone during this conversation. Audio is not stored — only the transcription, for anonymous analysis.",
    languageLabel: "Language",
    start: "Allow microphone & start",
    connecting: "Connecting …",
    preferText: "I'd rather type",
    status: {
      idle: "Ready",
      listening: "Listening",
      thinking: "Thinking",
      speaking: "Speaking",
    },
    connected: "Connected",
    reconnecting: "Reconnecting …",
    paused: "Paused",
    voiceOn: "Mic on",
    voiceOff: "Mic muted",
    toChat: "Switch to chat",
    toVoice: "Voice mode",
    pause: "Pause",
    resume: "Resume",
    end: "End",
    remaining: "remaining",
    endConfirmTitle: "End the interview?",
    endConfirmBody:
      "If you end now, the conversation will be completed and cannot be resumed.",
    cancel: "Cancel",
    confirmEnd: "End",
    endedEyebrow: "Completed",
    endedTitle: "Thank you!",
    endedBody:
      "The interview is complete. Your answers will be analyzed anonymously. You can close this window now.",
    resumeEyebrow: "Paused",
    resumeTitle: "Welcome back",
    resumeBody: (m) =>
      `You were about ${m} minutes in. Your answers are saved — we can pick up right where you left off.`,
    resumeCta: "Resume the interview",
    composerPlaceholder: "Reply here …",
    send: "Send",
    transcriptEmpty: "Your transcript will appear here.",
  },
  fr: {
    preflightEyebrow: "Entretien",
    preflightTitle: "Prêt pour une conversation ?",
    preflightBody:
      "Vous allez parler avec un agent d'entretien IA. La conversation dure environ 20 à 30 minutes et est entièrement anonyme.",
    aiNotice: "Remarque : cette conversation est menée par une IA, pas par un humain.",
    micNotice:
      "Nous utilisons votre microphone uniquement pendant cette conversation. L'audio n'est pas conservé — seule la transcription, pour une analyse anonyme.",
    languageLabel: "Langue",
    start: "Autoriser le micro & démarrer",
    connecting: "Connexion …",
    preferText: "Je préfère écrire",
    status: {
      idle: "Prêt",
      listening: "À l'écoute",
      thinking: "Réfléchit",
      speaking: "Parle",
    },
    connected: "Connecté",
    reconnecting: "Reconnexion …",
    paused: "En pause",
    voiceOn: "Micro activé",
    voiceOff: "Micro coupé",
    toChat: "Passer au chat",
    toVoice: "Mode vocal",
    pause: "Pause",
    resume: "Reprendre",
    end: "Terminer",
    remaining: "restant",
    endConfirmTitle: "Terminer l'entretien ?",
    endConfirmBody:
      "Si vous terminez maintenant, la conversation sera close et ne pourra pas reprendre.",
    cancel: "Annuler",
    confirmEnd: "Terminer",
    endedEyebrow: "Terminé",
    endedTitle: "Merci !",
    endedBody:
      "L'entretien est terminé. Vos réponses seront analysées de manière anonyme. Vous pouvez fermer cette fenêtre.",
    resumeEyebrow: "En pause",
    resumeTitle: "Bon retour",
    resumeBody: (m) =>
      `Vous étiez à environ ${m} minutes. Vos réponses sont enregistrées — nous pouvons reprendre exactement où vous vous êtes arrêté.`,
    resumeCta: "Reprendre l'entretien",
    composerPlaceholder: "Répondez ici …",
    send: "Envoyer",
    transcriptEmpty: "Votre transcription apparaîtra ici.",
  },
  es: {
    preflightEyebrow: "Entrevista",
    preflightTitle: "¿Listo para una conversación?",
    preflightBody:
      "Vas a hablar con un agente de entrevistas de IA. La conversación dura unos 20–30 minutos y es totalmente anónima.",
    aiNotice: "Nota: esta conversación la realiza una IA, no una persona.",
    micNotice:
      "Solo usamos tu micrófono durante esta conversación. El audio no se almacena — solo la transcripción, para un análisis anónimo.",
    languageLabel: "Idioma",
    start: "Permitir micrófono y empezar",
    connecting: "Conectando …",
    preferText: "Prefiero escribir",
    status: {
      idle: "Listo",
      listening: "Escuchando",
      thinking: "Pensando",
      speaking: "Hablando",
    },
    connected: "Conectado",
    reconnecting: "Reconectando …",
    paused: "En pausa",
    voiceOn: "Micrófono activado",
    voiceOff: "Micrófono silenciado",
    toChat: "Cambiar a chat",
    toVoice: "Modo voz",
    pause: "Pausa",
    resume: "Reanudar",
    end: "Finalizar",
    remaining: "restante",
    endConfirmTitle: "¿Finalizar la entrevista?",
    endConfirmBody:
      "Si finalizas ahora, la conversación se cerrará y no podrá reanudarse.",
    cancel: "Cancelar",
    confirmEnd: "Finalizar",
    endedEyebrow: "Completado",
    endedTitle: "¡Gracias!",
    endedBody:
      "La entrevista ha finalizado. Tus respuestas se analizarán de forma anónima. Puedes cerrar esta ventana.",
    resumeEyebrow: "En pausa",
    resumeTitle: "Bienvenido de nuevo",
    resumeBody: (m) =>
      `Estuviste unos ${m} minutos. Tus respuestas están guardadas — podemos continuar justo donde lo dejaste.`,
    resumeCta: "Reanudar la entrevista",
    composerPlaceholder: "Responde aquí …",
    send: "Enviar",
    transcriptEmpty: "Tu transcripción aparecerá aquí.",
  },
};

export function roomCopy(lang: Lang): RoomCopy {
  return COPY[lang] ?? COPY[DEFAULT_LANG];
}
