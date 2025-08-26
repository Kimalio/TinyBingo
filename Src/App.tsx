import React, { useState, useRef } from 'react'
import * as Y from 'yjs'
import TopBar from './components/TopBar'
import Board from './components/Board'
import PlayersPanel, { type Player } from './components/PlayersPanel'
import { initY } from './lib/y'
import { buildBoard } from './lib/board'
import type { GoalsPool, RoomSettings, GameTimerState, GameStage } from './types'
import './styles.css'
import goalsData from './data/goals.example.json'
import ActionLog, { type Action } from './components/ActionLog'

// адрес HTTP для пинания сервера
const WS_HTTP = 'https://tinybingo-ws-1.onrender.com';

// GH Pages base (/TinyBingo/)
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
    // ===== режим из URL =====
    const params = new URLSearchParams(location.search)
    const isGuestFromUrl = params.get('guest') === '1'

    // ===== roomId — последний сегмент после /TinyBingo/ =====
    const roomId = React.useMemo(() => {
        const base = getBase()
        const segs = location.pathname.split('/').filter(Boolean)
        const tail = segs.length > 1 ? segs[segs.length - 1] : ''
        if (tail) return tail
        const rid = Math.random().toString(36).slice(2, 8)
        history.replaceState(null, '', `${base}${rid}${location.search}${location.hash}`)
        return rid
    }, [])

    // ===== Yjs =====
    const { doc, provider, awareness, persist } = React.useMemo(() => initY(roomId), [roomId])

    const yBoard = React.useMemo(() => doc.getArray<string>('board'), [doc])
    const yHits = React.useMemo(() => doc.getMap<Y.Array<string>>('hits'), [doc])
    const ySettings = React.useMemo(() => doc.getMap<any>('settings'), [doc])
    const yLog = React.useMemo(() => doc.getArray<Action>('log'), [doc])
    const yTimer = React.useMemo(() => doc.getMap<any>('timer'), [doc])

    // ===== локальные данные целей/лейблов =====
    const [pool, setPool] = React.useState<GoalsPool>([])
    const [labels, setLabels] = React.useState<Record<string, string>>({ '__FREE__': 'Free Space' })

    // ===== лог действий =====
    const [actions, setActions] = React.useState<Action[]>([])
    React.useEffect(() => {
        const update = () => setActions(yLog.toArray())
        update()
        yLog.observe(update)
        return () => yLog.unobserve(update)
    }, [yLog])

    // ===== UI для выбора seed =====
    const [showSeedDialog, setShowSeedDialog] = useState(false);
    const [pendingSeed, setPendingSeed] = useState('');

    // ===== ручной выбор комнаты — только хост =====
    const [roomInput, setRoomInput] = React.useState('')

    // ===== локальный стейт таймера =====
    const [gameTimer, setGameTimer] = React.useState<GameTimerState | null>(null);

    // ===== PvE бот =====
    const botTimerRef = useRef<number | null>(null);

    // ===== вычисляемые переменные (должны быть после всех useState) =====
    const isGuest = (awareness.getLocalState() as any)?.role === 'guest';
    const gameMode = (ySettings.get('gameMode') as 'pvp' | 'pve') ?? 'pvp';
    const guestBlocked = gameMode === 'pve' && isGuest;

    // ===== локальный стейт таймера =====
    React.useEffect(() => {
        const update = () => {
            const t = {
                stage: yTimer.get('stage') as GameStage || 'create',
                timerValue: yTimer.get('timerValue') ?? 0,
                timerRunning: yTimer.get('timerRunning') ?? false,
                startedAt: yTimer.get('startedAt') ?? undefined,
            };
            setGameTimer(t);
        };
        update();
        yTimer.observe(update);
        return () => yTimer.unobserve(update);
    }, [yTimer]);

    // Таймер уменьшения каждую секунду
    React.useEffect(() => {
        if (!gameTimer?.timerRunning || gameTimer.stage === 'finished') return;

        const interval = setInterval(() => {
            if (gameTimer.stage === 'play') {
                // Для этапа "игра" - таймер идёт вперёд от 0
                setTimerState({ timerValue: (gameTimer.timerValue || 0) + 1 });
            } else {
                // Для других этапов - таймер идёт назад к 0
                if (gameTimer.timerValue > 0) {
                    setTimerState({ timerValue: Math.max(0, (gameTimer.timerValue || 0) - 1) });
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [gameTimer?.timerRunning, gameTimer?.timerValue, gameTimer?.stage]);

    // ===== локальные данные целей/лейблов =====
    React.useEffect(() => {
        const dict: Record<string, string> = { '__FREE__': 'Free Space' }
            ; (goalsData as any[]).forEach((g: any) => { dict[g.id] = g.text })
        setLabels(dict)
        setPool(goalsData as any)
        doc.transact(() => { ySettings.set('goalsSource', 'goals.example.json') })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ===== отслеживание изменений источника целей =====
    React.useEffect(() => {
        if (!ySettings) return;

        const goalsSourceType = ySettings.get('goalsSourceType') as 'local' | 'sheets';
        console.log('Источник целей изменился на:', goalsSourceType);

        if (goalsSourceType === 'sheets') {
            // Загружаем цели из Google Sheets CSV
            const loadFromSheets = async () => {
                try {
                    console.log('Загружаем цели из Google Sheets...');
                    const csvUrl = 'https://docs.google.com/spreadsheets/d/1anPHlA1wtAiXUKMHcKKbTa5Cp-qWQY1O9xj-bNPCzls/gviz/tq?tqx=out:csv&sheet=Tasks';
                    const response = await fetch(csvUrl);
                    const csvText = await response.text();

                    // Парсим CSV
                    const lines = csvText.split('\n').filter(line => line.trim());
                    const goals = lines.slice(1).map((line, index) => {
                        const [id, text] = line.split(',').map(field => field.trim().replace(/"/g, ''));
                        return {
                            id: id || `T${String(index + 1).padStart(3, '0')}`,
                            text: text || `Цель ${index + 1}`,
                            weight: 1
                        };
                    });

                    console.log(`Загружено ${goals.length} целей из CSV`);
                    const dict: Record<string, string> = { '__FREE__': 'Free Space' };
                    goals.forEach((g: any) => { dict[g.id] = g.text });

                    setLabels(dict);
                    setPool(goals);
                    doc.transact(() => {
                        ySettings.set('goalsSource', 'Google Sheets CSV');
                    });
                } catch (error) {
                    console.error('Ошибка загрузки CSV:', error);
                    // Fallback к локальным данным
                    const dict: Record<string, string> = { '__FREE__': 'Free Space' };
                    (goalsData as any[]).forEach((g: any) => { dict[g.id] = g.text });
                    setLabels(dict);
                    setPool(goalsData as any);
                    doc.transact(() => {
                        ySettings.set('goalsSource', 'goals.example.json (fallback)');
                        ySettings.set('goalsSourceType', 'local');
                    });
                }
            };

            loadFromSheets();
        } else if (goalsSourceType === 'local') {
            console.log('Загружаем локальные цели...');
            // Локальные данные
            const dict: Record<string, string> = { '__FREE__': 'Free Space' };
            (goalsData as any[]).forEach((g: any) => { dict[g.id] = g.text });
            setLabels(dict);
            setPool(goalsData as any);
            doc.transact(() => {
                ySettings.set('goalsSource', 'goals.example.json');
            });
        }
    }, [ySettings, doc, goalsData, ySettings.get('goalsSourceType')])

    // ===== инициализация таймера при первом запуске =====
    React.useEffect(() => {
        const me = awareness.getLocalState() as any
        const hostUid = ySettings.get('hostUid') as string
        const amHost = !!me?.uid && me.uid === hostUid

        // Просто инициализируем таймер, как для этапа 'plan'
        if (amHost && !yTimer.has('stage')) {
            // Добавляем небольшую задержку для полной инициализации yTimer
            setTimeout(() => {
                if (!yTimer.has('stage')) {
                    nextStage('create', 3 * 60); // 3 минуты на создание персонажа
                }
            }, 500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [awareness, ySettings, yTimer]);

    // ===== awareness: игрок + роли/цвета с учётом ?guest=1 =====
    React.useEffect(() => {
        let me = JSON.parse(localStorage.getItem('me') || 'null') as { uid: string; name: string; color?: string } | null
        if (!me) {
            me = { uid: crypto.randomUUID(), name: randomName() }
            localStorage.setItem('me', JSON.stringify(me))
        }

        // первый НЕ гость ставит hostUid
        doc.transact(() => {
            if (!isGuestFromUrl && !ySettings.has('hostUid')) ySettings.set('hostUid', me!.uid)
        })

        const hostUid = (ySettings.get('hostUid') as string) || me.uid
        const iAmHost = !isGuestFromUrl && hostUid === me.uid
        const color = iAmHost ? '#ef4444' : '#3b82f6'

        awareness.setLocalState({
            uid: me.uid,
            name: me.name || (iAmHost ? 'Host' : 'Player'),
            color,
            role: iAmHost ? 'host' : 'guest',
        })

        localStorage.setItem('me', JSON.stringify({ ...me, color }))
    }, [awareness, doc, ySettings, isGuestFromUrl])

    // === NEW: корректно убираем себя из awareness при закрытии/перезагрузке ===
    React.useEffect(() => {
        const sayBye = () => {
            try { awareness.setLocalState(null) } catch { }
        }
        window.addEventListener('beforeunload', sayBye)
        window.addEventListener('pagehide', sayBye) // safari/ios

        return () => {
            window.removeEventListener('beforeunload', sayBye)
            window.removeEventListener('pagehide', sayBye)
            sayBye()
        }
    }, [awareness])

    // ===== признак "я — хост" (реактивно) =====
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

    // ===== список игроков =====
    const [players, setPlayers] = React.useState<Player[]>([])
    React.useEffect(() => {
        const update = () => {
            const byUid = new Map<string, Player>()
                ; (awareness.getStates() as Map<number, any>).forEach((s) => {
                    if (s?.uid) byUid.set(s.uid, {
                        uid: s.uid, name: s.name, color: s.color, role: s.role
                    })
                })

            // Добавляем бота в PvE
            if (gameMode === 'pve' && !byUid.has('bot')) {
                byUid.set('bot', { uid: 'bot', name: settings.botName || 'Bot', color: '#3b82f6', role: 'guest' })
            }

            setPlayers(Array.from(byUid.values()))
        }
        update()
        awareness.on('change', update)
        ySettings.observe(update)
        return () => {
            awareness.off('change', update)
            ySettings.unobserve(update)
        }
    }, [awareness, ySettings, gameMode])

    // ===== перерисовка на изменения Yjs =====
    const [, force] = React.useReducer(x => x + 1, 0)
    React.useEffect(() => {
        const rerender = () => force()
        yBoard.observe(rerender)
        ySettings.observe(rerender)
        // @ts-ignore
        yHits.observeDeep(rerender)
        return () => {
            yBoard.unobserve(rerender)
            ySettings.unobserve(rerender)
            // @ts-ignore
            yHits.unobserveDeep(rerender)
        }
    }, [yBoard, ySettings, yHits])

    // ===== настройки по умолчанию =====
    React.useEffect(() => {
        if (!ySettings.has('size')) ySettings.set('size', 5)
        if (!ySettings.has('seed')) ySettings.set('seed', 'seed')
        if (!ySettings.has('freeCenter')) ySettings.set('freeCenter', true)
        if (!ySettings.has('mode')) ySettings.set('mode', 'standard')
        if (!ySettings.has('goalsSourceType')) ySettings.set('goalsSourceType', 'sheets')
        if (!ySettings.has('botMode')) ySettings.set('botMode', 'medium')
    }, [ySettings])

    const settings: RoomSettings = {
        size: (ySettings.get('size') as 3 | 4 | 5) ?? 5,
        seed: (ySettings.get('seed') as string) ?? 'seed',
        freeCenter: (ySettings.get('freeCenter') as boolean) ?? true,
        mode: (ySettings.get('mode') as 'standard' | 'blackout') ?? 'standard',
        goalsSource: (ySettings.get('goalsSource') as string) ?? undefined,
        goalsSourceType: (ySettings.get('goalsSourceType') as 'local' | 'sheets') ?? 'sheets',
        gameMode: (ySettings.get('gameMode') as 'pvp' | 'pve') ?? 'pvp',
        botMode: (ySettings.get('botMode') as 'test' | 'easy' | 'medium' | 'hard') ?? 'easy',
        botName: (ySettings.get('botName') as string) ?? undefined,
    }

    // ===== функции управления таймером и этапами (заглушки) =====
    function setTimerState(patch: Partial<GameTimerState>) {
        doc.transact(() => {
            for (const [k, v] of Object.entries(patch)) {
                yTimer.set(k, v);
            }
        });
    }
    function startTimer() { setTimerState({ timerRunning: true, startedAt: Date.now() }); }
    function pauseTimer() { setTimerState({ timerRunning: false }); }
    function nextStage(stage: GameStage, timerValue: number) {
        setTimerState({
            stage,
            timerValue,
            timerRunning: false,
            startedAt: undefined
        });
    }

    // ===== генерация — только хост =====
    function regenerate() {
        const me = awareness.getLocalState() as any
        const hostUid = ySettings.get('hostUid') as string
        const amHost = !!me?.uid && me.uid === hostUid
        if (!amHost) return

        const ids = buildBoard(pool, settings.size, settings.seed, false)
        doc.transact(() => {
            yBoard.delete(0, yBoard.length)
            yBoard.insert(0, ids)
            Array.from(yHits.keys()).forEach(k => yHits.delete(k))
            yLog.delete(0, yLog.length)
            ySettings.set('initialized', true)
        })
    }

    // ===== первая загрузка: только хост генерит, гость ждёт =====
    React.useEffect(() => {
        let cancelled = false
        persist.whenSynced.then(() => {
            if (cancelled) return
            if (!isHost) return
            if (yBoard.length === 0 && pool.length > 0) regenerate()

            // Инициализируем таймер после полной синхронизации
            if (!yTimer.has('stage')) {
                nextStage('create', 3 * 60); // 3 минуты на создание персонажа
            }
        })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [persist, yBoard, pool, isHost, yTimer])

    // ===== изменение настроек — только хост =====
    function patchSettings(patch: Partial<RoomSettings>) {
        if (!isHost) return
        doc.transact(() => {
            for (const [k, v] of Object.entries(patch)) ySettings.set(k, v as any)
        })
    }

    // ===== клик по клетке + лог (хост и гость) =====
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
                    cellText: `отметил ${goalName}`,
                    timestamp: Date.now(),
                    color: me.color,
                }])
            }
        })

        // Проверяем условие победы после изменения клетки
        checkWinCondition()
    }

    // ===== hits obj =====
    const hits: Record<number, string[]> = {}
    yHits.forEach((arr, k) => {
        hits[Number(k)] = (arr as Y.Array<string>).toArray()
    })

    // ===== проверка победы =====
    function checkWinCondition() {
        if (gameTimer?.stage !== 'play') return

        // Подсчет клеток для каждого игрока
        const playerScores: Record<string, number> = {}

        Object.values(hits).forEach(playerUids => {
            playerUids.forEach(uid => {
                if (uid === 'bot') {
                    playerScores['Bot'] = (playerScores['Bot'] || 0) + 1
                } else {
                    const player = Array.from(awareness.getStates().values()).find(s => s?.uid === uid)
                    if (player) {
                        playerScores[player.name] = (playerScores[player.name] || 0) + 1
                    }
                }
            })
        })

        // Проверка на победу (ровно 13 клеток)
        for (const [playerName, score] of Object.entries(playerScores)) {
            if (score === 12) {
                // Автоматическая победа - после отметки 13-й клетки
                nextStage('finished', gameTimer.timerValue)

                // Добавляем лог победы
                yLog.push([{
                    playerName: playerName.toUpperCase(),
                    cellText: 'ПОБЕДИЛ',
                    timestamp: Date.now(),
                    color: '#ffffff'
                }])

                return
            }
        }
    }

    // ===== helpers =====
    function labelOf(id: string) { return labels[id] ?? id }
    function getColor(uids: string[]) {
        if (!uids.length) return undefined
        const firstUid = uids[0]
        // Специальный случай: бот может не присутствовать в awareness, но должен быть синим
        if (firstUid === 'bot') return '#3b82f6'
        const state = Array.from(awareness.getStates().values()).find(s => s?.uid === firstUid)
        return state?.color as string | undefined
    }

    async function reconnect() {
        try {
            await fetch(`${WS_HTTP}/healthz`, { mode: 'no-cors' })
        } catch { }
        try { provider.disconnect() } catch { }
        setTimeout(() => { try { provider.connect() } catch { } }, 200)
    }

    // ===== ручной выбор комнаты — только хост =====
    React.useEffect(() => { setRoomInput(roomId) }, [roomId])

    function goToRoom() {
        if (!isHost) return
        const base = getBase()
        const clean = roomInput.trim().replace(/\s+/g, '-').toLowerCase()
        if (!clean) return
        location.href = `${base}${clean}`
    }

    // ===== инвайт — только хост =====
    function makeInviteUrl(): string {
        const base = getBase()
        return `${location.origin}${base}${roomId}?guest=1`
    }
    async function copyInvite() {
        try {
            await navigator.clipboard.writeText(makeInviteUrl())
            alert('Ссылка для гостя скопирована!')
        } catch {
            prompt('Скопируйте ссылку вручную:', makeInviteUrl())
        }
    }

    const peersIncludingMe = awareness.getStates().size || 0

    // Разрешение взаимодействия с сеткой: только во время этапа "Игра" и когда таймер запущен
    const interactivityAllowed = gameTimer?.stage === 'play' && !!gameTimer?.timerRunning

    // ===== UI для выбора seed =====
    React.useEffect(() => {
        if (isHost && gameTimer?.stage === 'seed') {
            setPendingSeed(settings.seed || '');
            setShowSeedDialog(true);
        } else {
            setShowSeedDialog(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameTimer?.stage, isHost]);
    function handleSeedGenerate() {
        patchSettings({ seed: pendingSeed || Math.random().toString(36).slice(2, 8) });
        regenerate();
        nextStage('plan', 5 * 60); // 5 минут на планирование
        setShowSeedDialog(false);
    }
    function handleRandomSeed() {
        setPendingSeed(Math.random().toString(36).slice(2, 8));
    }

    // ===== PvE бот =====
    React.useEffect(() => {
        // Бот работает только у хоста, в PvE, на этапе 'play', если не пауза
        if (!isHost || gameMode !== 'pve' || gameTimer?.stage !== 'play' || !gameTimer?.timerRunning) {
            if (botTimerRef.current) clearTimeout(botTimerRef.current);
            botTimerRef.current = null;
            return;
        }
        // Проверка на наличие реального гостя не требуется (по ТЗ)
        function botMove() {
            // Найти свободные клетки на основе актуального состояния yHits/yBoard
            const boardArr = yBoard.toArray();
            const freeCells: number[] = [];
            for (let i = 0; i < boardArr.length; i++) {
                const arr = yHits.get(String(i)) as Y.Array<string> | undefined;
                const len = arr ? arr.toArray().length : 0;
                if (len === 0) freeCells.push(i);
            }
            if (freeCells.length === 0) return;
            const idx = freeCells[Math.floor(Math.random() * freeCells.length)];
            // Отметить клетку от имени бота
            doc.transact(() => {
                const key = String(idx);
                let arr = yHits.get(key) as Y.Array<string> | undefined;
                if (!arr) {
                    arr = new Y.Array<string>();
                    yHits.set(key, arr);
                }
                if (!arr.toArray().includes('bot')) {
                    arr.push(['bot']);
                    yLog.push([{
                        playerName: settings.botName || 'Bot',
                        cellText: `отметил ${labelOf(yBoard.get(idx))}`,
                        timestamp: Date.now(),
                        color: '#3b82f6',
                    }]);
                }
            });

            // Проверяем условие победы после хода бота
            checkWinCondition();
        }
        // Случайный интервал (на основе сложности бота)
        function scheduleBotMove() {
            const mode = settings.botMode || 'easy'
            let minMs = 15 * 60_000, maxMs = 30 * 60_000
            if (mode === 'test') { minMs = 10_000; maxMs = 30_000 }
            else if (mode === 'easy') { minMs = 20 * 60_000; maxMs = 40 * 60_000 }
            else if (mode === 'medium') { minMs = 15 * 60_000; maxMs = 30 * 60_000 }
            else if (mode === 'hard') { minMs = 10 * 60_000; maxMs = 20 * 60_000 }
            const interval = minMs + Math.random() * (maxMs - minMs)
            botTimerRef.current = window.setTimeout(() => {
                botMove();
                scheduleBotMove();
            }, interval);
        }
        // Запускаем расписание сразу (без быстрого первого хода)
        scheduleBotMove();
        return () => {
            if (botTimerRef.current) clearTimeout(botTimerRef.current);
            botTimerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHost, gameMode, gameTimer?.stage, gameTimer?.timerRunning, settings.botMode, yBoard, yHits, yLog]);

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <h1 className="text-2xl font-bold">Elden Ring Bingo</h1>

            {isHost ? (
                <>
                    <TopBar
                        settings={{ ...settings, gameMode }}
                        onChange={patchSettings}
                        onRegenerate={regenerate}
                        showLoaders={false}
                        gameTimer={gameTimer || undefined}
                        isHost={isHost}
                        onStart={startTimer}
                        onPause={pauseTimer}
                        onNextStage={() => {
                            // Простой цикл этапов
                            const order: GameStage[] = ['create', 'seed', 'plan', 'play', 'finished'];
                            const cur = gameTimer?.stage || 'create';

                            if (cur === 'play' && gameTimer) {
                                // Если мы на этапе "игра", то переходим к "финиш" и сохраняем текущее время
                                nextStage('finished', gameTimer.timerValue);
                            } else {
                                // Для других этапов - обычный переход к следующему
                                const idx = order.indexOf(cur);
                                const next = order[Math.min(idx + 1, order.length - 1)];

                                let timerValue = 0;
                                if (next === 'create') timerValue = 3 * 60; // 180 секунд = 3 минуты
                                if (next === 'plan') timerValue = 5 * 60;   // 300 секунд = 5 минут
                                if (next === 'play') timerValue = 0;        // Основной таймер

                                nextStage(next, timerValue);
                            }
                        }}
                        onResetRun={() => {
                            // Сброс в начальное состояние таймера и этапов
                            nextStage('create', 3 * 60);
                            pauseTimer();
                            setShowSeedDialog(false);
                        }}
                    />
                </>
            ) : (
                <div className="rounded-xl border border-neutral-700 p-3 text-sm opacity-80 space-y-2">
                    <div>Вы гость — можете отмечать клетки. Генерация доступна только хозяину комнаты.</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={reconnect}
                            className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm"
                            title="Переустановить соединение с сервером"
                        >
                            Подключиться ещё раз
                        </button>
                        <span className="opacity-70">Если сервер «уснул», разбудим его и переподключимся.</span>
                    </div>
                </div>
            )}

            {showSeedDialog && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
                    <div className="bg-neutral-900 p-6 rounded-xl flex flex-col gap-4 w-96 border border-neutral-700">
                        <div className="text-lg font-bold">Выберите seed для генерации сетки</div>
                        <input
                            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
                            value={pendingSeed}
                            onChange={e => setPendingSeed(e.target.value)}
                            placeholder="Введите seed или сгенерируйте случайный"
                            maxLength={32}
                        />
                        <div className="flex gap-2">
                            <button onClick={handleRandomSeed} className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm">Случайный seed</button>
                            <button onClick={handleSeedGenerate} className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-sm font-bold">Сгенерировать сетку</button>
                        </div>
                    </div>
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
                        disabled={guestBlocked || !interactivityAllowed}
                    />
                </div>

                <div className="w-80 flex flex-col gap-4">
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

                    {/* Ссылка-приглашение — только для хоста */}
                    {isHost && (
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
                    )}

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

                    {/* Таймер и этап для гостей */}
                    {!isHost && gameTimer && (
                        <div className="rounded-xl border border-neutral-700 p-3">
                            <div className="text-sm opacity-80 mb-2">Игровой процесс</div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">Этап:</span>
                                <span className="text-sm">{gameTimer.stage === 'create' ? 'Создание персонажа' :
                                    gameTimer.stage === 'seed' ? 'Выбор seed и генерация' :
                                        gameTimer.stage === 'plan' ? 'Планирование маршрута' :
                                            gameTimer.stage === 'play' ? 'Игра' :
                                                gameTimer.stage === 'paused' ? 'Пауза' :
                                                    gameTimer.stage === 'finished' ? 'Финиш' : gameTimer.stage}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm font-bold">Время:</span>
                                <span className="text-sm">{Math.floor(gameTimer.timerValue / 60)}:{(gameTimer.timerValue % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>
                    )}

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
