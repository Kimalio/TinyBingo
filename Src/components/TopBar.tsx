import React from 'react'
import { RoomSettings } from '../types'

type Props = {
    settings: RoomSettings
    onChange: (patch: Partial<RoomSettings>) => void
    onRegenerate: () => void
    onLoadGoalsFile?: (file: File) => void
    onLoadGoalsUrl?: (url: string) => void
    showLoaders?: boolean
}


export default function TopBar({
    settings,
    onChange,
    onRegenerate,
    onLoadGoalsFile,
    onLoadGoalsUrl,
    showLoaders = true,
}: Props) {

    const [url, setUrl] = React.useState('')

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-900/60 rounded-xl">
            <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Room:</label>
                <code className="text-xs bg-neutral-800 px-2 py-1 rounded">{new URL(window.location.href).pathname.replace('/', '') || 'local'}</code>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Seed</label>
                <input value={settings.seed} onChange={e => onChange({ seed: e.target.value })}
                    className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm w-36" />
                <button onClick={onRegenerate} className="px-2 py-1 rounded bg-emerald-700/60 hover:bg-emerald-700 text-sm">Regenerate</button>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-sm opacity-80">Size</label>
                <select value={settings.size} onChange={e => onChange({ size: Number(e.target.value) as 3 | 4 | 5 })}
                    className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm">
                    <option value={3}>3×3</option>
                    <option value={4}>4×4</option>
                    <option value={5}>5×5</option>
                </select>
                <label className="inline-flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={settings.freeCenter} onChange={e => onChange({ freeCenter: e.target.checked })} />
                    Free center
                </label>
            </div>

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