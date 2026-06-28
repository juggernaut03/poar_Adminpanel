import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const usd = (n) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Dependency-free SVG line chart for the daily sales series.
function TrendChart({ data }) {
  if (!data.length) return <div className="empty">No sales data for this range.</div>;
  const W = 900;
  const H = 240;
  const pad = { l: 50, r: 16, t: 16, b: 28 };
  const xs = data.map((_, i) => i);
  const max = Math.max(1, ...data.map((d) => d.sales));
  const px = (i) => pad.l + (i / Math.max(1, xs.length - 1)) * (W - pad.l - pad.r);
  const py = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d.sales)}`).join(' ');
  const area = `${line} L${px(data.length - 1)},${H - pad.b} L${px(0)},${H - pad.b} Z`;

  // sparse x labels
  const step = Math.ceil(data.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={py(max * f)} y2={py(max * f)} stroke="#eee" />
          <text x={8} y={py(max * f) + 4} fontSize="11" fill="#9aa3af">{usd(max * f)}</text>
        </g>
      ))}
      <path d={area} fill="rgba(255,90,31,0.12)" />
      <path d={line} fill="none" stroke="#ff5a1f" strokeWidth="2" />
      {data.map((d, i) => (i % step === 0 ? (
        <text key={i} x={px(i)} y={H - 8} fontSize="10" fill="#9aa3af" textAnchor="middle">{d.label.slice(5)}</text>
      ) : null))}
    </svg>
  );
}

function UploadCard({ kind, label, hint, onDone }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.financeImport(kind, file);
      const detail = kind === 'transactions'
        ? `Parsed ${r.parsed}, added ${r.created}, skipped ${r.skipped} duplicates`
        : `Parsed ${r.parsed}, upserted ${r.upserted} days`;
      setMsg({ ok: true, text: detail });
      onDone?.();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="panel" style={{ flex: 1 }}>
      <h3 style={{ fontSize: 15, marginBottom: 4 }}>{label}</h3>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{hint}</p>
      {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ fontSize: 13 }}>{msg.text}</div>}
      <input ref={ref} type="file" accept=".csv" onChange={onPick} disabled={busy} />
      {busy && <div className="hint">Importing…</div>}
    </div>
  );
}

export default function Finance() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [top, setTop] = useState([]);
  const [profit, setProfit] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.financeSummary(range).catch(() => null),
      api.financeSalesTrend(range).catch(() => []),
      api.financeTopProducts({ ...range, limit: 8 }).catch(() => []),
      api.financeProfit(range).catch(() => null),
    ]).then(([s, t, tp, pr]) => {
      setSummary(s); setTrend(t || []); setTop(tp || []); setProfit(pr);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range.from, range.to]);

  const refundRate = summary && summary.grossSales
    ? Math.abs((summary.refunds / summary.grossSales) * 100)
    : 0;

  return (
    <>
      <div className="topbar">
        <h1>Finance & P&amp;L</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }} />
          <span style={{ color: 'var(--muted)' }}>→</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }} />
          {(range.from || range.to) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setRange({ from: '', to: '' })}>Clear</button>
          )}
        </div>
      </div>

      {/* CSV imports */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <UploadCard kind="transactions" label="Import Transactions report" hint="Amazon Payments → Transactions CSV. Real fees & refunds for P&L. (Duplicates are skipped automatically.)" onDone={load} />
        <UploadCard kind="sales" label="Import Sales Dashboard" hint="Amazon Business → Sales Dashboard CSV. Daily revenue & YoY trend." onDone={load} />
      </div>

      {loading ? (
        <div className="empty">Loading finance data…</div>
      ) : !summary ? (
        <div className="empty">No finance data yet. Upload a Transactions CSV to get started.</div>
      ) : (
        <>
          {/* P&L summary cards */}
          <div className="stats">
            <div className="stat"><div className="num">{usd(summary.grossSales)}</div><div className="lbl">Gross sales (orders)</div></div>
            <div className="stat"><div className="num" style={{ color: '#dc2626' }}>{usd(summary.refunds)}</div><div className="lbl">Refunds</div></div>
            <div className="stat"><div className="num" style={{ color: '#dc2626' }}>{usd(summary.amazonFees)}</div><div className="lbl">Amazon fees</div></div>
            <div className="stat"><div className="num" style={{ color: '#dc2626' }}>{usd(summary.serviceFees)}</div><div className="lbl">Service / storage fees</div></div>
            <div className="stat"><div className="num">{usd(summary.reimbursements)}</div><div className="lbl">Reimbursements</div></div>
            <div className="stat" style={{ borderColor: 'var(--brand)' }}>
              <div className="num" style={{ color: summary.netProceeds >= 0 ? 'var(--green, #15803d)' : '#dc2626' }}>{usd(summary.netProceeds)}</div>
              <div className="lbl">Net proceeds (after Amazon)</div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20, fontSize: 13, color: 'var(--muted)' }}>
            {summary.coverage?.from && (
              <div style={{ marginBottom: 6 }}>
                <strong style={{ color: 'var(--brand)' }}>Data coverage:</strong>{' '}
                {summary.coverage.from} → {summary.coverage.to}
                {(range.from || range.to) && ' (filtered)'}
              </div>
            )}
            <strong style={{ color: 'var(--ink)' }}>Note:</strong> Net proceeds are after Amazon fees but before your product cost (COGS).
            Add per-product cost in Products to compute true net profit. Refund rate: <strong>{refundRate.toFixed(1)}%</strong> ·
            Transactions: <strong>{summary.transactionCount}</strong>. Reserve-balance entries are excluded.
          </div>

          {/* True net profit (after Amazon fees AND COGS) */}
          {profit && profit.products?.length > 0 && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, marginBottom: 4 }}>True Net Profit (after Amazon fees + COGS)</h2>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
                Profit = Amazon net (incl. refunds) − (units kept × your cost). Service/storage fees are
                applied to the bottom line.
                {profit.unmappedProducts > 0 && (
                  <span style={{ color: '#b45309' }}> {profit.unmappedProducts} product(s) still missing a cost.</span>
                )}
              </p>

              <table>
                <thead>
                  <tr><th>Product</th><th>Units kept</th><th>Net after Amazon</th><th>COGS/unit</th><th>COGS total</th><th>Profit</th></tr>
                </thead>
                <tbody>
                  {profit.products.map((p) => (
                    <tr key={p.product}>
                      <td style={{ fontWeight: 600 }}>{p.product}{p.sku ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {p.sku}</span> : ''}</td>
                      <td>{p.unitsKept}</td>
                      <td>{usd(p.netAfterAmazon)}</td>
                      <td>{p.cogsPerUnit != null ? usd(p.cogsPerUnit) : <span style={{ color: '#b45309' }}>— set cost —</span>}</td>
                      <td>{p.cogsTotal != null ? usd(p.cogsTotal) : '—'}</td>
                      <td style={{ fontWeight: 700, color: p.profit == null ? 'var(--muted)' : p.profit >= 0 ? '#15803d' : '#dc2626' }}>
                        {p.profit != null ? usd(p.profit) : 'n/a'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 18 }}>
                <div className="stat"><div className="num">{usd(profit.productProfit)}</div><div className="lbl">Product profit</div></div>
                <div className="stat"><div className="num" style={{ color: '#dc2626' }}>{usd(profit.totalCogs)}</div><div className="lbl">Total COGS</div></div>
                <div className="stat"><div className="num" style={{ color: '#dc2626' }}>{usd(profit.serviceFees)}</div><div className="lbl">Service / storage fees</div></div>
                <div className="stat" style={{ borderColor: profit.netProfit >= 0 ? '#15803d' : '#dc2626', borderWidth: 2 }}>
                  <div className="num" style={{ color: profit.netProfit >= 0 ? '#15803d' : '#dc2626' }}>{usd(profit.netProfit)}</div>
                  <div className="lbl">NET PROFIT (bottom line)</div>
                </div>
              </div>
            </div>
          )}

          {/* Sales trend */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, marginBottom: 12 }}>Daily Sales Trend</h2>
            <TrendChart data={trend} />
          </div>

          {/* Top products + fee breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            <div className="panel">
              <h2 style={{ fontSize: 17, marginBottom: 12 }}>Top Products by Net</h2>
              {top.length === 0 ? <div className="empty">No order data.</div> : (
                <table>
                  <thead><tr><th>Product</th><th>Orders</th><th>Fees</th><th>Net</th></tr></thead>
                  <tbody>
                    {top.map((p) => (
                      <tr key={p.product}>
                        <td style={{ fontSize: 13 }}>{p.product}</td>
                        <td>{p.orders}</td>
                        <td style={{ color: '#dc2626' }}>{usd(p.fees)}</td>
                        <td style={{ fontWeight: 700 }}>{usd(p.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <h2 style={{ fontSize: 17, marginBottom: 12 }}>Breakdown by Type</h2>
              <table>
                <tbody>
                  {Object.entries(summary.byType || {}).sort((a, b) => b[1].total - a[1].total).map(([type, v]) => (
                    <tr key={type}>
                      <td style={{ fontWeight: 600 }}>{type}</td>
                      <td style={{ color: 'var(--muted)' }}>{v.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: v.total < 0 ? '#dc2626' : 'var(--ink)' }}>{usd(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
