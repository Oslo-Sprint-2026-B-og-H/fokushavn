import { useEffect, useRef, useState } from 'react';
import { fetchSpeechAudio } from '@/lib/elevenlabs';

export type ReadAloudStatus = 'idle' | 'loading' | 'playing' | 'error';

export function useReadAloud(text: string) {
  const [status, setStatus] = useState<ReadAloudStatus>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  useEffect(
    () => () => {
      requestRef.current += 1;
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function release() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  function stop() {
    requestRef.current += 1;
    release();
    setStatus('idle');
  }

  async function toggle() {
    if (status === 'loading' || status === 'playing') {
      stop();
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setStatus('loading');

    try {
      const blob = await fetchSpeechAudio(text);
      if (requestRef.current !== requestId) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      urlRef.current = url;
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current !== audio) return;
        release();
        setStatus('idle');
      };

      await audio.play();
      if (requestRef.current !== requestId) return;
      setStatus('playing');
    } catch {
      if (requestRef.current !== requestId) return;
      release();
      setStatus('error');
    }
  }

  return { status, toggle };
}
