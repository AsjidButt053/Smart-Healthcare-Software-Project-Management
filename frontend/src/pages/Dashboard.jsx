import { Link } from 'react-router-dom';
import { useLoad, Loading, Page, Card, Stat, Badge, Warnings, Table, money, dt } from '../ui.jsx';

export default function Dashboard() {
  const { data: d, err } = useLoad('/dashboard');
  return (
    <Page title="Project dashboard" sub={d && `${d.project.name} · status ${d.project.status} · as of ${dt(d.project.statusDate || new Date())}`}>
      <Loading data={d} err={err}>{d && <Body d={d} />}</Loading>
    </Page>
  );
}

function Body({ d }) {
  const { evm, schedule: s, project: p } = d;
  const lvl = (v) => (v == null ? '' : v < p.thresholds.cpi ? 'bad' : v < 1 ? 'warn' : 'ok');
  const budgetPct = Math.min(100, (evm.AC / p.approvedBudget) * 100);
  const bars = [['Approved budget', p.approvedBudget, 'green'], ['Planned cost (BAC)', evm.BAC, ''], ['Actual cost (AC)', evm.AC, 'blue'], ['Forecast (EAC)', evm.EAC, evm.EAC > p.approvedBudget ? 'coral' : 'amber']];
  const max = Math.max(...bars.map((b) => b[1]));
  return (<>
    <Warnings list={d.warnings} />
    <div className="stats">
      <Stat label="Overall progress" value={`${d.progress}%`} sub="Earned value ÷ planned cost" />
      <Stat label="Cost performance (CPI)" value={evm.CPI ?? '—'} level={lvl(evm.CPI)} sub={`Cost variance ${money(evm.CV)}`} />
      <Stat label="Schedule performance (SPI)" value={evm.SPI ?? '—'} level={lvl(evm.SPI)} sub={`Schedule variance ${money(evm.SV)}`} />
      <Stat label="Projected finish" value={dt(s.projectedFinish)} level={s.willMissDeadline ? 'bad' : 'ok'} sub={s.willMissDeadline ? `${s.varianceDays} day(s) after deadline` : 'Within deadline'} />
      <Stat label="Pending change requests" value={d.pendingCRs.length} level={d.pendingCRs.length ? 'warn' : 'ok'} sub={`${d.scope.approved} approved requirements`} />
      <Stat label="Critical defects open" value={d.criticalDefects.length} level={d.criticalDefects.length ? 'bad' : 'ok'} sub={`${d.defectCount.open} open of ${d.defectCount.total}`} />
    </div>
    <div className="grid g2">
      <Card title="Budget status">
        {bars.map(([l, v, c]) => <div className="barrow" key={l}><span>{l}</span><div className={'bar ' + c}><i style={{ width: `${(v / max) * 100}%` }} /></div><b>{money(v)}</b></div>)}
        <p className="muted">{budgetPct.toFixed(0)}% of the approved budget is already spent. Forecast variance at completion: <b>{money(evm.VAC)}</b>.</p>
      </Card>
      <Card title="Delayed activities" actions={<Link to="/schedule">Open schedule</Link>}>
        <Table rows={d.delayed} empty="No delayed activities." cols={[
          { h: 'Activity', r: (r) => r.name }, { h: 'Slip', r: (r) => `${r.slipDays} d` },
          { h: 'Pushes out', r: (r) => (r.impacted.length ? r.impacted.join(', ') : '—') }]} />
      </Card>
      <Card title="Pending change requests" actions={<Link to="/scope">Review</Link>}>
        <Table rows={d.pendingCRs} empty="No pending change requests." cols={[
          { h: 'Request', r: (r) => r.title }, { h: 'Cost', cls: 'num', r: (r) => money(r.costImpact) }, { h: 'Schedule', r: (r) => `+${r.scheduleImpactDays} d` }]} />
      </Card>
      <Card title="Unresolved critical defects" actions={<Link to="/quality">Open quality</Link>}>
        <Table rows={d.criticalDefects} empty="No unresolved critical defects." cols={[
          { h: 'Defect', r: (r) => r.title }, { h: 'Owner', r: (r) => r.assignedTo }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} />
      </Card>
      <Card title="Top risks" actions={<Link to="/risks">Open risks</Link>}>
        <Table rows={d.topRisks} cols={[{ h: 'Risk', r: (r) => r.title }, { h: 'Score', r: (r) => <b>{r.score}</b> }, { h: 'Owner', r: (r) => r.owner }]} />
      </Card>
      <Card title="Milestones">
        <Table rows={p.milestones} cols={[{ h: 'Milestone', r: (r) => r.name }, { h: 'Date', r: (r) => dt(r.date) }, { h: 'State', r: (r) => <Badge>{r.done ? 'Done' : 'Pending'}</Badge> }]} />
        <p className="muted">Quality checklist: {d.quality.passed} passed, {d.quality.failed} failed of {d.quality.total} items.</p>
      </Card>
    </div>
  </>);
}
