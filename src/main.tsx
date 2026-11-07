import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConversationProvider } from '@elevenlabs/react';
import App from './App.tsx';
import LanguageProvider from '@/contexts/LanguageProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ConversationProvider>
        <App />
      </ConversationProvider>
    </LanguageProvider>
  </StrictMode>
);
