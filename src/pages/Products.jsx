import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ProductEditor from './ProductEditor.jsx';

export default function Products() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // product object, {} for new, null = closed

  const load = (search = '') => {
    setLoading(true);
    api.listProducts(search).then((res) => setItems(res.items || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSearch = (e) => {
    e.preventDefault();
    load(q);
  };

  const onDelete = async (p) => {
    if (!window.confirm(`Delete “${p.title}”?`)) return;
    await api.deleteProduct(p._id);
    load(q);
  };

  return (
    <>
      <div className="topbar">
        <h1>Products</h1>
        <button className="btn" onClick={() => setEditing({})}>+ New product</button>
      </div>

      <form className="toolbar" onSubmit={onSearch}>
        <input className="search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-ghost btn-sm">Search</button>
        {q && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQ(''); load(); }}>Clear</button>}
      </form>

      <div className="panel" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No products yet. Click “New product” to add one.</div>
        ) : (
          <table>
            <thead>
              <tr><th></th><th>Title</th><th>Category</th><th>Price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id}>
                  <td>{p.images?.[0] ? <img className="thumb" src={p.images[0]} alt="" /> : <div className="thumb" />}</td>
                  <td style={{ fontWeight: 600 }}>{p.title}{p.isFeatured && ' ⭐'}</td>
                  <td>
                    {p.category}
                    {p.subcategory && <span style={{ color: 'var(--muted)', fontSize: 12, display: 'block' }}>{p.subcategory}</span>}
                  </td>
                  <td>{p.price != null ? `${p.currency === 'USD' ? '$' : '₹'}${Number(p.price).toLocaleString(p.currency === 'USD' ? 'en-US' : 'en-IN')}` : '—'}</td>
                  <td><span className={`badge ${p.isPublished ? 'on' : 'off'}`}>{p.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <ProductEditor
          initial={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(q); }}
        />
      )}
    </>
  );
}
