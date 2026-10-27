import { useState } from 'react';
import { api } from '../api';
import { useLoad, Loading, Page, Card, Btn, Badge, FormModal, ListEditor, act, money, dt } from '../ui.jsx';

const STATUS = ['Initiating', 'Planning', 'Executing', 'Monitoring'];
export default function Initiation() {
  const { data: p, err, reload } = useLoad('/project');
  const [m, setM] = useState(null);
  const put = (body) => api.put('/project', body).then(reload);
  const list = (key) => async (items) => { await api.put('/project', { [key]: items }); reload(); };
  return (
    <Page title="Charter & project plan" sub="Initiation, integration and closure records">
      <Loading data={p} err={err}>{p && (<>
        {p.closure.isClosed && <div className="alert ok">Project closed on {dt(p.closure.closedAt)}, accepted by {p.closure.acceptedBy}.</div>}
        <Card title="Project charter" actions={<Btn onClick={() => setM('charter')}>Edit charter</Btn>}>
          <dl className="kv">
            <dt>Project</dt><dd><b>{p.name}</b><br />{p.description}</dd>
            <dt>Objectives</dt><dd><ul className="plain">{p.objectives.map((o) => <li key={o}>{o}</li>)}</ul></dd>
            <dt>In scope</dt><dd>{p.scopeIn}</dd><dt>Out of scope</dt><dd>{p.scopeOut}</dd>
            <dt>Approved budget</dt><dd><b>{money(p.approvedBudget)}</b> <span className="muted">(baseline {money(p.baselineBudget)})</span></dd>
            <dt>Dates</dt><dd>{dt(p.startDate)} to <b>{dt(p.deadline)}</b> <span className="muted">(baseline deadline {dt(p.baselineDeadline)})</span></dd>
          </dl>
        </Card>
        <ListEditor title="Stakeholders" noun="stakeholder" items={p.stakeholders} onSave={list('stakeholders')}
          fields={[{ name: 'name', label: 'Name', required: true }, { name: 'role', label: 'Role', required: true }, { name: 'interest', label: 'Main interest', wide: true }]}
          cols={[{ h: 'Name', r: (r) => r.name }, { h: 'Role', r: (r) => r.role }, { h: 'Interest', r: (r) => r.interest }]} />
        <Card title="Project management plan" actions={<Btn onClick={() => setM('plan')}>Edit plan</Btn>}>
          <dl className="kv"><dt>Scope</dt><dd>{p.plan.scope}</dd><dt>Schedule</dt><dd>{p.plan.schedule}</dd><dt>Cost</dt><dd>{p.plan.cost}</dd><dt>Quality</dt><dd>{p.plan.quality}</dd></dl>
        </Card>
        <Card title="Status & monitoring settings" actions={<Btn onClick={() => setM('status')}>Update status</Btn>}>
          <dl className="kv"><dt>Status</dt><dd><b>{p.status}</b></dd><dt>Status date</dt><dd>{dt(p.statusDate)} <span className="muted">(all schedule and EVM figures are calculated as of this date)</span></dd>
            <dt>Warning thresholds</dt><dd>CPI below {p.thresholds.cpi} · SPI below {p.thresholds.spi}</dd></dl>
        </Card>
        <ListEditor title="Milestones" noun="milestone" items={p.milestones} onSave={list('milestones')}
          fields={[{ name: 'name', label: 'Milestone', required: true }, { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'done', label: 'Completed?', type: 'bool' }]}
          cols={[{ h: 'Milestone', r: (r) => r.name }, { h: 'Date', r: (r) => dt(r.date) }, { h: 'State', r: (r) => <Badge>{r.done ? 'Done' : 'Pending'}</Badge> }]} />
        <ListEditor title="Team responsibilities" noun="team member" items={p.responsibilities} onSave={list('responsibilities')}
          fields={[{ name: 'member', label: 'Member', required: true }, { name: 'role', label: 'Role', required: true }, { name: 'duty', label: 'Responsibility', type: 'textarea' }]}
          cols={[{ h: 'Member', r: (r) => r.member }, { h: 'Role', r: (r) => r.role }, { h: 'Responsibility', r: (r) => r.duty }]} />
        <Card title="Project closure" actions={!p.closure.isClosed && <Btn kind="primary" onClick={() => setM('close')}>Close project</Btn>}>
          {p.closure.isClosed ? <p>Lessons learned: {p.closure.lessonsLearned || '—'}</p>
            : <p className="muted">Closing requires every activity at 100%, no unresolved critical defects, no pending change requests and a named acceptor.</p>}
        </Card>
        {m === 'charter' && <FormModal title="Edit project charter" initial={p} onClose={() => setM(null)} onSubmit={put} fields={[
          { name: 'name', label: 'Project name', required: true, wide: true }, { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'objectives', label: 'Objectives', type: 'lines' }, { name: 'scopeIn', label: 'Scope: included', type: 'textarea' }, { name: 'scopeOut', label: 'Scope: excluded', type: 'textarea' },
          { name: 'approvedBudget', label: 'Approved budget (PKR)', type: 'number', required: true, min: 1 }, { name: 'startDate', label: 'Start date', type: 'date', required: true },
          { name: 'deadline', label: 'Deadline', type: 'date', required: true }]} />}
        {m === 'plan' && <FormModal title="Edit management plan" initial={p.plan} onClose={() => setM(null)} onSubmit={(b) => put({ plan: b })}
          fields={['scope', 'schedule', 'cost', 'quality'].map((k) => ({ name: k, label: k[0].toUpperCase() + k.slice(1) + ' plan', type: 'textarea' }))} />}
        {m === 'status' && <FormModal title="Update status" initial={{ status: p.status, statusDate: p.statusDate, cpi: p.thresholds.cpi, spi: p.thresholds.spi }} onClose={() => setM(null)}
          onSubmit={({ cpi, spi, ...b }) => put({ ...b, thresholds: { cpi, spi } })} fields={[
            { name: 'status', label: 'Project status', type: 'select', options: STATUS, required: true }, { name: 'statusDate', label: 'Status date', type: 'date', required: true },
            { name: 'cpi', label: 'CPI warning threshold', type: 'number', min: 0.1, max: 1.5 }, { name: 'spi', label: 'SPI warning threshold', type: 'number', min: 0.1, max: 1.5 }]} />}
        {m === 'close' && <FormModal title="Close project" submitLabel="Close project" onClose={() => setM(null)} onSubmit={(b) => api.post('/project/close', b).then(reload)}
          fields={[{ name: 'acceptedBy', label: 'Accepted by', required: true }, { name: 'lessonsLearned', label: 'Lessons learned', type: 'textarea' }]} />}
      </>)}</Loading>
    </Page>
  );
}
