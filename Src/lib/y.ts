import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'

export type YContext = {
    doc: Y.Doc
    provider: WebrtcProvider // оставим для совместимости
    awareness: Awareness
    persist: IndexeddbPersistence
}

const cache: Map<string, YContext> =
    (window as any).__YCTX__ ?? ((window as any).__YCTX__ = new Map())

export function initY(roomId: string): YContext {
    const ROOM = `elden-bingo-${roomId}`

    const existing = cache.get(ROOM)
    if (existing) return existing

    const doc = new Y.Doc()

    // ===== Offline cache (IndexedDB) =====
    const persist = new IndexeddbPersistence(ROOM, doc)

    // ===== WebRTC =====
    const provider = new WebrtcProvider(ROOM, doc, {
        signaling: ['wss://signaling.yjs.dev'],
        maxConns: 20,
        filterBcConns: true,
        awareness: new Awareness(doc),
    })

    // ===== WebSocket (для синка между браузерами/устройствами) =====
    const ws = new WebsocketProvider('wss://demos.yjs.dev', ROOM, doc)
    ws.awareness.setLocalStateField('synced', true)

    // ===== Локальная синхронизация между вкладками =====
    const bc = new BroadcastChannel(ROOM)
    bc.onmessage = (event) => {
        try {
            Y.applyUpdate(doc, event.data)
        } catch { }
    }
    doc.on('update', (update: Uint8Array) => {
        try {
            bc.postMessage(update)
        } catch { }
    })

    const ctx: YContext = {
        doc,
        provider,
        awareness: provider.awareness,
        persist, // теперь persist доступен в App
    }
    cache.set(ROOM, ctx)
    return ctx
}
