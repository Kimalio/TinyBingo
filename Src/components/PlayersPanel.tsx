import React from 'react'

export type Player = {
    uid: string
    name: string
    color?: string
    role?: 'host' | 'guest'
}

type Props = {
    players: Player[]
}

export default function PlayersPanel({ players }: Props) {
    return (
        <div className="rounded-xl border border-neutral-700 p-3 space-y-2 min-w-[220px]">
            <div className="text-sm opacity-80">Игроки</div>
            <ul className="space-y-1">
                {players.map(p => (
                    <li key={p.uid} className="flex items-center gap-2">
                        <span
                            className="inline-block w-3 h-3 rounded-full border border-neutral-600"
                            style={p.color ? { backgroundColor: p.color } : undefined}
                            title={p.color}
                        />
                        <span className="text-sm">{p.name}</span>
                        {p.role === 'host' && (
                            <span className="text-[10px] px-1 py-[1px] rounded bg-neutral-800 border border-neutral-700 ml-1">
                                host
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}
