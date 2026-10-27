import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

export const money = (n) => (n == null ? '—' : 'PKR ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 }));
export const dt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const notify = (msg, type = 'ok') => window.dispatchEvent(new CustomEvent('toast', { detail: { msg, type, id: Math.random() } }));

export function useLoad(path) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const reload = useCallback(() => api.get(path).then((d) => { setData(d); setErr(null); }).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, err, reload };
}
/** Runs an API action, shows a toast and refreshes. */
export const act = async (fn, okMsg, reload) => {
  try { await fn(); if (okMsg) notify(okMsg); reload && (await reload()); } catch (e) { notify(e.message, 'err'); }
};

export function Toaster() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const h = (e) => { setList((l) => [...l, e.detail]); setTimeout(() => setList((l) => l.filter((x) => x.id !== e.detail.id)), 4500); };
    window.addEventListener('toast', h); return () => window.removeEventListener('toast', h);
  }, []);
  return <div className="toasts">{list.map((t) => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}</div>;
}

export const Loading = ({ data, err, children }) => (err ? <div className="alert danger">{err}. Is the backend running on port 5000?</div> : !data ? <div className="muted pad">Loading…</div> : children);
export const Page = ({ title, sub, actions, children }) => (
  <div className="page"><header className="page-head"><div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div><div className="row gap">{actions}</div></header>{children}</div>
);
export const Card = ({ title, actions, children, className = '' }) => (
  <section className={'card ' + className}>{(title || actions) && <div className="card-head"><h3>{title}</h3><div className="row gap">{actions}</div></div>}{children}</section>
);
const tone = { Approved: 'ok', Pass: 'ok', Resolved: 'ok', Closed: 'ok', Done: 'ok', Pending: 'warn', Proposed: 'warn', Open: 'bad', 'In Progress': 'warn', Fail: 'bad', Rejected: 'bad', Critical: 'bad', High: 'warn', Medium: 'info', Low: 'ok', Must: 'bad', Should: 'warn', Could: 'info', Wont: 'ok' };
export const Badge = ({ children }) => <span className={'badge ' + (tone[children] || 'info')}>{children}</span>;
export const Stat = ({ label, value, sub, level }) => (<div className={'stat ' + (level || '')}><span className="muted">{label}</span><strong>{value}</strong>{sub && <small className="muted">{sub}</small>}</div>);
export const Warnings = ({ list }) => (list?.length ? <div className="stack">{list.map((w, i) => <div key={i} className={'alert ' + w.level}>{w.msg}</div>)}</div> : <div className="alert ok">No warnings. Everything is within thresholds.</div>);
export const Tabs = ({ tabs, value, onChange }) => <div className="tabs">{tabs.map((t) => <button key={t} className={t === value ? 'on' : ''} onClick={() => onChange(t)}>{t}</button>)}</div>;
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Btn = ({ kind = '', ...p }) => <button {...p} className={'btn ' + kind + ' ' + (p.className || '')} />;

export function Table({ cols, rows, empty = 'Nothing here yet.' }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return (<div className="scroll"><table><thead><tr>{cols.map((c) => <th key={c.h}>{c.h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={r._id || r.id || i}>{cols.map((c) => <td key={c.h} className={c.cls}>{c.r(r)}</td>)}</tr>)}</tbody></table></div>);
}

/** Generic form dialog. fields: {name,label,type,options,required,wide,min,max}. type: text|number|date|textarea|select|multi|lines */
export function FormModal({ title, fields, initial = {}, onSubmit, onClose, submitLabel = 'Save' }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => {
    const x = initial[f.name];
    return [f.name, f.type === 'lines' ? (x || []).join('\n') : f.type === 'date' ? iso(x) : f.type === 'multi' ? (x || []).map((i) => i._id || i) : x ?? ''];
  })));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));
  const go = async (e) => {
    e.preventDefault(); setBusy(true);
    const out = {};
    fields.forEach((f) => {
      let x = v[f.name];
      if (f.type === 'lines') x = x.split('\n').map((s) => s.trim()).filter(Boolean);
      else if (f.type === 'number') x = x === '' ? undefined : Number(x);
      else if (f.type === 'bool') x = x === 'true';
      if (x !== '' && x !== undefined) out[f.name] = x;
    });
    try { await onSubmit(out); onClose(); } catch (ex) { setErr(ex.message); setBusy(false); }
  };
  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={go}>
        <h3>{title}</h3>
        <div className="grid2">
          {fields.map((f) => (
            <label key={f.name} className={f.wide || f.type === 'textarea' || f.type === 'lines' || f.type === 'multi' ? 'wide' : ''}>
              <span>{f.label}{f.required && ' *'}</span>
              {f.type === 'select' || f.type === 'bool' ? (
                <select value={v[f.name]} required={f.required} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="">{f.required ? 'Select…' : '—'}</option>
                  {(f.type === 'bool' ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] : f.options).map((o) => (typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o}>{o}</option>))}
                </select>
              ) : f.type === 'textarea' || f.type === 'lines' ? (
                <textarea rows={f.type === 'lines' ? 4 : 3} value={v[f.name]} required={f.required} onChange={(e) => set(f.name, e.target.value)} placeholder={f.type === 'lines' ? 'One per line' : ''} />
              ) : f.type === 'multi' ? (
                <div className="chips">{f.options.length ? f.options.map((o) => (
                  <button type="button" key={o.value} className={'chip ' + (v[f.name].includes(o.value) ? 'on' : '')}
                    onClick={() => set(f.name, v[f.name].includes(o.value) ? v[f.name].filter((x) => x !== o.value) : [...v[f.name], o.value])}>{o.label}</button>
                )) : <span className="muted">No options</span>}</div>
              ) : (
                <input type={f.type || 'text'} value={v[f.name]} required={f.required} min={f.min} max={f.max} step={f.step || 'any'} onChange={(e) => set(f.name, e.target.value)} />
              )}
            </label>
          ))}
        </div>
        {err && <div className="alert danger">{err}</div>}
        <div className="row gap end"><Btn type="button" onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={busy}>{submitLabel}</Btn></div>
      </form>
    </div>
  );
}

/** Editable list stored inside the project document (stakeholders, milestones, responsibilities). */
export function ListEditor({ title, items = [], fields, cols, onSave, noun }) {
  const [m, setM] = useState(null);
  const save = (list) => act(() => onSave(list), 'Saved');
  return (
    <Card title={title} actions={<Btn onClick={() => setM({ i: -1 })}>Add {noun}</Btn>}>
      <Table rows={items} cols={[...cols, { h: '', cls: 'actions', r: (r) => { const i = items.indexOf(r); return <><Btn kind="ghost" onClick={() => setM({ i })}>Edit</Btn><Btn kind="ghost danger" onClick={() => save(items.filter((_, k) => k !== i))}>Remove</Btn></>; } }]} />
      {m && <FormModal title={(m.i < 0 ? 'Add ' : 'Edit ') + noun} fields={fields} initial={m.i < 0 ? {} : items[m.i]} onClose={() => setM(null)}
        onSubmit={(b) => onSave(m.i < 0 ? [...items, b] : items.map((x, k) => (k === m.i ? b : x)))} />}
    </Card>
  );
}
