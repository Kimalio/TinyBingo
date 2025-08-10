import React from 'react'

type Props = {
    text: string
    /** верхняя граница для шрифта, px (по умолчанию 18) */
    max?: number
    /** нижняя граница для шрифта, px (по умолчанию 10) */
    min?: number
    /** шаг подбора, px (по умолчанию 1) */
    step?: number
    className?: string
}

/**
 * Уменьшает font-size, пока текст целиком не влезет в контейнер (и по ширине, и по высоте).
 * Использует ResizeObserver, реагирует на изменение текста и размеров клетки.
 */
export default function AutoFitText({ text, max = 18, min = 10, step = 1, className }: Props) {
    const boxRef = React.useRef<HTMLDivElement | null>(null)
    const spanRef = React.useRef<HTMLSpanElement | null>(null)
    const [size, setSize] = React.useState(max)

    const fit = React.useCallback(() => {
        const box = boxRef.current
        const span = spanRef.current
        if (!box || !span) return

        // бинарный поиск по размеру шрифта
        let lo = min, hi = max, best = min
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2)
            span.style.fontSize = `${mid}px`

            // даем браузеру дорисовать

            const fits = span.scrollWidth <= box.clientWidth && span.scrollHeight <= box.clientHeight
            if (fits) { best = mid; lo = mid + step } else { hi = mid - step }
        }
        setSize(best)
    }, [max, min, step, text])

    // пересчёт при изменении текста
    React.useEffect(() => { fit() }, [text, fit])

    // пересчёт при ресайзе контейнера
    React.useEffect(() => {
        const box = boxRef.current
        if (!box) return
        const ro = new ResizeObserver(() => fit())
        ro.observe(box)
        return () => ro.disconnect()
    }, [fit])

    return (
        <div
            ref={boxRef}
            className={className}
            style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                padding: '8px',            // отступы тоже учитываются при fit
            }}
        >
            <span
                ref={spanRef}
                style={{
                    fontSize: `${size}px`,
                    lineHeight: 1.15,
                    // важные фичи для «длинных» слов/русского:
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    hyphens: 'auto' as any,
                    display: 'inline-block',
                }}
            >
                {text}
            </span>
        </div>
    )
}
