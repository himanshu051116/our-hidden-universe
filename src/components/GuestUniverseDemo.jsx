import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Clapperboard,
  Heart,
  MessageCircleHeart,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Stars,
} from 'lucide-react';

const tabs = [
  { key: 'chat', label: 'Chat', icon: MessageCircleHeart },
  { key: 'sky', label: 'Night Sky', icon: Stars },
  { key: 'letters', label: 'Letters', icon: Heart },
  { key: 'watch', label: 'Together', icon: Clapperboard },
];

const initialMessages = [
  { id: 1, from: 'partner', text: 'I saw the moon and thought of you. 🌙' },
  { id: 2, from: 'you', text: 'Then we were looking at the same sky. ❤️' },
];
const replies = [
  'Saving that thought for our next movie night. 💗',
  'You just made me smile. ✨',
  'A tiny moment for our universe. 🌙',
];
const defaultMemories = [
  { id: 1, title: 'Our first hello' },
  { id: 2, title: 'That unforgettable laugh' },
  { id: 3, title: 'A sky we both saw' },
];
const starPositions = [
  [22, 35], [48, 19], [74, 53], [34, 74], [82, 22],
  [15, 67], [60, 78], [92, 68], [52, 49], [9, 17],
];
const letters = [
  {
    title: 'You miss me',
    heading: 'The distance is only temporary.',
    body: 'Look up tonight. Somewhere under that same sky, someone is cheering you on and wishing you were here.',
  },
  {
    title: 'You need a smile',
    heading: 'A little reminder for you.',
    body: 'Remember that time we laughed over nothing? Keep a little of that happiness with you today. You deserve it.',
  },
  {
    title: 'You had a hard day',
    heading: 'You did enough today.',
    body: 'You do not have to find every answer tonight. Rest a little. Tomorrow is another page of our story.',
  },
];

const actionClass = 'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#ffc2d6] px-3.5 text-xs font-bold text-[#210f25] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] disabled:cursor-not-allowed disabled:opacity-45';
const secondaryClass = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.04] px-3.5 text-xs font-semibold text-pink-100 transition hover:border-[#ffc2d6]/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6]';

function ChatDemo() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  function sendMessage(event) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    const nextIndex = messages.filter((message) => message.from === 'you').length;
    setMessages((current) => [
      ...current.slice(-9),
      { id: Date.now(), from: 'you', text: value },
      { id: Date.now() + 1, from: 'partner', text: replies[nextIndex % replies.length] },
    ]);
    setDraft('');
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' }));
  }

  function resetChat() {
    setMessages(initialMessages);
    setDraft('');
  }

  return (
    <div className="flex h-[320px] min-h-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#090b19]/90 p-3 sm:h-[350px] sm:p-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#48314f] text-lg" aria-hidden="true">🌙</span>
          <div>
            <p className="text-sm font-semibold text-white">Your favourite person</p>
            <p className="text-[10px] text-emerald-200/75">Fictional sample conversation</p>
          </div>
        </div>
        <button type="button" onClick={resetChat} className={secondaryClass} aria-label="Reset sample chat">
          <RotateCcw size={13} aria-hidden="true" /> Reset
        </button>
      </div>
      <div role="log" aria-label="Sample chat messages" aria-live="polite" aria-relevant="additions" className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain pb-1 pr-1">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              'max-w-[88%] break-words rounded-2xl px-3.5 py-2 text-[13px] leading-5 ' +
              (message.from === 'you'
                ? 'self-end rounded-br-md bg-[#a85885]/35 text-white'
                : 'self-start rounded-bl-md bg-white/[0.09] text-pink-100/90')
            }
          >
            {message.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={sendMessage} className="mt-2 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] p-1.5">
        <label htmlFor="sample-chat-text" className="sr-only">Type a sample message</label>
        <input
          id="sample-chat-text"
          type="text"
          autoComplete="off"
          value={draft}
          maxLength={140}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message…"
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-pink-100/45 focus:outline-none"
        />
        <button type="submit" disabled={!draft.trim()} className={actionClass} aria-label="Send sample message">
          <Send size={15} aria-hidden="true" /> <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}

function SkyDemo() {
  const [memories, setMemories] = useState(defaultMemories);
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState(1);
  const atLimit = memories.length >= starPositions.length;

  function addMemory(event) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || atLimit) return;
    const id = Math.max(...memories.map((memory) => memory.id)) + 1;
    setMemories((current) => [...current, { id, title }]);
    setSelected(id);
    setDraft('');
  }

  function resetSky() {
    setMemories(defaultMemories);
    setSelected(defaultMemories[0].id);
    setDraft('');
  }

  return (
    <div className="relative flex h-[320px] min-h-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_50%_75%,#332144_0%,#11152b_50%,#060814_95%)] p-3 sm:h-[350px] sm:p-4">
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#f5bdd3]">OUR NIGHT SKY</p>
          <h3 className="mt-1 font-display text-[27px] leading-none text-white">A sky made of memories.</h3>
        </div>
        <button type="button" onClick={resetSky} className={secondaryClass} aria-label="Reset sample sky">
          <RotateCcw size={13} aria-hidden="true" /> Reset
        </button>
      </div>
      <div className="relative z-0 my-2 min-h-0 flex-1 rounded-2xl border border-white/[0.06] bg-black/10" aria-label="Interactive sample memory sky">
        {memories.map((memory, index) => {
          const [left, top] = starPositions[index];
          return (
            <button
              key={memory.id}
              type="button"
              onClick={() => setSelected(memory.id)}
              aria-label={'Open star: ' + memory.title}
              aria-pressed={selected === memory.id}
              className={
                'absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffc2d6] ' +
                (selected === memory.id ? 'scale-125 text-[#ffbfd7]' : 'hover:scale-125')
              }
              style={{ left: left + '%', top: top + '%' }}
            >
              <Stars size={16} fill="currentColor" className="drop-shadow-[0_0_12px_rgba(255,210,233,.8)]" aria-hidden="true" />
            </button>
          );
        })}
        <div className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-16px)] rounded-xl border border-white/10 bg-[#090a1c]/80 px-2.5 py-1.5 text-xs text-[#ffdfeb]" aria-live="polite">
          {memories.find((memory) => memory.id === selected)?.title || 'Choose a star'}
        </div>
      </div>
      <form onSubmit={addMemory} className="relative z-10 flex items-center gap-2">
        <label htmlFor="sample-star-title" className="sr-only">Name a sample memory</label>
        <input
          id="sample-star-title"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={atLimit ? 'Sample sky is full' : 'Name a little memory…'}
          maxLength={48}
          disabled={atLimit}
          className="min-w-0 min-h-10 flex-1 rounded-full border border-white/15 bg-[#090a1c]/80 px-3.5 text-xs text-white placeholder:text-pink-100/55 focus:border-[#ffc2d6]/60 focus:outline-none disabled:opacity-50"
        />
        <button type="submit" disabled={!draft.trim() || atLimit} className={actionClass}>
          <Sparkles size={14} aria-hidden="true" /> Add star
        </button>
      </form>
      <p className="mt-1 text-[10px] text-pink-100/55" aria-live="polite">{memories.length} sample stars. Tap a star to read its memory.</p>
    </div>
  );
}

function LettersDemo() {
  const [selected, setSelected] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const letter = letters[selected];

  return (
    <div className="flex h-[320px] min-h-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_50%_34%,#452a4d,#17101e_70%,#0d0b18)] p-3 sm:h-[350px] sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#ffbfd1]">Open when…</p>
      <div aria-label="Choose a sample letter" role="group" className="mt-2 flex flex-wrap gap-2">
        {letters.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => { setSelected(index); setIsOpen(false); }}
            aria-pressed={selected === index}
            className={
              'min-h-9 rounded-full border px-2.5 text-[11px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] ' +
              (selected === index ? 'border-[#ffc2d6]/70 bg-[#ffc2d6]/20 text-white' : 'border-white/15 bg-white/5 text-pink-100/70 hover:border-white/30')
            }
          >
            {item.title}
          </button>
        ))}
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-center">
        <span className="mb-1 text-3xl" aria-hidden="true">{isOpen ? '💌' : '✉️'}</span>
        <h3 className="font-display text-[27px] leading-tight text-white">
          {isOpen ? letter.heading : 'A note for when ' + letter.title.toLowerCase() + '.'}
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-5 text-pink-100/75" aria-live="polite">
          {isOpen ? letter.body : 'Just one small envelope, ready when you need it.'}
        </p>
      </div>
      <button type="button" onClick={() => setIsOpen((open) => !open)} className={actionClass + ' mt-3 self-center'}>
        {isOpen ? 'Close letter' : 'Open letter'}
      </button>
    </div>
  );
}

const durationSeconds = 60;
function formatTime(value) {
  return '0:' + String(value).padStart(2, '0');
}

function TogetherDemo({ active }) {
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!active || !isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((previous) => {
        if (previous >= durationSeconds - 1) {
          window.clearInterval(timer);
          return durationSeconds;
        }
        return previous + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, isPlaying]);

  useEffect(() => {
    if (!active || seconds >= durationSeconds) setIsPlaying(false);
  }, [active, seconds]);

  function toggle() {
    if (seconds >= durationSeconds) setSeconds(0);
    setIsPlaying((playing) => !playing);
  }

  function reset() {
    setIsPlaying(false);
    setSeconds(0);
  }

  const progress = seconds / durationSeconds * 100;

  return (
    <div className="flex h-[320px] min-h-0 flex-col rounded-[22px] border border-white/10 bg-[#0a0b17] p-3 sm:h-[350px] sm:p-4">
      <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_55%_10%,#754d79,#27243b_70%,#111426)] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffd0e0]">A shared movie-night timeline</p>
        <h3 className="mt-1 font-display text-[25px] leading-tight text-white">Press play. Stay in sync.</h3>
        <p className="mt-0.5 text-[10px] text-pink-100/65">Simulated playback, not a real video stream</p>
      </div>
      <div className="mt-3 grid flex-1 grid-cols-2 gap-2" aria-label="Two synchronized sample screens">
        {['You', 'Partner'].map((person) => (
          <div key={person} className="flex min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#17162b] p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-[#ffe0eb]">
              <span className={'h-1.5 w-1.5 rounded-full ' + (isPlaying ? 'bg-emerald-300' : 'bg-pink-100/40')} />
              {person}
            </div>
            <div className="text-center">
              {isPlaying ? <Play size={22} className="mx-auto text-[#ffbfd7]" fill="currentColor" aria-hidden="true" /> : <Pause size={22} className="mx-auto text-[#ffbfd7]" aria-hidden="true" />}
              <p className="mt-1 font-mono text-lg text-white">{formatTime(seconds)}</p>
            </div>
            <div role="progressbar" aria-label={person + ' sample playback progress'} aria-valuemin={0} aria-valuemax={60} aria-valuenow={seconds} className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[#ffc2d6] transition-[width] duration-700" style={{ width: progress + '%' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="max-w-[45%] text-xs text-pink-100/70" aria-live="polite">
          {seconds >= durationSeconds ? 'Sample finished' : isPlaying ? 'Both timelines are playing' : seconds ? 'Both timelines paused' : 'Ready to start'}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className={secondaryClass} aria-label="Restart sample playback">
            <RotateCcw size={13} aria-hidden="true" /> Reset
          </button>
          <button type="button" onClick={toggle} className={actionClass}>
            {isPlaying ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
            {isPlaying ? 'Pause' : seconds ? 'Resume' : 'Play sample'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuestUniverseDemo() {
  const [activeTab, setActiveTab] = useState('chat');
  const tabRefs = useRef({});
  const previewRef = useRef(null);

  function onTabKeyDown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    setActiveTab(tabs[next].key);
    tabRefs.current[tabs[next].key]?.focus();
  }

  useEffect(() => {
    function focusWhenRequested() {
      if (window.location.hash !== '#preview') return;
      const focusTarget = previewRef.current;
      window.requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
    }
    window.addEventListener('hashchange', focusWhenRequested);
    if (window.location.hash === '#preview') focusWhenRequested();
    return () => window.removeEventListener('hashchange', focusWhenRequested);
  }, []);

  return (
    <section id="preview" ref={previewRef} tabIndex={-1} aria-label="Try the interactive sample universe" className="relative mx-auto w-full max-w-[530px] scroll-mt-20 outline-none">
      <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-[#c65a98]/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[#151022]/95 p-3 shadow-[0_32px_85px_rgba(0,0,0,.5)] sm:rounded-[36px] sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 px-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ef9fbd]/15 text-[#ffbed2]">
              <Heart size={15} fill="currentColor" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-white">Try a little universe</p>
              <p className="text-[10px] text-pink-100/65">Interact freely · no account needed</p>
            </div>
          </div>
          <span className="rounded-full border border-[#ffc2d6]/20 bg-[#ffc2d6]/10 px-3 py-1 text-[10px] font-semibold text-[#ffc2d6]">SAMPLE</span>
        </div>
        <div role="tablist" aria-label="Try four OHS features" className="mb-3 grid grid-cols-4 gap-1 rounded-2xl bg-black/30 p-1">
          {tabs.map(({ key, label, icon: Icon }, index) => (
            <button
              key={key}
              id={'demo-tab-' + key}
              ref={(node) => { tabRefs.current[key] = node; }}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              aria-controls={'demo-panel-' + key}
              tabIndex={activeTab === key ? 0 : -1}
              onClick={() => setActiveTab(key)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={
                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc2d6] sm:flex-row sm:gap-2 sm:text-xs ' +
                (activeTab === key ? 'bg-[#ffc2d6] text-[#241224]' : 'text-pink-100/70 hover:bg-white/10 hover:text-white')
              }
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <div id="demo-panel-chat" role="tabpanel" aria-labelledby="demo-tab-chat" className={activeTab === 'chat' ? '' : 'hidden'}>
          <ChatDemo />
        </div>
        <div id="demo-panel-sky" role="tabpanel" aria-labelledby="demo-tab-sky" className={activeTab === 'sky' ? '' : 'hidden'}>
          <SkyDemo />
        </div>
        <div id="demo-panel-letters" role="tabpanel" aria-labelledby="demo-tab-letters" className={activeTab === 'letters' ? '' : 'hidden'}>
          <LettersDemo />
        </div>
        <div id="demo-panel-watch" role="tabpanel" aria-labelledby="demo-tab-watch" className={activeTab === 'watch' ? '' : 'hidden'}>
          <TogetherDemo active={activeTab === 'watch'} />
        </div>
        <p className="mt-3 px-1 text-center text-[11px] leading-5 text-pink-100/65">
          This is an interactive simulation with fictional content. Nothing is sent, saved, or shared with another person.
        </p>
      </div>
      <a href="#how-it-works" className="mt-2 flex items-center justify-center gap-1 text-xs text-pink-100/65 transition hover:text-white">
        See how you make your own space <ArrowRight size={12} aria-hidden="true" />
      </a>
    </section>
  );
}
