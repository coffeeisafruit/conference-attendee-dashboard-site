const { useEffect, useMemo, useState } = React;

function n(v) {
  const x = parseInt((v ?? '').toString().trim(), 10);
  return Number.isFinite(x) ? x : 0;
}

function intOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = (v ?? '').toString().trim();
  if (!s || s.toLowerCase() === 'nan') return null;
  const x = parseInt(s, 10);
  return Number.isFinite(x) ? x : null;
}

function buyerTier(v) {
  const x = intOrNull(v);
  if (x === null) return { label: 'Unknown', cls: 'bg-slate-50 text-slate-600 border-slate-200', tip: 'Buyer intent: unknown (missing data)' };
  if (x >= 3) return { label: 'Strong', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', tip: 'Buyer intent: strong (3/3)' };
  if (x === 2) return { label: 'Medium', cls: 'bg-blue-50 text-blue-700 border-blue-200', tip: 'Buyer intent: medium (2/3)' };
  if (x === 1) return { label: 'Light', cls: 'bg-amber-50 text-amber-700 border-amber-200', tip: 'Buyer intent: light (1/3)' };
  return { label: 'None', cls: 'bg-slate-50 text-slate-600 border-slate-200', tip: 'Buyer intent: none (0/3)' };
}

function partnerTier(v) {
  const x = intOrNull(v);
  if (x === null) return { label: 'Unknown', cls: 'bg-slate-50 text-slate-600 border-slate-200', tip: 'Partner strength: unknown (missing data)' };
  if (x >= 4) return { label: 'Excellent', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', tip: 'Partner strength: excellent (4/4)' };
  if (x === 3) return { label: 'Strong', cls: 'bg-blue-50 text-blue-700 border-blue-200', tip: 'Partner strength: strong (3/4)' };
  if (x === 2) return { label: 'Medium', cls: 'bg-amber-50 text-amber-700 border-amber-200', tip: 'Partner strength: medium (2/4)' };
  if (x === 1) return { label: 'Light', cls: 'bg-slate-50 text-slate-600 border-slate-200', tip: 'Partner strength: light (1/4)' };
  return { label: 'None', cls: 'bg-slate-50 text-slate-600 border-slate-200', tip: 'Partner strength: none (0/4)' };
}

function cleanText(s) {
  const t = (s ?? '').toString();
  if (!t) return '';
  return t
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJsonSafe(s) {
  if (!s) return null;
  if (typeof s !== 'string') return s;
  const txt = s.trim();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function extractFirstSnippetFromCandidatesJson(s) {
  if (!s || typeof s !== 'string') return '';
  // Handles both already-JSON strings and older escaped/double-quoted variants.
  const m = s.match(/\"snippet\"\\s*:\\s*\"([^\"]+)\"/);
  if (m && m[1]) return cleanText(m[1]);
  const m2 = s.match(/\"\"snippet\"\"\\s*:\\s*\"\"([^\\\"]+)\"\"/);
  if (m2 && m2[1]) return cleanText(m2[1]);
  return '';
}

function scoreValueProp(s) {
  const t = cleanText(s);
  if (!t) return -999;
  const lower = t.toLowerCase();

  // penalize obvious junk
  const junk = ['cookie', 'privacy', 'terms', 'consent', 'captcha', 'unsubscribe', 'all rights reserved'];
  if (junk.some(j => lower.includes(j))) return -50;

  let score = 0;
  const len = t.length;
  if (len >= 60 && len <= 220) score += 4;
  if (len >= 35 && len < 60) score += 2;
  if (len > 220) score -= 2;

  if (/\b(we help|i help|helping)\b/i.test(t)) score += 3;
  if (/\b(for|so you can|so that|to)\b/i.test(t)) score += 1;

  // very generic "we help you" gets penalized
  if (/^(we help you|helping you)\b/i.test(t) && len < 55) score -= 4;
  if (/we help you\??$/i.test(t)) score -= 6;

  return score;
}

function summarizeOfferTypes(offerTypes) {
  const parts = (offerTypes ?? '').toString().split(' | ').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  return parts.slice(0, 2).join(' + ');
}

function deriveValueProp(row) {
  const candidates = [];
  candidates.push(row.value_prop);
  candidates.push(row.targeting__niche_statement);
  candidates.push(row.linkedin__snippet);

  // best website snippet if present
  const wc = parseJsonSafe(row.website_candidates_json);
  if (Array.isArray(wc) && wc.length) {
    candidates.push(wc[0]?.snippet);
  }
  // fallback snippet extraction for any odd formatting
  const sn = extractFirstSnippetFromCandidatesJson(row.website_candidates_json);
  if (sn) candidates.push(sn);

  const scored = candidates
    .map(s => ({ s: cleanText(s), score: scoreValueProp(s) }))
    .filter(x => x.s);
  scored.sort((a, b) => b.score - a.score);

  if (scored.length && scored[0].score >= 2) return scored[0].s;

  // fallback: construct something truthful from structured fields (still heuristic, but less nonsense)
  const offer = summarizeOfferTypes(row.targeting__offer_types ?? row.offer_types);
  const industry = (row.industry_inferred || '').toString().trim();
  const org = (row.organization || '').toString().trim();
  const role = (row.role_raw || '').toString().trim();

  const bits = [];
  if (offer) bits.push(`Offers ${offer}`);
  if (industry) bits.push(`in ${industry}`);
  if (org) bits.push(`via ${org}`);
  if (!bits.length && role) bits.push(role);

  const sentence = bits.length ? bits.join(' ') + '.' : '';
  return sentence;
}

function buildOutreachDraft(row) {
  const name = (row.name || '').toString().trim();
  const firstName = name.split(/\s+/).filter(Boolean)[0] || '';
  const org = (row.organization || '').toString().trim();
  const role = (row.role_raw || '').toString().trim();
  const offerTypes = (row.targeting__offer_types ?? row.offer_types ?? '').toString().trim();
  const valueProp = deriveValueProp(row);

  const website = (row.website || '').toString().trim();
  const linkedin = (row.linkedin_url || '').toString().trim();

  const shorten = (s, max = 170) => {
    const t = (s || '').toString().replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (t.length <= max) return t;
    return t.slice(0, max - 1).trimEnd() + '…';
  };

  // We must not invent details; keep everything grounded in known fields.
  const subject = firstName
    ? `Quick question, ${firstName} — partnerships`
    : 'Quick question — partnerships';

  const opener = firstName ? `Hi ${firstName},` : 'Hi there,';

  const identity = org ? `I saw you on the Feb 2026 attendee list and came across ${org}` : 'I saw you on the Feb 2026 attendee list';

  const roleClause = role ? `— ${role}` : '';

  const offerClause = offerTypes ? ` (looks like you offer ${offerTypes.replace(/\s*\|\s*/g, ' + ')})` : '';

  const vpSnippet = shorten(valueProp, 170);
  const vpClause = vpSnippet ? `From your site: “${vpSnippet}”.` : '';

  const ask = `I run a JV matchmaking workflow for creators/consultants who grow via partnerships instead of paid ads, and I’m reaching out to a few speakers/attendees to see who’s open to collaborations in 2026.`;

  const cta = `If you’re open, would you be up for a 10–15 min chat to see whether there’s a good-fit JV partner match (or if it’s a “not now”)?`;

  const proofLinks = [];
  if (website) proofLinks.push(`Site: ${website}`);
  if (linkedin) proofLinks.push(`LinkedIn: ${linkedin}`);
  const linksBlock = proofLinks.length ? `\n\n${proofLinks.join('\n')}` : '';

  const close = `\n\nBest,\nJoe`;

  const bodyParts = [
    opener,
    '',
    `${identity}${roleClause}${offerClause}.`,
    vpClause ? vpClause : null,
    '',
    ask,
    '',
    cta,
    linksBlock || null,
    close,
  ].filter(Boolean);

  return { subject, body: bodyParts.join('\n') };
}

function encodeMailto(email, subject, body) {
  if (!email) return '';
  const s = encodeURIComponent(subject || '');
  const b = encodeURIComponent(body || '');
  return `mailto:${email}?subject=${s}&body=${b}`;
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = React.useState(false);
  const doCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={doCopy}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function hasContact(row) {
  return Boolean((row.email || '').trim() || (row.phone || '').trim());
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function safeHttpsUrl(u) {
  const s = (u || '').toString().trim();
  if (!s) return '';
  // Avoid mixed-content + sketchy schemes; only allow https for embedded assets.
  if (!/^https:\/\//i.test(s)) return '';
  return s;
}

function FitBadge({ fit_label, fit_score }) {
  const label = fit_label || 'not_sure';
  const cfg = {
    good_fit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    maybe_fit: 'bg-amber-50 text-amber-700 border-amber-200',
    not_sure: 'bg-slate-50 text-slate-600 border-slate-200',
  }[label] || 'bg-slate-50 text-slate-600 border-slate-200';

  const txt = {
    good_fit: 'Strong ICP match',
    maybe_fit: 'Possible ICP match',
    not_sure: 'Insufficient signals',
  }[label] || 'Insufficient signals';

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${cfg}`}
      title={`ICP match (heuristic): ${fit_score ?? '–'}/9. This is a lightweight signal score, not a verified fact. Use Priority Rank for ordering.`}
    >
      <span>{txt}</span>
    </span>
  );
}

function Tag({ tone = 'neutral', title, className = '', children }) {
  const cls = {
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
    subtle: 'bg-white text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  }[tone] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium leading-none ${cls} ${className}`}
      title={title || ''}
    >
      {children}
    </span>
  );
}

function Dot({ tone = 'slate' }) {
  const cls = {
    slate: 'bg-slate-400',
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
  }[tone] || 'bg-slate-400';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`} />;
}

function Icon({ name, className = 'w-3.5 h-3.5 text-slate-500' }) {
  if (name === 'building') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20V6a2 2 0 0 1 2-2h7v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M13 20V10h5a2 2 0 0 1 2 2v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M7 8h3M7 11h3M7 14h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'tag') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 7h6l8 8-6 6-8-8V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 10h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'spark') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2l1.2 4.3L17.5 7.5 13.2 8.7 12 13l-1.2-4.3L6.5 7.5l4.3-1.2L12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M19 11l.6 2.1L22 14l-2.4.9L19 17l-.6-2.1L16 14l2.4-.9L19 11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}

function ScorePill({ label, value, title, className }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold leading-none ${className || 'bg-white border-slate-200 text-slate-700'}`}
      title={title || ''}
    >
      <span className="text-slate-500">{label}:</span>
      <span className="font-semibold">{value ?? '–'}</span>
    </span>
  );
}

function LinkButton({ href, children }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
    >
      {children}
      <span className="opacity-80">↗</span>
    </a>
  );
}

function ContactChip({ type, value }) {
  if (!value) return null;
  const v = value.toString().trim();
  if (!v) return null;

  const common = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors';
  if (type === 'email') {
    return <a className={`${common} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`} href={`mailto:${v}`}>Email: <span className="font-semibold">{v}</span></a>;
  }
  if (type === 'phone') {
    return <a className={`${common} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`} href={`tel:${v}`}>Phone: <span className="font-semibold">{v}</span></a>;
  }
  if (type === 'website') {
    let host = v;
    try { host = new URL(v).hostname.replace('www.', ''); } catch {}
    return <a className={`${common} bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100`} href={v} target="_blank" rel="noopener noreferrer">Site: <span className="font-semibold">{host}</span> ↗</a>;
  }
  if (type === 'linkedin') {
    return <a className={`${common} bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100`} href={v} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>;
  }
  return null;
}

function SourceLink({ label, url }) {
  if (!url) return null;
  const u = url.toString().trim();
  if (!u) return null;
  return (
    <a
      href={u}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
      title={u}
    >
      <span className="text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="truncate max-w-[220px]">{u}</span>
      <span className="text-slate-400">↗</span>
    </a>
  );
}

function CertaintyPill({ label, level }) {
  const v = (level || 'unknown').toString();
  const cls = {
    high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    low: 'bg-amber-50 text-amber-700 border-amber-200',
    unknown: 'bg-slate-50 text-slate-600 border-slate-200',
  }[v] || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${cls}`}>
      <span className="text-slate-500">{label}:</span>
      <span className="uppercase">{v}</span>
    </span>
  );
}

function StatTile({ label, value, tone = 'neutral' }) {
  const toneCls = {
    neutral: 'from-slate-50 to-white border-slate-100',
    indigo: 'from-indigo-50/60 to-white border-indigo-100/70',
    emerald: 'from-emerald-50/60 to-white border-emerald-100/70',
    amber: 'from-amber-50/60 to-white border-amber-100/70',
  }[tone] || 'from-slate-50 to-white border-slate-100';

  return (
    <div className={`bg-gradient-to-br ${toneCls} rounded-2xl border p-4 shadow-sm`}>
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

function LeadCard({ row, expanded, onToggle, totalRows }) {
  const buyer = row.targeting__buyer_score ?? row.buyer_score;
  const partner = row.targeting__partner_score ?? row.partner_score;
  const buyerT = buyerTier(buyer);
  const partnerT = partnerTier(partner);
  const offerTypes = (row.targeting__offer_types ?? row.offer_types ?? '').toString();
  const valueProp = deriveValueProp(row);
  const draft = buildOutreachDraft(row);
  const readinessLabel = (row.jv_readiness_label || '').toString().trim() || 'low';
  const rankNum = n(row.priority_rank);
  const totalNum = n(totalRows);
  const topPct = (rankNum && totalNum) ? Math.max(1, Math.min(100, Math.ceil((rankNum / totalNum) * 100))) : null;
  const photoUrl = safeHttpsUrl(row.photo_url);
  const [photoOk, setPhotoOk] = React.useState(true);
  const readinessTone = readinessLabel === 'high' ? 'emerald' : readinessLabel === 'medium' ? 'amber' : 'slate';

  return (
    <div className="relative">
      <div
        className={`relative bg-white rounded-2xl border cursor-pointer transition-all shadow-sm hover:shadow-md ${expanded ? 'border-indigo-200' : 'border-slate-100 hover:border-slate-200'}`}
        onClick={onToggle}
      >
        <div className="absolute -top-2 -left-2">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow ${n(row.priority_rank) <= 10 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {row.priority_rank ?? ''}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow">
              {photoUrl && photoOk ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setPhotoOk(false)}
                />
              ) : (
                <span>{initials(row.name)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 truncate text-lg">{row.name || ''}</h3>
                    {hasContact(row) ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">contactable</span> : null}
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{row.role_raw || 'Role not specified'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <FitBadge fit_label={row.fit_label} fit_score={row.fit_score} />
                  <span className={`w-8 h-8 rounded-xl grid place-items-center border transition-colors ${expanded ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <span className="text-xs">{expanded ? '▲' : '▼'}</span>
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {row.organization ? (
                    <Tag tone="neutral" title={row.organization} className="min-w-0 max-w-[520px]">
                      <Icon name="building" />
                      <span className="truncate">{row.organization}</span>
                    </Tag>
                  ) : null}

                  {row.industry_inferred ? (
                    <Tag tone="indigo">
                      <Icon name="tag" className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="capitalize">{row.industry_inferred}</span>
                    </Tag>
                  ) : null}

                  <Tag
                    tone={readinessTone}
                    title={`JV readiness (0–3) is a lightweight signal score based on presence of partner/affiliate/podcast/newsletter/contact pages and other collaboration signals.${row.jv_readiness_score !== undefined && row.jv_readiness_score !== null && `${row.jv_readiness_score}` !== '' ? ` Score: ${row.jv_readiness_score}/3.` : ''}`}
                  >
                    <Icon name="spark" className={`w-3.5 h-3.5 ${readinessTone === 'emerald' ? 'text-emerald-700' : readinessTone === 'amber' ? 'text-amber-700' : 'text-slate-500'}`} />
                    <Dot tone={readinessTone === 'emerald' ? 'emerald' : readinessTone === 'amber' ? 'amber' : 'slate'} />
                    <span className="text-slate-600">Ready</span>
                    <span className="font-semibold capitalize">{readinessLabel}</span>
                  </Tag>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 truncate">
                    {row.priority_rank ? <span className="font-semibold text-slate-700">Rank {row.priority_rank}</span> : null}
                    {row.priority_rank ? <span className="text-slate-300 mx-2">•</span> : null}
                    {topPct ? <span className="text-slate-600">{`Top ${topPct}% priority`}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <ScorePill label="Buyer" value={buyerT.label} title={buyerT.tip} className={buyerT.cls} />
                    <ScorePill label="Partner" value={partnerT.label} title={partnerT.tip} className={partnerT.cls} />
                  </div>
                </div>
              </div>

              {/* keep the collapsed card tidy; show rationale inside expanded details instead */}
            </div>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="mt-2 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-100 p-5">
          {row.priority_reason ? (
            <div className="mb-4 text-sm text-slate-700 bg-white border border-slate-100 rounded-2xl p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Priority rationale</div>
              <div className="text-sm text-slate-700">{row.priority_reason}</div>
            </div>
          ) : null}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">How to read the scores</summary>
            <div className="mt-3 text-sm text-slate-700 bg-white border border-slate-100 rounded-2xl p-4">
              <div className="font-semibold text-slate-900">Use this:</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><span className="font-semibold">Priority rank</span> — overall ordering for your team (lower rank = higher priority).</li>
              </ul>
              <div className="mt-3 font-semibold text-slate-900">Quick breakdown (bounded scales):</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><span className="font-semibold">Fit</span> (0–9) — heuristic match to the JV Matchmaker <span className="font-semibold">platform-buyer</span> ICP.</li>
                <li><span className="font-semibold">Buyer</span> — shown as a tier (None / Light / Medium / Strong) based on a 0–3 heuristic.</li>
                <li><span className="font-semibold">Partner</span> — shown as a tier (None / Light / Medium / Strong / Excellent) based on a 0–4 heuristic.</li>
                <li><span className="font-semibold">Ready</span> (0–3) — collaboration readiness signals from the website/link data.</li>
              </ul>
              <div className="mt-3 text-xs text-slate-500">
                The raw <span className="font-semibold">priority_score</span> is an internal weighted number (not a 0–100). It’s available under “Advanced”.
              </div>
            </div>
          </details>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact</div>
              <div className="flex flex-wrap gap-2">
                <ContactChip type="email" value={row.email} />
                <ContactChip type="phone" value={row.phone} />
                <ContactChip type="website" value={row.website} />
                <ContactChip type="linkedin" value={row.linkedin_url} />
                {!hasContact(row) && !row.website && !row.linkedin_url ? (
                  <div className="text-xs text-slate-400 italic">No direct contact fields.</div>
                ) : null}
              </div>

              {/* Certainty and source links (hyperlinked) */}
              <div className="mt-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Certainty</div>
                <div className="flex flex-wrap gap-2">
                  <CertaintyPill label="Website" level={row.certainty__website} />
                  <CertaintyPill label="Email" level={row.certainty__email} />
                  <CertaintyPill label="Phone" level={row.certainty__phone} />
                  <CertaintyPill label="LinkedIn" level={row.certainty__linkedin} />
                  <CertaintyPill label="Photo" level={row.certainty__photo} />
                  <CertaintyPill label="Value prop" level={row.certainty__value_prop} />
                </div>
                {row.verification_flags ? (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <span className="font-semibold">Flags:</span> {row.verification_flags}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Offer Types</div>
              <div className="flex flex-wrap gap-2">
                {offerTypes.split(' | ').filter(Boolean).map((t, i) => (
                  <Tag key={i} tone="subtle">
                    <span className="capitalize">{t}</span>
                  </Tag>
                ))}
                {!offerTypes ? <div className="text-xs text-slate-400 italic">No offers detected.</div> : null}
              </div>
              <div className="mt-3 text-xs">
                <span className="font-semibold text-slate-700">JV readiness:</span>{' '}
                <span className="text-slate-600">{row.jv_readiness_label || 'low'}</span>
                {row.jv_readiness_score ? <span className="text-slate-400"> ({row.jv_readiness_score})</span> : null}
              </div>

              <div className="mt-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">JV links (hyperlinked)</div>
                <div className="flex flex-wrap gap-2">
                  <SourceLink label="Partner" url={row.jv_partner_url} />
                  <SourceLink label="Podcast" url={row.jv_podcast_url} />
                  <SourceLink label="Speaking" url={row.jv_speaking_url} />
                  <SourceLink label="Booking" url={row.jv_booking_url} />
                  <SourceLink label="Contact" url={row.jv_contact_url} />
                  <SourceLink label="Affiliate" url={row.jv_affiliate_url} />
                  <SourceLink label="Newsletter" url={row.jv_newsletter_url} />
                  <SourceLink label="Media kit" url={row.jv_media_kit_url} />
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Value Proposition</div>
              {valueProp ? (
                <div className="text-sm text-slate-700 bg-white border border-slate-100 rounded-2xl p-4 italic">
                  “{valueProp}”
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No value proposition detected.</div>
              )}

              <div className="mt-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Suggested outreach (personalized)</div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Subject:</span> {draft.subject}
                  </div>
                  <pre className="mt-3 text-sm text-slate-800 whitespace-pre-wrap font-sans">{draft.body}</pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyButton text={`${draft.subject}\n\n${draft.body}`} label="Copy message" />
                    {row.email ? (
                      <a
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                        href={encodeMailto(row.email, draft.subject, draft.body)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open email draft
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Uses only fields we have (no guessing). Always sanity-check before sending.
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sources (hyperlinked)</div>
                <div className="flex flex-wrap gap-2">
                  <SourceLink label="Email src" url={row.email__source_url} />
                  <SourceLink label="Phone src" url={row.phone__source_url} />
                  <SourceLink label="Photo src" url={row.photo__source_url} />
                  <SourceLink label="LinkedIn src" url={row.linkedin__source_url} />
                  <SourceLink label="Discovery src" url={row.website__discovery_source_url} />
                  <SourceLink label="Used URL" url={row.firecrawl__used_url} />
                </div>
              </div>
            </div>
          </div>

          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Advanced (raw scoring fields)</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <ScorePill label="priority_score" value={row.priority_score ?? '–'} title="Internal weighted score used to compute Priority Rank (not normalized)." />
              <ScorePill label="fit_score" value={row.fit_score ?? '–'} title="Fit (0–9)." />
              <ScorePill label="buyer_score" value={intOrNull(buyer) ?? '–'} title="Buyer intent (0–3)." />
              <ScorePill label="partner_score" value={intOrNull(partner) ?? '–'} title="Partner strength (0–4)." />
              <ScorePill label="readiness" value={row.jv_readiness_score ?? '–'} title="JV readiness (0–3)." />
            </div>
          </details>

          <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <LinkButton href={row.website}>Visit website</LinkButton>
              <LinkButton href={row.linkedin_url}>Open LinkedIn</LinkButton>
              {row.email ? (
                <a className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50" href={`mailto:${row.email}`}>
                  Send email
                </a>
              ) : null}
            </div>
            <div className="text-xs text-slate-400">Click card to collapse</div>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">All data (raw)</summary>
            <pre className="mt-3 text-xs bg-slate-900 text-slate-100 rounded-2xl p-4 overflow-auto">{JSON.stringify(row, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}

function Dashboard() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [fit, setFit] = useState('all');
  const [industry, setIndustry] = useState('all');
  const [expandedRank, setExpandedRank] = useState(null);

  useEffect(() => {
    const v = (typeof window !== 'undefined' && window.__BUILD_TS__) ? window.__BUILD_TS__ : '';
    fetch(`data.json?v=${v}`)
      .then(r => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const industries = useMemo(() => {
    const s = new Set(rows.map(r => (r.industry_inferred || '').trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(r => {
      if (fit !== 'all' && (r.fit_label || '') !== fit) return false;
      if (industry !== 'all' && (r.industry_inferred || '') !== industry) return false;
      if (!qq) return true;
      const blob = [r.name, r.organization, r.role_raw, r.targeting__niche_statement, r.targeting__offer_types, r.priority_reason]
        .map(x => (x || '').toString().toLowerCase())
        .join(' | ');
      return blob.includes(qq);
    });
  }, [rows, q, fit, industry]);

  const stats = useMemo(() => {
    const total = rows.length;
    const goodFit = rows.filter(r => r.fit_label === 'good_fit').length;
    const maybeFit = rows.filter(r => r.fit_label === 'maybe_fit').length;
    const notSure = rows.filter(r => r.fit_label === 'not_sure').length;
    const withEmail = rows.filter(r => (r.email || '').trim()).length;
    const withLinkedin = rows.filter(r => (r.linkedin_url || '').trim()).length;
    const withPhoto = rows.filter(r => (r.photo_url || '').trim()).length;
    return { total, goodFit, maybeFit, notSure, withEmail, withLinkedin, withPhoto };
  }, [rows]);

  function clear() {
    setQ('');
    setFit('all');
    setIndustry('all');
  }

  const hasFilters = q || fit !== 'all' || industry !== 'all';

  return (
    <div>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">Team Leads</div>
              <div className="text-sm text-slate-500">Prioritized conference attendees (click to expand)</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Showing</div>
              <div className="text-lg font-bold text-slate-900">
                {filtered.length} <span className="text-slate-400 font-normal">/ {stats.total}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatTile label="Strong ICP match" value={stats.goodFit} tone="emerald" />
            <StatTile label="Possible ICP match" value={stats.maybeFit} tone="indigo" />
            <StatTile label="Insufficient signals" value={stats.notSure} tone="neutral" />
            <StatTile label="With email" value={stats.withEmail} tone="emerald" />
            <StatTile label="With LinkedIn" value={stats.withLinkedin} tone="indigo" />
            <StatTile label="With photo" value={stats.withPhoto} tone="amber" />
          </div>

          <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, org, niche, priority reason..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
              />
              <select value={fit} onChange={(e) => setFit(e.target.value)} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                <option value="all">All fits</option>
                <option value="good_fit">Strong ICP match</option>
                <option value="maybe_fit">Possible ICP match</option>
                <option value="not_sure">Insufficient signals</option>
              </select>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                <option value="all">All industries</option>
                {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
              {hasFilters ? (
                <button onClick={clear} className="px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800">
                  Clear
                </button>
              ) : null}
              <a href="attendees.csv" className="px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 hover:bg-indigo-100 text-center">
                Download CSV
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-4">
        {filtered.map(r => (
          <LeadCard
            key={r.source_people_url || r.priority_rank || r.name}
            row={r}
            expanded={expandedRank === r.priority_rank}
            onToggle={() => setExpandedRank(expandedRank === r.priority_rank ? null : r.priority_rank)}
            totalRows={rows.length}
          />
        ))}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-600 font-semibold">No rows match your filters.</div>
            <div className="text-slate-400 text-sm mt-1">Try clearing filters.</div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
