'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEVEL_LABEL, LEVEL_SHORT, LEVEL_ORDER, PATHWAY_LABEL, PATHWAY_COLOR } from '@/lib/labels';
import { withBase } from '@/lib/basePath';
import { toDateInputValue } from '@/lib/validate';

const LEVELS = LEVEL_ORDER;
const PATHWAYS = Object.keys(PATHWAY_LABEL);
const STATUSES = ['Confirmed', 'Planned', 'TBD', 'In development'];

// Initial state derived from the row. TBD when both fields are
// null; otherwise the dates are pre-populated as YYYY-MM-DD.
function buildInitialState(programme) {
  const isTbd = !programme.startDate && !programme.endDate;
  return {
    form: {
      name: programme.name,
      level: programme.level,
      pathway: programme.pathway,
      status: programme.status,
      yearLevel: programme.yearLevel || '',
      partners: programme.partners || '',
      venue: programme.venue || '',
      startDate: toDateInputValue(programme.startDate),
      endDate: toDateInputValue(programme.endDate),
      description: programme.description || '',
    },
    tbd: isTbd,
  };
}

export default function EditProgrammeForm({ programme }) {
  const router = useRouter();
  const [{ form, tbd: initialTbd }, setState] = useState(() => buildInitialState(programme));
  // tbd lives outside `form` so it isn't accidentally POSTed.
  const [tbd, setTbd] = useState(initialTbd);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  function set(k, v) {
    setState(prev => ({ form: { ...prev.form, [k]: v }, tbd: prev.tbd }));
  }

  function onTbdChange(next) {
    setTbd(next);
    if (next) {
      setState(prev => ({
        form: { ...prev.form, startDate: '', endDate: '' },
        tbd: next,
      }));
    } else {
      setState(prev => ({ ...prev, tbd: next }));
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setOk(false);
    const payload = {
      ...form,
      startDate: tbd ? null : (form.startDate || null),
      endDate: tbd ? null : (form.endDate || null),
    };
    try {
      const res = await fetch(withBase(`/api/admin/programmes/${programme.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'Failed to save');
        return;
      }
      setOk(true);
      router.refresh();
    } catch (e) {
      setErr('Network error');
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (!confirm(`Delete "${programme.name}"? This removes all its files too. This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(withBase(`/api/admin/programmes/${programme.id}`), { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/programmes');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'Failed to delete');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-3">
      <h2 className="font-bold">Details</h2>
      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{err}</div>}
      {ok && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded">Saved.</div>}

      <Field label="Name" required>
        <input value={form.name} onChange={e => set('name', e.target.value)} className="input" required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Level" required>
          <select value={form.level} onChange={e => set('level', e.target.value)} className="input">
            {LEVELS.map(l => <option key={l} value={l}>{LEVEL_SHORT[l]} — {LEVEL_LABEL[l]}</option>)}
          </select>
        </Field>
        <Field label="Pathway" required>
          <select value={form.pathway} onChange={e => set('pathway', e.target.value)} className="input">
            {PATHWAYS.map(p => <option key={p} value={p}>{PATHWAY_LABEL[p]}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" required>
          <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Year Level">
          <input value={form.yearLevel} onChange={e => set('yearLevel', e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="Partners">
        <input value={form.partners} onChange={e => set('partners', e.target.value)} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Venue">
          <input value={form.venue} onChange={e => set('venue', e.target.value)} className="input" />
        </Field>
        {/* The free-text "dates" field was removed in favour of the
            structured startDate/endDate picker below. The legacy
            column is still in the schema but is no longer exposed. */}
      </div>

      <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tbd}
            onChange={e => onTbdChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="font-semibold text-gray-800">TBD — no dates yet</span>
          <span className="text-xs text-gray-500">
            (programme exists but no scheduled date)
          </span>
        </label>
        <div className={`grid grid-cols-2 gap-3 ${tbd ? 'opacity-50 pointer-events-none' : ''}`}>
          <Field label="Start date">
            <input
              type="date"
              value={form.startDate}
              onChange={e => set('startDate', e.target.value)}
              disabled={tbd}
              className="input"
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.endDate}
              onChange={e => set('endDate', e.target.value)}
              disabled={tbd}
              className="input"
            />
          </Field>
        </div>
        {!tbd && form.startDate && form.endDate && form.endDate < form.startDate && (
          <p className="text-xs text-red-600">End date must be on or after the start date.</p>
        )}
      </div>

      <Field label="Description">
        <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input min-h-[100px]" />
      </Field>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button type="button" onClick={destroy} disabled={busy} className="btn btn-danger">Delete programme</button>
        <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
      <style>{`.input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; } .input:disabled { background-color: #f3f4f6; cursor: not-allowed; }`}</style>
    </form>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
