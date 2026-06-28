import { Fragment, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const usd = (n) => (n == null ? '—' : (n < 0 ? '-' : '') + '$' + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const inr = (n) => (n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }));

export default function Costs() {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [overheads, setOverheads] = useState([]);
  const [landed, setLanded] = useState({});
  const [fxRate, setFxRate] = useState(83);
  const [rateInput, setRateInput] = useState('');
  const [msg, setMsg] = useState(null);

  const reload = () => {
    api.listProducts().then((r) => setProducts(r.items || []));
    api.listBatches().then(setBatches).catch(() => {});
    api.listShipments().then(setShipments).catch(() => {});
    api.listOverheads().then(setOverheads).catch(() => {});
    api.landedCogs().then(setLanded).catch(() => {});
    api.getCostSettings().then((s) => { setFxRate(s.fxRate); setRateInput(String(s.fxRate)); }).catch(() => {});
  };
  useEffect(() => { reload(); }, []);

  const saveRate = async () => {
    const r = Number(rateInput);
    if (!r || r <= 0) return flash('Enter a valid rate', false);
    try { await api.updateCostSettings({ fxRate: r }); flash(`Rate set to ₹${r}/$`); reload(); }
    catch (e) { flash(e.message, false); }
  };

  const skuOptions = products.filter((p) => p.sku).map((p) => ({ sku: p.sku, title: p.title }));
  const titleFor = (sku) => skuOptions.find((s) => s.sku === sku)?.title || sku;
  const weightBySku = {};
  products.forEach((p) => { if (p.sku) weightBySku[p.sku] = p.weightGrams; });

  const flash = (t, ok = true) => { setMsg({ ok, t }); setTimeout(() => setMsg(null), 2500); };

  return (
    <>
      <div className="topbar"><h1>Costs &amp; Landed COGS</h1></div>
      {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.t}</div>}

      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16, maxWidth: 860 }}>
        Enter all costs in <strong>₹ (INR)</strong> — how you actually pay. They're converted to $ using your
        exchange rate so landed COGS reconciles against Amazon's USD revenue. Landed COGS/unit = purchase +
        inbound shipping (split by weight). Overheads are allocated across units sold in the Finance date range.
      </p>

      {/* Exchange rate control */}
      <div className="panel" style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Exchange rate</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Your average ₹ per $1. Update it anytime — all costs re-convert instantly.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontWeight: 600 }}>₹</span>
          <input type="number" step="0.01" value={rateInput} onChange={(e) => setRateInput(e.target.value)}
            style={{ width: 110, padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontWeight: 700 }} />
          <span style={{ color: 'var(--muted)' }}>= $1</span>
          <button className="btn" onClick={saveRate}>Save rate</button>
        </div>
      </div>

      {/* Computed landed COGS */}
      <div className="panel" style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 17, marginBottom: 4 }}>Computed Landed COGS</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Converted at ₹{fxRate}/$. Landed cost is what feeds your profit calculation.</p>
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Purchase/unit</th><th>Shipping/unit</th><th>Override</th><th>Landed/unit ($)</th></tr></thead>
          <tbody>
            {Object.entries(landed).filter(([, v]) => v.hasData).sort((a, b) => (b[1].landed || 0) - (a[1].landed || 0)).map(([sku, v]) => (
              <tr key={sku}>
                <td style={{ fontWeight: 600 }}>{titleFor(sku).slice(0, 42)}</td>
                <td>{sku}</td>
                <td>{v.purchasePerUnit != null ? <span>{usd(v.purchasePerUnit)} <span style={{ color: 'var(--muted)', fontSize: 11 }}>(₹{v.purchasePerUnitInr})</span></span> : '—'}</td>
                <td>{v.shippingPerUnit != null ? <span>{usd(v.shippingPerUnit)} <span style={{ color: 'var(--muted)', fontSize: 11 }}>(₹{v.shippingPerUnitInr})</span></span> : '—'}</td>
                <td>{v.manualOverride != null ? usd(v.manualOverride) : '—'}</td>
                <td style={{ fontWeight: 800, color: 'var(--brand)' }}>{usd(v.landed)}</td>
              </tr>
            ))}
            {Object.values(landed).filter((v) => v.hasData).length === 0 && (
              <tr><td colSpan={6} className="empty">No cost data yet. Add purchase batches and shipments below.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PurchaseSection batches={batches} skuOptions={skuOptions} titleFor={titleFor} reload={reload} flash={flash} />
      <ShipmentSection shipments={shipments} skuOptions={skuOptions} weightBySku={weightBySku} reload={reload} flash={flash} />
      <OverheadSection overheads={overheads} reload={reload} flash={flash} />
    </>
  );
}

function PurchaseSection({ batches, skuOptions, titleFor, reload, flash }) {
  const [f, setF] = useState({ sku: '', quantity: '', totalCost: '', note: '' });
  const add = async () => {
    if (!f.sku || !f.quantity || !f.totalCost) return flash('SKU, quantity and total cost are required', false);
    try {
      await api.createBatch({ ...f, quantity: Number(f.quantity), totalCost: Number(f.totalCost), productTitle: titleFor(f.sku) });
      setF({ sku: '', quantity: '', totalCost: '', note: '' }); reload(); flash('Purchase batch added');
    } catch (e) { flash(e.message, false); }
  };
  return (
    <div className="panel" style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 17, marginBottom: 12 }}>Purchase Batches</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 10, alignItems: 'end', marginBottom: 14 }}>
        <Field label="Product"><select value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })}><option value="">— select —</option>{skuOptions.map((s) => <option key={s.sku} value={s.sku}>{s.title.slice(0, 40)} ({s.sku})</option>)}</select></Field>
        <Field label="Quantity"><input type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Field>
        <Field label="Total cost ₹"><input type="number" step="0.01" value={f.totalCost} onChange={(e) => setF({ ...f, totalCost: e.target.value })} /></Field>
        <Field label="Note"><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <button className="btn" onClick={add}>Add</button>
      </div>
      <CostTable rows={batches} cols={[
        ['Product', (b) => b.productTitle || titleFor(b.sku)],
        ['Qty', (b) => b.quantity],
        ['Total', (b) => inr(b.totalCost)],
        ['Per unit', (b) => inr(b.totalCost / b.quantity)],
      ]} onDelete={(id) => api.deleteBatch(id).then(() => { reload(); flash('Deleted'); })} />
    </div>
  );
}

function ShipmentSection({ shipments, skuOptions, weightBySku, reload, flash }) {
  const [cost, setCost] = useState('');
  const [ref, setRef] = useState('');
  const [lines, setLines] = useState([{ sku: '', units: '' }]);
  const [fbaCost, setFbaCost] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const fbaRef = useRef(null);
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const add = async () => {
    const valid = lines.filter((l) => l.sku && l.units).map((l) => ({ sku: l.sku, units: Number(l.units) }));
    if (!cost || !valid.length) return flash('Shipping cost and at least one product line are required', false);
    try {
      await api.createShipment({ totalShippingCost: Number(cost), reference: ref, lines: valid });
      setCost(''); setRef(''); setLines([{ sku: '', units: '' }]); reload(); flash('Shipment added');
    } catch (e) { flash(e.message, false); }
  };

  const onFba = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const r = await api.importFbaShipment(file, fbaCost);
      flash(`${r.updated ? 'Updated' : 'Imported'} ${r.parsed.shipmentId}: ${r.parsed.lineCount} SKUs, ${r.parsed.totalUnits} units`);
      setFbaCost(''); reload();
    } catch (e2) { flash(e2.message, false); }
    finally { setBusy(false); if (fbaRef.current) fbaRef.current.value = ''; }
  };

  // Per-SKU cost share for a shipment (same weight-split logic as the server).
  const costShares = (s) => {
    const totalW = s.lines.reduce((a, l) => a + (weightBySku[l.sku] || 1) * l.units, 0) || 1;
    return s.lines.map((l) => {
      const w = (weightBySku[l.sku] || 1) * l.units;
      const share = (w / totalW) * (s.totalShippingCost || 0);
      return { ...l, share, perUnit: share / l.units };
    });
  };

  return (
    <div className="panel" style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 17, marginBottom: 4 }}>Shipments (inbound)</h2>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        Cost is split across each shipment's units by product weight (set weight in Products).
      </p>

      {/* FBA TSV import */}
      <div style={{ background: 'var(--soft, #f7f7f8)', border: '1px dashed var(--line)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📦 Import from Amazon FBA shipment file</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="number" step="0.01" placeholder="shipping cost ₹ (optional)" value={fbaCost} onChange={(e) => setFbaCost(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, width: 200 }} />
          <input ref={fbaRef} type="file" accept=".tsv,.csv,.txt" onChange={onFba} disabled={busy} />
          {busy && <span className="hint">Importing…</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          Upload the .tsv from Amazon → auto-fills shipment ID + SKUs + units. Enter the cost now or edit later.
        </div>
      </div>

      <details style={{ marginBottom: 14 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--brand)' }}>+ Add a shipment manually</summary>
        <div style={{ display: 'flex', gap: 10, margin: '12px 0 10px' }}>
          <Field label="Total shipping ₹"><input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          <Field label="Reference"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="shipment ID" /></Field>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <select value={l.sku} onChange={(e) => setLine(i, 'sku', e.target.value)} style={{ flex: 2, padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8 }}>
              <option value="">— product —</option>{skuOptions.map((s) => <option key={s.sku} value={s.sku}>{s.title.slice(0, 36)} ({s.sku})</option>)}
            </select>
            <input type="number" placeholder="units" value={l.units} onChange={(e) => setLine(i, 'units', e.target.value)} style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8 }} />
            {lines.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</button>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setLines([...lines, { sku: '', units: '' }])}>+ line</button>
          <button className="btn" onClick={add}>Save shipment</button>
        </div>
      </details>

      {/* Shipment list with expandable per-SKU detail */}
      {shipments.length === 0 ? <div className="empty" style={{ padding: 20 }}>No shipments yet.</div> : (
        <table>
          <thead><tr><th>Shipment</th><th>Products</th><th>Units</th><th>Shipping</th><th></th></tr></thead>
          <tbody>
            {shipments.map((s) => {
              const totalUnits = s.lines.reduce((a, l) => a + l.units, 0);
              const isOpen = expanded === s._id;
              return (
                <Fragment key={s._id}>
                  <tr>
                    <td style={{ fontWeight: 600 }}>
                      <button onClick={() => setExpanded(isOpen ? null : s._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, color: 'var(--brand)' }}>
                        {isOpen ? '▾' : '▸'} {s.shipmentId || s.reference || 'shipment'}
                      </button>
                      {s.name && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{s.name}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{s.lines.length} SKUs</td>
                    <td>{totalUnits}</td>
                    <td style={{ fontWeight: 600 }}>{s.totalShippingCost ? inr(s.totalShippingCost) : <span style={{ color: '#b45309' }}>set cost</span>}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => api.deleteShipment(s._id).then(() => { reload(); flash('Deleted'); })}>Delete</button></td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} style={{ background: '#fafafa', padding: 0 }}>
                        <table style={{ margin: 0 }}>
                          <thead><tr><th>SKU</th><th>Units</th><th>Weight</th><th>Cost share</th><th>Per unit</th></tr></thead>
                          <tbody>
                            {costShares(s).map((l) => (
                              <tr key={l.sku}>
                                <td style={{ fontSize: 13 }}>{l.sku}</td>
                                <td>{l.units}</td>
                                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{weightBySku[l.sku] ? `${weightBySku[l.sku]}g` : 'no weight'}</td>
                                <td>{inr(l.share)}</td>
                                <td style={{ fontWeight: 600 }}>{inr(l.perUnit)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function OverheadSection({ overheads, reload, flash }) {
  const [f, setF] = useState({ label: '', amount: '', date: '', recurring: false });
  const add = async () => {
    if (!f.label || !f.amount || !f.date) return flash('Label, amount and month are required', false);
    try {
      await api.createOverhead({ ...f, amount: Number(f.amount), date: new Date(f.date) });
      setF({ label: '', amount: '', date: '', recurring: false }); reload(); flash('Overhead added');
    } catch (e) { flash(e.message, false); }
  };
  return (
    <div className="panel" style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 17, marginBottom: 4 }}>Overheads (rent, packaging, …)</h2>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>Allocated across units sold within the Finance date range.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', gap: 10, alignItems: 'end', marginBottom: 14 }}>
        <Field label="Label"><input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Shop rent" /></Field>
        <Field label="Amount ₹"><input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Month"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <label className="check" style={{ paddingBottom: 10 }}><input type="checkbox" checked={f.recurring} onChange={(e) => setF({ ...f, recurring: e.target.checked })} /> Recurring</label>
        <button className="btn" onClick={add}>Add</button>
      </div>
      <CostTable rows={overheads} cols={[
        ['Label', (o) => o.label],
        ['Amount', (o) => inr(o.amount)],
        ['Month', (o) => new Date(o.date).toISOString().slice(0, 7)],
        ['Recurring', (o) => (o.recurring ? 'Yes' : 'No')],
      ]} onDelete={(id) => api.deleteOverhead(id).then(() => { reload(); flash('Deleted'); })} />
    </div>
  );
}

function Field({ label, children }) {
  return <div className="field" style={{ margin: 0 }}><label style={{ fontSize: 12 }}>{label}</label>{children}</div>;
}

function CostTable({ rows, cols, onDelete }) {
  if (!rows.length) return <div className="empty" style={{ padding: 20 }}>None yet.</div>;
  return (
    <table>
      <thead><tr>{cols.map((c) => <th key={c[0]}>{c[0]}</th>)}<th></th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r._id}>
            {cols.map((c) => <td key={c[0]} style={{ fontSize: 13 }}>{c[1](r)}</td>)}
            <td><button className="btn btn-danger btn-sm" onClick={() => onDelete(r._id)}>Delete</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
