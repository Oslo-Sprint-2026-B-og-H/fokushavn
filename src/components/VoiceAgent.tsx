import { useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Loader2, Mic, Square } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { fetchConversationToken } from '@/lib/elevenlabs';
import type { VocabularyItem } from '@/lib/breakdown';
import type { SavedStep } from '@/lib/sessions';
import type { Language } from '@/lib/translations';

type VoiceAgentProps = {
  step: SavedStep;
  vocabulary: VocabularyItem[];
};

function buildDynamicVariables(
  step: SavedStep,
  vocabulary: VocabularyItem[],
  language: Language,
  copy: { noHints: string; noVocabulary: string },
) {
  return {
    language,
    current_task: step.text,
    current_hints: step.hints.length > 0 ? step.hints.join(' | ') : copy.noHints,
    current_vocabulary:
      vocabulary.length > 0
        ? vocabulary.map((item) => `${item.word}: ${item.definition}`).join(' | ')
        : copy.noVocabulary,
  };
}

function VoiceAgent({ step, vocabulary }: VoiceAgentProps) {
  const { t, language } = useLanguage();
  const [isStarting, setIsStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  const { startSession, endSession, sendContextualUpdate, status } = useConversation();
  const endSessionRef = useRef(endSession);
  endSessionRef.current = endSession;
  const syncedStepIdRef = useRef<string | null>(null);

  useEffect(() => () => endSessionRef.current(), []);

  const isConnected = status === 'connected';
  const isConnecting = isStarting || status === 'connecting';
  const hasError = startFailed || status === 'error';

  useEffect(() => {
    if (!isConnected || syncedStepIdRef.current === step.id) return;
    syncedStepIdRef.current = step.id;
    sendContextualUpdate(
      `The user has navigated to a new step. The new task is: "${step.text}". The new hints are: "${step.hints.length > 0 ? step.hints.join(' | ') : t('noHints')}".`,
    );
  }, [step.id, isConnected, sendContextualUpdate, step.text, step.hints, t]);

  async function handleStart() {
    setStartFailed(false);
    setIsStarting(true);
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphone.getTracks().forEach((track) => track.stop());
      const token = await fetchConversationToken();
      syncedStepIdRef.current = step.id;
      startSession({
        conversationToken: token,
        connectionType: 'webrtc',
        dynamicVariables: buildDynamicVariables(step, vocabulary, language, {
          noHints: t('noHints'),
          noVocabulary: t('noVocabulary'),
        }),
      });
    } catch {
      setStartFailed(true);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {hasError ? (
        <p
          role="alert"
          className="animate-fade-in-quick rounded-xl bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-lg"
        >
          {t('tutorError')}
        </p>
      ) : null}

      {isConnected ? (
        <div className="animate-fade-in-quick flex items-center gap-3 rounded-full bg-white p-2 pl-5 shadow-lg ring-1 ring-ink/10">
          <span role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            {t('listening')}
          </span>
          <button
            type="button"
            onClick={() => endSession()}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-600/30"
          >
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            {t('stopTutor')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
          {isConnecting ? t('connectingTutor') : t('talkToTutor')}
        </button>
      )}
    </div>
  );
}

export default VoiceAgent;
