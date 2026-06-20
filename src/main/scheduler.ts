type Tick = () => void
let timer: ReturnType<typeof setInterval> | null = null

export function startScheduler(minutes: number, onTick: Tick): void {
  stopScheduler()
  timer = setInterval(onTick, Math.max(1, minutes) * 60 * 1000)
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
