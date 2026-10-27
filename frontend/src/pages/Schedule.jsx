import { useState } from 'react';
import { api } from '../api';
import { useLoad, Loading, Page, Card, Btn, Badge, Stat, Table, FormModal, act, dt, money, notify } from '../ui.jsx';

const DAY = 864e5;
function Gantt({ s }) {
  const t = (x) => new Date(x).getTime();
  const min = t(s.startDate), max = Math.max(t(s.projectedFinish), t(s.deadline)) + 4 * DAY, total = max - min;
  const pos = (x) => ((t(x) - min) / total) * 100;
  const weeks = Math.ceil(total / (7 * DAY));
  return (
    <div className="scroll"><div className="gantt" style={{ '--wk': `${(7 * DAY / total) * 100}%` }}>
      <div className="g-head"><span>Activity</span><div className="g-axis">{Array.from({ length: Math.ceil(weeks / 2) }, (_, i) => <span key={i} style={{ left: `${(i * 14 * DAY / total) * 100}%`, transform: 'none' }}>W{i * 2 + 1}</span>)}</div></div>
      <div className="g-row" style={{ height: 30 }}><span className="g-name"><b>Milestones</b></span>
        <div className="g-track">{s.milestones.map((m) => <span key={m._id} className="g-ms" title={`${m.name}: ${dt(m.date)}`} style={{ left: `${pos(m.date)}%`, background: m.done ? 'var(--green)' : 'var(--ink)' }} />)}</div></div>
      {s.rows.map((r) => (
        <div className="g-row" key={r.id}><span className="g-name" title={r.name}>{r.name}</span>
          <div className="g-track">
            <span className="g-base" style={{ left: `${pos(r.baseStart)}%`, width: `${((t(r.baseEnd) - t(r.baseStart) + DAY) / total) * 100}%` }} />
            <span className={'g-bar ' + (r.critical ? 'critical' : r.delayed ? 'delayed' : '')} title={`${dt(r.start)} to ${dt(r.end)} · ${r.percentComplete}% · float ${r.floatDays} d`}
              style={{ left: `${pos(r.start)}%`, width: `${((t(r.end) - t(r.start) + DAY) / total) * 100}%` }}><i style={{ width: `${r.percentComplete}%` }} /></span>
          </div></div>))}
      <div style={{ position: 'absolute', left: 230, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}>
        <span className="g-line deadline" style={{ left: `${pos(s.deadline)}%` }}><em style={{ color: 'var(--coral)' }}>Deadline</em></span>
        <span className="g-line status" style={{ left: `${pos(s.statusDate)}%` }}><em style={{ color: 'var(--blue)' }}>Status date</em></span>
      </div>
    </div></div>
  );
}

export default function Schedule() {
  const { data: s, err, reload } = useLoad('/schedule');
  const { data: reqs } = useLoad('/requirements');
  const { data: project } = useLoad('/project');
  const [m, setM] = useState(null);
  const approved = (reqs || []).filter((r) => r.status === 'Approved').map((r) => ({ value: r._id, label: `${r.module}: ${r.title}` }));
  const team = (project?.responsibilities || []).map((x) => x.member);
  const depOpts = (s?.rows || []).filter((r) => r.id !== m?.id).map((r) => ({ value: r.id, label: r.name }));
  const fields = [
    { name: 'name', label: 'Activity', required: true, wide: true }, { name: 'requirement', label: 'Delivers requirement (approved only)', type: 'select', options: approved, required: true, wide: true },
    { name: 'assignee', label: 'Assigned to', type: 'select', options: team, required: true }, { name: 'durationDays', label: 'Duration (days)', type: 'number', min: 1, required: true },
    { name: 'plannedStart', label: 'Earliest start (optional)', type: 'date' }, { name: 'plannedCost', label: 'Planned cost (PKR)', type: 'number', min: 0, required: true },
    { name: 'dependencies', label: 'Depends on (finish-to-start)', type: 'multi', options: depOpts },
    { name: 'percentComplete', label: '% complete', type: 'number', min: 0, max: 100 }, { name: 'actualCost', label: 'Actual cost (PKR)', type: 'number', min: 0 },
    { name: 'delayDays', label: 'Reported delay (days)', type: 'number', min: 0 }];
  const edit = (r) => setM({ id: r.id, ...r, requirement: r.requirement });
  return (
    <Page title="Schedule & resources" sub="Dates come from durations and dependencies; delays are propagated automatically."
      actions={<Btn kind="primary" onClick={() => setM({})}>Add activity</Btn>}>
      <Loading data={s} err={err}>{s && (<>
        <div className="stats">
          <Stat label="Baseline finish" value={dt(s.baselineFinish)} />
          <Stat label="Projected finish" value={dt(s.projectedFinish)} level={s.projectDelayDays ? 'warn' : 'ok'} sub={`${s.projectDelayDays} day(s) of project slip`} />
          <Stat label="Deadline" value={dt(s.deadline)} level={s.willMissDeadline ? 'bad' : 'ok'} sub={s.willMissDeadline ? `Missed by ${s.varianceDays} day(s)` : `${-s.varianceDays} day(s) of buffer`} />
          <Stat label="Delayed activities" value={s.delayedCount} level={s.delayedCount ? 'warn' : 'ok'} />
        </div>
        <Card title="Timeline (Gantt)">
          <Gantt s={s} />
          <div className="legend" style={{ marginTop: 12 }}><span><i style={{ background: '#b9c8c6' }} />Baseline</span><span><i style={{ background: 'var(--teal)' }} />Current / progress</span>
            <span><i style={{ background: '#d28a00' }} />Delayed</span><span><i style={{ background: 'var(--coral)' }} />Critical path</span><span><i style={{ background: 'var(--ink)' }} />Milestone</span></div>
        </Card>
        <Card title="Delay impact analysis">
          <Table rows={s.rows.filter((r) => r.delayed)} empty="No delayed activities." cols={[
            { h: 'Delayed activity', r: (r) => <b>{r.name}</b> }, { h: 'Slip', r: (r) => `${r.slipDays} days` }, { h: 'New finish', r: (r) => `${dt(r.baseEnd)} → ${dt(r.end)}` },
            { h: 'Dependent activities pushed out', r: (r) => r.impacted.join(', ') || 'None' }]} />
          <p className="muted">Slip = the larger of the reported delay and the days an unfinished activity is past its baseline end. Project finish moves by {s.projectDelayDays} day(s).</p>
        </Card>
        <Card title="Activities">
          <Table rows={s.rows} cols={[
            { h: 'Activity', r: (r) => <b>{r.name}</b> }, { h: 'Owner', r: (r) => r.assignee }, { h: 'Start', r: (r) => dt(r.start) }, { h: 'End', r: (r) => dt(r.end) }, { h: 'Days', r: (r) => r.durationDays },
            { h: 'Depends on', r: (r) => r.dependencies.map((d) => s.rows.find((x) => x.id === d)?.name).join(', ') || '—' }, { h: '% done', r: (r) => `${r.percentComplete}%` },
            { h: 'Float', r: (r) => (r.critical ? <Badge>Critical</Badge> : `${r.floatDays} d`) },
            { h: '', cls: 'actions', r: (r) => <><Btn kind="ghost" onClick={() => edit(r)}>Edit</Btn><Btn kind="ghost danger" onClick={() => act(() => api.del('/activities/' + r.id), 'Activity deleted', reload)}>Delete</Btn></> }]} />
        </Card>
        {m && <FormModal title={m.id ? 'Edit activity' : 'Add activity'} fields={fields} initial={m} onClose={() => setM(null)}
          onSubmit={async (b) => { await (m.id ? api.put('/activities/' + m.id, b) : api.post('/activities', b)); notify('Activity saved'); reload(); }} />}
      </>)}</Loading>
    </Page>
  );
}
