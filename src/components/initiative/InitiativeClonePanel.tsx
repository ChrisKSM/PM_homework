import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ChevronRight, Copy, GitBranch, Search } from 'lucide-react'
import { inputClass } from './InitiativeFieldShell'

interface CloneNode {
  key: string
  type: 'Initiative' | 'Epic' | 'Story' | 'Task'
  summary: string
  status: string
  children?: CloneNode[]
}

const MOCK_SOURCES: CloneNode[] = [
  {
    key: 'TVPLAT-598120',
    type: 'Initiative',
    summary: '[PRD 4471] 사운드바 Wi-Fi 연결 안정화 (Phase - 1/2)',
    status: 'In Progress',
    children: [
      {
        key: 'TVPLAT-598133',
        type: 'Epic',
        summary: 'Wi-Fi 재연결 시퀀스 개선',
        status: 'In Progress',
        children: [
          { key: 'TVPLAT-598140', type: 'Story', summary: 'Reconnect backoff 정책 적용', status: 'Done' },
          { key: 'TVPLAT-598141', type: 'Story', summary: 'Link loss 로그 수집', status: 'In Progress' },
        ],
      },
      {
        key: 'TVPLAT-598134',
        type: 'Epic',
        summary: '안정화 검증 (QE)',
        status: 'To Do',
        children: [{ key: 'TVPLAT-598150', type: 'Task', summary: 'Aging TC 72h', status: 'To Do' }],
      },
    ],
  },
  {
    key: 'TVPLAT-601877',
    type: 'Initiative',
    summary: '[SEETV] webOS 26 오디오 정책 정비',
    status: 'ELT Review',
    children: [{ key: 'TVPLAT-601890', type: 'Epic', summary: '오디오 출력 정책 테이블 정리', status: 'To Do' }],
  },
]

const TYPE_STYLE: Record<CloneNode['type'], string> = {
  Initiative: 'bg-lg-red text-white',
  Epic: 'bg-violet-100 text-violet-700',
  Story: 'bg-emerald-100 text-emerald-700',
  Task: 'bg-sky-100 text-sky-700',
}

function collectKeys(node: CloneNode): string[] {
  return [node.key, ...(node.children ?? []).flatMap(collectKeys)]
}

function TreeRow({
  node,
  depth,
  selected,
  onToggle,
}: {
  node: CloneNode
  depth: number
  selected: Set<string>
  onToggle: (node: CloneNode) => void
}) {
  return (
    <>
      <label
        className="flex cursor-pointer items-center gap-2 border-t border-surface-border px-3 py-2 text-xs hover:bg-surface-page"
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <input
          type="checkbox"
          checked={selected.has(node.key)}
          onChange={() => onToggle(node)}
          className="h-3.5 w-3.5 rounded border-gray-300 accent-indigo-600"
        />
        {node.children?.length ? <ChevronRight size={12} className="rotate-90 text-gray-400" /> : <span className="w-3" />}
        <span className={clsx('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', TYPE_STYLE[node.type])}>{node.type}</span>
        <span className="font-mono text-[11px] text-gray-500">{node.key}</span>
        <span className="flex-1 truncate text-gray-800">{node.summary}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{node.status}</span>
      </label>
      {node.children?.map((c) => <TreeRow key={c.key} node={c} depth={depth + 1} selected={selected} onToggle={onToggle} />)}
    </>
  )
}

export default function InitiativeClonePanel() {
  const [query, setQuery] = useState('')
  const [sourceKey, setSourceKey] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')
  const [newPlatform, setNewPlatform] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return MOCK_SOURCES
    return MOCK_SOURCES.filter((s) => s.key.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q))
  }, [query])
  const source = MOCK_SOURCES.find((s) => s.key === sourceKey) ?? null

  const pick = (node: CloneNode) => {
    setSourceKey(node.key)
    setSelected(new Set(collectKeys(node)))
    setNewName(node.summary.replace(/\(Phase - (\d+)\/(\d+)\)/, (_, a, b) => `(Phase - ${Number(a) + 1}/${b})`))
    setDone(null)
  }

  const toggle = (node: CloneNode) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const keys = collectKeys(node)
      if (next.has(node.key)) keys.forEach((k) => next.delete(k))
      else keys.forEach((k) => next.add(k))
      return next
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <section className="rounded-xl border border-surface-border bg-white shadow-sm">
        <div className="border-b border-surface-border p-4">
          <h3 className="mb-2 text-sm font-bold text-gray-900">원본 Initiative 검색</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={clsx(inputClass, 'pl-8')} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Key 또는 Summary (JQL 연동 예정)" />
          </div>
        </div>
        <ul className="divide-y divide-surface-border">
          {results.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => pick(s)}
                className={clsx('w-full px-4 py-3 text-left transition hover:bg-surface-page', sourceKey === s.key && 'bg-indigo-50/70')}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-gray-500">{s.key}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{s.status}</span>
                </div>
                <p className="mt-1 text-[13px] font-medium text-gray-900">{s.summary}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">하위 {collectKeys(s).length - 1}건</p>
              </button>
            </li>
          ))}
          {results.length === 0 ? <li className="px-4 py-6 text-center text-xs text-gray-400">검색 결과 없음</li> : null}
        </ul>
      </section>

      <section className="rounded-xl border border-surface-border bg-white shadow-sm">
        {source ? (
          <>
            <div className="space-y-4 border-b border-surface-border p-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-800">새 Initiative Summary</label>
                <input className={inputClass} value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-border p-3 hover:border-indigo-300">
                <input
                  type="checkbox"
                  checked={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-800">
                    <GitBranch size={13} /> 새 플랫폼 준비
                  </span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    Fix Version · Release Sprint · Branch를 비우고 상태를 DRAFTING으로 되돌립니다.
                  </span>
                </span>
              </label>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <div className="sticky top-0 flex items-center bg-surface-page px-3 py-2 text-[11px] font-semibold text-gray-500">
                복제 대상 계층
                <span className="ml-auto">{selected.size}건 선택</span>
              </div>
              <TreeRow node={source} depth={0} selected={selected} onToggle={toggle} />
            </div>
            <div className="flex items-center gap-3 border-t border-surface-border p-4">
              {done ? <p className="text-xs font-medium text-emerald-700">{done}</p> : <p className="text-[11px] text-gray-400">BE 연동 전 — 미리보기만 동작합니다.</p>}
              <button
                type="button"
                disabled={!selected.has(source.key) || !newName.trim()}
                onClick={() => setDone(`${selected.size}건 복제 요청을 미리보기로 생성했습니다 (Jira 미반영)`)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Copy size={13} /> {selected.size}건 복제
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
            <Copy size={28} className="text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">복제할 Initiative를 선택하세요</p>
            <p className="text-xs text-gray-400">Epic · Story · Task 계층을 함께 복제할 수 있습니다.</p>
          </div>
        )}
      </section>
    </div>
  )
}
