import { useState, Fragment } from 'react';
import { api } from '../api';
import { useLoad, Loading, Page, Card, Btn, Badge, Tabs, Table, FormModal, act, notify } from '../ui.jsx';

const color = (s) => (s >= 15 ? 'var(--coral-soft)' : s >= 10 ? '#fbe3c4' : s >= 5 ? 'var(--amber-soft)' : 'var(--green-soft)');
const band = (s) => (s >= 15 ? 'Critical' : s >= 10 ? 'High' : s >= 5 ? 'Medium' : 'Low');

export default function Risks() {
  const { data, err, reload } = useLoad('/risks');
  const [tab, setTab] = useState('Prioritization matrix');
  const [m, setM] = useState(null);
  const list = data || [];
  const rank = Object.fromEntries(list.map((r, i) => [r._id, i + 1]));
  const fields = [{ name: 'title', label: 'Risk or issue', required: true, wide: true }, { name: 'category', label: 'Category' }, { name: 'owner', label: 'Owner' },
    { name: 'likelihood', label: 'Likelihood (1-5)', type: 'number', min: 1, max: 5, required: true }, { name: 'impact', label: 'Impact (1-5)', type: 'number', min: 1, max: 5, required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Mitigating', 'Occurred', 'Closed'] }, { name: 'trigger', label: 'Trigger / early warning', type: 'textarea' },
    { name: 'preventiveAction', label: 'Preventive action', type: 'textarea' }, { name: 'correctiveAction', label: 'Corrective action', type: 'textarea' }];
  const active = list.filter((r) => r.status !== 'Closed');
  return (
    <Page title="Risk control" sub="Rank risks by likelihood × impact and plan responses." actions={<Btn kind="primary" onClick={() => setM({ status: 'Open' })}>Add risk</Btn>}>
      <Loading data={data} err={err}>{data && (<>
        <Tabs tabs={['Prioritization matrix', 'PDPC', 'Risk register']} value={tab} onChange={setTab} />
        {tab === 'Prioritization matrix' && (<div className="grid g2">
          <Card title="Likelihood × impact grid"><div className="matrix">
            {[5, 4, 3, 2, 1].map((l) => (<Fragment key={l}>
              <div className="axis">L{l}</div>
              {[1, 2, 3, 4, 5].map((i) => <div key={l + '-' + i} className="cell" style={{ background: color(l * i) }} title={`Likelihood ${l} × Impact ${i} = ${l * i}`}>
                {active.filter((r) => r.likelihood === l && r.impact === i).map((r) => <span key={r._id} className="pin" title={r.title}>{rank[r._id]}</span>)}</div>)}
            </Fragment>))}
            <div />{[1, 2, 3, 4, 5].map((i) => <div className="axis" key={i}>I{i}</div>)}
          </div><p className="muted">Pin numbers match the ranking on the right. Likelihood rises upward, impact rises to the right.</p></Card>
          <Card title="Ranked by score"><Table rows={list} cols={[{ h: '#', r: (r) => <span className="pin">{rank[r._id]}</span> }, { h: 'Risk', r: (r) => r.title },
            { h: 'L×I', r: (r) => <b>{r.likelihood}×{r.impact} = {r.score}</b> }, { h: 'Level', r: (r) => <Badge>{band(r.score)}</Badge> }]} /></Card>
        </div>)}
        {tab === 'PDPC' && (<Card title="Process Decision Program Chart">
          <p className="muted">For each risk to the objective "Deliver the system on time, within budget and with quality": prevent it, and know what to do if it happens anyway.</p>
          <div className="pdpc">{active.map((r) => (
            <div className="pdpc-row" key={r._id}>
              <div className="pbox problem"><b>Problem (score {r.score})</b>{r.title}<br /><small>Trigger: {r.trigger || '—'}</small></div><div className="pa">→</div>
              <div className="pbox prevent"><b>Preventive action</b>{r.preventiveAction || 'Not defined'}</div><div className="pa">→</div>
              <div className="pbox correct"><b>If it occurs: corrective action</b>{r.correctiveAction || 'Not defined'}</div>
            </div>))}</div>
        </Card>)}
        {tab === 'Risk register' && (<Card title="Register"><Table rows={list} cols={[
          { h: 'Risk', r: (r) => <><b>{r.title}</b><br /><small className="muted">{r.category}</small></> }, { h: 'Score', r: (r) => r.score }, { h: 'Owner', r: (r) => r.owner || '—' },
          { h: 'Status', r: (r) => r.status },
          { h: '', cls: 'actions', r: (r) => <><Btn kind="ghost" onClick={() => setM(r)}>Edit</Btn><Btn kind="ghost danger" onClick={() => act(() => api.del('/risks/' + r._id), 'Deleted', reload)}>Delete</Btn></> }]} /></Card>)}
        {m && <FormModal title={m._id ? 'Edit risk' : 'Add risk'} fields={fields} initial={m} onClose={() => setM(null)}
          onSubmit={async (b) => { await (m._id ? api.put('/risks/' + m._id, b) : api.post('/risks', b)); notify('Risk saved'); reload(); }} />}
      </>)}</Loading>
    </Page>
  );
}
