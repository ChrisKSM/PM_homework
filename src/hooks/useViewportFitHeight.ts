import { useLayoutEffect, useRef, useState } from 'react'

/**
 * 요소 상단(페이지 스크롤 0 기준)부터 뷰포트 하단까지 남은 높이.
 * 내부 스크롤 컨테이너의 maxHeight 로 쓰면 가로/세로 스크롤바가 현재 화면 안에 보인다.
 */
export function useViewportFitHeight<T extends HTMLElement>(bottomGap = 48, minHeight = 320) {
  const ref = useRef<T | null>(null)
  const [height, setHeight] = useState<number>()

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const next = Math.max(minHeight, Math.floor(window.innerHeight - top - bottomGap))
      setHeight((prev) => (prev === next ? prev : next))
    }
    measure()
    window.addEventListener('resize', measure)
    // 툴바 줄바꿈·안내 문구 표시 등으로 위쪽 높이가 바뀔 때
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [bottomGap, minHeight])

  return [ref, height] as const
}
