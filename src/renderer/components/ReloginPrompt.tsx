import { api } from '../lib/ipc'

export function ReloginPrompt() {
  return (
    <div className="flex flex-col items-center gap-2 p-6 text-center">
      <div className="text-sm opacity-70">Your Claude session expired.</div>
      <button
        className="rounded-lg bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
        onClick={() => api.openLogin()}
      >
        Sign in again
      </button>
    </div>
  )
}
