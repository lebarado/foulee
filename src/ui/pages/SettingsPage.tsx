import { Brain, Database, Download, Footprints, Layers, TriangleAlert, Upload, Wrench } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { toISO } from '../../domain/dates';
import type { Settings } from '../../domain/types';
import { actions, settings, showToast } from '../../data/store';
import { Section } from './Today';

type NumPath =
  | ['efHrCeiling']
  | ['windowDays']
  | ['maxShiftDays']
  | ['weeklyRunTarget']
  | ['weeklyStrengthTarget']
  | ['jokersPerMonth']
  | ['volume', keyof Settings['volume']]
  | ['coach', Exclude<keyof Settings['coach'], 'runWalk'>]
  | ['coach', 'runWalk', 'runMin' | 'walkMin'];

function getAt(s: Settings, p: NumPath): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return p.reduce<any>((o, k) => o[k], s) as number;
}

function setAt(s: Settings, p: NumPath, v: number): Settings {
  const next = structuredClone(s);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let o: any = next;
  for (const k of p.slice(0, -1)) o = o[k];
  o[p[p.length - 1]] = v;
  return next;
}

function Num({ label, path, step = 1, min = 0, max, pct, hint }: {
  label: string;
  path: NumPath;
  step?: number;
  min?: number;
  max?: number;
  pct?: boolean;
  hint?: string;
}) {
  const raw = getAt(settings.value, path);
  const shown = pct ? Math.round(raw * 100) : raw;
  return (
    <label class="setting">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={shown}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number((e.target as HTMLInputElement).value);
          if (!Number.isFinite(n)) return;
          void actions.saveSettings(setAt(settings.value, path, pct ? n / 100 : n));
        }}
      />
    </label>
  );
}

export function SettingsPage() {
  const [err, setErr] = useState<string | null>(null);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(actions.exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `foulee-sauvegarde-${toISO(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await actions.importData(await file.text());
      setErr(null);
      showToast({ title: 'Sauvegarde restaurée', sub: 'Tout est revenu' });
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Import impossible.');
    }
  };

  return (
    <>
      <h1 class="page-title">Réglages</h1>

      <Section title="Mon entraînement" icon={Footprints}>
        <div class="settings">
          <Num label="Plafond FC en EF" path={['efHrCeiling']} hint="bpm · test de la parole : tu dois pouvoir parler" />
          <Num label="Sorties par semaine" path={['weeklyRunTarget']} min={1} max={7} />
          <Num label="Renfos par semaine" path={['weeklyStrengthTarget']} min={0} max={7} />
          <Num label="Jokers par mois" path={['jokersPerMonth']} min={0} max={4} hint="protègent une semaine à une sortie près" />
        </div>
      </Section>

      <Section title="Cartes" icon={Layers}>
        <div class="settings">
          <Num label="Fenêtre « à caler »" path={['windowDays']} min={1} max={7} hint="jours à l’avance" />
          <Num label="Décalage max" path={['maxShiftDays']} min={1} max={4} hint="jours après la date prévue" />
        </div>
      </Section>

      <Section title="Règles du coach" icon={Brain}>
        <div class="settings">
          <Num label="Hausse de volume max" path={['volume', 'maxIncrease']} pct hint="% par semaine" />
          <Num label="Hausse plancher" path={['volume', 'minIncreaseMin']} hint="min, pour les petits volumes" />
          <Num label="Tolérance FC" path={['coach', 'hrMargin']} hint="bpm au-dessus du plafond avant marche" />
          <Num label="Course (alternance)" path={['coach', 'runWalk', 'runMin']} min={1} hint="min" />
          <Num label="Marche (alternance)" path={['coach', 'runWalk', 'walkMin']} min={1} hint="min" />
          <Num label="Ressenti « dur » dès" path={['coach', 'rpeHigh']} min={1} max={10} hint="/10" />
          <Num label="Réduction si dur" path={['coach', 'stepDownPct']} pct hint="%" />
          <Num label="Ressenti « facile » jusqu’à" path={['coach', 'rpeEasy']} min={1} max={10} hint="/10" />
          <Num label="Progression si facile" path={['coach', 'stepUpMin']} hint="min ajoutées" />
          <Num label="Durée max d’une sortie" path={['coach', 'maxRunMin']} hint="min" />
          <Num label="Coupure longue après" path={['coach', 'gapDays']} hint="jours" />
          <Num label="Réduction après coupure" path={['coach', 'gapPct']} pct hint="%" />
        </div>
      </Section>

      <Section title="Mes données" icon={Database}>
        <p class="help">Tout est stocké sur ce téléphone. Exporte régulièrement une sauvegarde.</p>
        <div class="row">
          <button class="btn btn--soft" onClick={exportFile}>
            <Download size={18} /> Exporter
          </button>
          <label class="btn btn--soft">
            <Upload size={18} /> Importer
            <input type="file" accept="application/json,.json" class="sr-only" onChange={importFile} />
          </label>
        </div>
        {err && <p class="hint hint--warn"><TriangleAlert size={16} /> {err}</p>}
        <button
          class="link"
          onClick={() => {
            if (confirm('Tout effacer et revenir aux données de départ ? Pense à exporter avant.')) void actions.reset();
          }}
        >
          Réinitialiser l’app
        </button>
      </Section>

      <Section title="Bientôt" icon={Wrench}>
        <ul class="cues">
          <li>Import Garmin (CSV puis FIT)</li>
          <li>Rappels : export .ics avec alarmes (en attendant, bouton Google Agenda sur chaque carte du planning)</li>
          <li>Notifications push via ton serveur maison</li>
        </ul>
      </Section>
    </>
  );
}
