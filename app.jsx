const { useEffect, useMemo, useState, useCallback } = React;

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function n(v) {
  const x = parseInt((v ?? '').toString().trim(), 10);
  return Number.isFinite(x) ? x : 0;
}

function cleanText(s) {
  return (s ?? '').toString().replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(s, max = 120) {
  const t = cleanText(s);
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function hasContact(row) {
  return Boolean((row.email || '').trim() || (row.phone || '').trim());
}

function safeUrl(u) {
  const s = (u || '').toString().trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return '';
  return s;
}

function hostFromUrl(u) {
  try { return new URL(u).hostname.replace('www.', ''); } catch { return u; }
}

// Priority tier - using warm, professional tones
function getPriorityTier(rank, total) {
  const r = n(rank);
  const pct = (r / (n(total) || 129)) * 100;
  if (r <= 10) return { tier: 'priority', label: 'Priority', accent: 'var(--accent-gold)', bg: 'var(--card-priority)' };
  if (pct <= 25) return { tier: 'high', label: 'High', accent: 'var(--accent-teal)', bg: 'var(--card-high)' };
  if (pct <= 50) return { tier: 'medium', label: '', accent: 'var(--text-muted)', bg: 'var(--card-base)' };
  return { tier: 'standard', label: '', accent: 'var(--text-muted)', bg: 'var(--card-base)' };
}

// ─────────────────────────────────────────────────────────────
// ICONS - Refined, minimal strokes
// ─────────────────────────────────────────────────────────────

function IconMail({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function IconLinkedIn({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function IconGlobe({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function IconSearch({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function IconCheck({ className = '' }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function IconQuestion({ className = '' }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function IconChevron({ className = '', open }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function IconSun({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  );
}

function IconMoon({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function IconInsight({ className = '' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function VerificationBadge({ status }) {
  if (status === 'verified' || status === 'website_verified') {
    return (
      <span className="badge badge--verified">
        <IconCheck />
        <span>Verified</span>
      </span>
    );
  }
  if (status === 'unsure') {
    return (
      <span className="badge badge--unverified">
        <IconQuestion />
        <span>Unverified</span>
      </span>
    );
  }
  return null;
}

function ContactActions({ row }) {
  const email = (row.email || '').trim();
  const linkedin = safeUrl(row.linkedin_url || row.owl_linkedin);
  const website = safeUrl(row.owl_website_updated || row.website);

  if (!email && !linkedin && !website) return null;

  return (
    <div className="contact-actions">
      {email && (
        <a href={`mailto:${email}`} className="action-btn action-btn--primary" aria-label="Send email">
          <IconMail /> Email
        </a>
      )}
      {linkedin && (
        <a href={linkedin} target="_blank" rel="noopener noreferrer" className="action-btn" aria-label="View LinkedIn">
          <IconLinkedIn /> LinkedIn
        </a>
      )}
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" className="action-btn" aria-label="Visit website">
          <IconGlobe /> Website
        </a>
      )}
    </div>
  );
}

function InsightBlock({ label, value }) {
  if (!value) return null;
  return (
    <div className="insight-block">
      <span className="insight-label">{label}</span>
      <p className="insight-value">{truncate(value, 200)}</p>
    </div>
  );
}

function AttendeeCard({ row, totalRows, expanded, onToggle }) {
  const rank = n(row.priority_rank);
  const tier = getPriorityTier(rank, totalRows);
  const photoUrl = safeUrl(row.photo_url);
  const [photoOk, setPhotoOk] = useState(true);

  const seeking = row.owl_seeking || '';
  const whoYouServe = row.owl_who_you_serve || '';
  const whatYouDo = row.owl_what_you_do || '';
  const hasInsights = seeking || whoYouServe || whatYouDo;

  return (
    <article
      className={`card ${expanded ? 'card--expanded' : ''}`}
      style={{ '--tier-accent': tier.accent }}
    >
      <div className="card__header" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }}}
        aria-expanded={expanded}>

        <div className="card__rank" data-tier={tier.tier}>{rank}</div>

        <div className="card__avatar">
          {photoUrl && photoOk ? (
            <img src={photoUrl} alt="" loading="lazy" onError={() => setPhotoOk(false)} />
          ) : (
            <span className="card__initials">{initials(row.name)}</span>
          )}
        </div>

        <div className="card__info">
          <h3 className="card__name">{row.name}</h3>
          {row.organization && <p className="card__org">{row.organization}</p>}
          <div className="card__meta">
            <VerificationBadge status={row.owl_verification_status} />
            {tier.label && <span className="badge badge--tier">{tier.label}</span>}
            {hasInsights && <span className="badge badge--insights"><IconInsight /> Research</span>}
          </div>
        </div>

        <IconChevron className="card__chevron" open={expanded} />
      </div>

      {expanded && (
        <div className="card__body">
          <ContactActions row={row} />

          {hasInsights && (
            <div className="card__insights">
              <InsightBlock label="Looking for" value={seeking} />
              <InsightBlock label="Who they serve" value={whoYouServe} />
              <InsightBlock label="What they do" value={whatYouDo} />
            </div>
          )}

          {row.owl_verification_notes && (
            <div className="card__verification">
              <span className="verification-label">Verification notes</span>
              <p>{row.owl_verification_notes}</p>
            </div>
          )}

          <div className="card__scores">
            <div className="score"><span className="score__value">{row.fit_score ?? '—'}</span><span className="score__label">Fit</span></div>
            <div className="score"><span className="score__value">{row.targeting__buyer_score ?? '—'}</span><span className="score__label">Buyer</span></div>
            <div className="score"><span className="score__value">{row.targeting__partner_score ?? '—'}</span><span className="score__label">Partner</span></div>
            <div className="score"><span className="score__value">{row.jv_readiness_score ?? '—'}</span><span className="score__label">JV Ready</span></div>
          </div>
        </div>
      )}
    </article>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
      {detail && <span className="stat__detail">{detail}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

function Dashboard() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    fetch(`data.json?v=${Date.now()}`)
      .then(r => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const stats = useMemo(() => {
    const total = rows.length;
    const verified = rows.filter(r => r.owl_verification_status === 'verified' || r.owl_verification_status === 'website_verified').length;
    const unverified = rows.filter(r => r.owl_verification_status === 'unsure').length;
    const enriched = rows.filter(r => r.owl_seeking || r.owl_who_you_serve).length;
    const contactable = rows.filter(hasContact).length;
    return { total, verified, unverified, enriched, contactable };
  }, [rows]);

  const filtered = useMemo(() => {
    let result = [...rows];
    if (filter === 'verified') result = result.filter(r => r.owl_verification_status === 'verified' || r.owl_verification_status === 'website_verified');
    if (filter === 'unverified') result = result.filter(r => r.owl_verification_status === 'unsure');
    if (filter === 'enriched') result = result.filter(r => r.owl_seeking || r.owl_who_you_serve);
    if (filter === 'contactable') result = result.filter(hasContact);
    if (filter === 'priority') result = result.filter(r => n(r.priority_rank) <= 20);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        [r.name, r.organization, r.owl_seeking, r.owl_who_you_serve].join(' ').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, filter]);

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <div className="header__title">
            <h1>Conference Directory</h1>
            <p className="header__subtitle">{filtered.length} of {stats.total} attendees</p>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <IconSun /> : <IconMoon />}
          </button>
        </div>

        <div className="stats-row">
          <StatCard label="Verified" value={stats.verified} detail={`${Math.round(stats.verified/stats.total*100)}%`} />
          <StatCard label="Unverified" value={stats.unverified} />
          <StatCard label="Enriched" value={stats.enriched} />
          <StatCard label="Contactable" value={stats.contactable} />
        </div>

        <div className="search-bar">
          <IconSearch className="search-icon" />
          <input
            type="search"
            placeholder="Search by name, company, or niche..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <nav className="filters" aria-label="Filter contacts">
          {[
            { key: 'all', label: 'All' },
            { key: 'verified', label: 'Verified' },
            { key: 'unverified', label: 'Unverified' },
            { key: 'priority', label: 'Top 20' },
            { key: 'enriched', label: 'Enriched' },
            { key: 'contactable', label: 'Contactable' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`filter-btn ${filter === f.key ? 'filter-btn--active' : ''}`}
              aria-pressed={filter === f.key}
            >
              {f.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        <div className="cards">
          {filtered.map(row => (
            <AttendeeCard
              key={row.priority_rank || row.name}
              row={row}
              totalRows={stats.total}
              expanded={expandedId === row.priority_rank}
              onToggle={() => setExpandedId(prev => prev === row.priority_rank ? null : row.priority_rank)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <p>No contacts match your criteria</p>
            <button onClick={() => { setSearch(''); setFilter('all'); }} className="filter-btn">
              Clear filters
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <span>{stats.verified} verified · {stats.enriched} enriched</span>
        <a href="attendees.csv">Download CSV</a>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');

        :root {
          /* Light theme - warm editorial */
          --bg-primary: #FAF9F7;
          --bg-secondary: #FFFFFF;
          --bg-tertiary: #F5F4F2;
          --text-primary: #1A1918;
          --text-secondary: #4A4845;
          --text-muted: #8A8784;
          --border: #E8E6E3;
          --border-hover: #D5D3D0;

          --accent-gold: #B8860B;
          --accent-teal: #0D7377;
          --accent-success: #2D6A4F;
          --accent-warning: #9A6700;

          --card-base: #FFFFFF;
          --card-priority: linear-gradient(135deg, #FFFCF5 0%, #FFF9EB 100%);
          --card-high: linear-gradient(135deg, #F7FFFE 0%, #EEFBFA 100%);

          --shadow-sm: 0 1px 2px rgba(26, 25, 24, 0.04);
          --shadow-md: 0 4px 12px rgba(26, 25, 24, 0.08);
          --shadow-lg: 0 8px 24px rgba(26, 25, 24, 0.12);

          --font-display: 'Instrument Serif', Georgia, serif;
          --font-body: 'DM Sans', -apple-system, sans-serif;
          --radius: 8px;
        }

        [data-theme="dark"] {
          --bg-primary: #141312;
          --bg-secondary: #1C1B1A;
          --bg-tertiary: #242322;
          --text-primary: #F5F4F2;
          --text-secondary: #B5B3B0;
          --text-muted: #757370;
          --border: #2E2D2B;
          --border-hover: #3D3C3A;

          --card-base: #1C1B1A;
          --card-priority: linear-gradient(135deg, #1F1D18 0%, #242018 100%);
          --card-high: linear-gradient(135deg, #181D1D 0%, #1A2120 100%);

          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
          --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
          --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html {
          font-size: 16px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          font-family: var(--font-body);
          background: var(--bg-primary);
          color: var(--text-primary);
          line-height: 1.5;
          min-height: 100vh;
        }

        .app {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header */
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--bg-primary);
          padding: 24px 0 16px;
          border-bottom: 1px solid var(--border);
        }

        .header__inner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .header h1 {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }

        .header__subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .theme-toggle {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .theme-toggle:hover {
          background: var(--bg-secondary);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        /* Stats */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
        }

        .stat__value {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 400;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat__label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 6px;
        }

        .stat__detail {
          font-size: 0.75rem;
          color: var(--accent-success);
          margin-top: 2px;
        }

        /* Search */
        .search-bar {
          position: relative;
          margin-bottom: 12px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 14px 16px 14px 46px;
          font-family: var(--font-body);
          font-size: 0.9375rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-primary);
          transition: all 0.15s ease;
        }

        .search-input::placeholder { color: var(--text-muted); }

        .search-input:focus {
          outline: none;
          border-color: var(--text-muted);
          box-shadow: var(--shadow-sm);
        }

        /* Filters */
        .filters {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .filters::-webkit-scrollbar { display: none; }

        .filter-btn {
          padding: 8px 14px;
          font-family: var(--font-body);
          font-size: 0.8125rem;
          font-weight: 500;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 100px;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .filter-btn:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .filter-btn--active {
          background: var(--text-primary);
          border-color: var(--text-primary);
          color: var(--bg-primary);
        }

        /* Cards */
        .main { padding: 20px 0; }

        .cards { display: flex; flex-direction: column; gap: 12px; }

        .card {
          background: var(--card-base);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--border-hover);
        }

        .card--expanded { box-shadow: var(--shadow-lg); }

        .card__header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          cursor: pointer;
        }

        .card__header:focus { outline: 2px solid var(--accent-teal); outline-offset: -2px; }

        .card__rank {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 400;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          border-radius: 6px;
          flex-shrink: 0;
        }

        .card__rank[data-tier="priority"] {
          background: linear-gradient(135deg, #B8860B 0%, #DAA520 100%);
          color: white;
        }

        .card__rank[data-tier="high"] {
          background: linear-gradient(135deg, #0D7377 0%, #14919B 100%);
          color: white;
        }

        .card__avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--bg-tertiary);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card__initials {
          font-family: var(--font-display);
          font-size: 1rem;
          color: var(--text-muted);
        }

        .card__info { flex: 1; min-width: 0; }

        .card__name {
          font-family: var(--font-display);
          font-size: 1.125rem;
          font-weight: 400;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .card__org {
          font-size: 0.875rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card__meta {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .card__chevron {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border-radius: 4px;
        }

        .badge--verified {
          background: #E8F5E9;
          color: #2D6A4F;
        }

        [data-theme="dark"] .badge--verified {
          background: rgba(45, 106, 79, 0.2);
          color: #7BC29A;
        }

        .badge--unverified {
          background: #FFF3E0;
          color: #9A6700;
        }

        [data-theme="dark"] .badge--unverified {
          background: rgba(154, 103, 0, 0.2);
          color: #E0A82E;
        }

        .badge--tier {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .badge--insights {
          background: #E3F2FD;
          color: #1565C0;
        }

        [data-theme="dark"] .badge--insights {
          background: rgba(21, 101, 192, 0.2);
          color: #64B5F6;
        }

        /* Card Body */
        .card__body {
          padding: 0 16px 16px;
          border-top: 1px solid var(--border);
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .contact-actions {
          display: flex;
          gap: 8px;
          padding: 14px 0;
          flex-wrap: wrap;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          font-family: var(--font-body);
          font-size: 0.8125rem;
          font-weight: 500;
          text-decoration: none;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .action-btn:hover {
          background: var(--bg-secondary);
          border-color: var(--border-hover);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        .action-btn--primary {
          background: var(--text-primary);
          border-color: var(--text-primary);
          color: var(--bg-primary);
        }

        .action-btn--primary:hover {
          opacity: 0.9;
          color: var(--bg-primary);
        }

        /* Insights */
        .card__insights {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px 0;
          border-top: 1px solid var(--border);
        }

        .insight-block {
          padding-left: 12px;
          border-left: 2px solid var(--accent-teal);
        }

        .insight-label {
          display: block;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .insight-value {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Verification */
        .card__verification {
          padding: 14px 0;
          border-top: 1px solid var(--border);
        }

        .verification-label {
          display: block;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .card__verification p {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        /* Scores */
        .card__scores {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        .score {
          text-align: center;
          padding: 10px;
          background: var(--bg-tertiary);
          border-radius: 6px;
        }

        .score__value {
          display: block;
          font-family: var(--font-display);
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .score__label {
          display: block;
          font-size: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .empty-state p { margin-bottom: 16px; }

        /* Footer */
        .footer {
          display: flex;
          justify-content: space-between;
          padding: 20px 0 40px;
          font-size: 0.8125rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
        }

        .footer a {
          color: var(--text-secondary);
          text-decoration: none;
        }

        .footer a:hover { text-decoration: underline; }

        /* Responsive */
        @media (max-width: 600px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .header h1 { font-size: 1.5rem; }
          .card__scores { grid-template-columns: repeat(2, 1fr); }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
