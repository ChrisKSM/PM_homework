import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, CheckCircle2, Copy, KeyRound, X } from 'lucide-react'
import { buildInitiativePayload } from '../../utils/initiativePayload'
import type { InitiativeForm } from '../../utils/initiativeValidation'
import { inputClass } from './InitiativeFieldShell'

interface Props {
  open: boolean
  form: InitiativeForm
  missingCount: number
  errorCount: number
  onClose: () => void
}

export default function InitiativeCreateDialog({ open, form, missingCount, errorCount, onClose }: Props) {
  const [adId, setAdId] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const payload = useMemo(() => JSON.stringify(buildInitiativePayload(form), null, 2), [form])

  useEffect(() => {
    if (!open) {
      setPassword('')
      setSubmitted(false)
      setCopied(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const blocked = missingCount > 0 || errorCount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Initiative 생성 검토"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-surface-border px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Initiative 생성 검토</h2>
            <p className="text-xs text-gray-500">TVPLAT · Initiative · label Created_By_Davis</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-[300px_1fr]">
          <div className="space-y-4 border-b border-surface-border p-6 md:border-b-0 md:border-r">
            {blocked ? (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  필수 누락 {missingCount}건 · 규칙 오류 {errorCount}건이 남아 있습니다. DRAFTING 상태로 생성은 가능하지만 PO Review 전에 보완하세요.
                </span>
              </div>
            ) : (
              <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> 모든 필수 항목과 규칙을 통과했습니다.
              </div>
            )}

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-gray-800">
                <KeyRound size={13} /> Jira 인증 (AD)
              </p>
              <div className="space-y-2">
                <input className={inputClass} value={adId} onChange={(e) => setAdId(e.target.value)} placeholder="AD ID" autoComplete="username" />
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                BE 연동 전 UI입니다. 비밀번호는 전송·저장되지 않습니다.
              </p>
            </div>

            {submitted ? (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
                미리보기 완료 — BE 연동 후 이 payload로 Jira Initiative가 생성됩니다.
              </p>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col bg-gray-950">
            <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-400">
              <span className="font-mono">POST /rest/api/2/issue</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(payload)
                  setCopied(true)
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 hover:text-white"
              >
                <Copy size={12} /> {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <pre className="flex-1 overflow-auto px-4 pb-4 font-mono text-[11px] leading-relaxed text-emerald-200">{payload}</pre>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-surface-border px-6 py-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            계속 작성
          </button>
          <button
            type="button"
            disabled={!adId.trim() || !password}
            onClick={() => setSubmitted(true)}
            className={clsx(
              'rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40',
              blocked ? 'bg-gray-900 hover:bg-gray-800' : 'bg-lg-red hover:bg-lg-red-mid'
            )}
          >
            {blocked ? 'DRAFTING으로 생성 (미리보기)' : 'Initiative 생성 (미리보기)'}
          </button>
        </footer>
      </div>
    </div>
  )
}
