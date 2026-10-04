import { HeartHandshake, Home, MessageCircleHeart, Sparkles, Stars } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const items = [
  { to: '/universe/home', label: 'Home', icon: Home, family: ['/universe/home'] },
  { to: '/universe/chat', label: 'Chat', icon: MessageCircleHeart, family: ['/universe/chat'] },
  { to: '/universe/together', label: 'Together', icon: HeartHandshake, family: ['/universe/together'] },
  { to: '/universe/sky', label: 'Night Sky', icon: Stars, family: ['/universe/sky'] },
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
    <nav className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_45px_rgba(0,0,0,.35)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-stretch justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
        {items.map(({ to, label, icon: Icon, family }) => {
          const active = belongsToFamily(location.pathname, family);
          return (
            <NavLink
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] leading-none transition sm:px-2 sm:text-xs ${
                active
                  ? 'bg-blush/15 text-white shadow-[inset_0_0_0_1px_rgba(244,174,190,.38)]'
                  : 'text-pink-100/65 hover:bg-white/[0.06] hover:text-pink-100'
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
