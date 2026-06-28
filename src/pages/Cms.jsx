import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Editable CMS blocks. Each field maps to a key inside the block's `data`.
const BLOCKS = [
  {
    key: 'site', label: 'Site Settings',
    fields: [
      { name: 'brandName', label: 'Brand name' },
      { name: 'email', label: 'Support email' },
      { name: 'phone', label: 'Phone' },
      { name: 'address', label: 'Address', textarea: true },
    ],
  },
  {
    key: 'home_hero', label: 'Home Hero',
    fields: [
      { name: 'title', label: 'Title' },
      { name: 'subtitle', label: 'Subtitle' },
      { name: 'ctaText', label: 'Button text' },
    ],
  },
  {
    key: 'about', label: 'About Page',
    fields: [
      { name: 'heading', label: 'Heading' },
      { name: 'body', label: 'Body', textarea: true },
    ],
  },
];

function BlockEditor({ block }) {
  const [data, setData] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listContent().then((blocks) => {
      const found = blocks.find((b) => b.key === block.key);
      setData(found?.data || {});
    }).catch(() => {});
  }, [block.key]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.upsertContent(block.key, block.label, data);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 17, marginBottom: 16 }}>{block.label}</h2>
      {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
      {block.fields.map((f) => (
        <div className="field" key={f.name}>
          <label>{f.label}</label>
          {f.textarea ? (
            <textarea value={data[f.name] || ''} onChange={(e) => setData({ ...data, [f.name]: e.target.value })} />
          ) : (
            <input value={data[f.name] || ''} onChange={(e) => setData({ ...data, [f.name]: e.target.value })} />
          )}
        </div>
      ))}
      <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : `Save ${block.label}`}</button>
    </div>
  );
}

export default function Cms() {
  return (
    <>
      <div className="topbar"><h1>Website CMS</h1></div>
      {BLOCKS.map((b) => <BlockEditor key={b.key} block={b} />)}
    </>
  );
}
