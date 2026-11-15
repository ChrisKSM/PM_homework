import { AlertTriangle } from 'lucide-react'
import { resolveApiBaseUrl } from '../../api/client'

export default function JiraDegradedBanner() {
  const diagnoseUrl = `${resolveApiBaseUrl()}/jira/diagnose`

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[11px] text-amber-900">
      <p className="font-semibold flex items-center gap-1.5">
        <AlertTriangle size={14} />
        Jira BE 연결 실패 — 샘플(mock) 데이터를 표시 중입니다
      </p>
      <p className="mt-1 text-amber-800">
        be-audio-test pod에서 <code className="text-[10px]">JIRA_API_TOKEN</code> 확인 후 uvicorn 재시작이
        필요합니다.
      </p>
      <p className="mt-2 text-gray-600">
        진단:{' '}
        <a href={diagnoseUrl} target="_blank" rel="noreferrer" className="underline text-amber-900">
          {diagnoseUrl}
        </a>
      </p>
      <p className="mt-1 text-gray-500">BE pod: sh scripts/apply-jira-be-fix.sh → sh scripts/verify-jira-be.sh</p>
    </div>
  )
}
