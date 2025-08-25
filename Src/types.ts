export type Goal = {
    id: string;           // уникальный id (slug)
    text: string;         // видимый текст
    tags?: string[];      // опционально: boss, region:limgrave, difficulty:hard и т.д.
    weight?: number;      // опционально: влияние на вероятность
};

export type GoalsPool = Goal[];

export type RoomSettings = {
    size: 3 | 4 | 5;          // размер сетки
    seed: string;             // сид
    freeCenter: boolean;      // свободный центр (для 5x5)
    mode: 'standard' | 'blackout';
    goalsSource?: string;     // подпись/версии пула
    goalsSourceType: 'local' | 'sheets'; // тип источника целей
    gameMode: 'pvp' | 'pve'; // новый режим игры
    botMode?: 'test' | 'easy' | 'medium' | 'hard'; // сложность бота (только PvE)
    botName?: string;         // имя бота (только PvE)
};

export type GameStage = 'create' | 'seed' | 'plan' | 'play' | 'paused' | 'finished';

export type GameTimerState = {
    stage: GameStage;
    timerValue: number; // секунды
    timerRunning: boolean;
    startedAt?: number; // timestamp UTC, для синхронизации
};

export type SharedState = {
    board: string[];          // массив id целей (size*size)
    hits: Record<number, string[]>; // индекс клетки -> список uid игроков
    settings: RoomSettings;
};