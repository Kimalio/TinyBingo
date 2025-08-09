import seedrandom from 'seedrandom'

export function rng(seed: string) {
    const sr = seedrandom(String(seed))
    return () => sr.quick() // [0,1)
}

export function shuffle<T>(arr: T[], r = rng('default')): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}