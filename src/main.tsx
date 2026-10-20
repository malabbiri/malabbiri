import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA offline resilience and smartphone home screen installability
if (typeof window !== 'undefined') {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.log("MALA'BIRI PWA siap digunakan pada perangkat HP & desktop.");
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

