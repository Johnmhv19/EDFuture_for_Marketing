'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEVEL_LABEL, LEVEL_SHORT, LEVEL_ORDER, PATHWAY_LABEL } from '@/lib/labels';

const LEVELS = LEVEL_ORDER;
const PATHWAYS = Object.keys(PATHWAY_LABEL);

const STATUSES = ['Confirmed', 'Planned', 'TBD', 'In development'];

export default function NewProgrammeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    level: 'L1',
    pathway: 'ROBOTICS_ENGINEERING',
    status: 'Confirmed',
    yearLevel: '',
    partners: '',
    venue: '',
    dates: '',
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/programmes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'Failed to create');
        return;
      }
      const data = await res.json();
      router.push(`/admin/programmes/${data.id}`);
      router.refresh();
    } catch (e) {
      setErr('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">+ New programme</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold">New programme</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {err && <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{err}</div>}
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
                  <input value={form.yearLevel} onChange={e => set('yearLevel', e.target.value)} className="input" placeholder="e.g. G5/Y6 – IG1/Y10" />
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
                  <input value={form.dates} onChange={e => set('dates', e.target.value)} className="input" placeholder="e.g. 11–14 Sep 2026" />
                </Field>
              </div>
              <Field label="Description">
                <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input min-h-[80px]" />
              </Field>
            </div>
            <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? 'Creating…' : 'Create programme'}
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`.input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }`}</style>
    </>
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
