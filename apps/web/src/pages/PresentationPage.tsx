import { useParams } from 'react-router-dom'
import { MessageSquare, Monitor } from 'lucide-react'

export function PresentationPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex h-full">
      {/* Chat panel — left */}
      <div className="flex w-1/2 flex-col border-r border-border">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Chat</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-center text-sm text-muted-foreground">
            Chat-driven slide generation coming in Phase 3.
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground/60">
            Presentation ID: {id}
          </p>
        </div>
      </div>

      {/* Preview panel — right */}
      <div className="flex w-1/2 flex-col">
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Preview</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center bg-muted/30 p-8">
          <Monitor className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-center text-sm text-muted-foreground">
            Live slide preview coming in Phase 3.
          </p>
        </div>
      </div>
    </div>
  )
}
