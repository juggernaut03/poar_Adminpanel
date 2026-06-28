import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const usd = (n) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GREEN = '#15803d';
const RED = '#dc2626';

// Visual profit/loss table: a diverging bar per product + margin %, with
// money-maker / loss-maker row tinting so winners and losers are obvious.
function ProfitTable({ products }) {
  const maxAbs = Math.max(1, ...products.map((p) => Math.abs(p.profit || 0)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 1.4fr 0.9fr 0.9fr', gap: 12, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', padding: '0 12px' }}>
        <span>Product</span><span style={{ textAlign: 'right' }}>Units</span>
        <span>Profit / loss</span><span style={{ textAlign: 'right' }}>Margin</span><span style={{ textAlign: 'right' }}>Profit</span>
      </div>
      {products.map((p) => {
        const has = p.profit != null;
        const win = has && p.profit >= 0;
        const margin = has && p.netAfterAmazon ? (p.profit / p.netAfterAmazon) * 100 : null;
        const barW = has ? (Math.abs(p.profit) / maxAbs) * 100 : 0;
        return (
          <div key={p.product} style={{
            display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 1.4fr 0.9fr 0.9fr', gap: 12, alignItems: 'center',
            padding: '10px 12px', borderRadius: 10,
            background: !has ? '#fafafa' : win ? 'rgba(21,128,61,0.06)' : 'rgba(220,38,38,0.06)',
          }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {win && has && <span title="profitable" style={{ color: GREEN }}>▲ </span>}
              {!win && has && <span title="loss-making" style={{ color: RED }}>▼ </span>}
              {p.product}
              {p.sku && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {p.sku}</span>}
            </div>
            <div style={{ textAlign: 'right', fontSize: 13 }}>{p.unitsKept}</div>
            {/* diverging bar centered on zero */}
            <div style={{ position: 'relative', height: 18, background: 'transparent' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--line)' }} />
              {has && (
                <div style={{
                  position: 'absolute', top: 3, height: 12, borderRadius: 3,
                  background: win ? GREEN : RED,
                  ...(win
                    ? { left: '50%', width: `${barW / 2}%` }
                    : { right: '50%', width: `${barW / 2}%` }),
                }} />
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: margin == null ? 'var(--muted)' : margin >= 0 ? GREEN : RED }}>
              {margin == null ? '—' : `${margin.toFixed(0)}%`}
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: !has ? 'var(--muted)' : win ? GREEN : RED }}>
              {has ? usd(p.profit) : 'set cost'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact horizontal waterfall from gross net down to the bottom line.
function Waterfall({ steps }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' }}>
      {steps.map((s, i) => {
        const isTotal = s.kind === 'total';
        const isNeg = s.kind === 'neg';
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              minWidth: 150, padding: '10px 14px', borderRadius: 10,
              border: isTotal ? `2px solid ${s.value >= 0 ? GREEN : RED}` : '1px solid var(--line)',
              background: isTotal ? (s.value >= 0 ? 'rgba(21,128,61,0.06)' : 'rgba(220,38,38,0.06)') : '#fff',
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isTotal ? (s.value >= 0 ? GREEN : RED) : isNeg ? RED : 'var(--ink)' }}>
                {usd(s.value)}
              </div>
            </div>
            {i < steps.length - 1 && <span style={{ color: 'var(--muted)', fontSize: 18 }}>→</span>}
          </div>
        );
      })}
    </div>
  );
}

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

  // top-products now returns clean labels from the server.
  const topRows = (top || []).map((t) => ({
    name: t.product, net: t.net, gross: t.gross, fees: t.fees, orders: t.orders,
  }));
  const topMax = Math.max(1, ...topRows.map((t) => t.net));

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <h2 style={{ fontSize: 17 }}>True Net Profit <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 14 }}>(after Amazon fees + your cost)</span></h2>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: profit.netProfit >= 0 ? '#15803d' : '#dc2626' }}>{usd(profit.netProfit)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>net profit</div>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>
                Per product: profit = Amazon net (incl. refunds) − units kept × your cost.
                {profit.unmappedProducts > 0 && (
                  <span style={{ color: '#b45309' }}> {profit.unmappedProducts} product(s) need a cost — set it in Products.</span>
                )}
              </p>

              <ProfitTable products={profit.products} />

              {/* Waterfall to the bottom line */}
              <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <Waterfall
                  steps={[
                    { label: 'Net after Amazon', value: profit.netAfterAmazon, kind: 'base' },
                    { label: 'Less: cost of goods', value: -profit.totalCogs, kind: 'neg' },
                    { label: 'Less: storage/service fees', value: profit.serviceFees, kind: 'neg' },
                    ...(profit.overhead ? [{ label: `Less: overhead (rent etc.)`, value: profit.overhead, kind: 'neg' }] : []),
                    { label: 'Net profit', value: profit.netProfit, kind: 'total' },
                  ]}
                />
                {profit.overheadPerUnit > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                    Overhead allocated at {usd(profit.overheadPerUnit)}/unit across {profit.unitsSold} units sold.
                  </p>
                )}
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
              <h2 style={{ fontSize: 17, marginBottom: 14 }}>Top Products by Revenue</h2>
              {topRows.length === 0 ? <div className="empty">No order data.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {topRows.map((p) => {
                    const w = (p.net / topMax) * 100;
                    return (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</span>
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{usd(p.net)}</span>
                        </div>
                        <div style={{ height: 8, background: '#f0f1f3', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ width: `${w}%`, height: '100%', background: 'var(--brand)', borderRadius: 5 }} />
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                          {p.orders} orders · fees {usd(p.fees)} ({Math.abs((p.fees / p.gross) * 100).toFixed(0)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="panel">
              <h2 style={{ fontSize: 17, marginBottom: 14 }}>Breakdown by Type</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(summary.byType || {}).sort((a, b) => b[1].total - a[1].total).map(([type, v]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.total < 0 ? RED : GREEN }} />
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{type}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>×{v.count}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: v.total < 0 ? RED : 'var(--ink)' }}>{usd(v.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
