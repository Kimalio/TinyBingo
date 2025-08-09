import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

export function initY(roomId: string) {
    const doc = new Y.Doc()

    // Подключаемся к твоему WebSocket-серверу на Render
    const provider = new WebsocketProvider(
        'wss://tinybingo-ws-1.onrender.com', // сервер
        `elden-bingo-${roomId}`,           // имя комнаты
        doc
    )

    // Немного логов для отладки подключения
    provider.on('status', (e: any) => {
        console.log('[y-websocket] status:', e?.status) // 'connected' | 'disconnected'
    })
    provider.on('connection-close', () => console.log('[y-websocket] connection-close'))
    provider.on('connection-error', (err: any) => console.warn('[y-websocket] error', err))

    const awareness = provider.awareness
    const persist = new IndexeddbPersistence(`elden-bingo-${roomId}`, doc)

    return { doc, provider, awareness, persist }
}
