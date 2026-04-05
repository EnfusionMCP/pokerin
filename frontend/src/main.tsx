import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './stores/authStore.ts'

// Extract JWT from URL hash BEFORE React mounts.
// The backend redirects to /#/lobby?token=<jwt> after EVE SSO.
// We must capture it before HashRouter processes the URL.
const hash = window.location.hash;
const tokenMatch = hash.match(/[?&]token=([^&]+)/);
if (tokenMatch) {
  try {
    useAuthStore.getState().setToken(decodeURIComponent(tokenMatch[1]));
  } catch { /* malformed token */ }
  // Strip token from URL — replace (not push) to keep JWT out of history
  const cleanHash = hash.replace(/[?&]token=[^&]+/, '').replace(/\?$/, '');
  history.replaceState(null, '', cleanHash || '#/');
} else {
  // Restore session from localStorage
  useAuthStore.getState().init();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
