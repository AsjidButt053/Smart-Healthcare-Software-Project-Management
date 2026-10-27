import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster, Btn, act } from './ui.jsx';
import { api } from './api';
import Dashboard from './pages/Dashboard.jsx';
import Initiation from './pages/Initiation.jsx';
import Scope from './pages/Scope.jsx';
import Schedule from './pages/Schedule.jsx';
import Cost from './pages/Cost.jsx';
import Quality from './pages/Quality.jsx';
import Risks from './pages/Risks.jsx';

const nav = [
  ['/', 'Dashboard', '◧'], ['/initiation', 'Charter & Plan', '✎'], ['/scope', 'Scope & Changes', '◫'], ['/schedule', 'Schedule', '▤'],
  ['/cost', 'Cost & EVM', '₨'], ['/quality', 'Quality', '✔'], ['/risks', 'Risks', '⚠'],
];

export default function App() {
  const reset = () => window.confirm('Reset all data back to the case-study sample data?') &&
    act(() => api.post('/admin/seed'), 'Sample data restored', () => window.location.reload());
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><div className="logo">+</div><b>Healthcare PMS<small>Five-hospital network</small></b></div>
        <nav>{nav.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'}><span aria-hidden>{icon}</span>{label}</NavLink>)}</nav>
        <div className="foot"><span>CSE-494 Software Project Management</span><Btn onClick={reset}>Reset sample data</Btn></div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} /><Route path="/initiation" element={<Initiation />} /><Route path="/scope" element={<Scope />} />
          <Route path="/schedule" element={<Schedule />} /><Route path="/cost" element={<Cost />} /><Route path="/quality" element={<Quality />} />
          <Route path="/risks" element={<Risks />} /><Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}
