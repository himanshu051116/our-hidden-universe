import { useEffect, useState } from 'react';

const loveSequence = ['l', 'o', 'v', 'e'];
const moonSequence = ['m', 'o', 'o', 'n'];

export default function useEasterEggs() {
  const [message, setMessage] = useState('');
  const [altTheme, setAltTheme] = useState(false);

  useEffect(() => {
    let keys = [];

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      keys = [...keys.slice(-3), key];

      if (event.ctrlKey && event.shiftKey && key === 'h') {
        setMessage('Hidden signal unlocked: "Every road ends in us."');
      }

      if (loveSequence.every((letter, idx) => keys[idx] === letter)) {
        setAltTheme((previous) => !previous);
        setMessage('Theme shifted by secret code LOVE.');
      }

      if (moonSequence.every((letter, idx) => keys[idx] === letter)) {
        setMessage('Moon mode whisper: "Look up. I am under this sky too."');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--cursor-x', '50vw');
    root.style.setProperty('--cursor-y', '30vh');
    if (altTheme) {
      document.body.classList.add('theme-aurora');
    } else {
      document.body.classList.remove('theme-aurora');
    }
  }, [altTheme]);

  useEffect(() => {
    function onMove(event) {
      document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`);
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), 3200);
    return () => clearTimeout(timer);
  }, [message]);

  return { easterEggMessage: message };
}
