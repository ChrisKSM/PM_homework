import { useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { Search, Sparkles, X } from 'lucide-react'
import type { DirectoryUser } from '../../data/initiativeTemplate'
import type { InitiativeOwner } from '../../utils/initiativeValidation'
import type { OwnerCandidate } from '../../utils/initiativeAutofill'
import { inputClass } from './InitiativeFieldShell'

interface Props {
  value: InitiativeOwner | null
  onChange: (owner: InitiativeOwner | null) => void
  directory: DirectoryUser[]
  candidates?: OwnerCandidate[]
  placeholder?: string
}

function initials(name: string): string {
  return name.slice(0, 1)
}

export default function InitiativeOwnerPicker({ value, onChange, directory, candidates = [], placeholder }: Props) {
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
    </div>
  )
}
