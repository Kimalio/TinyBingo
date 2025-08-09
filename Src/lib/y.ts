import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'

export type YContext = {
    doc: Y.Doc
    provider: WebsocketProvider
    awareness: Awareness
    persist: IndexeddbPersistence
}

// Кешируем инстансы, чтобы не плодить документы при повторных initY
const cache: Map<string, YContext> =
    (window as any).__YCTX__ ?? ((window as any).__YCTX__ = new Map())

export function initY(roomId: string): YContext {
    // ЕДИНЫЙ ключ комнаты для сети — НИЧЕГО кроме самого roomId!
    // Внутри добавим префикс, чтобы наш трафик не пересекался с чужим.
    const ROOM = `elden-bingo-${roomId}`

    const fromCache = cache.get(ROOM)
    if (fromCache) return fromCache

    const doc = new Y.Doc()
    const awareness = new Awareness(doc)

    // 1) Локальный офлайн-кеш
    const persist = new IndexeddbPersistence(ROOM, doc)

    // 2) Основной транспорт — WebSocket (работает между разными браузерами/устройствами)
    const provider = new WebsocketProvider('wss://demos.yjs.dev', ROOM, doc, { awareness })

    // 3) Локальная синхронизация между вкладками одного браузера
    const bc = new BroadcastChannel(ROOM)
    bc.onmessage = (ev) => { try { Y.applyUpdate(doc, ev.data) } catch { } }
    doc.on('update', (update: Uint8Array) => { try { bc.postMessage(update) } catch { } })

    const ctx: YContext = { doc, provider, awareness, persist }
    cache.set(ROOM, ctx)
    return ctx
}
