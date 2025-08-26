import React from 'react'
import { RoomSettings, GameTimerState } from '../types'

type Props = {
    settings: RoomSettings
    onChange: (patch: Partial<RoomSettings>) => void
    onRegenerate: () => void
    onLoadGoalsFile?: (file: File) => void
    onLoadGoalsUrl?: (url: string) => void
    showLoaders?: boolean
    gameTimer?: GameTimerState
    isHost?: boolean
    onStart?: () => void
    onPause?: () => void
    onNextStage?: () => void
    onResetRun?: () => void
}


export default function TopBar({
    settings,
    onChange,
    onRegenerate,
    onLoadGoalsFile,
    onLoadGoalsUrl,
    showLoaders = true,
    gameTimer,
    isHost,
    onStart,
    onPause,
    onNextStage,
    onResetRun,
}: Props) {

    const [url, setUrl] = React.useState('')

    function formatTime(sec: number) {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }
    const stageLabels: Record<string, string> = {
        create: 'Создание персонажа',
        seed: 'Выбор seed и генерация',
        plan: 'Планирование маршрута',
        play: 'Игра',
        paused: 'Пауза',
        finished: 'Финиш',
    }

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-900/60 rounded-xl">
            <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Комната:</label>
                <code className="text-xs bg-neutral-800 px-2 py-1 rounded">{new URL(window.location.href).pathname.replace('/', '') || 'local'}</code>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Сид</label>
                <input value={settings.seed} onChange={e => onChange({ seed: e.target.value })}
                    className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm w-36" />
                <button onClick={onRegenerate} className="px-2 py-1 rounded bg-emerald-700/60 hover:bg-emerald-700 text-sm">Regenerate</button>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Режим</label>
                <select value={settings.gameMode || 'pvp'} onChange={e => onChange({ gameMode: e.target.value as 'pvp' | 'pve' })}
                    className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm">
                    <option value="pvp">PvP</option>
                    <option value="pve">PvE (бот)</option>
                </select>
                <span className="text-xs opacity-70">{settings.gameMode === 'pve' ? 'Против бота' : 'Два игрока'}</span>
            </div>



            <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Источник целей</label>
                <select value={settings.goalsSourceType || 'local'} onChange={e => onChange({ goalsSourceType: e.target.value as 'local' | 'sheets' })}
                    className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm">
                    <option value="local">Ресурс 1</option>
                    <option value="sheets">Ресурс 2</option>
                </select>
            </div>

            {gameTimer && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Этап:</span>
                    <span className="text-sm">{stageLabels[gameTimer.stage] || gameTimer.stage}</span>
                    <span className="text-sm">{formatTime(gameTimer.timerValue)}</span>
                    {isHost && gameTimer.stage !== 'finished' && (
                        <>
                            {gameTimer.timerRunning ? (
                                <button onClick={onPause} className="px-2 py-1 rounded bg-yellow-700/60 hover:bg-yellow-700 text-sm">Пауза</button>
                            ) : (
                                <button onClick={onStart} className="px-2 py-1 rounded bg-emerald-700/60 hover:bg-emerald-700 text-sm">Старт</button>
                            )}
                            {gameTimer.stage === 'play' && gameTimer.timerRunning ? (
                                <button onClick={onNextStage} className="px-2 py-1 rounded bg-neutral-700/60 hover:bg-neutral-700 text-sm">
                                    Финиш
                                </button>
                            ) : (
                                <button onClick={onNextStage} className="px-2 py-1 rounded bg-neutral-700/60 hover:bg-neutral-700 text-sm">
                                    Следующий этап
                                </button>
                            )}
                        </>
                    )}

                    {isHost && gameTimer.stage === 'finished' && (
                        <button onClick={onResetRun} className="px-2 py-1 rounded bg-blue-700/60 hover:bg-blue-700 text-sm">Новый забег</button>
                    )}
                </div>
            )}

            {settings.gameMode === 'pve' && isHost && (
                <div className="relative">
                    <details className="relative">
                        <summary className="list-none cursor-pointer px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm">
                            ⚙️ Настройки бота
                        </summary>
                        <div className="absolute mt-1 z-10 bg-neutral-900 border border-neutral-700 rounded p-2 w-64 shadow-xl">
                            <div className="text-sm opacity-80 mb-2">Сложность бота</div>
                            <div className="flex flex-col gap-1 text-sm">
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="botMode"
                                        checked={settings.botMode === 'test'}
                                        onChange={() => onChange({ botMode: 'test' })}
                                    />
                                    Тестирование (10–30 секунд)
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="botMode"
                                        checked={settings.botMode === 'easy'}
                                        onChange={() => onChange({ botMode: 'easy' })}
                                    />
                                    Легко (20–40 минут)
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="botMode"
                                        checked={settings.botMode === 'medium' || !settings.botMode}
                                        onChange={() => onChange({ botMode: 'medium' })}
                                    />
                                    Средне (15–30 минут)
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="botMode"
                                        checked={settings.botMode === 'hard'}
                                        onChange={() => onChange({ botMode: 'hard' })}
                                    />
                                    Сложно (10–20 минут)
                                </label>
                            </div>
                            <div className="mt-3 border-t border-neutral-800 pt-2">
                                <div className="text-sm opacity-80 mb-1">Имя бота</div>
                                <input
                                    type="text"
                                    value={settings.botName ?? ''}
                                    onChange={e => onChange({ botName: e.target.value.slice(0, 24) })}
                                    placeholder="Bot"
                                    className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
                                    maxLength={24}
                                />
                            </div>
                        </div>
                    </details>
                </div>
            )}

            {/* {showLoaders && (
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        accept=".json,.csv"
                        onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) onLoadGoalsFile?.(f)
                        }}
                    />
                    <input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://.../goals.json|csv"
                        className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm w-72"
                    />
                    <button
                        onClick={() => onLoadGoalsUrl?.(url)}
                        className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm"
                    >
                        Load URL
                    </button>
                    <span className="text-xs opacity-70">{settings.goalsSource ?? 'no pool loaded'}</span>
                </div>
            )} */}

        </div>
    )
}