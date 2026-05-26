import { motion } from 'framer-motion';

export default function PageShell({ children, className = '' }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={`cinematic-bg relative z-10 min-h-screen ${className}`}
    >
      {children}
    </motion.main>
  );
}
