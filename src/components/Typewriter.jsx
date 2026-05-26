import { useEffect, useState } from 'react';

export default function Typewriter({ text, speed = 50 }) {
  const [rendered, setRendered] = useState('');

  useEffect(() => {
    setRendered('');
    let index = 0;
    const timer = setInterval(() => {
      setRendered(text.slice(0, index + 1));
      index += 1;
      if (index >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {rendered}
      <span className="ml-1 animate-pulse text-roseGold">|</span>
    </span>
  );
}
