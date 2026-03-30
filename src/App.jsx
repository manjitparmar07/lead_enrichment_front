// App.jsx — WorksBuddy Lead Enrichment
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'

import { getActiveJobs, updateJob, removeJob } from './utils/importStore'

// ── Lazy page imports ──────────────────────────────────────────────────────
// Each page is a separate chunk — only downloaded when first visited.
// Initial bundle drops from ~338 KB → ~120 KB (react + router + hot-toast).
const LoginPage               = lazy(() => import('./pages/LoginPage'))
const LeadEnrichmentPage      = lazy(() => import('./pages/LeadEnrichmentPage'))
const LeadEnrichmentConfigPage = lazy(() => import('./pages/LeadEnrichmentConfigPage'))
const ApiDocPage              = lazy(() => import('./pages/ApiDocPage'))
const LioConfigPage           = lazy(() => import('./pages/LioConfigPage'))
const ImportPage              = lazy(() => import('./pages/ImportPage'))
const StoragePage             = lazy(() => import('./pages/StoragePage'))

// ── Suspense fallback ──────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 10, color: 'var(--text-3)', fontSize: 13,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ animation: 'spin 0.8s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
      </svg>
      Loading…
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Auth helpers ───────────────────────────────────────────────────────────

function getStoredAuth() {
  try {
    const token = localStorage.getItem('wb_ai_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('wb_ai_token')
      localStorage.removeItem('wb_ai_user')
      return null
    }
    return { token, user: JSON.parse(localStorage.getItem('wb_ai_user') || '{}') }
  } catch {
    return null
  }
}

// ── Global import monitor ──────────────────────────────────────────────────
// Lives at app root — survives page navigation.
// Polls ONLY when there are active jobs (no wasted requests when idle).
// Fires a custom browser event so the sidebar progress bars update without
// their own separate interval.

const IMPORT_STORE_EVENT = 'wb-import-store-updated'

function ImportMonitor({ onActiveCountChange }) {
  const intervalRef = useRef(null)
  const POLL_MS = 8_000  // was 5 000 — less aggressive, still responsive

  useEffect(() => {
    const poll = async () => {
      const active = getActiveJobs()
      onActiveCountChange(active.length)

      if (!active.length) return  // no jobs → skip network requests

      for (const job of active) {
        try {
          const res = await fetch(`/api/import/status/${job.jobId}`)
          if (!res.ok) continue
          const d = await res.json()
          updateJob(job.jobId, { status: d.status, processed: d.processed, pct: d.pct, total: d.total })

          if (d.status === 'completed') {
            toast.success(`Import complete: ${job.filename} — ${(d.processed || 0).toLocaleString()} rows`, { duration: 6000 })
            setTimeout(() => removeJob(job.jobId), 3000)
          } else if (d.status === 'failed') {
            toast.error(`Import failed: ${job.filename}${d.error ? ` — ${d.error}` : ''}`, { duration: 8000 })
            setTimeout(() => removeJob(job.jobId), 3000)
          }
        } catch { /* network hiccup — retry next tick */ }
      }

      // Notify sidebar to re-render from updated store (replaces the 1 s interval)
      window.dispatchEvent(new CustomEvent(IMPORT_STORE_EVENT))
      onActiveCountChange(getActiveJobs().length)
    }

    poll()
    intervalRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(intervalRef.current)
  }, [])

  return null
}

// ── App root ───────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [activeImports, setActiveImports] = useState(() => getActiveJobs().length)

  if (!auth) {
    return (
      <>
        <ToasterSetup />
        <Suspense fallback={null}>
          <LoginPage onLogin={(user) => {
            setAuth({ token: localStorage.getItem('wb_ai_token'), user })
          }} />
        </Suspense>
      </>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('wb_ai_token')
    localStorage.removeItem('wb_ai_user')
    setAuth(null)
  }

  return (
    <BrowserRouter>
      <ToasterSetup />
      <ImportMonitor onActiveCountChange={setActiveImports} />
      <AppShell user={auth.user} onLogout={handleLogout} activeImports={activeImports} />
    </BrowserRouter>
  )
}

function ToasterSetup() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1e1e1e', color: '#e8e8e8',
          border: '1px solid #2a2a2a', borderRadius: '10px',
          fontSize: '13px', fontFamily: "'Inter', system-ui, sans-serif",
        },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
      }}
    />
  )
}

// ── Nav config ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    to: '/leads', label: 'Lead Enrichment', badge: 'LIVE',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="23" y2="12"/><line x1="23" y1="8" x2="19" y2="12"/></svg>,
  },
  {
    to: '/config', label: 'Tool Configuration',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
  },
  {
    to: '/lio-config', label: 'LIO Config',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  },
  {
    to: '/storage', label: 'Storage',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  },
  {
    to: '/import', label: 'Import', importNav: true,
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  },
  {
    to: '/api-doc', label: 'API Doc',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  },
]

// ── App shell ──────────────────────────────────────────────────────────────

function AppShell({ user, onLogout, activeImports }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* Left nav */}
      <nav style={{
        width: 220, minWidth: 220, height: '100vh', flexShrink: 0,
        background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column', zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', gap: 10, minHeight: 56,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>WorksBuddy</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Lead Enrichment</div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 9, marginBottom: 4,
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                color: isActive ? '#a5b4fc' : 'var(--text-3)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s', textDecoration: 'none',
              })}
            >
              {item.icon}
              {item.label}
              {item.badge && !item.importNav && (
                <span style={{
                  marginLeft: 'auto', fontSize: 8, padding: '1px 5px', borderRadius: 4,
                  background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontWeight: 700,
                }}>{item.badge}</span>
              )}
              {item.importNav && activeImports > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: 8, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#f59e0b',
                    animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block',
                  }} />
                  {activeImports}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Running imports ticker — event-driven, no interval */}
        {activeImports > 0 && (
          <div style={{
            margin: '0 8px 8px', padding: '8px 12px', borderRadius: 9,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                {activeImports} import{activeImports > 1 ? 's' : ''} running
              </span>
            </div>
            <ActiveImportsList />
          </div>
        )}

        {/* User + logout */}
        <div style={{
          padding: '12px 14px', borderTop: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || user?.email || 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            style={{
              background: 'transparent', border: '1px solid var(--border-1)',
              color: 'var(--text-3)', cursor: 'pointer', borderRadius: 7,
              padding: 5, display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Main content — each page lazy-loaded on first visit */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', background: 'var(--bg-base)' }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/leads" replace />} />
            <Route path="/leads"    element={<LeadEnrichmentPage />} />
            <Route path="/config"   element={<LeadEnrichmentConfigPage />} />
            <Route path="/lio-config" element={<LioConfigPage />} />
            <Route path="/storage"  element={<StoragePage />} />
            <Route path="/import"   element={<ImportPage />} />
            <Route path="/api-doc"  element={<ApiDocPage />} />
            <Route path="*"         element={<Navigate to="/leads" replace />} />
          </Routes>
        </Suspense>
      </main>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes spin   { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ── Active imports sidebar list ────────────────────────────────────────────
// Re-reads from localStorage ONLY when ImportMonitor fires an event.
// Eliminates the previous 1 000 ms setInterval (was causing constant re-renders).

function ActiveImportsList() {
  const [jobs, setJobs] = useState(() => getActiveJobs())

  useEffect(() => {
    const handler = () => setJobs(getActiveJobs())
    window.addEventListener(IMPORT_STORE_EVENT, handler)
    return () => window.removeEventListener(IMPORT_STORE_EVENT, handler)
  }, [])

  return (
    <div>
      {jobs.map(j => (
        <div key={j.jobId} style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
            {j.filename}
          </div>
          <div style={{ height: 3, background: 'rgba(245,158,11,0.15)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${j.pct || 0}%`, background: '#f59e0b', borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
