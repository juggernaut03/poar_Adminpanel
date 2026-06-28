import { useEffect, useState } from 'react';
import { api } from '../api.js';

const EMPTY = {
  title: '', shortDescription: '', description: '', amazonUrl: '',
  price: '', mrp: '', cost: '', currency: 'INR', category: 'General', subcategory: '', brand: '',
  rating: '', ratingCount: '',
  images: [], tags: '', isPublished: true, isFeatured: false, sortOrder: 0,
};

export default function ProductEditor({ initial, onClose, onSaved }) {
  const editing = Boolean(initial?._id);
  const [form, setForm] = useState(() =>
    initial
      ? { ...EMPTY, ...initial, tags: (initial.tags || []).join(', '), price: initial.price ?? '', mrp: initial.mrp ?? '', cost: initial.cost ?? '', rating: initial.rating ?? '', ratingCount: initial.ratingCount ?? '' }
      : EMPTY
  );
  const [categories, setCategories] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
  }, []);

  // Subcategory options follow the selected category.
  const activeCat = categories.find((c) => c.name === form.category);
  const subOptions = activeCat?.subcategories || [];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setErr('');
    try {
      const { urls } = await api.upload(files);
      set('images', [...form.images, ...urls]);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (url) => set('images', form.images.filter((u) => u !== url));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim() || !form.amazonUrl.trim()) {
      setErr('Title and Amazon URL are required.');
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      price: form.price === '' ? null : Number(form.price),
      mrp: form.mrp === '' ? null : Number(form.mrp),
      cost: form.cost === '' ? null : Number(form.cost),
      rating: form.rating === '' ? null : Number(form.rating),
      ratingCount: form.ratingCount === '' ? 0 : Number(form.ratingCount),
      sortOrder: Number(form.sortOrder) || 0,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (editing) await api.updateProduct(initial._id, payload);
      else await api.createProduct(payload);
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
        <h2>{editing ? 'Edit product' : 'New product'}</h2>
        {err && <div className="err">{err}</div>}

        <div className="field">
          <label>Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>

        <div className="field">
          <label>Amazon URL *</label>
          <input value={form.amazonUrl} onChange={(e) => set('amazonUrl', e.target.value)} placeholder="https://www.amazon.in/dp/..." required />
          <div className="hint">The “Buy on Amazon” button links here.</div>
        </div>

        <div className="field">
          <label>Short description</label>
          <input value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
        </div>

        <div className="field">
          <label>Full description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="row">
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}>
              {!categories.some((c) => c.name === form.category) && form.category && (
                <option value={form.category}>{form.category}</option>
              )}
              {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Subcategory</label>
            <select value={form.subcategory || ''} onChange={(e) => set('subcategory', e.target.value)} disabled={!subOptions.length}>
              <option value="">— none —</option>
              {!subOptions.includes(form.subcategory) && form.subcategory && (
                <option value={form.subcategory}>{form.subcategory}</option>
              )}
              {subOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="field"><label>Brand</label><input value={form.brand} onChange={(e) => set('brand', e.target.value)} /></div>

        <div className="row">
          <div className="field"><label>Price</label><input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
          <div className="field"><label>MRP</label><input type="number" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} /></div>
        </div>

        <div className="field" style={{ maxWidth: 220 }}>
          <label>Cost / COGS (per unit)</label>
          <input type="number" step="0.01" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="your cost price" />
          <div className="hint">Used for true profit in Finance.</div>
        </div>

        <div className="row">
          <div className="field"><label>Rating (0–5)</label><input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => set('rating', e.target.value)} placeholder="4.3" /></div>
          <div className="field"><label>No. of ratings</label><input type="number" min="0" value={form.ratingCount} onChange={(e) => set('ratingCount', e.target.value)} placeholder="128" /></div>
        </div>

        <div className="field">
          <label>Tags (comma separated)</label>
          <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="steel, bottle" />
        </div>

        <div className="field">
          <label>Images</label>
          <input type="file" accept="image/*" multiple onChange={onUpload} disabled={uploading} />
          {uploading && <div className="hint">Uploading…</div>}
          {form.images.length > 0 && (
            <div className="imgs">
              {form.images.map((url) => (
                <div className="img" key={url}>
                  <img src={url} alt="" />
                  <button type="button" onClick={() => removeImage(url)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="row">
          <label className="check"><input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} /> Published</label>
          <label className="check"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Featured</label>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </div>
  );
}
