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
    return (
        <div className="rounded-xl border border-neutral-700 p-3 space-y-2 min-w-[220px]">
            <div className="text-sm opacity-80">Log</div>
            <ul className="space-y-1 max-h-64 overflow-y-auto text-sm">
                {actions.map((a, idx) => (
                    <li key={idx} style={{ color: a.color || 'inherit' }}>
                        {a.playerName} закрыл «{a.cellText}» [{new Date(a.timestamp).toLocaleTimeString()}]
                    </li>
                ))}
            </ul>
        </div>
    )
}
