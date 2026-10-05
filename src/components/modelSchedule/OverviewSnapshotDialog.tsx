import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Mail, X } from 'lucide-react'
import clsx from 'clsx'
import type { OverviewModel } from '../../types/modelScheduleOverview'
import { expandOverviewToDisplayRows } from '../../utils/modelScheduleOverviewRows'
import { captureOverviewPageImages } from '../../utils/captureOverviewPages'
import { modelScheduleApi } from '../../api/modelScheduleApi'
import OverviewScheduleTable from './OverviewScheduleTable'

const MIN_SCALE = 0.75

function fmt(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function splitModelsIntoPages(models: OverviewModel[]): OverviewModel[][] {
  if (models.length <= 8) return [models]
  const mid = Math.ceil(models.length / 2)
  return [models.slice(0, mid), models.slice(mid)]
}

export default function OverviewSnapshotDialog({
  open,
  onClose,
  models,
  filterActive = false,
  filteredCount,
  dates,
  periodLabel,
  today,
  todayOff,
}: {
  open: boolean
  onClose: () => void
  models: OverviewModel[]
  /** 화면 필터 적용 중이어도 메일은 전체 models 로 발송 */
  filterActive?: boolean
  filteredCount?: number
  dates: Date[]
  periodLabel: string
  today: Date
  viewStart: Date
  todayOff: number
}) {
  const pages = useMemo(() => splitModelsIntoPages(models), [models])
  const allDisplayRows = useMemo(() => expandOverviewToDisplayRows(models), [models])
  const pageDisplayRows = useMemo(
    () => pages.map((pm) => expandOverviewToDisplayRows(pm)),
    [pages],
  )
  const [page, setPage] = useState(0)
  const [shareDev, setShareDev] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [shareMsg, setShareMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (open) {
      setPage(0)
      setShareDev(true)
      setShareMsg(null)
    }
  }, [open, models])

  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !innerRef.current) return
    const fit = () => {
      const w = wrapRef.current!.clientWidth - 24
      const h = wrapRef.current!.clientHeight - 24
      const sw = innerRef.current!.scrollWidth
      const sh = innerRef.current!.scrollHeight
      if (sw <= 0 || sh <= 0) return
      setScale(Math.max(MIN_SCALE, Math.min(1, w / sw, h / sh)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open, page, models, dates])

  const handleShare = async () => {
    if (!shareDev || sharing) return
    setSharing(true)
    setShareMsg(null)
    try {
      let pageImages: Array<{ page: number; data: string }> = []
      try {
        pageImages = await captureOverviewPageImages(pageDisplayRows, dates, todayOff)
      } catch (capErr) {
        console.warn('overview snapshot capture failed:', capErr)
      }

      const res = await modelScheduleApi.shareOverviewSnapshot({
        period_label: periodLabel,
        dates: dates.map(toISO),
        models,
        page_images: pageImages.length ? pageImages : undefined,
        display_rows: allDisplayRows.map((r) => ({
          modelId: r.modelId,
          category: r.category,
          model: r.model,
          variant: r.variant,
          soc: r.soc,
          swPm: r.swPm,
          spec: r.spec,
          pv: r.pv,
          mp: r.mp,
          timelineKind: r.timelineKind,
          lineIndex: r.lineIndex,
          bars: r.bars,
        })),
        audiences: ['개발'],
        recipients: ['seokmin.koh@lge.com'],
      })
      setShareMsg({ type: 'ok', text: `${res.message} → ${res.recipients.join(', ')}` })
    } catch (e: unknown) {
      const err = e as {
        response?: { status?: number; data?: { detail?: unknown } }
        message?: string
        code?: string
      }
      let detail = '발송 실패'
      const raw = err?.response?.data?.detail
      if (typeof raw === 'string') detail = raw
      else if (Array.isArray(raw) && raw[0]?.msg) detail = String(raw[0].msg)
      else if (err?.response?.status === 422)
        detail = 'BE 구버전 — BE pod에서 apply-model-schedule-overview-be.sh 실행 후 uvicorn 재시작'
      else if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error')
        detail =
          'Network Error — BE 응답 없음(타임아웃/게이트웨이). 메일은 발송됐을 수 있으니 수신함 확인'
      else if (err?.message) detail = err.message
      setShareMsg({ type: 'err', text: detail })
    } finally {
      setSharing(false)
    }
  }

  if (!open) return null

  const pageModels = pages[page] ?? []
  const displayRows = expandOverviewToDisplayRows(pageModels)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[96vw] max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">전 모델 일정 Snapshot</h2>
            <p className="text-[11px] text-gray-500">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {pages.length > 1 && (
              <>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded border border-surface-border disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-500">
                  Page {page + 1}/{pages.length}
                </span>
                <button type="button" onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))} disabled={page >= pages.length - 1} className="p-1.5 rounded border border-surface-border disabled:opacity-40">
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>
        <div ref={wrapRef} className="flex-1 overflow-auto p-3 min-h-0">
          <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <OverviewScheduleTable displayRows={displayRows} dates={dates} todayOff={todayOff} />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-surface-border shrink-0 bg-white space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-gray-700">메일 공유</span>
            <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={shareDev}
                onChange={(e) => setShareDev(e.target.checked)}
                className="rounded border-gray-300"
              />
              개발
            </label>
            <button
              type="button"
              disabled={!shareDev || sharing}
              onClick={handleShare}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                shareDev && !sharing
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed',
              )}
            >
              {sharing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              공유 (메일)
            </button>
            <span className="text-[10px] text-gray-400">
              테스트: seokmin.koh@lge.com · SW 이벤트 + Page 1/2 · 전체 {models.length}모델 발송
              {filterActive && filteredCount != null && filteredCount !== models.length
                ? ` (화면 필터 ${filteredCount}모델 — 메일은 전체)`
                : ''}
            </span>
          </div>
          {shareMsg && (
            <p className={clsx('text-[11px]', shareMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600')}>
              {shareMsg.text}
            </p>
          )}
          <p className="text-[10px] text-gray-400">
            오늘: {fmt(today)} · {models.length}모델 · 1행 HW / 2행 SW
          </p>
        </div>
      </div>
    </div>
  )
}
