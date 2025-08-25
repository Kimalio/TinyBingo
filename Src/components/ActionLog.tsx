import React from 'react'

export type Action = {
    playerName: string
    cellText: string
    timestamp: number
    color?: string
}

type Props = {
    actions: Action[]
}

export default function ActionLog({ actions }: Props) {
    const logRef = React.useRef<HTMLUListElement>(null)

    // Автоматическая прокрутка к последней записи
    React.useEffect(() => {
        if (logRef.current && actions.length > 0) {
            logRef.current.scrollTop = logRef.current.scrollHeight
        }
    }, [actions])

    return (
        <div className="rounded-xl border border-neutral-700 p-3 space-y-2 min-w-[220px]">
            <div className="text-sm opacity-80">История</div>
            <ul ref={logRef} className="space-y-1 max-h-64 overflow-y-auto text-sm">
                {actions.map((a, idx) => (
                    <li key={idx} style={{ color: a.color || 'inherit' }}>
                        {a.playerName} {a.cellText} [{new Date(a.timestamp).toLocaleTimeString()}]
                    </li>
                ))}
            </ul>
        </div>
    )
}
