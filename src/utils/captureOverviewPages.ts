import type { OverviewDisplayRow } from '../types/modelScheduleOverview'
import OverviewScheduleTable from '../components/modelSchedule/OverviewScheduleTable'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'

export type CapturedPageImage = { page: number; data: string }

/** Page별 OverviewScheduleTable PNG 캡처 (html2canvas). */
export async function captureOverviewPageImages(
  pages: OverviewDisplayRow[][],
  dates: Date[],
  todayOff: number,
): Promise<CapturedPageImage[]> {
  if (!pages.length) return []

  const html2canvas = (await import('html2canvas')).default
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.position = 'fixed'
  host.style.left = '-12000px'
  host.style.top = '0'
  host.style.background = '#ffffff'
  host.style.padding = '8px'
  host.style.zIndex = '-1'
  document.body.appendChild(host)

  const images: CapturedPageImage[] = []

  try {
    for (let i = 0; i < pages.length; i++) {
      host.innerHTML = ''
      const mount = document.createElement('div')
      host.appendChild(mount)
      const root = createRoot(mount)
      root.render(
        createElement(OverviewScheduleTable, {
          displayRows: pages[i],
          dates,
          todayOff,
        }),
      )
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise((r) => setTimeout(r, 80))

      const canvas = await html2canvas(host, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      images.push({ page: i + 1, data })
      root.unmount()
    }
  } finally {
    host.remove()
  }

  return images
}
