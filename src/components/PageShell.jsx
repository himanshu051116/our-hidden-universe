import { motion } from 'framer-motion';
import useLiteEffects from '../hooks/useLiteEffects.js';

export default function PageShell({ children, className = '' }) {
  const liteEffects = useLiteEffects();

  return (
    <motion.main
      initial={liteEffects ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={liteEffects ? { opacity: 0 } : { opacity: 0, y: -14 }}
      transition={{ duration: liteEffects ? 0.18 : 0.55, ease: 'easeOut' }}
      className={`cinematic-bg relative z-10 min-h-screen ${className}`}
    >
      {children}
    </motion.main>
  );
}
