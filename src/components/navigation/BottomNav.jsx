import { HeartHandshake, Home, MessageCircleHeart, Sparkles, Stars } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const items = [
  { to: '/universe/home', label: 'Home', icon: Home, family: ['/universe/home'] },
  { to: '/universe/chat', label: 'Chat', icon: MessageCircleHeart, family: ['/universe/chat'] },
  { to: '/universe/together', label: 'Together', icon: HeartHandshake, family: ['/universe/together'] },
  { to: '/universe/sky', label: 'Sky', icon: Stars, family: ['/universe/sky'] },
  {
    to: '/universe/us',
    label: 'Us',
    icon: Sparkles,
    family: [
      '/universe/us',
      '/universe/memories',
      '/universe/timeline',
      '/universe/open-when',
      '/universe/extras',
      '/birthday-surprise',
    ],
  },
];

function belongsToFamily(pathname, family) {
  return family.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="app-bottom-nav fixed inset-x-2.5 bottom-[calc(0.55rem+env(safe-area-inset-bottom))] z-40 lg:inset-x-0 lg:bottom-auto lg:top-4 lg:px-4">
      <div className="mx-auto grid max-w-md grid-cols-5 rounded-[1.35rem] border border-white/10 bg-midnight/92 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,.48)] backdrop-blur-2xl lg:flex lg:max-w-2xl lg:items-center lg:justify-center lg:gap-1 lg:rounded-full lg:px-2 lg:py-2">
        {items.map(({ to, label, icon: Icon, family }) => {
          const active = belongsToFamily(location.pathname, family);
          return (
            <NavLink
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[1rem] px-0.5 py-1.5 text-center transition active:scale-[0.97] lg:min-h-11 lg:flex-row lg:gap-2 lg:rounded-full lg:px-4 lg:py-2 ${
                active
                  ? 'bg-white/[0.07] text-white'
                  : 'text-pink-100/52 hover:bg-white/[0.04] hover:text-pink-100'
              }`}
            >
              <span className={`grid h-7 w-8 place-items-center rounded-xl transition ${active ? 'bg-blush/14 text-blush ring-1 ring-blush/20' : ''}`}>
                <Icon size={18} strokeWidth={active ? 2.25 : 1.8} />
              </span>
              <span className={`max-w-full truncate text-[9px] font-medium leading-none tracking-[0.01em] sm:text-[10px] lg:text-sm ${active ? 'text-white' : ''}`}>
                {label}
              </span>
              {active ? <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-blush/70 lg:hidden" /> : null}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
