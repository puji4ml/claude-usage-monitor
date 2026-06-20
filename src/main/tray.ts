import { Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import type { UsageSnapshot } from '@shared/types'

export interface TrayActions {
  onShow: () => void
  onRefresh: () => void
  onQuit: () => void
}

export function createTray(actions: TrayActions): Tray {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Claude Usage Monitor')
  tray.on('click', () => actions.onShow())
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show usage', click: actions.onShow },
      { label: 'Refresh now', click: actions.onRefresh },
      { type: 'separator' },
      { label: 'Quit', click: actions.onQuit }
    ])
  )
  return tray
}

// Tray hover tooltip reflects the latest usage so a hover shows the numbers.
export function setTrayUsage(tray: Tray, snap: UsageSnapshot | null): void {
  if (!snap) {
    tray.setToolTip('Claude Usage Monitor')
    return
  }
  const s = Math.round(snap.session.usedPct)
  const w = Math.round(snap.weekly.usedPct)
  tray.setToolTip('Claude Usage   Session ' + s + '%   ·   Weekly ' + w + '%')
}
