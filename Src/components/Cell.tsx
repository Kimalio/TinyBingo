import React from 'react'
import clsx from 'clsx'

type Props = {
    text: string
    markedBy: string[]
    onToggle: () => void
    isFree?: boolean
    color?: string
    fontPx: number
}

export default function Cell({ text, onToggle, isFree, color, fontPx }: Props) {
    return (
        <button
            onClick={onToggle}
            style={color ? { backgroundColor: color } : undefined}
            className={clsx(
                'aspect-square w-full rounded-xl p-2',
                'border border-neutral-700',
                'transition hover:opacity-90',
                !color && 'bg-neutral-800/50',
                isFree && 'ring-2 ring-amber-400'
            )}
            title={text}
        >
            <div className="h-full w-full flex items-center justify-center text-center select-none">
                <div
                    className="bingo-cell-text flex items-center justify-center"
                    style={{
                        fontSize: `${fontPx}px`,
                        lineHeight: 1.15,
                        wordBreak: 'keep-all',
                        overflowWrap: 'normal',
                        hyphens: 'none',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {isFree ? 'FREE' : text}
                </div>
            </div>
        </button>
    )
}
