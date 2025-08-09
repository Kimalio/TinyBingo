import React, { useMemo } from 'react'
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

    return (
        <div className="grid gap-2" style={style}>
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
                    />
                )
            })}
        </div>
    )
}
