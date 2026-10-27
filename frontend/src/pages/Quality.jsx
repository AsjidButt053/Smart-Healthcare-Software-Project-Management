import { useState } from 'react';
import { api } from '../api';
import { useLoad, Loading, Page, Card, Btn, Badge, Tabs, Table, Stat, FormModal, act, dt, notify } from '../ui.jsx';

export default function Quality() {
  const [tab, setTab] = useState('Defects');
  return (<Page title="Quality management" sub="Defect tracking and deliverable inspections"><Tabs tabs={['Defects', 'Quality checklist']} value={tab} onChange={setTab} />{tab === 'Defects' ? <Defects /> : <Checklist />}</Page>);
}

function Defects() {
  const { data, err, reload } = useLoad('/defects');
  const { data: acts } = useLoad('/activities');
  const { data: p } = useLoad('/project');
  const [m, setM] = useState(null);
  const fields = [{ name: 'title', label: 'Defect', required: true, wide: true }, { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'severity', label: 'Severity', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'], required: true }, { name: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Resolved', 'Closed'], required: true },
    { name: 'assignedTo', label: 'Assigned to', type: 'select', options: (p?.responsibilities || []).map((x) => x.member), required: true },
    { name: 'activity', label: 'Found in activity', type: 'select', options: (acts || []).map((a) => ({ value: a._id, label: a.name })) }];
  const open = (data || []).filter((d) => !['Resolved', 'Closed'].includes(d.status));
  return (
    <Loading data={data} err={err}>{data && (<>
      <div className="stats"><Stat label="Total defects" value={data.length} /><Stat label="Unresolved" value={open.length} level={open.length ? 'warn' : 'ok'} />
        <Stat label="Unresolved critical" value={open.filter((d) => d.severity === 'Critical').length} level={open.some((d) => d.severity === 'Critical') ? 'bad' : 'ok'} /></div>
      <Card title="Defect log" actions={<Btn kind="primary" onClick={() => setM({ status: 'Open', severity: 'Medium' })}>Log defect</Btn>}>
        <Table rows={data} cols={[
          { h: 'Defect', r: (r) => <><b>{r.title}</b><br /><small className="muted">{r.description}</small></> }, { h: 'Severity', r: (r) => <Badge>{r.severity}</Badge> },
          { h: 'Status', r: (r) => <select value={r.status} onChange={(e) => act(() => api.put('/defects/' + r._id, { status: e.target.value }), 'Status updated', reload)}>{['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => <option key={s}>{s}</option>)}</select> },
          { h: 'Assigned to', r: (r) => r.assignedTo }, { h: 'Activity', r: (r) => r.activity?.name || '—' },
          { h: '', cls: 'actions', r: (r) => <><Btn kind="ghost" onClick={() => setM({ ...r, activity: r.activity?._id })}>Edit</Btn><Btn kind="ghost danger" onClick={() => act(() => api.del('/defects/' + r._id), 'Deleted', reload)}>Delete</Btn></> }]} />
      </Card>
      {m && <FormModal title={m._id ? 'Edit defect' : 'Log defect'} fields={fields} initial={m} onClose={() => setM(null)}
        onSubmit={async (b) => { await (m._id ? api.put('/defects/' + m._id, b) : api.post('/defects', b)); notify('Defect saved'); reload(); }} />}
    </>)}</Loading>
  );
}

function Checklist() {
  const { data, err, reload } = useLoad('/checklist');
  const [m, setM] = useState(null);
  const [ins, setIns] = useState(null);
  const groups = (data || []).reduce((g, c) => ({ ...g, [c.deliverable]: [...(g[c.deliverable] || []), c] }), {});
  const done = (data || []).filter((c) => c.status !== 'Pending');
  const rate = done.length ? Math.round((done.filter((c) => c.status === 'Pass').length / done.length) * 100) : 0;
  return (
    <Loading data={data} err={err}>{data && (<>
      <div className="stats"><Stat label="Items inspected" value={`${done.length} / ${data.length}`} /><Stat label="Pass rate" value={`${rate}%`} level={rate >= 80 ? 'ok' : 'warn'} />
        <Stat label="Failed items" value={data.filter((c) => c.status === 'Fail').length} level={data.some((c) => c.status === 'Fail') ? 'bad' : 'ok'} /></div>
      <div className="row end"><Btn kind="primary" onClick={() => setM({})}>Add checklist item</Btn></div>
      {Object.entries(groups).map(([name, items]) => (
        <Card key={name} title={name}>
          <Table rows={items} cols={[
            { h: 'Check', r: (r) => r.item }, { h: 'Result', r: (r) => <Badge>{r.status}</Badge> }, { h: 'Inspector', r: (r) => r.inspector || '—' }, { h: 'Inspected', r: (r) => dt(r.inspectedAt) }, { h: 'Notes', r: (r) => r.notes || '—' },
            { h: '', cls: 'actions', r: (r) => <><Btn kind="ghost" onClick={() => setIns(r)}>Record result</Btn><Btn kind="ghost danger" onClick={() => act(() => api.del('/checklist/' + r._id), 'Deleted', reload)}>Delete</Btn></> }]} />
        </Card>))}
      {m && <FormModal title="Add checklist item" onClose={() => setM(null)} onSubmit={async (b) => { await api.post('/checklist', b); notify('Item added'); reload(); }}
        fields={[{ name: 'deliverable', label: 'Deliverable', required: true }, { name: 'item', label: 'Check', required: true, wide: true }]} />}
      {ins && <FormModal title={`Inspection result: ${ins.item}`} initial={ins} onClose={() => setIns(null)} onSubmit={async (b) => { await api.put('/checklist-inspect/' + ins._id, b); notify('Result recorded'); reload(); }}
        fields={[{ name: 'status', label: 'Result', type: 'select', options: ['Pending', 'Pass', 'Fail'], required: true }, { name: 'inspector', label: 'Inspector' }, { name: 'notes', label: 'Notes', type: 'textarea' }]} />}
    </>)}</Loading>
  );
}
