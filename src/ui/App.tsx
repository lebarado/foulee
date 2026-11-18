import { useEffect } from 'preact/hooks';
import { init, ready, toast } from '../data/store';
import { Planning } from './pages/Planning';
import { Progress } from './pages/Progress';
import { SettingsPage } from './pages/SettingsPage';
import { Today } from './pages/Today';
import { SheetHost } from './Sheets';
import { tab, type Tab } from './state';

const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: 'today', emoji: '⚡', label: 'Aujourd’hui' },
  { id: 'plan', emoji: '🗓️', label: 'Planning' },
  { id: 'progress', emoji: '📈', label: 'Progrès' },
  { id: 'settings', emoji: '⚙️', label: 'Réglages' },
];

export function App() {
  useEffect(() => {
    void init();
  }, []);

  if (!ready.value) return <div class="splash">🏃</div>;

  return (
    <>
      <main class="screen">
        {tab.value === 'today' && <Today />}
        {tab.value === 'plan' && <Planning />}
        {tab.value === 'progress' && <Progress />}
        {tab.value === 'settings' && <SettingsPage />}
      </main>
      <nav class="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            class={`nav__item ${tab.value === t.id ? 'nav__item--on' : ''}`}
            aria-current={tab.value === t.id ? 'page' : undefined}
            onClick={() => {
              tab.value = t.id;
              window.scrollTo({ top: 0 });
            }}
          >
            <span class="nav__emoji" aria-hidden="true">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <SheetHost />
      <ToastView />
    </>
  );
}

const CONFETTI = ['#5ee6a8', '#b69cff', '#ffc24b', '#ff7aa8', '#6cc7ff'];

function ToastView() {
  const t = toast.value;
  if (!t) return null;
  return (
    <div class="toast-wrap" key={t.id} aria-live="polite">
      {t.party && (
        <div class="confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 41) % 100}%`,
                background: CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 6) * 60}ms`,
                transform: `rotate(${i * 37}deg)`,
              }}
            />
          ))}
        </div>
      )}
      <div class={`toast ${t.party ? 'toast--party' : ''}`}>
        <strong>{t.title}</strong>
        {t.sub && <span>{t.sub}</span>}
      </div>
    </div>
  );
}
