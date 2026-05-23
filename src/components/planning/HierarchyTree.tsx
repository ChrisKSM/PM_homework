import clsx from 'clsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { ComplianceStatus, PlanningHierarchyNode } from '../../types/planning'

interface Props {
  nodes: PlanningHierarchyNode[]
  selectedKey: string | null
  onSelectStory: (key: string) => void
}

const LEVEL_LABEL: Record<string, string> = {
  release: 'L1',
  sprint: 'L2',
  epic: 'L3',
  story: 'L4',
}

const STATUS_STYLE: Record<ComplianceStatus, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  fail: 'bg-red-50 text-lg-red border-red-200',
  pending: 'bg-gray-50 text-gray-500 border-gray-200',
}

function TreeNode({
  node,
  depth,
  selectedKey,
  onSelectStory,
}: {
  node: PlanningHierarchyNode
  depth: number
  selectedKey: string | null
  onSelectStory: (key: string) => void
}) {
  const hasChildren = (node.children?.length ?? 0) > 0
  const [open, setOpen] = useState(depth < 2)

  const isStory = node.level === 'story'
  const isSelected = isStory && selectedKey === node.key

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isStory) {
            onSelectStory(node.key)
          } else if (hasChildren) {
            setOpen((v) => !v)
          }
        }}
        className={clsx(
          'w-full flex items-center gap-2 py-2 px-2 rounded-lg text-left transition-colors',
          isSelected ? 'bg-lg-red-light border border-red-200' : 'hover:bg-surface-page',
          isStory && 'cursor-pointer'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren && !isStory ? (
          open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="text-[10px] font-bold text-gray-400 w-6 shrink-0">{LEVEL_LABEL[node.level]}</span>
        <span className="font-mono text-xs text-lg-red font-bold shrink-0">{node.key}</span>
        <span className="text-sm text-gray-800 truncate flex-1">{node.label}</span>
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0', STATUS_STYLE[node.status])}>
          {node.criteria}
        </span>
      </button>
      {open &&
        node.children?.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedKey={selectedKey}
            onSelectStory={onSelectStory}
          />
        ))}
    </div>
  )
}

export default function HierarchyTree({ nodes, selectedKey, onSelectStory }: Props) {
  return (
    <div className="space-y-0.5 max-h-[420px] overflow-y-auto">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedKey={selectedKey}
          onSelectStory={onSelectStory}
        />
      ))}
    </div>
  )
}
