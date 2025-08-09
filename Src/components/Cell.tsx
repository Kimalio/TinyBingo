import React from 'react'
import clsx from 'clsx'

type Props = {
    text: string
    markedBy: string[]
    onToggle: () => void
    isFree?: boolean
    color?: string // ← цвет ячейки от игрока
}

export default function Cell({ text, onToggle, isFree, color }: Props) {
    return (
        <button
            onClick={onToggle}
            // Цвет задаём инлайном, чтобы никакие классы его не перебили
            style={color ? { backgroundColor: color } : undefined}
            className={clsx(
                'aspect-square w-full rounded-xl p-2 text-sm md:text-base',
                'border border-neutral-700',
                'transition hover:opacity-90',
                !color && 'bg-neutral-800/50',
                isFree && 'ring-2 ring-amber-400'
            )}
            title={text}
        >
            <div className="h-full w-full flex items-center justify-center text-center select-none">
                <span className="line-clamp-4">{isFree ? 'FREE' : text}</span>
            </div>
        </button>
    )
}
