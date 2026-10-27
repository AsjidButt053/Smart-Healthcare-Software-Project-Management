import { useState } from 'react';
import { api } from '../api';
import { useLoad, Loading, Page, Card, Btn, Stat, Warnings, Table, FormModal, money, dt, notify } from '../ui.jsx';

export default function Cost() {
  const { data: e, err, reload } = useLoad('/evm');
  const [m, setM] = useState(null);
  const lvl = (v) => (v == null ? '' : v < e.thresholds.cpi ? 'bad' : v < 1 ? 'warn' : 'ok');
  return (
    <Page title="Cost & earned value" sub={e && `Earned value analysis as of ${dt(e.statusDate)}`}>
      <Loading data={e} err={err}>{e && (<>
        <Warnings list={e.warnings} />
        <div className="stats">
          <Stat label="Planned value (PV)" value={money(e.PV)} sub="Work that should be done" /><Stat label="Earned value (EV)" value={money(e.EV)} sub="Value of work done" />
          <Stat label="Actual cost (AC)" value={money(e.AC)} sub="Money spent" />
          <Stat label="CPI = EV ÷ AC" value={e.CPI ?? '—'} level={lvl(e.CPI)} sub={`Warn below ${e.thresholds.cpi}`} /><Stat label="SPI = EV ÷ PV" value={e.SPI ?? '—'} level={lvl(e.SPI)} sub={`Warn below ${e.thresholds.spi}`} />
          <Stat label="Cost variance (CV)" value={money(e.CV)} level={e.CV < 0 ? 'bad' : 'ok'} /><Stat label="Schedule variance (SV)" value={money(e.SV)} level={e.SV < 0 ? 'bad' : 'ok'} />
          <Stat label="Budget at completion (BAC)" value={money(e.BAC)} sub={`Approved ${money(e.approvedBudget)}`} />
          <Stat label="Estimate at completion" value={money(e.EAC)} level={e.EAC > e.approvedBudget ? 'bad' : 'ok'} sub={`ETC ${money(e.ETC)}`} /><Stat label="Variance at completion" value={money(e.VAC)} level={e.VAC < 0 ? 'bad' : 'ok'} />
        </div>
        <Card title="Planned vs earned vs actual cost, by activity">
          <Table rows={e.rows} cols={[
            { h: 'Activity', r: (r) => <b>{r.name}</b> }, { h: 'Planned cost', cls: 'num', r: (r) => money(r.plannedCost) }, { h: '% done', r: (r) => `${r.percentComplete}%` },
            { h: 'Earned', cls: 'num', r: (r) => money((r.plannedCost * r.percentComplete) / 100) }, { h: 'Actual', cls: 'num', r: (r) => money(r.actualCost) },
            { h: 'Variance', cls: 'num', r: (r) => { const v = (r.plannedCost * r.percentComplete) / 100 - r.actualCost; return <span style={{ color: v < 0 ? 'var(--coral)' : 'var(--green)', fontWeight: 600 }}>{money(v)}</span>; } },
            { h: '', cls: 'actions', r: (r) => <Btn kind="ghost" onClick={() => setM(r)}>Update progress</Btn> }]} />
        </Card>
        {m && <FormModal title={`Update progress: ${m.name}`} initial={m} onClose={() => setM(null)} onSubmit={async (b) => { await api.put('/activities/' + m.id, b); notify('Progress saved. EVM recalculated.'); reload(); }}
          fields={[{ name: 'percentComplete', label: '% complete', type: 'number', min: 0, max: 100, required: true }, { name: 'actualCost', label: 'Actual cost to date (PKR)', type: 'number', min: 0, required: true },
            { name: 'delayDays', label: 'Reported delay (days)', type: 'number', min: 0 }, { name: 'plannedCost', label: 'Planned cost (PKR)', type: 'number', min: 0, required: true }]} />}
      </>)}</Loading>
    </Page>
  );
}
