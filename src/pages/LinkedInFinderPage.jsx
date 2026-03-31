// LinkedInFinderPage.jsx — LinkedIn profile finder via SerpAPI
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const BACKEND = `${import.meta.env.VITE_BACKEND_URL || 'https://leadenrichment-production-5b78.up.railway.app'}/api`
const jsonHdr = () => ({ 'Content-Type': 'application/json' })

const RESULT_OPTIONS = [10, 20, 50, 100]
const EMPTY_ROW = () => ({ id: Date.now(), role: '', industry: '', location: '', country: '', keywords: '' })

function getOrgId() {
  try {
    const token = localStorage.getItem('wb_ai_token')
    if (!token) return 'default'
    const p = JSON.parse(atob(token.split('.')[1]))
    return p.organization_id || p.org_id || 'default'
  } catch { return 'default' }
}

function buildQuery({ role, industry, location, country, keywords }) {
  return [role, industry, location, country, keywords].map(s => s.trim()).filter(Boolean).join(' ')
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LinkedInFinderPage() {
  const [rows, setRows]               = useState([EMPTY_ROW()])
  const [numResults, setNumResults]   = useState(10)
  const [searching, setSearching]     = useState(false)
  const [results, setResults]         = useState([])
  const [allUrls, setAllUrls]         = useState([])
  const [selected, setSelected]       = useState(new Set())
  const [enriching, setEnriching]     = useState(false)
  const [history, setHistory]         = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [activeTab, setActiveTab]     = useState('search')

  const orgId = getOrgId()

  // ── History ───────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const r = await fetch(`${BACKEND}/linkedin-finder/searches?org_id=${orgId}`, { headers: jsonHdr() })
      const d = await r.json()
      if (d.success) setHistory(d.searches)
    } catch { toast.error('Failed to load history') }
    finally { setHistoryLoading(false) }
  }, [orgId])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── Row management ────────────────────────────────────────────────────────

  const updateRow = (id, field, value) =>
    setRows(rs => rs.map(r => r.id === id ? { ...r, [field]: value } : r))

  const addRow = () => {
    if (rows.length >= 20) return toast.error('Max 20 search rows')
    setRows(rs => [...rs, EMPTY_ROW()])
  }

  const removeRow = (id) => {
    if (rows.length === 1) return
    setRows(rs => rs.filter(r => r.id !== id))
  }

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    const queries = rows.map(buildQuery).filter(Boolean)
    if (!queries.length) return toast.error('Fill at least one field to search')

    setSearching(true); setResults([]); setAllUrls([]); setSelected(new Set())
    try {
      const r = await fetch(`${BACKEND}/linkedin-finder/bulk-search`, {
        method: 'POST', headers: jsonHdr(),
        body: JSON.stringify({ queries, org_id: orgId, num: numResults }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Search failed')
      setResults(data.results || [])
      setAllUrls(data.all_urls || [])
      setSelected(new Set(data.all_urls || []))
      toast.success(`Found ${data.total_urls} LinkedIn URLs`)
      loadHistory()
    } catch (e) { toast.error(e.message) }
    finally { setSearching(false) }
  }

  // ── Enrich ────────────────────────────────────────────────────────────────

  const handleEnrich = async () => {
    const urls = [...selected]
    if (!urls.length) return toast.error('Select at least one URL')
    setEnriching(true)
    try {
      const r = await fetch(`${BACKEND}/leads/enrich/bulk`, {
        method: 'POST', headers: jsonHdr(),
        body: JSON.stringify({ linkedin_urls: urls, org_id: orgId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Enrich failed')
      toast.success(`Job started for ${urls.length} profiles — ${data.job?.id?.slice(0, 8)}…`)
    } catch (e) { toast.error(e.message) }
    finally { setEnriching(false) }
  }

  // ── Delete history ────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    try {
      await fetch(`${BACKEND}/linkedin-finder/searches/${id}?org_id=${orgId}`, { method: 'DELETE', headers: jsonHdr() })
      setHistory(h => h.filter(s => s.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
  }

  const toggleUrl    = (url) => setSelected(s => { const n = new Set(s); n.has(url) ? n.delete(url) : n.add(url); return n })
  const toggleAll    = () => setSelected(s => s.size === allUrls.length ? new Set() : new Set(allUrls))
  const toggleExpand = (id) => setExpandedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>LinkedIn Finder</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Find LinkedIn profiles via SerpAPI · Results auto-saved to database
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--border-1)' }}>
        {[['search', 'Search'], ['history', `History (${history.length})`]].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
            background: 'transparent', color: activeTab === tab ? '#a5b4fc' : 'var(--text-3)',
            marginBottom: -1, borderRadius: '6px 6px 0 0',
          }}>{label}</button>
        ))}
      </div>

      {/* ── SEARCH TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'search' && (
        <div>

          {/* Search rows table */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-1)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 32px', gap: 0, background: 'var(--bg-base)', borderBottom: '1px solid var(--border-1)', padding: '8px 14px' }}>
              {['Role / Title', 'Industry', 'Location', 'Country', 'Keywords', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingRight: 8 }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((row, idx) => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 32px', gap: 0, borderBottom: idx < rows.length - 1 ? '1px solid var(--border-1)' : 'none', alignItems: 'center' }}>
                {['role', 'industry', 'location', 'country', 'keywords'].map((field, fi) => (
                  <input
                    key={field}
                    value={row[field]}
                    onChange={e => updateRow(row.id, field, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addRow()}
                    placeholder={['e.g. CEO', 'e.g. SaaS', 'e.g. Mumbai', 'e.g. India', 'startup'][fi]}
                    style={{
                      padding: '10px 14px', border: 'none', borderRight: fi < 4 ? '1px solid var(--border-1)' : 'none',
                      background: 'transparent', color: 'var(--text-1)', fontSize: 12, outline: 'none',
                      fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                    }}
                  />
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(row.id)} title="Remove row" style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
                      padding: 4, display: 'flex', alignItems: 'center',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add row footer */}
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={addRow} disabled={rows.length >= 20} style={{
                ...ghostBtn, display: 'flex', alignItems: 'center', gap: 5,
                opacity: rows.length >= 20 ? 0.4 : 1,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Row
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{rows.length} / 20 rows</span>
            </div>
          </div>

          {/* Options row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Results per query</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {RESULT_OPTIONS.map(n => (
                  <button key={n} onClick={() => setNumResults(n)} style={{
                    padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: numResults === n ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--border-1)',
                    background: numResults === n ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: numResults === n ? '#a5b4fc' : 'var(--text-3)',
                  }}>{n}</button>
                ))}
              </div>
              {numResults > 10 && (
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  ({Math.ceil(numResults / 10)} SerpAPI pages/query)
                </span>
              )}
            </div>
          </div>

          {/* Search button */}
          <button onClick={handleSearch} disabled={searching} style={{
            padding: '9px 22px', borderRadius: 8, border: 'none',
            cursor: searching ? 'not-allowed' : 'pointer',
            background: searching ? 'var(--bg-card)' : '#6366f1',
            color: searching ? 'var(--text-3)' : '#fff',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {searching ? <><Spinner /> Searching…</> : <><SearchIcon /> Search LinkedIn</>}
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                  {allUrls.length} URLs found
                  <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 6, fontSize: 12 }}>across {results.length} quer{results.length === 1 ? 'y' : 'ies'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={toggleAll} style={ghostBtn}>
                    {selected.size === allUrls.length ? 'Deselect All' : `Select All (${allUrls.length})`}
                  </button>
                  <button onClick={handleEnrich} disabled={enriching || !selected.size} style={{
                    ...ghostBtn,
                    ...(selected.size > 0 ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.4)' } : { opacity: 0.5 }),
                  }}>
                    {enriching ? 'Starting…' : `Enrich Selected (${selected.size})`}
                  </button>
                </div>
              </div>

              {results.map((res, i) => (
                <div key={i} style={{ marginBottom: 14, background: 'var(--bg-card)', border: '1px solid var(--border-1)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{res.query}</div>
                    <div style={{ fontSize: 11, color: res.error ? '#ef4444' : 'var(--text-3)' }}>
                      {res.error || `${res.result_count} results`}
                    </div>
                  </div>
                  {(res.linkedin_urls || []).map((url, j) => (
                    <div key={j} onClick={() => toggleUrl(url)} style={{
                      padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      borderBottom: j < res.linkedin_urls.length - 1 ? '1px solid var(--border-1)' : 'none',
                      background: selected.has(url) ? 'rgba(99,102,241,0.06)' : 'transparent',
                    }}>
                      <input type="checkbox" readOnly checked={selected.has(url)} style={{ cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }} />
                      <a href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ fontSize: 12, color: '#a5b4fc', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {url}
                      </a>
                    </div>
                  ))}
                  {!res.linkedin_urls?.length && !res.error && (
                    <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-3)' }}>No results found</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{history.length} saved searches</div>
            <button onClick={loadHistory} style={ghostBtn}>Refresh</button>
          </div>

          {historyLoading && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: 16 }}>Loading…</div>}

          {!historyLoading && !history.length && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 13 }}>
              No searches yet. Run a search to see history here.
            </div>
          )}

          {history.map(s => {
            const urls     = Array.isArray(s.linkedin_urls) ? s.linkedin_urls : JSON.parse(s.linkedin_urls || '[]')
            const expanded = expandedIds.has(s.id)
            const visible  = expanded ? urls : urls.slice(0, 3)
            const hidden   = urls.length - 3

            return (
              <div key={s.id} style={{ marginBottom: 12, background: 'var(--bg-card)', border: '1px solid var(--border-1)', borderRadius: 10, overflow: 'hidden' }}>

                {/* Header row */}
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: urls.length ? '1px solid var(--border-1)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.query}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {s.result_count} URLs · {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    <button onClick={() => {
                      setResults([{ query: s.query, linkedin_urls: urls, result_count: s.result_count }])
                      setAllUrls(urls); setSelected(new Set(urls)); setActiveTab('search')
                    }} style={ghostBtn}>Load</button>
                    <button onClick={() => handleDelete(s.id)} style={{ ...ghostBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Delete</button>
                  </div>
                </div>

                {/* URL list */}
                {visible.map((url, j) => (
                  <div key={j} style={{ padding: '7px 14px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a href={url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: '#a5b4fc', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {url}
                    </a>
                  </div>
                ))}

                {/* Show more / less */}
                {urls.length > 3 && (
                  <button onClick={() => toggleExpand(s.id)} style={{
                    width: '100%', padding: '8px 14px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    color: expanded ? 'var(--text-3)' : '#a5b4fc',
                    display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    {expanded ? 'Show less' : `Show ${hidden} more URL${hidden !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const ghostBtn = {
  padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border-1)',
  background: 'transparent', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}
function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
    </svg>
  )
}
