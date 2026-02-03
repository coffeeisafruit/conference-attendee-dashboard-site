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

function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || '';
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

// Priority tier based on rank
function getPriorityTier(rank, total) {
  const r = n(rank);
  const t = n(total) || 129;
  const pct = (r / t) * 100;
  if (r <= 10) return { tier: 'platinum', label: 'Top 10', color: 'from-amber-400 to-orange-500', text: 'text-amber-900', bg: 'bg-gradient-to-r from-amber-50 to-orange-50', border: 'border-amber-200' };
  if (pct <= 15) return { tier: 'gold', label: 'Top 15%', color: 'from-emerald-400 to-teal-500', text: 'text-emerald-900', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (pct <= 35) return { tier: 'silver', label: 'Top 35%', color: 'from-blue-400 to-indigo-500', text: 'text-blue-900', bg: 'bg-blue-50', border: 'border-blue-200' };
  return { tier: 'bronze', label: '', color: 'from-slate-300 to-slate-400', text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' };
}

// ─────────────────────────────────────────────────────────────
// ICONS (inline SVG)
// ─────────────────────────────────────────────────────────────

function IconEmail({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLinkedIn({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function IconWebsite({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconPhone({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconSearch({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconStar({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}

function IconChevron({ className = 'w-5 h-5', direction = 'down' }) {
  const rotate = direction === 'up' ? 'rotate-180' : '';
  return (
    <svg className={`${className} ${rotate} transition-transform`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconMoon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSun({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconSparkle({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function ActionButton({ href, onClick, icon: Icon, label, variant = 'default', className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95';
  const variants = {
    default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
    primary: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100',
    email: 'bg-blue-600 text-white hover:bg-blue-700',
    linkedin: 'bg-[#0A66C2] text-white hover:bg-[#004182]',
  };

  const props = {
    className: `${base} ${variants[variant]} ${className}`,
    ...(href ? { href, target: href.startsWith('mailto:') || href.startsWith('tel:') ? undefined : '_blank', rel: 'noopener noreferrer' } : {}),
    ...(onClick ? { onClick } : {}),
  };

  const El = href ? 'a' : 'button';
  return (
    <El {...props}>
      {Icon && <Icon className="w-4 h-4" />}
      <span>{label}</span>
    </El>
  );
}

function QuickContactBar({ row }) {
  const email = (row.email || '').trim();
  const phone = (row.phone || '').trim();
  const linkedin = safeUrl(row.linkedin_url || row.owl_linkedin);
  const website = safeUrl(row.website);

  if (!email && !phone && !linkedin && !website) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {email && (
        <a href={`mailto:${email}`} className="flex-1 min-w-[140px] flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all">
          <IconEmail className="w-4 h-4" />
          <span className="truncate">Email</span>
        </a>
      )}
      {linkedin && (
        <a href={linkedin} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#0A66C2] text-white font-semibold text-sm hover:bg-[#004182] active:scale-95 transition-all">
          <IconLinkedIn className="w-4 h-4" />
          <span>LinkedIn</span>
        </a>
      )}
      {website && !email && !linkedin && (
        <a href={website} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white font-semibold text-sm hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 transition-all">
          <IconWebsite className="w-4 h-4" />
          <span className="truncate">{hostFromUrl(website)}</span>
        </a>
      )}
    </div>
  );
}

function EnrichedInsight({ label, value, icon }) {
  if (!value) return null;
  const text = truncate(value, 150);
  return (
    <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10 border border-amber-200/50 dark:border-amber-800/30">
      <div className="flex items-start gap-2">
        {icon && <span className="text-amber-600 dark:text-amber-400 mt-0.5">{icon}</span>}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70 dark:text-amber-400/70">{label}</div>
          <div className="text-sm text-amber-900 dark:text-amber-100 mt-0.5">{text}</div>
        </div>
      </div>
    </div>
  );
}

function AttendeeCard({ row, totalRows, expanded, onToggle, viewMode }) {
  const rank = n(row.priority_rank);
  const tier = getPriorityTier(rank, totalRows);
  const photoUrl = safeUrl(row.photo_url);
  const [photoOk, setPhotoOk] = useState(true);

  // OWL enriched data
  const seeking = row.owl_seeking || '';
  const whoYouServe = row.owl_who_you_serve || '';
  const whatYouDo = row.owl_what_you_do || '';
  const signaturePrograms = row.owl_signature_programs || '';
  const hasEnrichment = seeking || whoYouServe || whatYouDo || signaturePrograms;

  // Compact mode for list view
  if (viewMode === 'compact') {
    return (
      <div
        onClick={onToggle}
        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${tier.bg} ${tier.border} hover:shadow-md active:scale-[0.99]`}
      >
        {/* Rank badge */}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
          {rank}
        </div>

        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex-shrink-0">
          {photoUrl && photoOk ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setPhotoOk(false)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-lg">
              {initials(row.name)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 dark:text-white truncate">{row.name}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{row.organization || row.role_raw || '—'}</div>
        </div>

        {/* Quick indicators */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasContact(row) && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Has contact info" />
          )}
          {hasEnrichment && (
            <IconSparkle className="w-4 h-4 text-amber-500" title="OWL enriched" />
          )}
          <IconChevron direction={expanded ? 'up' : 'down'} className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div className={`rounded-3xl overflow-hidden transition-all ${expanded ? 'shadow-xl' : 'shadow-md hover:shadow-lg'}`}>
      {/* Priority band */}
      <div className={`h-2 bg-gradient-to-r ${tier.color}`} />

      <div className={`p-5 ${tier.bg} border-x border-b ${tier.border}`}>
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 shadow-inner">
              {photoUrl && photoOk ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setPhotoOk(false)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-2xl">
                  {initials(row.name)}
                </div>
              )}
            </div>
            {/* Rank badge */}
            <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white font-bold text-xs shadow-lg`}>
              {rank}
            </div>
          </div>

          {/* Name & org */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-slate-900 dark:text-white truncate">{row.name}</h3>
            {row.organization && (
              <p className="text-slate-600 dark:text-slate-400 truncate mt-0.5">{row.organization}</p>
            )}
            {row.role_raw && row.role_raw !== row.organization && (
              <p className="text-sm text-slate-500 dark:text-slate-500 truncate">{row.role_raw}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tier.label && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tier.text} bg-white/60 dark:bg-black/20`}>
                  <IconStar className="w-3 h-3" />
                  {tier.label}
                </span>
              )}
              {hasContact(row) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30">
                  Contactable
                </span>
              )}
              {row.industry_inferred && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-black/20 capitalize">
                  {row.industry_inferred}
                </span>
              )}
              {hasEnrichment && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30">
                  <IconSparkle className="w-3 h-3" />
                  Enriched
                </span>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={onToggle}
            className="w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-black/30 transition-colors flex-shrink-0"
          >
            <IconChevron direction={expanded ? 'up' : 'down'} />
          </button>
        </div>

        {/* Quick actions */}
        <QuickContactBar row={row} />

        {/* OWL Enrichment highlights (always visible) */}
        {hasEnrichment && !expanded && (
          <div className="mt-4 space-y-2">
            {seeking && (
              <EnrichedInsight label="Seeking" value={seeking} icon={<IconSparkle className="w-3 h-3" />} />
            )}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-5 pt-5 border-t border-slate-200/50 dark:border-slate-700/50 space-y-4 animate-fadeIn">
            {/* All enrichment data */}
            {hasEnrichment && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">OWL Research Insights</h4>
                {seeking && <EnrichedInsight label="Seeking" value={seeking} />}
                {whoYouServe && <EnrichedInsight label="Who They Serve" value={whoYouServe} />}
                {whatYouDo && <EnrichedInsight label="What They Do" value={whatYouDo} />}
                {signaturePrograms && <EnrichedInsight label="Signature Programs" value={signaturePrograms} />}
              </div>
            )}

            {/* Contact details */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Contact Info</h4>
              <div className="space-y-2 text-sm">
                {row.email && (
                  <div className="flex items-center gap-2">
                    <IconEmail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${row.email}`} className="text-blue-600 dark:text-blue-400 hover:underline truncate">{row.email}</a>
                  </div>
                )}
                {row.phone && (
                  <div className="flex items-center gap-2">
                    <IconPhone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${row.phone}`} className="text-slate-700 dark:text-slate-300 hover:underline">{row.phone}</a>
                  </div>
                )}
                {safeUrl(row.website) && (
                  <div className="flex items-center gap-2">
                    <IconWebsite className="w-4 h-4 text-slate-400" />
                    <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-slate-700 dark:text-slate-300 hover:underline truncate">{hostFromUrl(row.website)}</a>
                  </div>
                )}
                {safeUrl(row.linkedin_url) && (
                  <div className="flex items-center gap-2">
                    <IconLinkedIn className="w-4 h-4 text-slate-400" />
                    <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:underline">View profile</a>
                  </div>
                )}
              </div>
            </div>

            {/* Scores */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Scores</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-black/20 text-xs">
                  <span className="text-slate-500">Fit:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">{row.fit_score ?? '—'}/9</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-black/20 text-xs">
                  <span className="text-slate-500">Buyer:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">{row.targeting__buyer_score ?? '—'}/3</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-black/20 text-xs">
                  <span className="text-slate-500">Partner:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">{row.targeting__partner_score ?? '—'}/4</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-black/20 text-xs">
                  <span className="text-slate-500">JV Ready:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">{row.jv_readiness_score ?? '—'}/3</span>
                </span>
              </div>
            </div>

            {/* Priority reason */}
            {row.priority_reason && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Why They're Prioritized</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-black/20 rounded-xl p-3">{row.priority_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, accent = false }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
      {subtext && <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

function Dashboard() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, contactable, enriched, top20
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // cards, compact
  const [darkMode, setDarkMode] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const v = window.__BUILD_TS__ || Date.now();
    fetch(`data.json?v=${v}`)
      .then(r => r.json())
      .then(data => setRows(data))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const stats = useMemo(() => {
    const total = rows.length;
    const contactable = rows.filter(hasContact).length;
    const enriched = rows.filter(r => r.owl_seeking || r.owl_who_you_serve).length;
    const top20 = rows.filter(r => n(r.priority_rank) <= 20).length;
    const withEmail = rows.filter(r => (r.email || '').trim()).length;
    const withLinkedin = rows.filter(r => (r.linkedin_url || '').trim()).length;
    return { total, contactable, enriched, top20, withEmail, withLinkedin };
  }, [rows]);

  const filtered = useMemo(() => {
    let result = [...rows];

    // Apply filter
    if (filter === 'contactable') result = result.filter(hasContact);
    if (filter === 'enriched') result = result.filter(r => r.owl_seeking || r.owl_who_you_serve);
    if (filter === 'top20') result = result.filter(r => n(r.priority_rank) <= 20);

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => {
        const blob = [r.name, r.organization, r.role_raw, r.industry_inferred, r.owl_seeking, r.owl_who_you_serve].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }

    return result;
  }, [rows, search, filter]);

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50/30'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Conference Contacts</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} of {stats.total} attendees
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Stats
              </button>
              <button
                onClick={() => setViewMode(v => v === 'cards' ? 'compact' : 'cards')}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {viewMode === 'cards' ? 'List' : 'Cards'}
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {darkMode ? <IconSun /> : <IconMoon />}
              </button>
            </div>
          </div>

          {/* Stats panel */}
          {showStats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn">
              <StatCard label="Contactable" value={stats.contactable} subtext={`${Math.round(stats.contactable/stats.total*100)}% have email/phone`} />
              <StatCard label="OWL Enriched" value={stats.enriched} subtext="With research insights" accent />
              <StatCard label="Top Priority" value={stats.top20} subtext="Rank 1-20" />
              <StatCard label="LinkedIn" value={stats.withLinkedin} subtext="Profile linked" />
            </div>
          )}

          {/* Search */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, company, niche..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'top20', label: 'Top 20' },
              { key: 'contactable', label: 'Contactable' },
              { key: 'enriched', label: 'Enriched' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-4'}>
          {filtered.map(row => (
            <AttendeeCard
              key={row.priority_rank || row.name}
              row={row}
              totalRows={stats.total}
              expanded={expandedId === row.priority_rank}
              onToggle={() => toggleExpand(row.priority_rank)}
              viewMode={viewMode}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-slate-500 dark:text-slate-400 font-medium">No matches found</div>
            <button onClick={() => { setSearch(''); setFilter('all'); }} className="mt-2 text-blue-600 dark:text-blue-400 text-sm hover:underline">
              Clear filters
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
          <a href="attendees.csv" className="hover:underline">Download CSV</a>
          <span className="mx-2">·</span>
          <span>{stats.enriched} profiles enriched with OWL research</span>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
