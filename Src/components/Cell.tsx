import React, { useRef, useState, useEffect } from 'react'
import clsx from 'clsx'

type Props = {
    text: string
    markedBy: string[]
    onToggle: () => void
    isFree?: boolean
    color?: string // цвет ячейки от игрока
}

/**
 * Авто-подгон текста под размеры клетки.
 * - Переносит слова (word-break/break-word)
 * - Без line-clamp: текст всегда полностью виден
 * - Реагирует на ресайзы (ResizeObserver) и смену текста
 */
function AutoFitText({
    text,
    minPx = 10,
    maxPx,
}: {
    text: string
    minPx?: number
    /** upper bound; если не задан — выбирается от размера клетки */
    maxPx?: number
}) {
    const boxRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLDivElement>(null)
    const [fontSize, setFontSize] = useState<number | undefined>(undefined)

    useEffect(() => {
        const box = boxRef.current
        const el = textRef.current
        if (!box || !el) return

        const fit = () => {
            const boxW = box.clientWidth
            const boxH = box.clientHeight
            if (!boxW || !boxH) return

            // стартуем с процента от меньшей стороны клетки
            let size = Math.floor((Math.min(boxW, boxH) * 0.20)) // ~20% высоты клетки
            if (maxPx) size = Math.min(size, maxPx)
            size = Math.max(size, minPx)

            // грубая бинарка: ускоряет подбор
            let lo = minPx
            let hi = size
            const fits = () => el.scrollWidth <= boxW && el.scrollHeight <= boxH

            // временно задаём большой размер, чтобы измерять корректно
            el.style.fontSize = `${hi}px`
            if (!fits()) {
                // если даже стартовый не влазит — уменьшаем
                while (hi - lo > 1) {
                    const mid = Math.floor((lo + hi) / 2)
                    el.style.fontSize = `${mid}px`
                    if (fits()) lo = mid
                    else hi = mid
                }
                el.style.fontSize = `${lo}px`
                setFontSize(lo)
            } else {
                // пробуем увеличить до разумного предела
                let upper = Math.max(hi, minPx)
                let top = Math.max(upper, minPx)
                // ограничим верх, чтобы не бегать бесконечно
                const hardCap = Math.max(Math.floor(Math.min(boxW, boxH) * 0.35), upper)
                while (top <= hardCap) {
                    el.style.fontSize = `${top}px`
                    if (!fits()) { // перешли предел
                        el.style.fontSize = `${top - 1}px`
                        setFontSize(top - 1)
                        return
                    }
                    top += 1
                }
                setFontSize(top)
            }
        }

        // первый прогон после отрисовки
        fit()

        // реагируем на ресайз клетки
        const ro = new ResizeObserver(() => fit())
        ro.observe(box)

        // и на смену текста
        const mo = new MutationObserver(() => fit())
        mo.observe(el, { characterData: true, childList: true, subtree: true })

        // и на ресайз окна (на всякий)
        window.addEventListener('resize', fit)

        return () => {
            ro.disconnect()
            mo.disconnect()
            window.removeEventListener('resize', fit)
        }
    }, [text, minPx, maxPx])

    return (
        <div ref={boxRef} className="w-full h-full flex items-center justify-center text-center p-1">
            <div
                ref={textRef}
                style={{
                    fontSize: fontSize ? `${fontSize}px` : undefined,
                    lineHeight: 1.05,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                }}
                className="w-full"
            >
                {text}
            </div>
        </div>
    )
}

export default function Cell({ text, onToggle, isFree, color }: Props) {
    const display = isFree ? 'FREE' : text

    return (
        <button
            onClick={onToggle}
            // Цвет задаём инлайном, чтобы никакие классы его не перебили
            style={color ? { backgroundColor: color } : undefined}
            className={clsx(
                'aspect-square w-full rounded-xl p-2',
                'border border-neutral-700',
                'transition hover:opacity-90',
                !color && 'bg-neutral-800/50',
                isFree && 'ring-2 ring-amber-400'
            )}
            title={display}
        >
            {/* Контейнер для автофита: без line-clamp, текст всегда влезает */}
            <AutoFitText text={display} minPx={10} />
        </button>
    )
}
