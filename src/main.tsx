import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Mitigate foreign script execution errors and browser extension interference
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Check if the error is a cross-origin script error or benign third-party script error
    if (event.message === 'Script error.' || !event.filename || !event.filename.includes(window.location.host)) {
      console.warn('Suppressed benign third-party cross-origin or browser extension error:', event.message || event);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    // Guard against unhandled promise rejections that might originate from foreign script tools / browser plugins
    console.warn('Unhandled promise rejection captured:', event.reason);
    event.preventDefault();
    event.stopPropagation();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
