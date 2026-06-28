import { NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../auth.jsx';

// Sidebar groups. "Website" section is live in Phase 1; later phases
// (Amazon, Finance) are shown disabled so the structure is visible.
const NAV = [
  {
    group: 'Website',
    items: [
      { to: '/', label: 'Dashboard', end: true },
      { to: '/products', label: 'Products' },
      { to: '/categories', label: 'Categories' },
      { to: '/cms', label: 'Website CMS' },
    ],
  },
  {
    group: 'Business',
    items: [
      { to: '/finance', label: 'Finance & P&L' },
    ],
  },
  {
    group: 'Coming soon',
    items: [
      { label: 'Amazon Shipment', soon: true },
      { label: 'Accounts', soon: true },
    ],
  },
];

export default function Shell({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo-mark"><Logo /></span>
          <span>Pawar Admin</span>
        </div>

        {NAV.map((section) => (
          <div key={section.group}>
            <div className="nav-group">{section.group}</div>
            {section.items.map((item) =>
              item.soon ? (
                <div key={item.label} className="nav-item disabled">
                  {item.label}
                  <span className="soon">soon</span>
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </NavLink>
              )
            )}
          </div>
        ))}

        <div className="spacer" />
        <div className="nav-group">{admin?.email}</div>
        <div className="logout" onClick={onLogout}>Sign out</div>
      </aside>

      <div className="main">{children}</div>
    </div>
  );
}
