import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, published: 0, featured: 0 });

  useEffect(() => {
    api.listProducts().then((res) => {
      const items = res.items || [];
      setStats({
        total: items.length,
        published: items.filter((p) => p.isPublished).length,
        featured: items.filter((p) => p.isFeatured).length,
      });
    }).catch(() => {});
  }, []);

  return (
    <>
      <div className="topbar">
        <h1>Dashboard</h1>
        <Link to="/products" className="btn btn-sm">Manage products →</Link>
      </div>

      <div className="stats">
        <div className="stat"><div className="num">{stats.total}</div><div className="lbl">Total products</div></div>
        <div className="stat"><div className="num">{stats.published}</div><div className="lbl">Published</div></div>
        <div className="stat"><div className="num">{stats.featured}</div><div className="lbl">Featured</div></div>
      </div>

      <div className="panel">
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Welcome to Pawar Online Retail admin</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
          Manage your storefront from here. Add products with their Amazon links in{' '}
          <Link to="/products" style={{ color: 'var(--brand)', fontWeight: 600 }}>Products</Link>, and edit
          homepage / about / site content in{' '}
          <Link to="/cms" style={{ color: 'var(--brand)', fontWeight: 600 }}>Website CMS</Link>.
          Amazon Shipment, Accounts and Finance modules are planned for upcoming phases.
        </p>
      </div>
    </>
  );
}
