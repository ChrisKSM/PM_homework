import { useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ChevronRight, Search, Sparkles, UsersRound, X } from 'lucide-react'
import type { DirectoryUser } from '../../data/initiativeTemplate'
import { PART_STAFF, partOfMember, teamMembers, type OrgTeam, type TeamOrganization } from '../../data/initiativeOrg'
import type { InitiativeOwner } from '../../utils/initiativeValidation'
import type { OwnerCandidate } from '../../utils/initiativeAutofill'
import { inputClass } from './InitiativeFieldShell'

export interface OwnerOrgSource {
  teams: OrgTeam[]
  partsByTeam: Record<string, TeamOrganization>
  /** 접속 계정의 팀 — 조직 선택 기본값 */
  defaultTeam: string
}

interface Props {
  value: InitiativeOwner | null
  onChange: (owner: InitiativeOwner | null) => void
  directory: DirectoryUser[]
  candidates?: OwnerCandidate[]
  placeholder?: string
  org?: OwnerOrgSource
}

function initials(name: string): string {
  return name.slice(0, 1)
}

const selectClass =
  'rounded-lg border border-surface-border bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none'

function OrgMemberBrowser({ org, onPick }: { org: OwnerOrgSource; onPick: (owner: InitiativeOwner) => void }) {
  const [showMembers, setShowMembers] = useState(false)
  const [teamName, setTeamName] = useState(org.defaultTeam)
  const [part, setPart] = useState('')
  const team = org.teams.find((t) => t.name === teamName)
  const partData = org.partsByTeam[teamName]
  const members = team ? teamMembers(team, partData, part) : []

  return (
    <div className="rounded-lg border border-surface-border bg-surface-page/60">
      <button
        type="button"
        onClick={() => setShowMembers((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs text-gray-700 hover:text-gray-900"
      >
        <ChevronRight size={13} className={clsx('text-gray-400 transition-transform', showMembers && 'rotate-90')} />
        <UsersRound size={13} className="text-gray-500" />
        <span className="font-semibold">조직에서 선택</span>
        <span className="text-gray-400">
          · {teamName || '팀 미선택'}
          {part ? ` / ${part === PART_STAFF ? '팀 스태프' : part}` : ''} ({members.length})
        </span>
      </button>
      {showMembers ? (
        <div className="space-y-2 border-t border-surface-border px-3 py-2.5">
          <div className="flex flex-wrap gap-2">
            <select
              className={selectClass}
              value={teamName}
              aria-label="팀 선택"
              onChange={(e) => {
                setTeamName(e.target.value)
                setPart('')
              }}
            >
              <option value="">팀 선택</option>
              {org.teams.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.members.length})
                </option>
              ))}
            </select>
            {partData ? (
              <select className={selectClass} value={part} aria-label="파트 선택" onChange={(e) => setPart(e.target.value)}>
                <option value="">파트 전체</option>
                {Object.keys(partData.parts).map((p) => (
                  <option key={p} value={p}>
                    {p} ({partData.parts[p].length})
                  </option>
                ))}
                {partData.team_staff.length > 0 ? (
                  <option value={PART_STAFF}>팀 스태프 ({partData.team_staff.length})</option>
                ) : null}
              </select>
            ) : null}
          </div>
          {members.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-gray-400">{teamName ? '멤버 없음' : '팀을 선택하세요'}</p>
          ) : (
            <ul className="grid max-h-52 gap-1 overflow-auto sm:grid-cols-2">
              {members.map((m) => {
                const memberPart = partOfMember(partData, m.jiraId)
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick({ name: m.jiraId, displayName: m.displayName, team: m.team })
                        setShowMembers(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md bg-white px-2 py-1.5 text-left ring-1 ring-surface-border transition hover:ring-indigo-300"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-700">
                        {initials(m.displayName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-gray-900">
                          {m.displayName} <span className="font-normal text-gray-400">{m.title}</span>
                        </span>
                        <span className="block truncate text-[10px] text-gray-500">{m.jiraId}</span>
                      </span>
                      {memberPart && !part ? (
                        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">{memberPart}</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function InitiativeOwnerPicker({ value, onChange, directory, candidates = [], placeholder, org }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 1) return directory
    return directory.filter(
      (u) => u.name.toLowerCase().includes(q) || u.displayName.includes(query.trim()) || u.team.toLowerCase().includes(q)
    )
  }, [query, directory])

  const pick = (u: DirectoryUser) => {
    onChange({ name: u.name, displayName: u.displayName, team: u.team })
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {initials(value.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {value.displayName} <span className="font-normal text-gray-500">{value.name}</span>
            </p>
            {value.team ? <p className="text-[11px] text-gray-500">{value.team}</p> : null}
          </div>
          <button type="button" onClick={() => onChange(null)} className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700" aria-label="Owner 해제">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className={clsx(inputClass, 'pl-8')}
            value={query}
            placeholder={placeholder || '이름 / AD ID / 팀 검색'}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
          />
          {open ? (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-surface-border bg-white py-1 shadow-lg">
              {results.length === 0 ? <p className="px-3 py-2 text-xs text-gray-500">검색 결과 없음</p> : null}
              {results.map((u) => (
                <button
                  key={u.name}
                  type="button"
                  onClick={() => pick(u)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-page"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-700">
                    {initials(u.displayName)}
                  </span>
                  <span className="text-sm text-gray-900">{u.displayName}</span>
                  <span className="text-xs text-gray-500">{u.name}</span>
                  <span className="ml-auto text-[11px] text-gray-400">{u.team}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {!value && candidates.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
            <Sparkles size={12} /> 추천
          </span>
          {candidates.slice(0, 3).map((c) => (
            <button
              key={c.user.name}
              type="button"
              onClick={() => pick(c.user)}
              title={c.reason}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-xs text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
            >
              <span className="font-semibold">{c.user.displayName}</span>
              <span className="text-gray-400">· {c.reason}</span>
            </button>
          ))}
        </div>
      ) : null}
      {!value && org ? <OrgMemberBrowser org={org} onPick={onChange} /> : null}
    </div>
  )
}
