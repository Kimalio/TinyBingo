import React from 'react'
import * as Y from 'yjs'
import TopBar from './components/TopBar'
import Board from './components/Board'
import PlayersPanel, { type Player } from './components/PlayersPanel'
import { initY } from './lib/y'
import { buildBoard } from './lib/board'
import type { GoalsPool, RoomSettings } from './types'
import './styles.css'
import goalsData from './data/goals.example.json'
import ActionLog, { type Action } from './components/ActionLog'

// Базовый префикс репозитория на GitHub Pages: /TinyBingo/
function getBase(): string {
    const segs = location.pathname.split('/').filter(Boolean)
    return segs.length ? `/${segs[0]}/` : '/'
}

function randomName() { return 'Tarnished-' + Math.floor(Math.random() * 10_000) }
function randomColor() {
    const hues = [0, 30, 60, 120, 180, 210, 240, 270, 300]
    const h = hues[Math.floor(Math.random() * hues.length)]
    return `hsl(${h} 70% 60%)`
}

export default function App() {
    // ===== Room =====
    // roomId — это последний сегмент после /TinyBingo/
    const roomId = React.useMemo(() => {
        const base = getBase()
        const segs = location.pathname.split('/').filter(Boolean)
        const tail = segs.length > 1 ? segs[segs.length - 1] : ''
        if (tail) return tail

        // комнаты нет → создаём и подставляем в URL с учётом base
        const rid = Math.random().toString(36).slice(2, 8)
        const newUrl = `${base}${rid}${location.search}${location.hash}`
        history.replaceState(null, '', newUrl)
        return rid
    }, [])

    // Yjs
    const { doc, provider, awareness, persist } = React.useMemo(() => initY(roomId), [roomId])

    // ===== Shared Yjs structures =====
    const yBoard = React.useMemo(() => doc.getArray<string>('board'), [doc])
    const yHits = React.useMemo(() => doc.getMap<Y.Array<string>>('hits'), [doc])
    const ySettings = React.useMemo(() => doc.getMap<any>('settings'), [doc])
    const yLog = React.useMemo(() => doc.getArray<Action>('log'), [doc])

    // ===== Local (not shared) =====
    const [pool, setPool] = React.useState<GoalsPool>([])
    const [labels, setLabels] = React.useState<Record<string, string>>({ '__FREE__': 'Free Space' })

    // ===== Log state =====
    const [actions, setActions] = React.useState<Action[]>([])
    React.useEffect(() => {
        const updateLog = () => setActions(yLog.toArray())
        updateLog()
        yLog.observe(updateLog)
        return () => yLog.unobserve(updateLog)
    }, [yLog])

    // ===== Load goals (local JSON) =====
    React.useEffect(() => {
        const dict: Record<string, string> = { '__FREE__': 'Free Space' }
            ; (goalsData as any[]).forEach((g: any) => { dict[g.id] = g.text })
        setLabels(dict)
        setPool(goalsData as any)
        // просто для подписи в футере
        doc.transact(() => { ySettings.set('goalsSource', 'goals.example.json') })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ===== Awareness: текущий игрок + назначение хоста =====
    React.useEffect(() => {
        let me = JSON.parse(localStorage.getItem('me') || 'null') as { uid: string; name: string; color?: string } | null
        if (!me) {
            me = { uid: crypto.randomUUID(), name: randomName() }
            localStorage.setItem('me', JSON.stringify(me))
        }

        // первый, кто зашёл в комнату, становится хостом
        doc.transact(() => {
            if (!ySettings.has('hostUid')) ySettings.set('hostUid', me!.uid)
        })
        const hostUid = (ySettings.get('hostUid') as string) || me.uid
        const iAmHost = hostUid === me.uid
        const color = iAmHost ? '#ef4444' : '#3b82f6'

        awareness.setLocalState({
            uid: me.uid,
            name: me.name || (iAmHost ? 'Host' : 'Player 2'),
            color,
            role: iAmHost ? 'host' : 'guest',
        })

        localStorage.setItem('me', JSON.stringify({ ...me, color }))
    }, [awareness, doc, ySettings])

    // ===== Host / Guest флаг (зависит от hostUid в ySettings) =====
    const [isHost, setIsHost] = React.useState(false)
    React.useEffect(() => {
        const update = () => {
            const me = awareness.getLocalState() as any
            const hostUid = (ySettings.get('hostUid') as string) || me?.uid
            setIsHost(!!me?.uid && hostUid === me.uid)
        }
        update()
        awareness.on('change', update)
        ySettings.observe(update)
        return () => {
            awareness.off('change', update)
            ySettings.unobserve(update)
        }
    }, [awareness, ySettings])

    // ===== Список игроков =====
    const [players, setPlayers] = React.useState<Player[]>([])
    React.useEffect(() => {
        const update = () => {
            const list: Player[] = Array.from(awareness.getStates().values())
                .filter(Boolean)
                .map((s: any) => ({
                    uid: s.uid,
                    name: s.name,
                    color: s.color,
                    role: s.role,
                }))
                .filter(p => !!p.uid)
            setPlayers(list)
        }
        update()
        awareness.on('change', update)
        return () => { awareness.off('change', update) }
    }, [awareness])

    // ===== Ререндер на изменения в Yjs =====
    const [, force] = React.useReducer(x => x + 1, 0)
    React.useEffect(() => {
        const rerender = () => force()
        yBoard.observe(rerender)
        ySettings.observe(rerender)
        // @ts-ignore — ловим изменения внутри Y.Array в hits
        yHits.observeDeep(rerender)
        return () => {
            yBoard.unobserve(rerender)
            ySettings.unobserve(rerender)
            // @ts-ignore
            yHits.unobserveDeep(rerender)
        }
    }, [yBoard, ySettings, yHits])

    // ===== Настройки по умолчанию =====
    React.useEffect(() => {
        if (!ySettings.has('seed')) ySettings.set('seed', Math.random().toString(36).slice(2, 8))
        if (!ySettings.has('size')) ySettings.set('size', 5)
        if (!ySettings.has('freeCenter')) ySettings.set('freeCenter', false)
        if (!ySettings.has('mode')) ySettings.set('mode', 'standard')
    }, [ySettings])

    const settings: RoomSettings = {
        size: (ySettings.get('size') as 3 | 4 | 5) ?? 5,
        seed: (ySettings.get('seed') as string) ?? 'seed',
        freeCenter: (ySettings.get('freeCenter') as boolean) ?? true,
        mode: (ySettings.get('mode') as 'standard' | 'blackout') ?? 'standard',
        goalsSource: (ySettings.get('goalsSource') as string) ?? undefined,
    }

    // ===== Генерация/перегенерация (только хост) =====
    function regenerate() {
        const me = awareness.getLocalState() as any
        const hostUid = ySettings.get('hostUid') as string
        const amHost = !!me?.uid && me.uid === hostUid
        if (!amHost) return

        const ids = buildBoard(pool, settings.size, settings.seed, /*freeCenter*/ false)

        doc.transact(() => {
            yBoard.delete(0, yBoard.length)
            yBoard.insert(0, ids)
            // очистить отметки
            Array.from(yHits.keys()).forEach(k => yHits.delete(k))
            // очистить лог
            yLog.delete(0, yLog.length)
            // пометить, что доска инициализирована
            ySettings.set('initialized', true)
        })
    }

    // ===== Первая загрузка =====
    // Только хост создаёт доску, гость ничего не генерирует.
    React.useEffect(() => {
        let cancelled = false
        persist.whenSynced.then(() => {
            if (cancelled) return
            if (!isHost) return
            if (yBoard.length === 0 && pool.length > 0) {
                regenerate()
            }
        })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [persist, yBoard, pool, isHost])

    // ===== Изменение настроек (только хост) =====
    function patchSettings(patch: Partial<RoomSettings>) {
        if (!isHost) return
        doc.transact(() => {
            for (const [k, v] of Object.entries(patch)) ySettings.set(k, v as any)
        })
    }

    // ===== Тоггл клетки + лог (гостю можно) =====
    function toggleCell(i: number) {
        let me = awareness.getLocalState() as any
        if (!me?.uid) {
            me = { uid: crypto.randomUUID(), name: randomName(), color: randomColor() }
            awareness.setLocalState(me)
        }

        const key = String(i)
        let arr = yHits.get(key) as Y.Array<string> | undefined
        if (!arr) {
            arr = new Y.Array<string>()
            yHits.set(key, arr)
        }

        const list = arr.toArray()
        const idx = list.indexOf(me.uid)
        const goalName = labelOf(yBoard.get(i))

        doc.transact(() => {
            if (idx >= 0) {
                arr!.delete(idx, 1)
                yLog.push([{
                    playerName: me.name,
                    cellText: `снял отметку с «${goalName}»`,
                    timestamp: Date.now(),
                    color: me.color,
                }])
            } else {
                arr!.push([me.uid])
                yLog.push([{
                    playerName: me.name,
                    cellText: `отметил «${goalName}»`,
                    timestamp: Date.now(),
                    color: me.color,
                }])
            }
        })
    }

    // ===== Hits map =====
    const hits: Record<number, string[]> = {}
    yHits.forEach((arr, k) => {
        hits[Number(k)] = (arr as Y.Array<string>).toArray()
    })

    // ===== Helpers =====
    function labelOf(id: string) { return labels[id] ?? id }
    function getColor(uids: string[]) {
        if (!uids.length) return undefined
        const firstUid = uids[0]
        const state = Array.from(awareness.getStates().values())
            .find(s => s?.uid === firstUid)
        return state?.color as string | undefined
    }

    // ===== Room selector (только хост) =====
    const [roomInput, setRoomInput] = React.useState('')
    React.useEffect(() => { setRoomInput(roomId) }, [roomId])

    function goToRoom() {
        if (!isHost) return
        const base = getBase()
        const clean = roomInput.trim().replace(/\s+/g, '-').toLowerCase()
        if (!clean) return
        location.href = `${base}${clean}`
    }

    // ===== Invite link (только хост) =====
    function makeInviteUrl(): string {
        const base = getBase()
        const url = `${location.origin}${base}${roomId}?guest=1`
        return url
    }
    async function copyInvite() {
        try {
            await navigator.clipboard.writeText(makeInviteUrl())
            alert('Ссылка для гостя скопирована!')
        } catch {
            prompt('Скопируйте ссылку вручную:', makeInviteUrl())
        }
    }

    // peers (включая себя, если локальное состояние выставлено)
    const peersIncludingMe = awareness.getStates().size || 0

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold">Elden Ring Bingo</h1>

            {isHost ? (
                <>
                    <TopBar
                        settings={settings}
                        onChange={patchSettings}
                        onRegenerate={regenerate}
                        showLoaders={false}
                    />
                    {/* Пригласить гостя */}
                    <div className="rounded-xl border border-neutral-700 p-3 flex items-center gap-2">
                        <input
                            readOnly
                            value={makeInviteUrl()}
                            className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
                        />
                        <button
                            onClick={copyInvite}
                            className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm"
                            title="Скопировать ссылку"
                        >
                            Пригласить
                        </button>
                    </div>
                </>
            ) : (
                <div className="rounded-xl border border-neutral-700 p-3 text-sm opacity-80">
                    Вы гость — можете отмечать клетки. Генерация доступна только хозяину комнаты.
                </div>
            )}

            <div className="flex gap-4">
                <div className="flex-1">
                    <Board
                        size={settings.size}
                        board={yBoard.toArray()}
                        hits={hits}
                        onToggle={toggleCell}
                        labelOf={labelOf}
                        getColor={getColor}
                    />
                </div>

                <div className="w-64 flex flex-col gap-4">
                    {/* Имя игрока */}
                    <div className="rounded-xl border border-neutral-700 p-3">
                        <div className="text-sm opacity-80 mb-2">Имя игрока</div>
                        <input
                            type="text"
                            value={(awareness.getLocalState() as any)?.name ?? ''}
                            onChange={(e) => {
                                const me = awareness.getLocalState() as any
                                if (!me) return
                                const updated = { ...me, name: e.target.value }
                                awareness.setLocalState(updated)
                                localStorage.setItem('me', JSON.stringify({
                                    uid: updated.uid,
                                    name: updated.name,
                                    color: updated.color,
                                }))
                            }}
                            className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
                            placeholder="Погасший"
                            maxLength={24}
                        />
                    </div>

                    {/* Комната — только для хоста */}
                    {isHost && (
                        <div className="rounded-xl border border-neutral-700 p-3">
                            <div className="text-sm opacity-80 mb-2">Комната</div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={roomInput}
                                    onChange={(e) => setRoomInput(e.target.value)}
                                    className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
                                    placeholder="введите имя комнаты"
                                    maxLength={32}
                                />
                                <button
                                    onClick={goToRoom}
                                    className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm"
                                    title="Перейти в комнату"
                                >
                                    Перейти
                                </button>
                            </div>
                        </div>
                    )}

                    <PlayersPanel players={players} />
                    <ActionLog actions={actions} />
                </div>
            </div>

            <footer className="text-xs opacity-70 pt-4">
                Room: {roomId} • Peers (incl. me): {peersIncludingMe} •
                Source: {settings.goalsSource ?? '—'}
            </footer>
        </div>
    )
}
