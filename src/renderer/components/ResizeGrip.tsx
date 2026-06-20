import { useRef } from 'react'
import { api } from '../lib/ipc'

// Drag the bottom-right corner to resize the window. We track the pointer delta
// from where the drag started and push the absolute new content size to the
// main process (throttled to one update per frame).
export function ResizeGrip() {
  const raf = useRef(0)
  const pending = useRef<{ w: number; h: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.screenX
    const startY = e.screenY
    const startW = window.innerWidth
    const startH = window.innerHeight

    const flush = (): void => {
      raf.current = 0
      if (pending.current) {
        void api.setWindowSize(pending.current.w, pending.current.h)
        pending.current = null
      }
    }
    const move = (ev: PointerEvent): void => {
      pending.current = {
        w: startW + (ev.screenX - startX),
        h: startH + (ev.screenY - startY)
      }
      if (!raf.current) raf.current = requestAnimationFrame(flush)
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (raf.current) cancelAnimationFrame(raf.current)
      flush()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return <div className="resize-grip" title="Drag to resize" onPointerDown={onPointerDown} />
}
