import { useState } from 'react';
import { api } from '../api';
import { useLoad, Loading, Page, Card, Btn, Badge, Tabs, Table, FormModal, act, money, dt, notify } from '../ui.jsx';

export default function Scope() {
  const [tab, setTab] = useState('Requirements');
  return (
    <Page title="Scope & change control" sub="Only approved requirements can enter the scope, the WBS and the schedule.">
      <Tabs tabs={['Requirements', 'WBS', 'Change requests']} value={tab} onChange={setTab} />
      {tab === 'Requirements' && <Requirements />}{tab === 'WBS' && <Wbs />}{tab === 'Change requests' && <Changes />}
    </Page>
  );
}

function Requirements() {
  const { data, err, reload } = useLoad('/requirements');
  const [m, setM] = useState(null);
  const set = (r, status) => act(() => api.put('/requirements/' + r._id, { status }), `Requirement ${status.toLowerCase()}`, reload);
  const fields = [{ name: 'title', label: 'Requirement', required: true, wide: true }, { name: 'module', label: 'Module', required: true },
    { name: 'priority', label: 'Priority (MoSCoW)', type: 'select', options: ['Must', 'Should', 'Could', 'Wont'] }, { name: 'description', label: 'Description', type: 'textarea' }];
  return (
    <Loading data={data} err={err}>{data && (
      <Card title="Requirements register" actions={<Btn kind="primary" onClick={() => setM({})}>Add requirement</Btn>}>
        <Table rows={data} cols={[
          { h: 'Requirement', r: (r) => <><b>{r.title}</b><br /><small className="muted">{r.description}</small></> }, { h: 'Module', r: (r) => r.module },
          { h: 'Priority', r: (r) => <Badge>{r.priority}</Badge> }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> },
          { h: '', cls: 'actions', r: (r) => (<>
            {r.status !== 'Approved' && <Btn kind="ghost" onClick={() => set(r, 'Approved')}>Approve</Btn>}
            {r.status === 'Proposed' && <Btn kind="ghost danger" onClick={() => set(r, 'Rejected')}>Reject</Btn>}
            <Btn kind="ghost" onClick={() => setM(r)}>Edit</Btn>
            <Btn kind="ghost danger" onClick={() => act(() => api.del('/requirements/' + r._id), 'Deleted', reload)}>Delete</Btn></>) }]} />
        {m && <FormModal title={m._id ? 'Edit requirement' : 'Add requirement'} fields={fields} initial={m} onClose={() => setM(null)}
          onSubmit={async (b) => { await (m._id ? api.put('/requirements/' + m._id, b) : api.post('/requirements', b)); notify('Saved'); reload(); }} />}
      </Card>)}</Loading>
  );
}

function Node({ n }) {
  return (<li><span className={'node ' + n.type.split(' ')[0]}><code>{n.code}</code><b>{n.name}</b><small>{n.type}{n.assignee ? ` · ${n.assignee}` : ''} · {money(n.cost)}</small>
    {n.type === 'Work package' && !n.children.length && <Badge>Pending</Badge>}</span>
    {n.children?.length > 0 && <ul>{n.children.map((c) => <Node key={c.code} n={c} />)}</ul>}</li>);
}
function Wbs() {
  const { data, err } = useLoad('/wbs');
  return (<Loading data={data} err={err}>{data && <Card title="Work breakdown structure" className="wbs">
    <p className="muted">Generated live from approved requirements (work packages) and their scheduled activities (tasks). Costs roll up to the top. A work package marked Pending has no tasks yet.</p>
    <ul><Node n={data} /></ul></Card>}</Loading>);
}

function Changes() {
  const { data, err, reload } = useLoad('/change-requests');
  const { data: acts } = useLoad('/activities');
  const [m, setM] = useState(null);
  const decide = (cr, decision) => setM({ cr, decision });
  const opts = (acts || []).map((a) => ({ value: a._id, label: a.name }));
  const create = async (b) => {
    const pre = (k) => Object.fromEntries(Object.entries(b).filter(([x]) => x.startsWith(k + '_')).map(([x, v]) => [x.slice(k.length + 1), v]));
    const body = { title: b.title, justification: b.justification, description: b.description, requestedBy: b.requestedBy, costImpact: b.costImpact, scheduleImpactDays: b.scheduleImpactDays,
      newRequirement: pre('nr'), newActivity: pre('na') };
    await api.post('/change-requests', body); notify('Change request recorded'); reload();
  };
  return (
    <Loading data={data} err={err}>{data && (<>
      <div className="row end"><Btn kind="primary" onClick={() => setM({ create: true })}>New change request</Btn></div>
      {data.length === 0 && <div className="empty">No change requests yet.</div>}
      {data.map((c) => (
        <div className="cr" key={c._id}>
          <div className="row gap wrap"><h3>{c.title}</h3><Badge>{c.status}</Badge><span className="muted">Requested by {c.requestedBy || '—'} · {dt(c.createdAt)}</span></div>
          <div>{c.justification}</div>
          <div className="impact"><div><span className="muted">Cost impact</span><b className="up">+ {money(c.costImpact)}</b></div><div><span className="muted">Schedule impact</span><b className="up">+ {c.scheduleImpactDays} days</b></div>
            <div><span className="muted">Linked requirement</span><b>{c.requirement ? `${c.requirement.title} (${c.requirement.status})` : 'None'}</b></div></div>
          {c.status === 'Pending' && <div className="row gap"><Btn kind="good" onClick={() => decide(c, 'Approved')}>Approve</Btn><Btn kind="danger" onClick={() => decide(c, 'Rejected')}>Reject</Btn>
            <Btn kind="ghost danger" onClick={() => act(() => api.del('/change-requests/' + c._id), 'Deleted', reload)}>Delete</Btn></div>}
          {c.status !== 'Pending' && <small className="muted">Decided by {c.decidedBy} on {dt(c.decidedAt)}{c.decisionNote ? `: ${c.decisionNote}` : ''}</small>}
          {c.impact && <Impact i={c.impact} />}
        </div>))}
      {m?.create && <FormModal title="New change request" onClose={() => setM(null)} onSubmit={create} fields={[
        { name: 'title', label: 'Title', required: true, wide: true }, { name: 'justification', label: 'Justification', type: 'textarea', required: true },
        { name: 'requestedBy', label: 'Requested by' }, { name: 'costImpact', label: 'Cost impact (PKR)', type: 'number', min: 0 }, { name: 'scheduleImpactDays', label: 'Schedule impact (days)', type: 'number', min: 0 },
        { name: 'nr_title', label: 'New requirement title' }, { name: 'nr_module', label: 'Module' },
        { name: 'na_name', label: 'New activity name' }, { name: 'na_assignee', label: 'Assignee' }, { name: 'na_durationDays', label: 'Duration (days)', type: 'number', min: 1 },
        { name: 'na_plannedCost', label: 'Planned cost (PKR)', type: 'number', min: 0 },
        { name: 'na_dependencies', label: 'New activity starts after…', type: 'multi', options: opts }, { name: 'na_successors', label: 'Activities that must wait for it…', type: 'multi', options: opts }]} />}
      {m?.decision && <FormModal title={`${m.decision === 'Approved' ? 'Approve' : 'Reject'}: ${m.cr.title}`} submitLabel={m.decision === 'Approved' ? 'Approve & apply' : 'Reject'} onClose={() => setM(null)}
        onSubmit={async (b) => { await api.post(`/change-requests/${m.cr._id}/decision`, { ...b, decision: m.decision }); notify(`Change request ${m.decision.toLowerCase()}`); reload(); }}
        fields={[{ name: 'decidedBy', label: 'Approver', required: true }, { name: 'decisionNote', label: 'Note', type: 'textarea' }]} />}
    </>)}</Loading>
  );
}

function Impact({ i }) {
  const rows = [['Approved budget', money(i.before.approvedBudget), money(i.after.approvedBudget)], ['Planned activity cost', money(i.before.plannedCost), money(i.after.plannedCost)],
    ['Deadline', dt(i.before.deadline), dt(i.after.deadline)], ['Projected finish', dt(i.before.projectedFinish), dt(i.after.projectedFinish)],
    ['Days past deadline', i.before.daysLate, i.after.daysLate], ['Approved requirements', i.before.approvedRequirements, i.after.approvedRequirements], ['Scheduled activities', i.before.activities, i.after.activities]];
  return (<div><b>Applied impact (before → after)</b><div className="impact" style={{ marginTop: 8 }}>
    {rows.map(([l, a, b]) => <div key={l}><span className="muted">{l}</span><b>{a}<span className="arrow">→</span>{b}</b></div>)}</div></div>);
}
