import clsx from 'clsx'

/** 메타 셀 — 고정 폭 + hover 시 전체 내용 */
export default function MetaTooltipCell({
  value,
  className,
  maxWidth = 100,
}: {
  value: string
  className?: string
  maxWidth?: number
}) {
  const text = String(value ?? '').trim()
  if (!text || text === '-') {
    return <span className={clsx('text-gray-400', className)}>-</span>
  }
  return (
    <div className="group relative w-full">
      <span
        className={clsx('block truncate text-center mx-auto', className)}
        style={{ maxWidth }}
      >
        {text}
      </span>
      <div className="hidden group-hover:block absolute z-40 left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-xl max-w-xs whitespace-pre-wrap pointer-events-none">
        {text}
      </div>
    </div>
  )
}
