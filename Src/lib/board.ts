import type { Goal, GoalsPool } from '../types'
import { rng, shuffle } from './seed'

export function buildBoard(pool: GoalsPool, size: 3 | 4 | 5, seed: string, freeCenter: boolean) {
    const R = rng(seed)

    // Весовая лотерея: продублируем цели по weight (по умолчанию 1)
    const weighted: Goal[] = []
    for (const g of pool) {
        const w = Math.max(1, Math.floor(g.weight ?? 1))
        for (let i = 0; i < w; i++) weighted.push(g)
    }

    const uniqueById = new Map<string, Goal>()
    for (const g of shuffle(weighted, R)) {
        if (!uniqueById.has(g.id)) uniqueById.set(g.id, g)
        if (uniqueById.size >= size * size) break
    }

    let ids = Array.from(uniqueById.values()).map(g => g.id)

    // Free center для 5x5: пометим специальной целью '__FREE__'
    if (size === 5 && freeCenter) {
        const center = Math.floor((size * size) / 2)
        ids[center] = '__FREE__'
    }

    return ids
}