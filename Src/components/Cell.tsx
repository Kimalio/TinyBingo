import React from 'react'
import clsx from 'clsx'

type Props = {
    text: string
    markedBy: string[]
    onToggle?: () => void
    isFree?: boolean
    color?: string
    fontPx: number        // общий размер шрифта, приходит из Board
    disabled?: boolean // новый проп
}

export default function Cell({ text, onToggle, isFree, color, fontPx, disabled }: Props) {
    return (
        <button
            onClick={disabled ? undefined : onToggle}
            disabled={disabled}
            aria-disabled={disabled}
            style={color ? { backgroundColor: color } : undefined}
            className={clsx(
                'aspect-square w-full rounded-xl p-2',
                'border border-neutral-700',
                'transition',
                !color && 'bg-neutral-800/50',
                isFree && 'ring-2 ring-amber-400',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={disabled ? 'В режиме PvE гости не могут отмечать клетки' : text}
        >
            {/* Обертка на всю ячейку: настоящий вертикальный + горизонтальный центр через grid */}
            <div className="h-full w-full grid place-items-center text-center select-none">
                {/* Сам текст: без фиксированной высоты! */}
                <div
                    className="bingo-cell-text"
                    style={{
                        fontSize: `${fontPx}px`,
                        lineHeight: 1.15,

                        // Не разрывать слова и не переносить по слогам
                        wordBreak: 'keep-all',
                        overflowWrap: 'normal',
                        hyphens: 'none',
                        whiteSpace: 'normal',

                        // Обрезка по 4 строкам с многоточием
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',

                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                >
                    {isFree ? 'FREE' : text}
                </div>
            </div>
        </button>
    )
}
