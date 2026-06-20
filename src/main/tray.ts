import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'

export function createTray(
  panel: BrowserWindow,
  onRefresh: () => void,
  onQuit: () => void
): Tray {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Claude Usage Monitor')
  tray.on('click', () => {
    if (panel.isVisible()) {
      panel.hide()
      return
    }
    const { x, y } = tray.getBounds()
    const { width } = panel.getBounds()
    panel.setPosition(Math.round(x - width / 2), Math.round(y + 8))
    panel.show()
  })
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Refresh now', click: onRefresh },
      { type: 'separator' },
      { label: 'Quit', click: onQuit }
    ])
  )
  return tray
}
