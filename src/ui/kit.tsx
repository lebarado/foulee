import type { ComponentChildren } from 'preact';

/** Section : petit titre discret, puis le contenu (souvent une liste groupée). */
export function Section({ title, aside, children }: { title: string; aside?: ComponentChildren; children: ComponentChildren }) {
  return (
    <section class="section">
      <div class="section__head">
        <h2 class="section__title">{title}</h2>
        {aside && <span class="section__aside">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Anneau de progression fin (0 → 1). */
export function Ring({ value, size = 24 }: { value: number; size?: number }) {
  const r = (size - 3) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg class="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle class="ring__track" cx={size / 2} cy={size / 2} r={r} />
      <circle
        class="ring__value"
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke-dasharray={c}
        stroke-dashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <i style={{ width: `${Math.min(1, value) * 100}%` }} />
    </div>
  );
}
