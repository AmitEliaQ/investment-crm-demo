import { Loader2 } from 'lucide-react'

export function Spinner({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-12'}`}>
      <Loader2 className="size-7 animate-spin text-brand-500" aria-label="טוען" />
    </div>
  )
}
