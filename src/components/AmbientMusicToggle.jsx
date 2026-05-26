import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ambientTrack = 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3';

export default function AmbientMusicToggle({ className = '' }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(ambientTrack);
    audio.loop = true;
    audio.volume = 0.32;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  async function toggleAudio() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleAudio}
      className={`glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-pink-100 transition hover:text-white ${className}`}
      aria-label={playing ? 'Pause ambient music' : 'Play ambient music'}
    >
      {playing ? <Pause size={14} /> : <Play size={14} />}
      {playing ? 'Ambient On' : 'Ambient Off'}
    </button>
  );
}
