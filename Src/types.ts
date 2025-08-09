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
    goalsSource?: string;     // подпись/версия пула
};

export type SharedState = {
    board: string[];          // массив id целей (size*size)
    hits: Record<number, string[]>; // индекс клетки -> список uid игроков
    settings: RoomSettings;
};