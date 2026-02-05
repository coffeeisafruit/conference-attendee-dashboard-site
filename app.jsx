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

// Priority tier based on rank
function getPriorityTier(rank, total) {
  const r = n(rank);
  const t = n(total) || 129;
  const pct = (r / t) * 100;
  if (r <= 10) return { tier: 'platinum', label: 'Top 10', color: 'from-violet-500 to-purple-600', text: 'text-violet-700 dark:text-violet-300', bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30', border: 'border-violet-200 dark:border-violet-800/50', accent: 'violet' };
  if (pct <= 15) return { tier: 'gold', label: 'Top 15%', color: 'from-amber-400 to-orange-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20', border: 'border-amber-200 dark:border-amber-800/50', accent: 'amber' };
  if (pct <= 35) return { tier: 'silver', label: 'Top 35%', color: 'from-cyan-400 to-blue-500', text: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/20', border: 'border-cyan-200 dark:border-cyan-800/50', accent: 'cyan' };
  return { tier: 'bronze', label: '', color: 'from-slate-400 to-slate-500', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-white dark:bg-slate-800/80', border: 'border-slate-200 dark:border-slate-700', accent: 'slate' };
}

// ─────────────────────────────────────────────────────────────
// ICONS (inline SVG)
// ─────────────────────────────────────────────────────────────

function IconEmail({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="3" />
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconPhone({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
    <svg className={`${className} ${rotate} transition-transform duration-200`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconMoon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconSun({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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

function IconVerified({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IconShield({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconQuestion({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function IconGrid({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function IconList({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="4" cy="6" r="1" fill="currentColor"/>
      <circle cx="4" cy="12" r="1" fill="currentColor"/>
      <circle cx="4" cy="18" r="1" fill="currentColor"/>
    </svg>
  );
}

function IconChart({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  );
}

// Get verification status styling
function getVerificationStyle(status) {
  if (status === 'website_verified' || status === 'verified') {
    return {
      label: 'Verified',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-700/30',
      icon: IconShield
    };
  }
  if (status === 'unsure') {
    return {
      label: 'Unverified',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200/50 dark:border-amber-700/30',
      icon: IconQuestion
    };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function QuickContactBar({ row }) {
  const email = (row.email || '').trim();
  const linkedin = safeUrl(row.linkedin_url || row.owl_linkedin);
  const website = safeUrl(row.owl_website_updated || row.website);

  if (!email && !linkedin && !website) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {email && (
        <a href={`mailto:${email}`} className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium text-sm hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20">
          <IconEmail className="w-4 h-4" />
          <span>Email</span>
        </a>
      )}
      {linkedin && (
        <a href={linkedin} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0A66C2] to-[#0077B5] text-white font-medium text-sm hover:from-[#004182] hover:to-[#0A66C2] active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20">
          <IconLinkedIn className="w-4 h-4" />
          <span>LinkedIn</span>
        </a>
      )}
      {website && !email && !linkedin && (
        <a href={website} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-600 dark:to-slate-700 text-white font-medium text-sm hover:from-slate-800 hover:to-slate-900 active:scale-[0.98] transition-all shadow-sm">
          <IconWebsite className="w-4 h-4" />
          <span className="truncate">{hostFromUrl(website)}</span>
        </a>
      )}
    </div>
  );
}

function EnrichedInsight({ label, value }) {
  if (!value) return null;
  const text = truncate(value, 180);
  return (
    <div className="group p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-100/60 dark:border-indigo-800/30 hover:border-indigo-200 dark:hover:border-indigo-700/50 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <IconSparkle className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600/70 dark:text-indigo-400/70">{label}</div>
          <div className="text-sm text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">{text}</div>
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

  const vStyle = getVerificationStyle(row.owl_verification_status);

  // Compact mode for list view
  if (viewMode === 'compact') {
    return (
      <article
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-label={`${row.name}${row.organization ? `, ${row.organization}` : ''}. Rank ${rank}. Click to ${expanded ? 'collapse' : 'expand'} details.`}
        className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${tier.bg} ${tier.border} hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900`}
      >
        {/* Rank badge */}
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}>
          {rank}
        </div>

        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex-shrink-0 ring-2 ring-white dark:ring-slate-700 shadow-sm">
          {photoUrl && photoOk ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setPhotoOk(false)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-semibold text-base">
              {initials(row.name)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 dark:text-white truncate">{row.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{row.organization || row.role_raw || '—'}</div>
        </div>

        {/* Quick indicators */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasContact(row) && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-900" title="Has contact info" />
          )}
          {hasEnrichment && (
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center" title="Research available">
              <IconSparkle className="w-3 h-3 text-white" />
            </div>
          )}
          {vStyle && (
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${row.owl_verification_status === 'unsure' ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50'}`} title={vStyle.label}>
              <vStyle.icon className={`w-3.5 h-3.5 ${vStyle.color}`} />
            </div>
          )}
          <IconChevron direction={expanded ? 'up' : 'down'} className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" aria-hidden="true" />
        </div>
      </article>
    );
  }

  // Full card view
  return (
    <article
      aria-label={`${row.name}${row.organization ? `, ${row.organization}` : ''}. Rank ${rank}.`}
      className={`rounded-2xl overflow-hidden transition-all duration-300 ${expanded ? 'shadow-2xl shadow-slate-300/50 dark:shadow-slate-900/50 ring-1 ring-slate-200 dark:ring-slate-700' : 'shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 hover:shadow-xl hover:-translate-y-1'}`}
    >
      {/* Priority band */}
      <div className={`h-1.5 bg-gradient-to-r ${tier.color}`} />

      <div className={`p-5 ${tier.bg} border-x border-b ${tier.border}`}>
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 ring-4 ring-white dark:ring-slate-800 shadow-lg">
              {photoUrl && photoOk ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setPhotoOk(false)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                  {initials(row.name)}
                </div>
              )}
            </div>
            {/* Rank badge */}
            <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white font-bold text-xs shadow-lg ring-2 ring-white dark:ring-slate-800`}>
              {rank}
            </div>
          </div>

          {/* Name & org */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate tracking-tight">{row.name}</h3>
            {row.organization && (
              <p className="text-slate-600 dark:text-slate-400 truncate mt-0.5 text-[15px]">{row.organization}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {tier.label && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${tier.text} bg-white/70 dark:bg-black/20 shadow-sm`}>
                  <IconStar className="w-3 h-3" />
                  {tier.label}
                </span>
              )}
              {vStyle && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${vStyle.color} ${vStyle.bg}`}>
                  <vStyle.icon className="w-3 h-3" />
                  {vStyle.label}
                </span>
              )}
              {hasEnrichment && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30">
                  <IconSparkle className="w-3 h-3" />
                  Research
                </span>
              )}
              {hasContact(row) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/30">
                  <IconEmail className="w-3 h-3" />
                  Contact
                </span>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all flex-shrink-0 shadow-sm border border-slate-100 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <IconChevron direction={expanded ? 'up' : 'down'} aria-hidden="true" />
          </button>
        </div>

        {/* Quick actions */}
        <QuickContactBar row={row} />

        {/* OWL Enrichment highlights (always visible) */}
        {hasEnrichment && !expanded && seeking && (
          <div className="mt-4">
            <EnrichedInsight label="Looking For" value={seeking} />
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-5 pt-5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-5 animate-fadeIn">
            {/* All enrichment data */}
            {hasEnrichment && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <IconSparkle className="w-3.5 h-3.5 text-indigo-500" />
                  Research Insights
                </h4>
                <div className="grid gap-2.5">
                  {seeking && <EnrichedInsight label="Looking For" value={seeking} />}
                  {whoYouServe && <EnrichedInsight label="Who They Serve" value={whoYouServe} />}
                  {whatYouDo && <EnrichedInsight label="What They Do" value={whatYouDo} />}
                  {signaturePrograms && <EnrichedInsight label="Signature Programs" value={signaturePrograms} />}
                </div>
              </div>
            )}

            {/* Contact details */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Contact Information</h4>
              <div className="space-y-2.5">
                {row.email && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <IconEmail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <a href={`mailto:${row.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate font-medium">{row.email}</a>
                  </div>
                )}
                {row.phone && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <IconPhone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <a href={`tel:${row.phone}`} className="text-sm text-slate-700 dark:text-slate-300 hover:underline font-medium">{row.phone}</a>
                  </div>
                )}
                {safeUrl(row.owl_website_updated || row.website) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <IconWebsite className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <a href={row.owl_website_updated || row.website} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-700 dark:text-slate-300 hover:underline truncate font-medium">{hostFromUrl(row.owl_website_updated || row.website)}</a>
                  </div>
                )}
                {safeUrl(row.linkedin_url) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20 flex items-center justify-center">
                      <IconLinkedIn className="w-4 h-4 text-[#0A66C2]" />
                    </div>
                    <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A66C2] hover:underline font-medium">View LinkedIn Profile</a>
                  </div>
                )}
              </div>
            </div>

            {/* Scores */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Scoring</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Fit', value: row.fit_score, max: 9, color: 'blue' },
                  { label: 'Buyer', value: row.targeting__buyer_score, max: 3, color: 'emerald' },
                  { label: 'Partner', value: row.targeting__partner_score, max: 4, color: 'violet' },
                  { label: 'JV Ready', value: row.jv_readiness_score, max: 3, color: 'amber' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{s.value ?? '—'}<span className="text-sm font-normal text-slate-400">/{s.max}</span></div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification status */}
            {row.owl_verification_status && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Verification</h4>
                <div className={`rounded-xl p-4 ${row.owl_verification_status === 'unsure' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30'}`}>
                  <div className="flex items-center gap-2">
                    {vStyle && <vStyle.icon className={`w-5 h-5 ${vStyle.color}`} />}
                    <span className={`font-semibold capitalize ${row.owl_verification_status === 'unsure' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                      {row.owl_verification_status.replace('_', ' ')}
                    </span>
                  </div>
                  {row.owl_verification_notes && (
                    <p className={`mt-2 text-sm leading-relaxed ${row.owl_verification_status === 'unsure' ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-emerald-600/80 dark:text-emerald-400/80'}`}>
                      {row.owl_verification_notes}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function StatCard({ label, value, subtext, icon: Icon, color = 'slate' }) {
  const colors = {
    emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/20',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/20',
    indigo: 'from-indigo-500 to-purple-500 shadow-indigo-500/20',
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/20',
    slate: 'from-slate-400 to-slate-500 shadow-slate-500/20',
  };

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">{label}</div>
          {subtext && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtext}</div>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
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
  const [viewMode, setViewMode] = useState('cards');
  const [showStats, setShowStats] = useState(true);

  // Initialize dark mode from localStorage or system preference
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const v = window.__BUILD_TS__ || Date.now();
    fetch(`data.json?v=${v}`)
      .then(r => r.json())
      .then(data => setRows(data))
      .catch(() => setRows([]));
  }, []);

  // Persist dark mode preference and apply to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const saved = localStorage.getItem('darkMode');
      if (saved === null) setDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const contactable = rows.filter(hasContact).length;
    const enriched = rows.filter(r => r.owl_seeking || r.owl_who_you_serve).length;
    const top20 = rows.filter(r => n(r.priority_rank) <= 20).length;
    const verified = rows.filter(r => r.owl_verification_status === 'verified' || r.owl_verification_status === 'website_verified').length;
    const unsure = rows.filter(r => r.owl_verification_status === 'unsure').length;
    return { total, contactable, enriched, top20, verified, unsure };
  }, [rows]);

  const filtered = useMemo(() => {
    let result = [...rows];

    if (filter === 'contactable') result = result.filter(hasContact);
    if (filter === 'enriched') result = result.filter(r => r.owl_seeking || r.owl_who_you_serve);
    if (filter === 'top20') result = result.filter(r => n(r.priority_rank) <= 20);
    if (filter === 'verified') result = result.filter(r => r.owl_verification_status === 'verified' || r.owl_verification_status === 'website_verified');
    if (filter === 'unsure') result = result.filter(r => r.owl_verification_status === 'unsure');

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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Conference Attendees</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {filtered.length} of {stats.total} contacts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`p-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${showStats ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                aria-label={showStats ? 'Hide statistics' : 'Show statistics'}
                aria-pressed={showStats}
              >
                <IconChart className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode(v => v === 'cards' ? 'compact' : 'cards')}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                aria-label={viewMode === 'cards' ? 'Switch to list view' : 'Switch to card view'}
              >
                {viewMode === 'cards' ? <IconList className="w-5 h-5" aria-hidden="true" /> : <IconGrid className="w-5 h-5" aria-hidden="true" />}
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <IconSun className="w-5 h-5" aria-hidden="true" /> : <IconMoon className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Stats panel */}
          {showStats && (
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
              <StatCard label="Verified" value={stats.verified} subtext={`${Math.round(stats.verified/stats.total*100)}% confirmed`} icon={IconShield} color="emerald" />
              <StatCard label="Unverified" value={stats.unsure} subtext="Need review" icon={IconQuestion} color="amber" />
              <StatCard label="Enriched" value={stats.enriched} subtext="With research" icon={IconSparkle} color="indigo" />
              <StatCard label="Contactable" value={stats.contactable} subtext={`${Math.round(stats.contactable/stats.total*100)}% reachable`} icon={IconEmail} color="blue" />
            </div>
          )}

          {/* Search */}
          <div className="mt-4" role="search">
            <label htmlFor="search-input" className="sr-only">Search contacts</label>
            <div className="relative">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
              <input
                id="search-input"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, company, or niche..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:border-indigo-400 dark:focus:border-indigo-600 transition-all shadow-sm"
                aria-label="Search contacts by name, company, or niche"
              />
            </div>
          </div>

          {/* Filters */}
          <nav className="mt-3" aria-label="Filter contacts">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" role="tablist">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'verified', label: 'Verified', count: stats.verified },
                { key: 'unsure', label: 'Unverified', count: stats.unsure },
                { key: 'top20', label: 'Top 20', count: stats.top20 },
                { key: 'enriched', label: 'Enriched', count: stats.enriched },
                { key: 'contactable', label: 'Contactable', count: stats.contactable },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  role="tab"
                  aria-selected={filter === f.key}
                  aria-controls="contacts-list"
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                    filter === f.key
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 dark:shadow-white/10'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 ${filter === f.key ? 'text-white/70 dark:text-slate-900/70' : 'text-slate-400 dark:text-slate-500'}`} aria-label={`${f.count} contacts`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6" role="main">
        <div
          id="contacts-list"
          role="tabpanel"
          aria-label={`${filter === 'all' ? 'All' : filter} contacts`}
          className={viewMode === 'compact' ? 'space-y-2' : 'space-y-4'}
        >
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
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <IconSearch className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">No contacts found</div>
            <button onClick={() => { setSearch(''); setFilter('all'); }} className="mt-3 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Clear filters
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-4">
              <a href="attendees.csv" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Download CSV</a>
              <span>·</span>
              <span>{stats.verified} verified ({Math.round(stats.verified/stats.total*100)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <IconSparkle className="w-4 h-4 text-indigo-400" />
              <span>Powered by OWL Research</span>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        /* Improved focus visibility for keyboard navigation */
        :focus-visible {
          outline: 2px solid #6366f1;
          outline-offset: 2px;
        }
        /* Respect reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn {
            animation: none;
          }
          * {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
