import { LogIn } from 'lucide-react'
import { api } from '../lib/ipc'

export function ReloginPrompt() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-sm text-zinc-300">Your Claude session expired.</div>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
        onClick={() => api.openLogin()}
      >
        <LogIn className="h-4 w-4" />
        Sign in again
      </button>
    </div>
  )
}
