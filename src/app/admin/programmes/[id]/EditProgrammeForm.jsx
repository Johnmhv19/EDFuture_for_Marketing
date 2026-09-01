'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEVEL_LABEL, LEVEL_SHORT, LEVEL_ORDER, PATHWAY_LABEL, PATHWAY_COLOR } from '@/lib/labels';
import { withBase } from '@/lib/basePath';

const LEVELS = LEVEL_ORDER;
const PATHWAYS = Object.keys(PATHWAY_LABEL);
const STATUSES = ['Confirmed', 'Planned', 'TBD', 'In development'];

export default function EditProgrammeForm({ programme }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: programme.name,
    level: programme.level,
    pathway: programme.pathway,
    status: programme.status,
    yearLevel: programme.yearLevel || '',
    partners: programme.partners || '',
    venue: programme.venue || '',
    dates: programme.dates || '',
    description: programme.description || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setOk(false);
    try {
      const res = await fetch(withBase(`/api/admin/programmes/${programme.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
        <Field label="Dates">
          <input value={form.dates} onChange={e => set('dates', e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="Description">
        <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input min-h-[100px]" />
      </Field>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button type="button" onClick={destroy} disabled={busy} className="btn btn-danger">Delete programme</button>
        <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
      <style>{`.input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }`}</style>
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
