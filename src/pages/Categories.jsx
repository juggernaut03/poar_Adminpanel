import { useEffect, useState } from 'react';
import { api } from '../api.js';

function CategoryEditor({ initial, onClose, onSaved }) {
  const editing = Boolean(initial?._id);
  const [name, setName] = useState(initial?.name || '');
  const [subs, setSubs] = useState((initial?.subcategories || []).join('\n'));
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('Name is required.'); return; }
    setBusy(true);
    const payload = {
      name: name.trim(),
      subcategories: subs.split('\n').map((s) => s.trim()).filter(Boolean),
      sortOrder: Number(sortOrder) || 0,
    };
    try {
      if (editing) await api.updateCategory(initial._id, payload);
      else await api.createCategory(payload);
      onSaved();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2>{editing ? 'Edit category' : 'New category'}</h2>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Subcategories (one per line)</label>
          <textarea value={subs} onChange={(e) => setSubs(e.target.value)} style={{ minHeight: 140 }} placeholder={'Tawa & Dosa\nKadhai\nPots & Tope'} />
        </div>
        <div className="field" style={{ maxWidth: 160 }}>
          <label>Sort order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Categories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    api.listCategories().then((c) => setItems(c || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (c) => {
    if (!window.confirm(`Delete category “${c.name}”? Products keep their current category value.`)) return;
    await api.deleteCategory(c._id);
    load();
  };

  return (
    <>
      <div className="topbar">
        <h1>Categories</h1>
        <button className="btn" onClick={() => setEditing({})}>+ New category</button>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No categories yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Order</th><th>Name</th><th>Subcategories</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id}>
                  <td>{c.sortOrder}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {(c.subcategories || []).join(' · ') || '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <CategoryEditor
          initial={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}
