import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 360, height: 480 })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile('out/renderer/index.html')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
