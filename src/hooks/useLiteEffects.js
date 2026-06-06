import { useEffect, useState } from 'react';

export default function useLiteEffects() {
  const [liteEffects, setLiteEffects] = useState(() =>
    window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px), (prefers-reduced-motion: reduce)');
    const onChange = () => setLiteEffects(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return liteEffects;
}
