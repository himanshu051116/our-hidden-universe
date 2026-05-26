import { motion } from 'framer-motion';

export default function FloatingHeart() {
  return (
    <motion.div
      initial={{ y: 0, opacity: 0.8 }}
      animate={{ y: [-2, -24, -2], opacity: [0.7, 1, 0.75], scale: [1, 1.07, 1] }}
      transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
      className="relative h-20 w-20"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-blush/30 blur-xl" />
      <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[10px] bg-gradient-to-br from-blush to-roseGold shadow-rose" />
      <div className="absolute left-[34%] top-[22%] h-7 w-7 rounded-full bg-blush" />
      <div className="absolute left-[50%] top-[22%] h-7 w-7 rounded-full bg-roseGold" />
    </motion.div>
  );
}
