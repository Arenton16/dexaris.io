export default function Methodology() {
  const S = styles;

  const components = [
    {
      name: 'APY Consistency',
      weight: '30%',
      description: 'How stable the yield has been over 30 days — volatile APY is penalised',
    },
    {
      name: 'APY Level',
      weight: '20%',
      description: 'Yield attractiveness with diminishing returns above 50% — extreme APY is a red flag, not a reward',
    },
    {
      name: 'TVL Size',
      weight: '20%',
      description: 'Pool depth as a proxy for liquidity and market confidence, log-scaled',
    },
    {
      name: 'Organic Yield Ratio',
      weight: '20%',
      description: 'How much of the yield comes from real activity vs token incentives — incentive-heavy pools score lower',
    },
    {
      name: 'Pool Age Proxy',
      weight: '10%',
      description: 'Protocol maturity signals using available risk and outlier data',
    },
  ];

  const tiers = [
    { range: '80 – 100', label: 'Strong',   color: '#4ECDA4',                   bg: 'rgba(78,205,164,0.10)'  },
    { range: '60 – 79',  label: 'Solid',    color: 'rgba(78,205,164,0.65)',      bg: 'rgba(78,205,164,0.06)'  },
    { range: '40 – 59',  label: 'Moderate', color: '#FFB347',                   bg: 'rgba(255,179,71,0.10)'  },
    { range: '20 – 39',  label: 'Weak',     color: 'rgba(255,107,107,0.75)',     bg: 'rgba(255,107,107,0.08)' },
    { range: '0 – 19',   label: 'Poor',     color: 'rgba(255,107,107,0.45)',     bg: 'rgba(255,107,107,0.05)' },
  ];

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={S.topBar}>
        <a href="/app" style={S.backLink}>← Back to Dexaris</a>
      </div>

      <div style={S.container}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.headerBadge}>Dexaris Score</div>
          <h1 style={S.title}>How the Dexaris Score Works</h1>
          <p style={S.subtitle}>
            A proprietary 0–100 rating that measures the quality and sustainability of a DeFi yield
            opportunity — designed to surface yield worth chasing, not just highest APY.
          </p>
        </div>

        {/* Scoring components table */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Scoring Components</h2>
          <p style={S.cardSubtitle}>
            Each component is scored 0–10, then multiplied by its weight. The final score is the sum, capped at 100.
          </p>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, ...S.thFirst }}>Component</th>
                  <th style={{ ...S.th, ...S.thWeight }}>Weight</th>
                  <th style={S.th}>What it measures</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c, i) => (
                  <tr
                    key={c.name}
                    style={i % 2 === 0 ? S.trEven : S.trOdd}
                  >
                    <td style={{ ...S.td, ...S.tdName }}>{c.name}</td>
                    <td style={{ ...S.td, ...S.tdWeight }}>{c.weight}</td>
                    <td style={{ ...S.td, ...S.tdDesc }}>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Score tier section */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Score Tiers</h2>
          <p style={S.cardSubtitle}>
            What your pool's score means at a glance.
          </p>
          <div style={S.tierList}>
            {tiers.map(t => (
              <div key={t.label} style={{ ...S.tierRow, background: t.bg, borderColor: `${t.color}40` }}>
                <div style={{ ...S.tierBadge, color: t.color, borderColor: `${t.color}50`, background: `${t.color}15` }}>
                  {t.range}
                </div>
                <div style={{ ...S.tierLabel, color: t.color }}>{t.label}</div>
                <div style={S.tierBar}>
                  <div style={{
                    ...S.tierBarFill,
                    width: t.range.startsWith('80') ? '92%'
                         : t.range.startsWith('60') ? '72%'
                         : t.range.startsWith('40') ? '52%'
                         : t.range.startsWith('20') ? '32%'
                         : '12%',
                    background: t.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={S.disclaimer}>
          <div style={S.disclaimerHeader}>
            <span style={S.disclaimerIcon}>⚠</span>
            <span style={S.disclaimerTitle}>Important Disclaimer</span>
          </div>
          <p style={S.disclaimerText}>
            The Dexaris Score is an independent analytical tool provided for informational purposes only.
            It does not constitute financial advice, investment advice, or a recommendation to buy, sell,
            or hold any asset. DeFi protocols carry significant risks including smart contract vulnerabilities,
            liquidity risk, and token price depreciation. Always conduct your own research before committing
            capital. Dexaris is not regulated by the FCA, SEC, or any other financial authority. Past score
            performance does not guarantee future yield outcomes.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0C0B1A',
    fontFamily: 'Inter, sans-serif',
    color: '#E8E6FF',
  } as React.CSSProperties,

  topBar: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(107,79,255,0.12)',
    background: 'rgba(17,16,40,0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  } as React.CSSProperties,

  backLink: {
    color: 'rgba(232,230,255,0.5)',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '0.01em',
    transition: 'color 0.15s',
  } as React.CSSProperties,

  container: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 80px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 24,
  } as React.CSSProperties,

  header: {
    marginBottom: 8,
  } as React.CSSProperties,

  headerBadge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#6B4FFF',
    background: 'rgba(107,79,255,0.12)',
    border: '1px solid rgba(107,79,255,0.25)',
    borderRadius: 4,
    padding: '3px 10px',
    marginBottom: 16,
  } as React.CSSProperties,

  title: {
    fontSize: 28,
    fontWeight: 600,
    color: '#E8E6FF',
    letterSpacing: '-0.3px',
    margin: '0 0 14px',
    lineHeight: 1.25,
  } as React.CSSProperties,

  subtitle: {
    fontSize: 15,
    color: 'rgba(232,230,255,0.55)',
    lineHeight: 1.65,
    margin: 0,
    maxWidth: 620,
  } as React.CSSProperties,

  card: {
    background: 'rgba(107,79,255,0.05)',
    border: '1px solid rgba(107,79,255,0.15)',
    borderRadius: 12,
    padding: '28px 28px 24px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  } as React.CSSProperties,

  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'rgba(232,230,255,0.45)',
    margin: '0 0 6px',
  } as React.CSSProperties,

  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(232,230,255,0.40)',
    margin: '0 0 20px',
    lineHeight: 1.5,
  } as React.CSSProperties,

  tableWrap: {
    overflowX: 'auto' as const,
    margin: '0 -4px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '10px 14px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.09em',
    textTransform: 'uppercase' as const,
    color: 'rgba(232,230,255,0.35)',
    borderBottom: '1px solid rgba(107,79,255,0.15)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  thFirst: {
    paddingLeft: 0,
  } as React.CSSProperties,

  thWeight: {
    width: 72,
  } as React.CSSProperties,

  trEven: {
    background: 'transparent',
  } as React.CSSProperties,

  trOdd: {
    background: 'rgba(107,79,255,0.03)',
  } as React.CSSProperties,

  td: {
    padding: '13px 14px',
    borderBottom: '1px solid rgba(107,79,255,0.07)',
    verticalAlign: 'top' as const,
    lineHeight: 1.5,
  } as React.CSSProperties,

  tdName: {
    paddingLeft: 0,
    fontWeight: 500,
    color: '#E8E6FF',
    whiteSpace: 'nowrap' as const,
    fontSize: 13,
  } as React.CSSProperties,

  tdWeight: {
    fontWeight: 700,
    color: '#6B4FFF',
    fontSize: 14,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  tdDesc: {
    color: 'rgba(232,230,255,0.55)',
    fontSize: 13,
  } as React.CSSProperties,

  tierList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  } as React.CSSProperties,

  tierRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid',
  } as React.CSSProperties,

  tierBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 4,
    border: '1px solid',
    whiteSpace: 'nowrap' as const,
    minWidth: 72,
    textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,

  tierLabel: {
    fontWeight: 600,
    fontSize: 13,
    minWidth: 68,
  } as React.CSSProperties,

  tierBar: {
    flex: 1,
    height: 4,
    background: 'rgba(232,230,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden' as const,
  } as React.CSSProperties,

  tierBarFill: {
    height: '100%',
    borderRadius: 2,
    opacity: 0.7,
  } as React.CSSProperties,

  disclaimer: {
    background: 'rgba(107,79,255,0.04)',
    border: '1px solid rgba(107,79,255,0.3)',
    borderRadius: 12,
    padding: '22px 24px',
    boxShadow: '0 0 0 4px rgba(107,79,255,0.06)',
  } as React.CSSProperties,

  disclaimerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  } as React.CSSProperties,

  disclaimerIcon: {
    fontSize: 16,
    color: '#FFB347',
  } as React.CSSProperties,

  disclaimerTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase' as const,
    color: '#FFB347',
  } as React.CSSProperties,

  disclaimerText: {
    fontSize: 13,
    color: 'rgba(232,230,255,0.55)',
    lineHeight: 1.7,
    margin: 0,
  } as React.CSSProperties,
};
