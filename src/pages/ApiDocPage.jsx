// ApiDocPage.jsx — Lead Enrichment API Reference

import { useState } from 'react'
import { Copy, Check, Eye, EyeOff, Key, Loader } from 'lucide-react'

const BACKEND = (import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8010`) + '/api'
const BASE    = BACKEND.replace('/api', '')
const TOKEN   = '<YOUR_TOKEN>'

const PROFILE_EXAMPLE = `{
  "linkedin_url": "https://www.linkedin.com/in/username",
  "first_name": "John",
  "last_name": "Doe",
  "headline": "VP of Engineering at Acme Corp",
  "company": "Acme Corp",
  "location": "San Francisco, CA"
}`

export default function ApiDocPage() {
  const [activeGroup, setActiveGroup] = useState('token')
  const [copied, setCopied]           = useState(null)

  const copy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1800)
  }

  const GROUPS = [
    { id: 'token', label: 'Get Token',    icon: '🔑' },
    { id: 'bulk',  label: 'Bulk Enrich',  icon: '📦' },
    { id: 'core',  label: 'Core',         icon: '🔷' },
    { id: 'intel', label: 'Intelligence', icon: '🧠' },
    { id: 'output',label: 'Output',       icon: '📤' },
  ]

  const aiNote = 'No auth required. Pass the raw BrightData profile object in the body.'

  const ENDPOINTS = {
    bulk: [
      {
        id: 'enrich-bulk', method: 'POST', path: '/api/leads/enrich/bulk', title: 'Bulk Enrich',
        desc: 'Submit up to 5000 LinkedIn profile URLs for async enrichment. Pass your token in the request body. Returns a job_id — poll /api/leads/jobs/{job_id} to track progress.',
        curl:
`curl -X POST ${BASE}/api/leads/enrich/bulk \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "${TOKEN}",
    "linkedin_urls": [
      "https://www.linkedin.com/in/person-one",
      "https://www.linkedin.com/in/person-two",
      "https://www.linkedin.com/in/person-three"
    ]
  }'`,
        response:
`{
  "success": true,
  "job": {
    "id": "a1b2c3d4-e5f6-...",
    "status": "running",
    "total_urls": 3
  },
  "message": "Batch job started for 3 URLs. Track progress at GET /api/leads/jobs/a1b2c3d4"
}`,
      },
      {
        id: 'job-status', method: 'GET', path: '/api/leads/jobs/{job_id}', title: 'Poll Job Status',
        desc: 'Get real-time status of a bulk enrichment job including chunk-level sub-jobs. No auth required.',
        curl:
`curl ${BASE}/api/leads/jobs/JOB_ID`,
        response:
`{
  "id": "job-uuid",
  "status": "running",
  "total_urls": 20,
  "processed": 8,
  "failed": 0,
  "sub_jobs": [
    { "chunk_index": 0, "status": "completed", "processed": 5, "failed": 0 },
    { "chunk_index": 1, "status": "running",   "processed": 3, "failed": 0 },
    { "chunk_index": 2, "status": "pending",   "processed": 0, "failed": 0 }
  ]
}`,
      },
    ],

    core: [
      {
        id: 'identity', method: 'POST', path: '/api/v1/ai/identity', title: 'Identity',
        desc: `Extract identity information (name, title, location, seniority, department) from a profile. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/identity \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "full_name": "John Doe",
  "title": "VP of Engineering",
  "seniority": "VP",
  "department": "Engineering",
  "location": "San Francisco, CA",
  "token_usage": { "prompt_tokens": 320, "completion_tokens": 80, "total_tokens": 400 }
}`,
      },
      {
        id: 'contact', method: 'POST', path: '/api/v1/ai/contact', title: 'Contact',
        desc: `Extract contact details (work email, phone, LinkedIn URL) from a profile. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/contact \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "work_email": "john.doe@acme.com",
  "phone": "+1-415-555-0100",
  "linkedin_url": "https://www.linkedin.com/in/username",
  "token_usage": { "prompt_tokens": 290, "completion_tokens": 60, "total_tokens": 350 }
}`,
      },
      {
        id: 'scores', method: 'POST', path: '/api/v1/ai/scores', title: 'Scores',
        desc: `Calculate lead scores (total_score, score_tier, data_completeness) for a profile. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/scores \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "total_score": 78,
  "score_tier": "warm",
  "data_completeness": 88,
  "score_breakdown": { "identity": 20, "contact": 18, "company": 15, "activity": 12, "intent": 13 },
  "token_usage": { "prompt_tokens": 310, "completion_tokens": 90, "total_tokens": 400 }
}`,
      },
    ],

    intel: [
      {
        id: 'icp-match', method: 'POST', path: '/api/v1/ai/icp-match', title: 'ICP Match',
        desc: `Analyse how well a profile matches your Ideal Customer Profile. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/icp-match \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "icp_match_score": 82,
  "icp_tier": "strong",
  "match_reasons": ["VP-level seniority in Engineering", "Company size 200-500 matches ICP"],
  "disqualifiers": [],
  "token_usage": { "prompt_tokens": 350, "completion_tokens": 110, "total_tokens": 460 }
}`,
      },
      {
        id: 'behavioural-signals', method: 'POST', path: '/api/v1/ai/behavioural-signals', title: 'Behavioural Signals',
        desc: `Analyse behavioural signals and buying intent from a profile's activity. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/behavioural-signals \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "intent_level": "high",
  "buying_signals": ["Recently posted about evaluating new tools", "Hiring for expansion roles"],
  "engagement_score": 74,
  "token_usage": { "prompt_tokens": 380, "completion_tokens": 120, "total_tokens": 500 }
}`,
      },
      {
        id: 'pitch-intelligence', method: 'POST', path: '/api/v1/ai/pitch-intelligence', title: 'Pitch Intelligence',
        desc: `Generate pitch angles and value propositions tailored to the prospect. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/pitch-intelligence \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "primary_pitch": "Help John's team ship faster with automated QA pipelines",
  "value_props": ["Reduce deployment failures by 60%", "Cut QA cycle time in half"],
  "pain_points": ["Scaling engineering team", "Tech debt pressure"],
  "token_usage": { "prompt_tokens": 400, "completion_tokens": 140, "total_tokens": 540 }
}`,
      },
      {
        id: 'activity', method: 'POST', path: '/api/v1/ai/activity', title: 'Activity',
        desc: `Analyse recent activity — posts, comments, shares — to surface conversation starters. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/activity \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "recent_topics": ["AI in DevOps", "Remote team scaling"],
  "activity_level": "moderate",
  "conversation_starters": ["Saw your post on platform engineering — are you building internal tooling?"],
  "token_usage": { "prompt_tokens": 370, "completion_tokens": 130, "total_tokens": 500 }
}`,
      },
    ],

    output: [
      {
        id: 'tags', method: 'POST', path: '/api/v1/ai/tags', title: 'Tags',
        desc: `Auto-generate categorisation tags for a lead based on their profile. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/tags \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "tags": ["engineering-leader", "vp-level", "saas", "series-b", "platform-engineering", "hiring"],
  "token_usage": { "prompt_tokens": 280, "completion_tokens": 70, "total_tokens": 350 }
}`,
      },
      {
        id: 'outreach', method: 'POST', path: '/api/v1/ai/outreach', title: 'Outreach',
        desc: `Generate personalised cold email and LinkedIn outreach copy for a prospect. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/outreach \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "email_subject": "Quick question about your engineering stack at Acme",
  "cold_email": "Hi John, I noticed you recently...",
  "linkedin_note": "Hey John, love what you're building at Acme...",
  "best_channel": "email",
  "best_send_time": "Tuesday 10–11am",
  "token_usage": { "prompt_tokens": 420, "completion_tokens": 180, "total_tokens": 600 }
}`,
      },
      {
        id: 'persona-analysis', method: 'POST', path: '/api/v1/ai/persona-analysis', title: 'Persona Analysis',
        desc: `Build a deep buyer persona — communication style, decision traits, motivators, objections. ${aiNote}`,
        curl:
`curl -X POST ${BASE}/api/v1/ai/persona-analysis \\
  -H "Content-Type: application/json" \\
  -d '{ "profile": ${PROFILE_EXAMPLE} }'`,
        response:
`{
  "persona_type": "Analytical Builder",
  "communication_style": "Direct, data-driven, prefers async",
  "decision_style": "Research-heavy, involves team",
  "motivators": ["Technical excellence", "Team autonomy"],
  "likely_objections": ["Budget approval process", "Integration complexity"],
  "token_usage": { "prompt_tokens": 430, "completion_tokens": 170, "total_tokens": 600 }
}`,
      },
    ],
  }

  const METHOD_COLOR = {
    GET:    { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    POST:   { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    DELETE: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  }

  const list = ENDPOINTS[activeGroup] || []

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg-base)', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>API Reference</h1>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)' }}>
            Base URL: <code style={{ color: '#818cf8' }}>{BASE}</code>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0 }}>

        {/* Left nav */}
        <div style={{
          width: 192, flexShrink: 0, borderRight: '1px solid var(--border-1)',
          paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 8 }}>Sections</div>

          {GROUPS.map(g => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
              borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
              background: activeGroup === g.id ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: activeGroup === g.id ? '#a5b4fc' : 'var(--text-2)',
              fontSize: 12, fontWeight: activeGroup === g.id ? 600 : 400,
              transition: 'all 0.12s',
            }}>
              <span style={{ fontSize: 13 }}>{g.icon}</span>
              {g.label}
            </button>
          ))}

          <div style={{ marginTop: 20, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase',
              letterSpacing: '0.07em', marginBottom: 5 }}>Base URL</div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', wordBreak: 'break-all', lineHeight: 1.5, fontFamily: 'monospace' }}>{BASE}</div>
          </div>

          <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textTransform: 'uppercase',
              letterSpacing: '0.07em', marginBottom: 5 }}>Bulk Auth</div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'monospace', lineHeight: 1.7 }}>
              Token in body:<br /><span style={{ color: '#a7f3d0' }}>"token": "&lt;token&gt;"</span>
            </div>
          </div>

          <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase',
              letterSpacing: '0.07em', marginBottom: 5 }}>AI Endpoints</div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'monospace', lineHeight: 1.7 }}>
              No auth required<br />Just send profile
            </div>
          </div>
        </div>

        {/* Right content */}
        <div style={{ flex: 1, paddingLeft: 24 }}>
          {activeGroup === 'token'
            ? <TokenGenerator BASE={BASE} copy={copy} copied={copied} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {list.map(ep => {
                  const mc = METHOD_COLOR[ep.method] || METHOD_COLOR.GET
                  return (
                    <div key={ep.id} style={{
                      borderRadius: 10, border: '1px solid var(--border-1)',
                      background: 'var(--bg-card)', overflow: 'hidden',
                    }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)',
                        display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 5, flexShrink: 0,
                          background: mc.bg, color: mc.color, border: `1px solid ${mc.border}`,
                        }}>{ep.method}</span>
                        <code style={{ fontSize: 12, color: '#a5b4fc', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</code>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flexShrink: 0 }}>{ep.title}</span>
                      </div>

                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>{ep.desc}</p>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>curl</span>
                            <CopyBtn id={ep.id + '-curl'} text={ep.curl} copied={copied} onCopy={copy} />
                          </div>
                          <pre style={{
                            margin: 0, padding: '10px 14px', borderRadius: 8, overflow: 'auto',
                            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                            fontSize: 11, lineHeight: 1.75, color: '#e2e8f0', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            whiteSpace: 'pre',
                          }}>{ep.curl}</pre>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>response</span>
                            <CopyBtn id={ep.id + '-res'} text={ep.response} copied={copied} onCopy={copy} />
                          </div>
                          <pre style={{
                            margin: 0, padding: '10px 14px', borderRadius: 8, overflow: 'auto',
                            background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)',
                            fontSize: 11, lineHeight: 1.75, color: '#a7f3d0', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            whiteSpace: 'pre',
                          }}>{ep.response}</pre>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

// ── Token Generator ────────────────────────────────────────────────────────────

function TokenGenerator({ BASE, copy, copied }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)   // { token, user } | { error }

  const generate = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const d = await r.json()
      if (!r.ok) {
        setResult({ error: d.detail || 'Login failed' })
      } else {
        setResult({ token: d.access_token, user: d.user, expires_in: d.expires_in })
      }
    } catch (e) {
      setResult({ error: 'Could not reach server' })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid var(--border-1)', background: 'var(--bg-elevated)',
    color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Info card */}
      <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.25)',
        background: 'rgba(99,102,241,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Key size={14} color="#818cf8" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>Generate Your WorksBuddy Token</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>
          Login with your <strong style={{ color: 'var(--text-1)' }}>WorksBuddy admin account</strong>.
          Only admin + owner accounts from the WorksBuddy organisation can generate a token.
          The token is valid for <strong style={{ color: 'var(--text-1)' }}>8 hours</strong> and must include{' '}
          <code style={{ color: '#a7f3d0', fontSize: 11 }}>platform: "worksbuddy"</code> to be accepted by the API.
        </p>
      </div>

      {/* Form */}
      <div style={{ padding: '20px', borderRadius: 10, border: '1px solid var(--border-1)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            WorksBuddy Email
          </label>
          <input
            type="email"
            placeholder="you@worksbuddy.ai"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              style={{ ...inputStyle, paddingRight: 40 }}
            />
            <button onClick={() => setShowPw(p => !p)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2,
            }}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !email.trim() || !password.trim()}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#6366f1,#0ea5e9)',
            color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, opacity: (!email.trim() || !password.trim()) ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Key size={14} /> Generate Token</>}
        </button>
      </div>

      {/* Result */}
      {result && (
        result.error ? (
          <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 13 }}>
            {result.error}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* User info */}
            <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.25)',
              background: 'rgba(16,185,129,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 10 }}>Login Successful</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                {[
                  ['Name',  result.user?.full_name],
                  ['Email', result.user?.email],
                  ['Role',  result.user?.role],
                  ['Org',   result.user?.organization],
                  ['Org ID',result.user?.organization_id],
                  ['Expires', `${(result.expires_in / 3600).toFixed(0)}h`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token */}
            <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border-1)', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Your Token
                </span>
                <CopyBtn id="generated-token" text={result.token} copied={copied} onCopy={copy} />
              </div>
              <pre style={{
                margin: 0, padding: '10px 14px', borderRadius: 8, overflow: 'auto',
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 11, lineHeight: 1.6, color: '#a7f3d0', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>{result.token}</pre>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                Copy this token and use it as <code style={{ color: '#fde68a' }}>"token"</code> in the Bulk Enrich body. It carries{' '}
                <code style={{ color: '#a7f3d0' }}>platform: "worksbuddy"</code> — required for API access.
              </p>
            </div>
          </div>
        )
      )}

      {/* curl reference */}
      <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border-1)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            curl equivalent
          </span>
          <CopyBtn id="token-curl"
            text={`curl -X POST ${BASE}/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"you@worksbuddy.ai","password":"your_password"}'`}
            copied={copied} onCopy={copy} />
        </div>
        <pre style={{
          margin: 0, padding: '10px 14px', borderRadius: 8, overflow: 'auto',
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11, lineHeight: 1.75, color: '#e2e8f0', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          whiteSpace: 'pre',
        }}>{`curl -X POST ${BASE}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "you@worksbuddy.ai",
    "password": "your_password"
  }'`}</pre>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Copy Button ────────────────────────────────────────────────────────────────

function CopyBtn({ id, text, copied, onCopy }) {
  const active = copied === id
  return (
    <button onClick={() => onCopy(id, text)} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px',
      borderRadius: 5, border: '1px solid var(--border-1)', background: 'var(--bg-elevated)',
      cursor: 'pointer', fontSize: 10, color: active ? '#10b981' : 'var(--text-3)',
      transition: 'color 0.15s',
    }}>
      {active ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
    </button>
  )
}
