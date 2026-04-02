import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    }).catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(<App/>);
