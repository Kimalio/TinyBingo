import React, { useMemo, useRef, useState, useLayoutEffect, useCallback } from 'react'
import Cell from './Cell'

type Props = {
    size: 3 | 4 | 5
    board: string[]
    hits: Record<number, string[]>
    onToggle: (i: number) => void
    labelOf: (id: string) => string
    getColor?: (uids: string[]) => string | undefined
}

export default function Board({ size, board, hits, onToggle, labelOf, getColor }: Props) {
    const style = useMemo(() => ({
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
    }), [size])

    // общий размер шрифта для всех ячеек
    const [fontPx, setFontPx] = useState<number>(14)
    const gridRef = useRef<HTMLDivElement | null>(null)

    const textsKey = useMemo(() => board.map(labelOf).join('|'), [board, labelOf])

    const measureAndFit = useCallback(() => {
        const root = gridRef.current
        if (!root) return
        const els = Array.from(root.querySelectorAll<HTMLElement>('.bingo-cell-text'))
        if (els.length === 0) return

        // границы бинарного поиска
        let lo = 10   // минимально допустимый
        let hi = 18   // максимально желанный (можно подкрутить)
        const fitsWith = (px: number) => {
            for (const el of els) {
                el.style.fontSize = `${px}px`
            }
            // force reflow
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _ = els[0].offsetHeight

            // Проверяем и высоту, и ширину (чтобы длинные слова не вылезали)
            return els.every(el =>
                el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth
            )
        }

        // быстрый выход, если и "hi" влезает
        if (fitsWith(hi)) { setFontPx(hi); return }

        // бинарный поиск общего минимума, который влезает всем
        while (hi - lo > 0.5) {
            const mid = (hi + lo) / 2
            if (fitsWith(mid)) lo = mid
            else hi = mid
        }
        setFontPx(Math.floor(lo))
    }, [])

    useLayoutEffect(() => {
        measureAndFit()
    }, [measureAndFit, size, textsKey])

    useLayoutEffect(() => {
        const onResize = () => measureAndFit()
        window.addEventListener('resize', onResize)
        window.addEventListener('orientationchange', onResize)
        return () => {
            window.removeEventListener('resize', onResize)
            window.removeEventListener('orientationchange', onResize)
        }
    }, [measureAndFit])

    return (
        <div ref={gridRef} className="grid gap-2" style={style}>
            {board.map((id, i) => {
                const uids = hits[i] ?? []
                const color = typeof getColor === 'function' ? getColor(uids) : undefined

                return (
                    <Cell
                        key={i}
                        text={labelOf(id)}
                        markedBy={uids}
                        onToggle={() => onToggle(i)}
                        isFree={id === '__FREE__'}
                        color={color}
                        fontPx={fontPx}
                    />
                )
            })}
        </div>
    )
}
