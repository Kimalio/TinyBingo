/**
 * Bot_AI.tsx - Модуль искусственного интеллекта для бота TinyBingo v2.0
 * 
 * КОНЦЕПЦИЯ:
 * Бот планирует на 5 ходов вперед, адаптируется к действиям игрока,
 * использует разные стратегии в зависимости от сложности и иногда "блефует"
 * 
 * АРХИТЕКТУРА:
 * - Планирование: создание плана на 5 ходов для завершения линии
 * - Адаптация: пересчет плана только при нарушении игроком
 * - Стратегии: разные подходы для Easy/Medium/Hard режимов
 * - Блеф: случайные ходы для запутывания игрока
 */

import React from 'react'
import { getBotConfig, type BotDifficultyConfig, type BotDifficulty } from './Bot_Config'

// ===== ТИПЫ ДАННЫХ =====

export type GoalDifficulty = 1 | 2 | 3 // easy, medium, hard

export interface Goal {
    id: string
    text: string
    difficulty: GoalDifficulty
}

export type BotStrategy = 'aggressive' | 'defensive' | 'balanced' | 'speedrunner'

export type LineType = 'row' | 'col' | 'diag'

export interface BotPlan {
    targetLine: LineType
    targetIndex: number // какой ряд/столбец/диагональ
    plannedMoves: number[] // индексы клеток для закрытия (до 5)
    priority: 'high' | 'medium' | 'low'
    fallbackStrategy: 'line' | 'quantity' | 'blocking'
    createdAt: number // timestamp для отслеживания "свежести" плана
}

export interface BoardState {
    board: string[] // массив ID целей
    hits: Record<number, string[]> // какие клетки закрыты кем
    size: number // размер доски (3x3, 4x4, 5x5)
}



// ===== ОСНОВНЫЕ ФУНКЦИИ ИИ =====

/**
 * Анализ конкретной линии (ряд/столбец/диагональ) для analyzeBoard
 */
function analyzeLine(
    indices: number[],
    hits: Record<number, string[]>,
    goals: Record<string, Goal>,
    board: string[],
    type: LineType,
    lineIndex: number
): {
    botProgress: number;
    playerProgress: number;
    available: number;
    difficulty: number;
} {
    let botProgress = 0;
    let playerProgress = 0;
    let available = 0;
    let totalDifficulty = 0;
    let cellsWithDifficulty = 0;

    for (const cellIndex of indices) {
        const cellHits = hits[cellIndex] || [];
        const goalId = board[cellIndex];
        const goal = goalId ? goals[goalId] : null;

        if (cellHits.includes('bot')) {
            botProgress++;
        } else if (cellHits.length > 0) {
            playerProgress++;
        } else {
            available++;
        }

        if (goal?.difficulty) {
            totalDifficulty += goal.difficulty;
            cellsWithDifficulty++;
        }
    }

    const averageDifficulty = cellsWithDifficulty > 0 ? totalDifficulty / cellsWithDifficulty : 2;

    return {
        botProgress,
        playerProgress,
        available,
        difficulty: Math.round(averageDifficulty)
    };
}

/**
 * 1. АНАЛИЗ ДОСКИ
 * Анализирует текущее состояние доски и определяет возможности
 */
export function analyzeBoard(boardState: BoardState, goals: Record<string, Goal>): {
    availableLines: Array<{ type: LineType, index: number, progress: number, difficulty: number }>
    threats: Array<{ type: LineType, index: number, player: string, progress: number }>
    botProgress: Array<{ type: LineType, index: number, progress: number, difficulty: number }>
} {
    const { board, hits, size } = boardState;

    console.log('=== АНАЛИЗ ДОСКИ ===');
    console.log('Размер доски:', size);
    console.log('Количество отмеченных клеток:', Object.keys(hits).length);
    console.log('========================');

    const availableLines: Array<{ type: LineType, index: number, progress: number, difficulty: number }> = [];
    const threats: Array<{ type: LineType, index: number, player: string, progress: number }> = [];
    const botProgress: Array<{ type: LineType, index: number, progress: number, difficulty: number }> = [];

    // Анализируем ряды
    for (let row = 0; row < size; row++) {
        const rowIndices = getLineIndices('row', row, size);
        const rowAnalysis = analyzeLine(rowIndices, hits, goals, board, 'row', row);
        console.log(`Ряд ${row}:`, rowAnalysis);

        if (rowAnalysis.botProgress > 0) {
            botProgress.push({
                type: 'row',
                index: row,
                progress: rowAnalysis.botProgress,
                difficulty: rowAnalysis.difficulty
            });
        }

        if (rowAnalysis.playerProgress > 0) {
            threats.push({
                type: 'row',
                index: row,
                player: 'player',
                progress: rowAnalysis.playerProgress
            });
        }

        if (rowAnalysis.available > 0) {
            availableLines.push({
                type: 'row',
                index: row,
                progress: rowAnalysis.available,
                difficulty: rowAnalysis.difficulty
            });
        }
    }

    // Анализируем столбцы
    for (let col = 0; col < size; col++) {
        const colIndices = getLineIndices('col', col, size);
        const colAnalysis = analyzeLine(colIndices, hits, goals, board, 'col', col);
        console.log(`Столбец ${col}:`, colAnalysis);

        if (colAnalysis.botProgress > 0) {
            botProgress.push({
                type: 'col',
                index: col,
                progress: colAnalysis.botProgress,
                difficulty: colAnalysis.difficulty
            });
        }

        if (colAnalysis.playerProgress > 0) {
            threats.push({
                type: 'col',
                index: col,
                player: 'player',
                progress: colAnalysis.playerProgress
            });
        }

        if (colAnalysis.available > 0) {
            availableLines.push({
                type: 'col',
                index: col,
                progress: colAnalysis.available,
                difficulty: colAnalysis.difficulty
            });
        }
    }

    // Анализируем диагонали (только для 5x5)
    if (size === 5) {
        // Главная диагональ (0,0) -> (4,4)
        const mainDiagIndices = getLineIndices('diag', 0, size);
        const mainDiagAnalysis = analyzeLine(mainDiagIndices, hits, goals, board, 'diag', 0);
        console.log('Главная диагональ:', mainDiagAnalysis);

        if (mainDiagAnalysis.botProgress > 0) {
            botProgress.push({
                type: 'diag',
                index: 0,
                progress: mainDiagAnalysis.botProgress,
                difficulty: mainDiagAnalysis.difficulty
            });
        }

        if (mainDiagAnalysis.playerProgress > 0) {
            threats.push({
                type: 'diag',
                index: 0,
                player: 'player',
                progress: mainDiagAnalysis.playerProgress
            });
        }

        if (mainDiagAnalysis.available > 0) {
            availableLines.push({
                type: 'diag',
                index: 0,
                progress: mainDiagAnalysis.available,
                difficulty: mainDiagAnalysis.difficulty
            });
        }

        // Побочная диагональ (0,4) -> (4,0)
        const antiDiagIndices = getLineIndices('diag', 1, size);
        const antiDiagAnalysis = analyzeLine(antiDiagIndices, hits, goals, board, 'diag', 1);
        console.log('Побочная диагональ:', antiDiagAnalysis);

        if (antiDiagAnalysis.botProgress > 0) {
            botProgress.push({
                type: 'diag',
                index: 1,
                progress: antiDiagAnalysis.botProgress,
                difficulty: antiDiagAnalysis.difficulty
            });
        }

        if (antiDiagAnalysis.playerProgress > 0) {
            threats.push({
                type: 'diag',
                index: 1,
                player: 'player',
                progress: antiDiagAnalysis.playerProgress
            });
        }

        if (antiDiagAnalysis.available > 0) {
            availableLines.push({
                type: 'diag',
                index: 1,
                progress: antiDiagAnalysis.available,
                difficulty: antiDiagAnalysis.difficulty
            });
        }
    }

    console.log('=== РЕЗУЛЬТАТЫ АНАЛИЗА ===');
    console.log('Доступные линии:', availableLines.length);
    console.log('Угрозы:', threats.length);
    console.log('Прогресс бота:', botProgress.length);
    console.log('============================');

    return {
        availableLines,
        threats,
        botProgress
    };
}

/**
 * 2. СОЗДАНИЕ ПЛАНА
 * Создает план на 5 ходов для завершения наиболее перспективной линии
 */
export function createPlan(
    boardState: BoardState,
    goals: Record<string, Goal>,
    botConfig: BotDifficultyConfig,
    currentPlan?: BotPlan
): BotPlan | null {
    const { board, hits, size } = boardState;

    console.log('=== СОЗДАНИЕ ПЛАНА ===');
    console.log('Размер доски:', size);
    console.log('Количество целей:', Object.keys(goals).length);
    console.log('Количество отмеченных клеток:', Object.keys(hits).length);
    console.log('========================');

    // Анализируем текущее состояние доски
    const analysis = analyzeBoard(boardState, goals);
    console.log('Результат анализа:', analysis);

    // Если у бота уже есть прогресс в какой-то линии, приоритет отдаем ей
    if (analysis.botProgress.length > 0) {
        console.log('Найден прогресс бота в линиях:', analysis.botProgress);
        // Сортируем по прогрессу (больше прогресс = выше приоритет)
        const bestBotLine = analysis.botProgress.sort((a, b) => b.progress - a.progress)[0];

        if (bestBotLine.progress >= 3) {
            console.log('Бот близок к победе, завершаем линию:', bestBotLine);
            // Если бот уже близок к победе (3+ клетки), завершаем линию
            const plan = createLineCompletionPlan(bestBotLine, boardState, goals, botConfig);
            // Проверяем, что план содержит ходы
            if (plan.plannedMoves.length > 0) {
                return plan;
            }
        }
    }

    // Ищем наиболее перспективную линию для начала
    const bestLine = findBestStartingLine(analysis, boardState, goals, botConfig);
    console.log('Найдена лучшая линия для начала:', bestLine);

    if (bestLine) {
        console.log('Создаю план для лучшей линии:', bestLine);
        const plan = createLineCompletionPlan(bestLine, boardState, goals, botConfig);
        // Проверяем, что план содержит ходы
        if (plan.plannedMoves.length > 0) {
            return plan;
        }
    }

    // Если нет хороших линий или план пустой, создаем план для количественного бинго
    console.log('Создаю план количественного бинго');
    return createQuantityPlan(boardState, goals, botConfig);
}

/**
 * Создает план для завершения конкретной линии
 */
function createLineCompletionPlan(
    lineInfo: { type: LineType; index: number; progress: number; difficulty: number },
    boardState: BoardState,
    goals: Record<string, Goal>,
    botConfig: BotDifficultyConfig
): BotPlan {
    const { type, index, progress } = lineInfo;
    const indices = getLineIndices(type, index, boardState.size);

    console.log('=== СОЗДАНИЕ ПЛАНА ЗАВЕРШЕНИЯ ЛИНИИ ===');
    console.log('Тип линии:', type, 'Индекс:', index, 'Прогресс:', progress);
    console.log('Индексы клеток:', indices);
    console.log('Состояние доски (hits):', boardState.hits);

    // Находим свободные клетки в этой линии
    const freeCells = indices.filter(cellIndex => {
        const cellHits = boardState.hits[cellIndex] || [];
        const isFree = cellHits.length === 0;
        console.log(`Клетка ${cellIndex}: ${isFree ? 'свободна' : 'занята игроком ' + cellHits.join(', ')}`);
        return isFree;
    });

    console.log('Свободные клетки в линии:', freeCells);

    // Сортируем по сложности (приоритет простым заданиям)
    const sortedFreeCells = freeCells.sort((a, b) => {
        const goalA = goals[boardState.board[a]];
        const goalB = goals[boardState.board[b]];
        const diffA = goalA?.difficulty || 2;
        const diffB = goalB?.difficulty || 2;
        return diffA - diffB;
    });

    // Берем до 5 клеток для плана
    const plannedMoves = sortedFreeCells.slice(0, 5);
    console.log('Запланированные ходы для завершения линии:', plannedMoves);

    const plan = {
        targetLine: type,
        targetIndex: index,
        plannedMoves,
        priority: (progress >= 3 ? 'high' : progress >= 2 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        fallbackStrategy: 'line' as const,
        createdAt: Date.now()
    };

    console.log('Создан план завершения линии:', plan);
    return plan;
}

/**
 * Находит лучшую линию для начала
 */
function findBestStartingLine(
    analysis: ReturnType<typeof analyzeBoard>,
    boardState: BoardState,
    goals: Record<string, Goal>,
    botConfig: BotDifficultyConfig
): { type: LineType; index: number; progress: number; difficulty: number } | null {
    const { availableLines, threats } = analysis;

    // Если есть угрозы от игрока, приоритет блокировке
    if (threats.length > 0) {
        const criticalThreats = threats.filter(t => t.progress >= 3);
        if (criticalThreats.length > 0) {
            // Находим линию, которую можно заблокировать
            const blockingLine = findBlockingLine(criticalThreats[0], boardState, goals);
            if (blockingLine) {
                return blockingLine;
            }
        }
    }

    // Ищем линию с лучшим соотношением прогресс/сложность
    if (availableLines.length > 0) {
        return availableLines.sort((a, b) => {
            // Приоритет: больше прогресс, меньше сложность
            const scoreA = a.progress - a.difficulty * 0.5;
            const scoreB = b.progress - b.difficulty * 0.5;
            return scoreB - scoreA;
        })[0];
    }

    return null;
}

/**
 * Находит линию для блокировки угрозы игрока
 */
function findBlockingLine(
    threat: { type: LineType; index: number; player: string; progress: number },
    boardState: BoardState,
    goals: Record<string, Goal>
): { type: LineType; index: number; progress: number; difficulty: number } | null {
    const { type, index } = threat;
    const indices = getLineIndices(type, index, boardState.size);

    // Ищем свободные клетки в угрожающей линии
    const freeCells = indices.filter(cellIndex => {
        const cellHits = boardState.hits[cellIndex] || [];
        return cellHits.length === 0;
    });

    if (freeCells.length > 0) {
        // Выбираем клетку с наименьшей сложностью для быстрой блокировки
        const bestCell = freeCells.sort((a, b) => {
            const goalA = goals[boardState.board[a]];
            const goalB = goals[boardState.board[b]];
            const diffA = goalA?.difficulty || 2;
            const diffB = goalB?.difficulty || 2;
            return diffA - diffB;
        })[0];

        return {
            type,
            index,
            progress: 1, // Начинаем с 1 клетки
            difficulty: goals[boardState.board[bestCell]]?.difficulty || 2
        };
    }

    return null;
}

/**
 * Создает план для количественного бинго (13 клеток)
 */
function createQuantityPlan(
    boardState: BoardState,
    goals: Record<string, Goal>,
    botConfig: BotDifficultyConfig
): BotPlan {
    const { board, hits, size } = boardState;

    console.log('=== СОЗДАНИЕ КОЛИЧЕСТВЕННОГО ПЛАНА ===');
    console.log('Размер доски:', size);
    console.log('Количество целей:', Object.keys(goals).length);
    console.log('Состояние доски (hits):', hits);

    // Находим все свободные клетки
    const freeCells: number[] = [];
    for (let i = 0; i < board.length; i++) {
        const cellHits = hits[i] || [];
        if (cellHits.length === 0) {
            freeCells.push(i);
        }
    }

    console.log('Найдено свободных клеток:', freeCells.length);
    console.log('Свободные клетки:', freeCells);

    // Сортируем по сложности (приоритет простым)
    const sortedFreeCells = freeCells.sort((a, b) => {
        const goalA = goals[board[a]];
        const goalB = goals[board[b]];
        const diffA = goalA?.difficulty || 2;
        const diffB = goalB?.difficulty || 2;
        return diffA - diffB;
    });

    // Берем до 5 клеток для плана
    const plannedMoves = sortedFreeCells.slice(0, 5);
    console.log('Запланированные ходы:', plannedMoves);

    const plan = {
        targetLine: 'row' as LineType, // Не важно для количественного бинго
        targetIndex: 0,
        plannedMoves,
        priority: 'low' as const,
        fallbackStrategy: 'quantity' as const,
        createdAt: Date.now()
    };

    console.log('Создан план:', plan);
    return plan;
}

/**
 * 3. ПРОВЕРКА НАРУШЕНИЯ ПЛАНА
 * Проверяет, не нарушил ли игрок текущий план бота
 */
export function isPlanViolated(
    currentPlan: BotPlan,
    boardState: BoardState,
    lastPlayerMove: number
): boolean {
    // Проверяем, закрыл ли игрок запланированную клетку
    if (currentPlan.plannedMoves.includes(lastPlayerMove)) {
        console.log('План нарушен: игрок закрыл запланированную клетку', lastPlayerMove);
        return true;
    }

    // Проверяем, не стали ли запланированные клетки недоступными
    for (const cellIndex of currentPlan.plannedMoves) {
        const cellHits = boardState.hits[cellIndex] || [];
        if (cellHits.length > 0 && !cellHits.includes('bot')) {
            console.log('План нарушен: запланированная клетка занята игроком', cellIndex);
            return true;
        }
    }

    return false;
}

/**
 * 4. ПЕРЕСЧЕТ ПЛАНА
 * Создает новый план при нарушении текущего
 */
export function recalculatePlan(
    boardState: BoardState,
    goals: Record<string, Goal>,
    botConfig: BotDifficultyConfig,
    violatedPlan: BotPlan
): BotPlan | null {
    console.log('Пересчитываю план после нарушения');

    // Создаем новый план, игнорируя нарушенный
    return createPlan(boardState, goals, botConfig);
}

/**
 * 5. ВЫБОР ОПТИМАЛЬНОГО ХОДА
 * Выбирает лучший ход на основе текущего плана
 */
export function selectBestMove(
    currentPlan: BotPlan,
    boardState: BoardState,
    goals: Record<string, Goal>,
    botConfig: BotDifficultyConfig
): number | null {
    console.log('=== selectBestMove ===');
    console.log('План:', currentPlan);
    console.log('Запланированные ходы:', currentPlan?.plannedMoves);
    console.log('Состояние доски (hits):', boardState.hits);
    console.log('Размер доски:', boardState.size);

    if (!currentPlan || currentPlan.plannedMoves.length === 0) {
        console.log('План отсутствует или пуст, возвращаю null');
        return null;
    }

    const { plannedMoves, targetLine, targetIndex } = currentPlan;

    // Проверяем, доступна ли первая клетка из плана
    for (const cellIndex of plannedMoves) {
        const cellHits = boardState.hits[cellIndex] || [];
        console.log(`Клетка ${cellIndex}:`, cellHits);
        if (cellHits.length === 0) {
            // Клетка свободна, можно ходить
            console.log(`Найдена свободная клетка: ${cellIndex}`);
            return cellIndex;
        }
    }

    // Если все запланированные клетки заняты, план нужно пересчитать
    console.log('Все запланированные клетки заняты, возвращаю null');
    console.log('Статус запланированных клеток:');
    plannedMoves.forEach(cellIndex => {
        const cellHits = boardState.hits[cellIndex] || [];
        const occupiedBy = cellHits.length > 0 ? cellHits.join(', ') : 'свободна';
        console.log(`  Клетка ${cellIndex}: ${occupiedBy}`);
    });
    return null;
}

/**
 * 6. СТРАТЕГИЧЕСКОЕ ПОВЕДЕНИЕ
 * Определяет общую стратегию бота в зависимости от сложности
 */
export function determineStrategy(
    boardState: BoardState,
    botConfig: BotDifficultyConfig,
    currentPlan?: BotPlan
): BotStrategy {
    const { aggressiveness, defensiveness } = botConfig.behavior;

    if (aggressiveness > 0.7) {
        return 'aggressive';
    } else if (defensiveness > 0.7) {
        return 'defensive';
    } else if (aggressiveness > 0.4 && defensiveness > 0.4) {
        return 'balanced';
    } else {
        return 'balanced';
    }
}

/**
 * 7. ОБНАРУЖЕНИЕ УГРОЗ
 * Анализирует угрозы от игрока и определяет приоритеты
 */
export function detectThreats(
    boardState: BoardState,
    playerUid: string
): Array<{ type: LineType, index: number, severity: 'high' | 'medium' | 'low' }> {
    const threats: Array<{ type: LineType, index: number, severity: 'high' | 'medium' | 'low' }> = [];
    const { size } = boardState;

    // Анализируем ряды, столбцы и диагонали на предмет угроз
    // Пока возвращаем пустой массив, но логика готова для расширения
    return threats;
}

/**
 * 8. БЛЕФ
 * Иногда делает случайные ходы для запутывания игрока
 */
export function shouldBluff(botConfig: BotDifficultyConfig): boolean {
    const { bluffChance } = botConfig.behavior;

    // Используем точно настройку из конфига
    const shouldBluff = Math.random() < bluffChance;
    console.log(`Блеф: ${bluffChance}, результат: ${shouldBluff}`);

    return shouldBluff;
}

/**
 * 9. ВЫБОР СЛУЧАЙНОГО ХОДА
 * Выбирает случайную доступную клетку для блефа
 */
export function selectRandomMove(boardState: BoardState): number {
    const { board, hits } = boardState;

    console.log('  selectRandomMove: начало поиска случайного хода');

    // Находим все свободные клетки
    const freeCells: number[] = [];
    for (let i = 0; i < board.length; i++) {
        const cellHits = hits[i] || [];
        if (cellHits.length === 0) {
            freeCells.push(i);
        }
    }

    if (freeCells.length === 0) {
        console.log('  ❌ selectRandomMove: нет свободных клеток - это ошибка!');
        // Если нет свободных клеток, возвращаем 0 (это не должно происходить)
        return 0;
    }

    // Выбираем случайную клетку
    const randomIndex = Math.floor(Math.random() * freeCells.length);
    const selectedCell = freeCells[randomIndex];
    console.log(`  ✅ selectRandomMove: выбрана случайная клетка ${selectedCell} из ${freeCells.length} свободных`);
    return selectedCell;
}

/**
 * 10. ПРОСТАЯ ФУНКЦИЯ ИИ
 * Простая и эффективная логика без сложного планирования
 */
export function simpleBotAI(
    boardState: BoardState,
    goals: Record<string, Goal>,
    botDifficulty: BotDifficulty,
    lastPlayerMove?: number
): {
    nextMove: number
    strategy: BotStrategy
    reason: string
} {
    const { board, hits, size } = boardState;
    const config = getBotConfig(botDifficulty);

    console.log('=== ПРОСТАЯ ЛОГИКА ИИ ===');
    console.log('Сложность бота:', botDifficulty);
    console.log('Размер доски:', size);
    console.log('Количество целей:', Object.keys(goals).length);
    console.log('Состояние доски (hits):', hits);

    // Анализируем свободные клетки
    const freeCells: number[] = [];
    for (let i = 0; i < board.length; i++) {
        const cellHits = hits[i] || [];
        if (cellHits.length === 0) {
            freeCells.push(i);
        }
    }
    console.log('Свободные клетки:', freeCells);
    console.log('Количество свободных клеток:', freeCells.length);

    // Анализируем доску
    const initialBoardAnalysis = analyzeBoard(boardState, goals);
    console.log('Анализ доски:', initialBoardAnalysis);
    console.log('========================');

    // 0. ПРИОРИТЕТ: Анализ угроз игрока и блокировки бота
    console.log('Анализирую угрозы и блокировки...');
    const threatAnalysis = analyzeThreats(boardState, goals, config);

    // Если есть критические угрозы, блокируем их немедленно
    if (threatAnalysis.recommendedAction === 'block') {
        console.log('🚨 Обнаружены критические угрозы, ищу ход для блокировки...');
        const blockingMove = findBlockingMoveFromThreats(threatAnalysis.playerThreats, boardState, goals);
        if (blockingMove !== null) {
            console.log('✅ Найден ход для блокировки угрозы:', blockingMove);
            return {
                nextMove: blockingMove.index,
                strategy: 'defensive',
                reason: `Блокирую угрозу: ${blockingMove.reason}`
            };
        } else {
            console.log('⚠️ Не удалось найти ход для блокировки угрозы - переключаюсь на другие стратегии');
        }
    }

    // Если бот заблокирован, переключаемся на другие стратегии
    if (threatAnalysis.recommendedAction === 'switch') {
        console.log('⚠️ Бот заблокирован в некоторых линиях, переключаюсь на другие стратегии');
    }

    // 1. ПРИОРИТЕТ: Динамический анализ потенциала линий между последними ходами бота
    console.log('Анализирую потенциал линий между последними ходами бота...');
    const dynamicLineMove = findDynamicLineMove(boardState, goals, config);
    console.log('  Результат findDynamicLineMove:', dynamicLineMove);
    if (dynamicLineMove !== null) {
        console.log('✅ Найден ход для динамической линии:', dynamicLineMove);
        return {
            nextMove: dynamicLineMove.index,
            strategy: 'aggressive',
            reason: `Завершение динамической линии: ${dynamicLineMove.type} ${dynamicLineMove.lineIndex}`
        };
    } else {
        console.log('❌ Динамические линии не найдены');
    }

    // 2. ПРИОРИТЕТ: Захват стратегических позиций (центр и углы)
    console.log('Ищу стратегические позиции...');
    const strategicMove = findStrategicMove(boardState, goals, config);
    console.log('  Результат findStrategicMove:', strategicMove);
    if (strategicMove !== null) {
        console.log('✅ Найден ход для захвата стратегической позиции:', strategicMove);
        return {
            nextMove: strategicMove,
            strategy: 'aggressive',
            reason: 'Захват стратегической позиции'
        };
    } else {
        console.log('❌ Стратегические позиции не найдены');
    }

    // 3. ПРИОРИТЕТ: Анализ потенциальных линий (2+ клетки закрыты)
    console.log('Анализирую потенциальные линии...');
    const potentialLineMove = findPotentialLineMove(boardState, goals, config);
    console.log('  Результат findPotentialLineMove:', potentialLineMove);
    if (potentialLineMove !== null) {
        console.log('✅ Найден ход для потенциальной линии:', potentialLineMove);
        return {
            nextMove: potentialLineMove,
            strategy: 'aggressive',
            reason: 'Завершение потенциальной линии'
        };
    } else {
        console.log('❌ Потенциальные линии не найдены или заблокированы игроком');
    }

    // 4. ПРИОРИТЕТ: Завершить свой ряд/столбец/диагональ
    console.log('Ищу ход для завершения линии...');
    const lineCompletionMove = findLineCompletionMove(boardState, goals, config);
    console.log('  Результат findLineCompletionMove:', lineCompletionMove);
    if (lineCompletionMove !== null) {
        console.log('✅ Найден ход для завершения линии:', lineCompletionMove);
        return {
            nextMove: lineCompletionMove,
            strategy: 'aggressive',
            reason: 'Завершаю линию'
        };
    } else {
        console.log('❌ Ход для завершения линии не найден');
    }

    // 5. ПРИОРИТЕТ: Помешать игроку (с вероятностью из конфига)
    const shouldBlock = Math.random() < config.behavior.blockPlayerChance;
    console.log(`Проверяю блокировку игрока: ${shouldBlock} (вероятность: ${config.behavior.blockPlayerChance})`);

    if (shouldBlock) {
        console.log('Ищу ход для блокировки игрока...');
        const blockingMove = findBlockingMove(boardState, goals, config);
        console.log('  Результат findBlockingMove:', blockingMove);
        if (blockingMove !== null) {
            console.log('✅ Найден ход для блокировки игрока:', blockingMove);
            return {
                nextMove: blockingMove,
                strategy: 'defensive',
                reason: 'Блокирую игрока'
            };
        } else {
            console.log('❌ Ход для блокировки игрока не найден');
        }
    }

    // 6. ПРИОРИТЕТ: Количественное бинго по сложности
    console.log('Ищу ход для количественного бинго...');
    const quantityMove = findQuantityMove(boardState, goals, config);
    console.log('  Результат findQuantityMove:', quantityMove);
    if (quantityMove !== null) {
        console.log('✅ Найден ход для количественного бинго:', quantityMove);
        return {
            nextMove: quantityMove,
            strategy: 'balanced',
            reason: 'Количественное бинго'
        };
    } else {
        console.log('❌ Ход для количественного бинго не найден');
    }

    // 7. АДАПТИВНОЕ ПЕРЕКЛЮЧЕНИЕ СТРАТЕГИЙ (вместо fallback)
    console.log('🔄 Анализирую причины неудачи и переключаюсь на другие стратегии...');

    // Анализируем текущее состояние доски
    const boardAnalysis = analyzeBoard(boardState, goals);
    console.log('📊 Анализ доски:', boardAnalysis);

    // Пробуем количественную стратегию (если не заблокированы все клетки)
    console.log('🔄 Пробую количественную стратегию...');
    const quantityMoveRetry = findQuantityMove(boardState, goals, config);
    console.log('  Результат findQuantityMove:', quantityMoveRetry);
    if (quantityMoveRetry !== null) {
        console.log('✅ Найден ход для количественной стратегии:', quantityMoveRetry);
        return {
            nextMove: quantityMoveRetry,
            strategy: 'balanced',
            reason: 'Переключение на количественную стратегию'
        };
    }

    // Пробуем захват любых свободных стратегических позиций
    console.log('🔄 Пробую захват любых свободных стратегических позиций...');
    const anyStrategicMove = findAnyStrategicMove(boardState, goals);
    console.log('  Результат findAnyStrategicMove:', anyStrategicMove);
    if (anyStrategicMove !== null) {
        console.log('✅ Найден ход для захвата стратегической позиции:', anyStrategicMove);
        return {
            nextMove: anyStrategicMove,
            strategy: 'aggressive',
            reason: 'Захват доступной стратегической позиции'
        };
    }

    // Последняя попытка - любая свободная клетка с лучшей сложностью
    console.log('🔄 Последняя попытка - любая свободная клетка...');
    const bestAvailableMove = findBestAvailableMove(boardState, goals);
    console.log('✅ Выбран лучший доступный ход:', bestAvailableMove);

    // Дополнительная проверка - убеждаемся, что ход валидный
    if (bestAvailableMove === null || bestAvailableMove === undefined) {
        console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: bestAvailableMove равен null/undefined!');
        // Fallback на первую свободную клетку
        const fallbackCell = board.findIndex((_, index) => {
            const cellHits = hits[index] || [];
            return cellHits.length === 0;
        });
        console.log('🆘 Fallback на первую свободную клетку:', fallbackCell);
        return {
            nextMove: fallbackCell >= 0 ? fallbackCell : 0,
            strategy: 'balanced',
            reason: 'Критический fallback - первая свободная клетка'
        };
    }

    // Финальная проверка - убеждаемся, что ход в пределах доски
    if (bestAvailableMove < 0 || bestAvailableMove >= board.length) {
        console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: bestAvailableMove вне пределов доски!');
        // Fallback на первую свободную клетку
        const fallbackCell = board.findIndex((_, index) => {
            const cellHits = hits[index] || [];
            return cellHits.length === 0;
        });
        console.log('🆘 Fallback на первую свободную клетку:', fallbackCell);
        return {
            nextMove: fallbackCell >= 0 ? fallbackCell : 0,
            strategy: 'balanced',
            reason: 'Критический fallback - первая свободная клетка'
        };
    }

    // Финальная отладка - что именно возвращаем
    console.log('🎯 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:');
    console.log('  nextMove:', bestAvailableMove);
    console.log('  strategy: balanced');
    console.log('  reason: Лучший доступный ход из оставшихся');
    console.log('  Проверяем валидность:', {
        isValid: bestAvailableMove >= 0 && bestAvailableMove < board.length,
        boardLength: board.length,
        isFree: !hits[bestAvailableMove] || hits[bestAvailableMove].length === 0
    });

    return {
        nextMove: bestAvailableMove,
        strategy: 'balanced',
        reason: 'Лучший доступный ход из оставшихся'
    };
}

/**
 * Найти ход для завершения линии
 */
function findLineCompletionMove(
    boardState: BoardState,
    goals: Record<string, Goal>,
    botConfig: BotDifficultyConfig
): number | null {
    const { board, hits, size } = boardState;

    console.log('  findLineCompletionMove: начало поиска');

    // Анализируем все линии
    const analysis = analyzeBoard(boardState, goals);
    console.log('  Анализ доски:', analysis);
    console.log('  Прогресс бота:', analysis.botProgress);

    // Ищем линии, где у бота есть прогресс
    for (const lineInfo of analysis.botProgress) {
        console.log(`  Проверяю линию ${lineInfo.type} ${lineInfo.index}: прогресс ${lineInfo.progress}`);

        if (lineInfo.progress >= 3) { // Бот близок к победе
            console.log(`  ✅ Линия ${lineInfo.type} ${lineInfo.index} подходит для завершения!`);

            const indices = getLineIndices(lineInfo.type, lineInfo.index, size);
            console.log(`  Индексы клеток в линии:`, indices);

            const freeCells = indices.filter(cellIndex => {
                const cellHits = hits[cellIndex] || [];
                const isFree = cellHits.length === 0;
                console.log(`    Клетка ${cellIndex}: ${isFree ? 'свободна' : 'занята ' + cellHits.join(', ')}`);
                return isFree;
            });

            console.log(`  Свободные клетки в линии:`, freeCells);

            if (freeCells.length > 0) {
                // Сортируем по сложности (приоритет простым)
                const sortedCells = freeCells.sort((a, b) => {
                    const goalA = goals[board[a]];
                    const goalB = goals[board[b]];
                    const diffA = goalA?.difficulty || 2;
                    const diffB = goalB?.difficulty || 2;
                    console.log(`    Сравниваю клетки ${a} (сложность ${diffA}) и ${b} (сложность ${diffB})`);
                    return diffA - diffB;
                });

                const bestCell = sortedCells[0];
                console.log(`  🎯 Выбрана лучшая клетка: ${bestCell}`);
                return bestCell;
            } else {
                console.log(`  ❌ В линии ${lineInfo.type} ${lineInfo.index} нет свободных клеток`);
            }
        } else {
            console.log(`  ❌ Линия ${lineInfo.type} ${lineInfo.index}: прогресс ${lineInfo.progress} < 3`);
        }
    }

    console.log('  ❌ Не найдено подходящих линий для завершения');
    return null;
}

/**
 * Найти ход для блокировки игрока
 */
function findBlockingMove(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): number | null {
    const { board, hits, size } = boardState;

    console.log('  findBlockingMove: начало поиска');

    // Анализируем все линии
    const analysis = analyzeBoard(boardState, goals);
    console.log('  Анализ доски:', analysis);
    console.log('  Угрозы:', analysis.threats);

    // ПРИОРИТЕТ 1: КРИТИЧЕСКИЕ УГРОЗЫ - игроку осталась 1 клетка для бинго
    for (const threat of analysis.threats) {
        if (threat.progress >= 4) { // Игроку осталась 1 клетка!
            console.log(`  🚨 КРИТИЧЕСКАЯ УГРОЗА: ${threat.type} ${threat.index} - игроку осталась 1 клетка!`);

            const indices = getLineIndices(threat.type, threat.index, size);
            const freeCells = indices.filter(cellIndex => {
                const cellHits = hits[cellIndex] || [];
                return cellHits.length === 0;
            });

            if (freeCells.length > 0) {
                // Берем первую свободную клетку (срочно блокируем!)
                const blockingCell = freeCells[0];
                console.log(`  🚨 СРОЧНО БЛОКИРУЮ клетку ${blockingCell} в ${threat.type} ${threat.index}`);
                return blockingCell;
            }
        }
    }

    // ПРИОРИТЕТ 2: СЕРЬЕЗНЫЕ УГРОЗЫ - игроку осталось 2-3 клетки
    for (const threat of analysis.threats) {
        if (threat.progress >= 3 && threat.progress < 4) { // Игроку осталось 2-3 клетки
            console.log(`  ⚠️ СЕРЬЕЗНАЯ УГРОЗА: ${threat.type} ${threat.index} - игроку осталось ${5 - threat.progress} клетки`);

            const indices = getLineIndices(threat.type, threat.index, size);
            const freeCells = indices.filter(cellIndex => {
                const cellHits = hits[cellIndex] || [];
                return cellHits.length === 0;
            });

            if (freeCells.length > 0) {
                // Выбираем клетку с наименьшей сложностью для быстрой блокировки
                const sortedCells = freeCells.sort((a, b) => {
                    const goalA = goals[board[a]];
                    const goalB = goals[board[b]];
                    const diffA = goalA?.difficulty || 2;
                    const diffB = goalB?.difficulty || 2;
                    return diffA - diffB;
                });

                const blockingCell = sortedCells[0];
                console.log(`  ⚠️ Блокирую клетку ${blockingCell} в ${threat.type} ${threat.index} (сложность: ${goals[board[blockingCell]]?.difficulty || 'undefined'})`);
                return blockingCell;
            }
        }
    }

    // ПРИОРИТЕТ 3: ЛЕГКИЕ УГРОЗЫ - игроку осталось 4+ клетки (блокируем только если нет других вариантов)
    for (const threat of analysis.threats) {
        if (threat.progress >= 2 && threat.progress < 3) { // Игроку осталось 4+ клетки
            console.log(`  ℹ️ ЛЕГКАЯ УГРОЗА: ${threat.type} ${threat.index} - игроку осталось ${5 - threat.progress} клетки`);

            const indices = getLineIndices(threat.type, threat.index, size);
            const freeCells = indices.filter(cellIndex => {
                const cellHits = hits[cellIndex] || [];
                return cellHits.length === 0;
            });

            if (freeCells.length > 0) {
                // Выбираем клетку с наименьшей сложностью
                const sortedCells = freeCells.sort((a, b) => {
                    const goalA = goals[board[a]];
                    const goalB = goals[board[b]];
                    const diffA = goalA?.difficulty || 2;
                    const diffB = goalB?.difficulty || 2;
                    return diffA - diffB;
                });

                const blockingCell = sortedCells[0];
                console.log(`  ℹ️ Блокирую клетку ${blockingCell} в ${threat.type} ${threat.index} (сложность: ${goals[board[blockingCell]]?.difficulty || 'undefined'})`);
                return blockingCell;
            }
        }
    }

    console.log('  ❌ Угрозы для блокировки не найдены');
    return null;
}

/**
 * Найти ход для количественного бинго
 */
function findQuantityMove(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): number | null {
    const { board, hits, size } = boardState;

    console.log('  findQuantityMove: начало поиска');

    // Анализируем доску для понимания текущего состояния
    const analysis = analyzeBoard(boardState, goals);

    // Находим все свободные клетки
    const freeCells: number[] = [];
    for (let i = 0; i < board.length; i++) {
        const cellHits = hits[i] || [];
        if (cellHits.length === 0) {
            freeCells.push(i);
        }
    }

    console.log(`  Найдено свободных клеток: ${freeCells.length}`);
    console.log(`  Свободные клетки:`, freeCells);

    if (freeCells.length === 0) {
        console.log('  ❌ Нет свободных клеток');
        return null;
    }

    // ИСКЛЮЧАЕМ клетки, которые подходят для завершения линий
    const cellsForLines: number[] = [];

    // Проверяем, какие из свободных клеток могут завершить линии
    for (const cellIndex of freeCells) {
        // Проверяем, может ли эта клетка завершить какую-то линию
        const canCompleteLine = checkIfCellCanCompleteLine(cellIndex, boardState, goals);
        if (canCompleteLine) {
            cellsForLines.push(cellIndex);
        }
    }

    console.log(`  Клетки для завершения линий: ${cellsForLines.length}`);
    console.log(`  Клетки для количественного бинго: ${freeCells.length - cellsForLines.length}`);

    // ВАЖНО: Если все свободные клетки подходят для завершения линий, это НЕ значит, что количественное бинго не нужно!
    // Это значит, что бот заблокирован и должен выбрать лучшую клетку для количественного бинго
    if (cellsForLines.length === freeCells.length) {
        console.log('  ⚠️ Все свободные клетки подходят для завершения линий - бот заблокирован');
        console.log('  🔄 Переключаюсь на количественное бинго с приоритетом по сложности');

        // Сортируем все свободные клетки по сложности (приоритет простым)
        const sortedCells = freeCells.sort((a, b) => {
            const goalA = goals[board[a]];
            const goalB = goals[board[b]];
            const diffA = goalA?.difficulty || 2;
            const diffB = goalB?.difficulty || 2;
            return diffA - diffB;
        });

        const bestCell = sortedCells[0];
        console.log(`  🎯 Выбрана лучшая клетка для количественного бинго (заблокирован): ${bestCell} (цель: ${board[bestCell]}, сложность: ${goals[board[bestCell]]?.difficulty || 'undefined'})`);

        return bestCell;
    }

    // Фильтруем клетки, оставляя только те, которые НЕ подходят для линий
    const quantityCells = freeCells.filter(cellIndex => !cellsForLines.includes(cellIndex));

    if (quantityCells.length === 0) {
        console.log('  ⚠️ Нет клеток для количественного бинго - переключаюсь на любые свободные клетки');
        // Fallback: ищем любую свободную клетку
        const anyFreeCell = board.findIndex((_, index) => {
            const cellHits = hits[index] || [];
            return cellHits.length === 0;
        });
        if (anyFreeCell >= 0) {
            console.log(`  🆘 Fallback на любую свободную клетку: ${anyFreeCell}`);
            return anyFreeCell;
        }
        console.log('  ❌ Критическая ошибка: нет свободных клеток вообще!');
        return 0; // Последний fallback
    }

    // Сортируем по сложности (приоритет простым)
    const sortedCells = quantityCells.sort((a, b) => {
        const goalA = goals[board[a]];
        const goalB = goals[board[b]];
        const diffA = goalA?.difficulty || 2;
        const diffB = goalB?.difficulty || 2;
        console.log(`    Сравниваю клетки ${a} (цель ${board[a]}, сложность ${diffA}) и ${b} (цель ${board[b]}, сложность ${diffB})`);
        return diffA - diffB;
    });

    const bestCell = sortedCells[0];
    console.log(`  🎯 Выбрана лучшая клетка для количественного бинго: ${bestCell} (цель: ${board[bestCell]}, сложность: ${goals[board[bestCell]]?.difficulty || 'undefined'})`);

    return bestCell;
}

/**
 * Найти стратегический ход (центр или угол) с умным взвешиванием
 */
function findStrategicMove(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): number | null {
    const { board, hits, size } = boardState;
    const centerIndex = Math.floor(size * size / 2);
    const corners = [0, size - 1, size * (size - 1), size * size - 1];

    console.log('  findStrategicMove: проверяю стратегические позиции с взвешиванием');
    console.log(`  Центр: ${centerIndex}, углы: ${corners}`);

    // ПРИОРИТЕТ 1: Ищем ТОЛЬКО сложность 1 (самые простые задания)
    console.log('    ПРИОРИТЕТ 1: Ищу задания со сложностью 1...');

    // Проверяем центр со сложностью 1
    const centerHits = hits[centerIndex] || [];
    if (centerHits.length === 0) {
        const goalId = board[centerIndex];
        const goal = goals[goalId];
        if (goal && goal.difficulty === 1) {
            console.log(`  ✅ Центр (${centerIndex}): ${goal.text} (сложность: ${goal.difficulty}, вес: 3)`);
            return centerIndex;
        }
    }

    // Проверяем углы со сложностью 1
    for (const corner of corners) {
        const cornerHits = hits[corner] || [];
        if (cornerHits.length === 0) {
            const goalId = board[corner];
            const goal = goals[goalId];
            if (goal && goal.difficulty === 1) {
                console.log(`  ✅ Угол (${corner}): ${goal.text} (сложность: ${goal.difficulty}, вес: 2)`);
                return corner;
            }
        }
    }

    // ПРИОРИТЕТ 2: Если нет сложности 1, ищем сложность 2
    console.log('    ПРИОРИТЕТ 2: Ищу задания со сложностью 2...');

    // Собираем все стратегические позиции с их "весом"
    const strategicPositions: Array<{
        index: number;
        type: 'center' | 'corner' | 'edge';
        weight: number; // Вес позиции (центр = 3, углы = 2, края = 1)
        difficulty: number;
        goalText: string;
    }> = [];

    // Проверяем центр со сложностью 2
    if (centerHits.length === 0) {
        const goalId = board[centerIndex];
        const goal = goals[goalId];
        if (goal && goal.difficulty === 2) {
            strategicPositions.push({
                index: centerIndex,
                type: 'center',
                weight: 3,
                difficulty: goal.difficulty,
                goalText: goal.text
            });
            console.log(`  Центр (${centerIndex}): ${goal.text} (сложность: ${goal.difficulty}, вес: 3)`);
        }
    }

    // Проверяем углы со сложностью 2
    for (const corner of corners) {
        const cornerHits = hits[corner] || [];
        if (cornerHits.length === 0) {
            const goalId = board[corner];
            const goal = goals[goalId];
            if (goal && goal.difficulty === 2) {
                strategicPositions.push({
                    index: corner,
                    type: 'corner',
                    weight: 2,
                    difficulty: goal.difficulty,
                    goalText: goal.text
                });
                console.log(`  Угол (${corner}): ${goal.text} (сложность: ${goal.difficulty}, вес: 2)`);
            }
        }
    }

    // Если есть сложность 2, выбираем лучшую позицию
    if (strategicPositions.length > 0) {
        // Сортируем по весу позиции (центр > углы)
        strategicPositions.sort((a, b) => b.weight - a.weight);
        const bestPosition = strategicPositions[0];
        console.log(`  🎯 Выбрана лучшая стратегическая позиция: ${bestPosition.type} (${bestPosition.index})`);
        console.log(`    Задание: ${bestPosition.goalText} (сложность: ${bestPosition.difficulty}, вес: ${bestPosition.weight})`);
        return bestPosition.index;
    }

    // ПРИОРИТЕТ 3: Если нет сложности 1-2, ищем сложность 3 (только для очень сложных ботов)
    if (config.behavior.strategicMoveDifficultyThreshold >= 3) {
        console.log('    ПРИОРИТЕТ 3: Ищу задания со сложностью 3...');

        // Проверяем центр со сложностью 3
        if (centerHits.length === 0) {
            const goalId = board[centerIndex];
            const goal = goals[goalId];
            if (goal && goal.difficulty === 3) {
                console.log(`  ✅ Центр (${centerIndex}): ${goal.text} (сложность: ${goal.difficulty}, вес: 3)`);
                return centerIndex;
            }
        }

        // Проверяем углы со сложностью 3
        for (const corner of corners) {
            const cornerHits = hits[corner] || [];
            if (cornerHits.length === 0) {
                const goalId = board[corner];
                const goal = goals[goalId];
                if (goal && goal.difficulty === 3) {
                    console.log(`  ✅ Угол (${corner}): ${goal.text} (сложность: ${goal.difficulty}, вес: 2)`);
                    return corner;
                }
            }
        }
    }

    console.log('  ❌ Стратегические позиции не найдены');
    return null;
}

/**
 * Найти потенциальный ход для завершения линии (2+ клетки закрыты)
 */
function findPotentialLineMove(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): number | null {
    const { board, hits, size } = boardState;

    console.log('  findPotentialLineMove: начало поиска');

    // Анализируем все линии
    const analysis = analyzeBoard(boardState, goals);
    console.log('  Анализ доски:', analysis);
    console.log('  Прогресс бота:', analysis.botProgress);

    // ПРИОРИТЕТ 1: Диагонали (особенно важны для стратегии)
    const diagonalMoves = findDiagonalMoves(boardState, goals, config);
    if (diagonalMoves.length > 0) {
        // Сортируем диагональные ходы по приоритету: сначала по количеству закрытых клеток, потом по сложности
        diagonalMoves.sort((a, b) => {
            // Приоритет 1: больше закрытых клеток = выше приоритет
            if (a.closedCells !== b.closedCells) {
                return b.closedCells - a.closedCells;
            }
            // Приоритет 2: сложность (проще = выше приоритет)
            return a.difficulty - b.difficulty;
        });

        const bestDiagonalMove = diagonalMoves[0];
        console.log(`  🎯 Выбрана лучшая диагональная клетка: ${bestDiagonalMove.index} (закрыто: ${bestDiagonalMove.closedCells}, сложность: ${bestDiagonalMove.difficulty})`);
        return bestDiagonalMove.index;
    }

    // ПРИОРИТЕТ 2: Ряды и столбцы
    const lineMoves = findLineMoves(boardState, goals, config);
    if (lineMoves.length > 0) {
        // Сортируем по приоритету: сначала по количеству закрытых клеток, потом по сложности
        lineMoves.sort((a, b) => {
            if (a.closedCells !== b.closedCells) {
                return b.closedCells - a.closedCells;
            }
            return a.difficulty - b.difficulty;
        });

        const bestLineMove = lineMoves[0];
        console.log(`  🎯 Выбрана лучшая клетка для линии: ${bestLineMove.index} (закрыто: ${bestLineMove.closedCells}, сложность: ${bestLineMove.difficulty})`);
        return bestLineMove.index;
    }

    console.log('  ❌ Не найдено подходящих линий для потенциального завершения');
    return null;
}

/**
 * Найти ходы для диагоналей с приоритетом
 */
function findDiagonalMoves(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): Array<{
    index: number;
    type: 'diag';
    diagIndex: number;
    closedCells: number;
    difficulty: number;
    goalText: string;
}> {
    const { board, hits, size } = boardState;
    const moves: Array<{
        index: number;
        type: 'diag';
        diagIndex: number;
        closedCells: number;
        difficulty: number;
        goalText: string;
    }> = [];

    console.log('    Анализирую диагонали...');

    // Главная диагональ (0, 6, 12, 18, 24)
    const mainDiagIndices = [0, 6, 12, 18, 24];
    const mainDiagMoves = analyzeDiagonal(mainDiagIndices, 0, boardState, goals);
    moves.push(...mainDiagMoves);

    // Побочная диагональ (4, 8, 12, 16, 20)
    const antiDiagIndices = [4, 8, 12, 16, 20];
    const antiDiagMoves = analyzeDiagonal(antiDiagIndices, 1, boardState, goals);
    moves.push(...antiDiagMoves);

    console.log(`    Найдено диагональных ходов: ${moves.length}`);
    return moves;
}

/**
 * Анализировать конкретную диагональ
 */
function analyzeDiagonal(
    indices: number[],
    diagIndex: number,
    boardState: BoardState,
    goals: Record<string, Goal>
): Array<{
    index: number;
    type: 'diag';
    diagIndex: number;
    closedCells: number;
    difficulty: number;
    goalText: string;
}> {
    const { board, hits } = boardState;
    const moves: Array<{
        index: number;
        type: 'diag';
        diagIndex: number;
        closedCells: number;
        difficulty: number;
        goalText: string;
    }> = [];

    // Подсчитываем закрытые клетки в диагонали
    let closedCells = 0;
    let botCells = 0;
    let playerCells = 0;
    const botIndices: number[] = [];
    const playerIndices: number[] = [];

    for (const idx of indices) {
        const cellHits = hits[idx] || [];
        if (cellHits.length > 0) {
            closedCells++;

            if (cellHits.includes('bot')) {
                botCells++;
                botIndices.push(idx);
            } else {
                playerCells++;
                playerIndices.push(idx);
            }
        }
    }

    console.log(`      Диагональ ${diagIndex}: закрыто ${closedCells}/5 клеток (бот: ${botCells}, игрок: ${playerCells})`);

    // ПРОВЕРЯЕМ: если игрок заблокировал линию, то бот не может её завершить
    if (playerCells >= 2) {
        console.log(`      ❌ Диагональ ${diagIndex} заблокирована игроком (${playerCells} клетки), пропускаю`);
        return moves;
    }

    // ПРОВЕРЯЕМ: если центр занят игроком, то главная диагональ заблокирована
    if (diagIndex === 0 && playerIndices.includes(12)) { // Главная диагональ, центр (12) занят игроком
        console.log(`      ❌ Главная диагональ заблокирована игроком в центре, пропускаю`);
        return moves;
    }

    // ПРОВЕРЯЕМ: если углы заняты игроком, то диагонали заблокированы
    if (diagIndex === 0 && (playerIndices.includes(0) || playerIndices.includes(24))) { // Главная диагональ, углы заняты игроком
        console.log(`      ❌ Главная диагональ заблокирована игроком в углах, пропускаю`);
        return moves;
    }
    if (diagIndex === 1 && (playerIndices.includes(4) || playerIndices.includes(20))) { // Побочная диагональ, углы заняты игроком
        console.log(`      ❌ Побочная диагональ заблокирована игроком в углах, пропускаю`);
        return moves;
    }

    // Если в диагонали 2+ клетки закрыты И игрок не заблокировал, ищем возможности для завершения
    if (closedCells >= 2 && playerCells < 2) {
        console.log(`      ✅ Диагональ ${diagIndex} подходит для завершения`);

        // АНАЛИЗИРУЕМ ПОТЕНЦИАЛ ДИАГОНАЛИ
        if (botCells >= 2) {
            console.log(`        🎯 У бота ${botCells} клетки в диагонали ${diagIndex} - высокий потенциал!`);

            // Ищем свободные клетки в диагонали
            for (const idx of indices) {
                const cellHits = hits[idx] || [];
                if (cellHits.length === 0) { // Клетка свободна
                    const goalId = board[idx];
                    const goal = goals[goalId];
                    if (goal) {
                        moves.push({
                            index: idx,
                            type: 'diag',
                            diagIndex,
                            closedCells,
                            difficulty: goal.difficulty || 2,
                            goalText: goal.text
                        });
                        console.log(`          Клетка ${idx}: ${goal.text} (сложность: ${goal.difficulty})`);
                    }
                }
            }
        } else if (botCells === 1 && playerCells === 0) {
            console.log(`        ℹ️ У бота 1 клетка в диагонали ${diagIndex} - средний потенциал`);

            // Ищем свободные клетки в диагонали
            for (const idx of indices) {
                const cellHits = hits[idx] || [];
                if (cellHits.length === 0) { // Клетка свободна
                    const goalId = board[idx];
                    const goal = goals[goalId];
                    if (goal) {
                        moves.push({
                            index: idx,
                            type: 'diag',
                            diagIndex,
                            closedCells,
                            difficulty: goal.difficulty || 2,
                            goalText: goal.text
                        });
                        console.log(`          Клетка ${idx}: ${goal.text} (сложность: ${goal.difficulty})`);
                    }
                }
            }
        }
    } else {
        console.log(`      ❌ Диагональ ${diagIndex}: недостаточно клеток (${closedCells}) или заблокирована игроком`);
    }

    return moves;
}

/**
 * Найти ходы для рядов и столбцов
 */
function findLineMoves(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): Array<{
    index: number;
    type: 'row' | 'col';
    lineIndex: number;
    closedCells: number;
    difficulty: number;
    goalText: string;
}> {
    const { board, hits, size } = boardState;
    const moves: Array<{
        index: number;
        type: 'row' | 'col';
        lineIndex: number;
        closedCells: number;
        difficulty: number;
        goalText: string;
    }> = [];

    console.log('    Анализирую ряды и столбцы...');

    // Анализируем ряды
    for (let row = 0; row < size; row++) {
        const rowIndices: number[] = [];
        for (let col = 0; col < size; col++) {
            rowIndices.push(row * size + col);
        }
        const rowMoves = analyzeLineForMoves(rowIndices, 'row', row, boardState, goals);
        moves.push(...rowMoves);
    }

    // Анализируем столбцы
    for (let col = 0; col < size; col++) {
        const colIndices: number[] = [];
        for (let row = 0; row < size; row++) {
            colIndices.push(row * size + col);
        }
        const colMoves = analyzeLineForMoves(colIndices, 'col', col, boardState, goals);
        moves.push(...colMoves);
    }

    console.log(`    Найдено ходов для линий: ${moves.length}`);
    return moves;
}

/**
 * Анализировать конкретную линию (ряд или столбец) для поиска ходов
 */
function analyzeLineForMoves(
    indices: number[],
    type: 'row' | 'col',
    lineIndex: number,
    boardState: BoardState,
    goals: Record<string, Goal>
): Array<{
    index: number;
    type: 'row' | 'col';
    lineIndex: number;
    closedCells: number;
    difficulty: number;
    goalText: string;
}> {
    const { board, hits } = boardState;
    const moves: Array<{
        index: number;
        type: 'row' | 'col';
        lineIndex: number;
        closedCells: number;
        difficulty: number;
        goalText: string;
    }> = [];

    // Подсчитываем закрытые клетки в линии
    let closedCells = 0;
    let botCells = 0;
    let playerCells = 0;
    const botIndices: number[] = [];
    const playerIndices: number[] = [];

    for (const idx of indices) {
        const cellHits = hits[idx] || [];
        if (cellHits.length > 0) {
            closedCells++;

            if (cellHits.includes('bot')) {
                botCells++;
                botIndices.push(idx);
            } else {
                playerCells++;
                playerIndices.push(idx);
            }
        }
    }

    console.log(`      ${type} ${lineIndex}: закрыто ${closedCells}/5 клеток (бот: ${botCells}, игрок: ${playerCells})`);

    // ПРОВЕРЯЕМ: если игрок заблокировал линию, то бот не может её завершить
    if (playerCells >= 2) {
        console.log(`      ❌ ${type} ${lineIndex} заблокирован игроком (${playerCells} клетки), пропускаю`);
        return moves;
    }

    // Если в линии 2+ клетки закрыты И игрок не заблокировал, ищем возможности для завершения
    if (closedCells >= 2 && playerCells < 2) {
        console.log(`      ✅ ${type} ${lineIndex} подходит для завершения`);

        // АНАЛИЗИРУЕМ ПОТЕНЦИАЛ ЛИНИИ
        if (botCells >= 2) {
            console.log(`        🎯 У бота ${botCells} клетки в ${type} ${lineIndex} - высокий потенциал!`);

            // Ищем свободные клетки в линии
            for (const idx of indices) {
                const cellHits = hits[idx] || [];
                if (cellHits.length === 0) { // Клетка свободна
                    const goalId = board[idx];
                    const goal = goals[goalId];
                    if (goal) {
                        moves.push({
                            index: idx,
                            type,
                            lineIndex,
                            closedCells,
                            difficulty: goal.difficulty || 2,
                            goalText: goal.text
                        });
                        console.log(`          Клетка ${idx}: ${goal.text} (сложность: ${goal.difficulty})`);
                    }
                }
            }
        } else if (botCells === 1 && playerCells === 0) {
            console.log(`        ℹ️ У бота 1 клетка в ${type} ${lineIndex} - средний потенциал`);

            // Ищем свободные клетки в линии
            for (const idx of indices) {
                const cellHits = hits[idx] || [];
                if (cellHits.length === 0) { // Клетка свободна
                    const goalId = board[idx];
                    const goal = goals[goalId];
                    if (goal) {
                        moves.push({
                            index: idx,
                            type,
                            lineIndex,
                            closedCells,
                            difficulty: goal.difficulty || 2,
                            goalText: goal.text
                        });
                        console.log(`          Клетка ${idx}: ${goal.text} (сложность: ${goal.difficulty})`);
                    }
                }
            }
        }
    } else {
        console.log(`      ❌ ${type} ${lineIndex}: недостаточно клеток (${closedCells}) или заблокирован игроком`);
    }

    return moves;
}

// Вспомогательная функция для проверки, может ли клетка завершить линию
function checkIfCellCanCompleteLine(
    cellIndex: number,
    boardState: BoardState,
    goals: Record<string, Goal>
): boolean {
    const { board, hits, size } = boardState;

    // Получаем все линии, в которых участвует эта клетка
    const lines = getLinesForCell(cellIndex, size);

    for (const line of lines) {
        const indices = getLineIndices(line.type, line.index, size);

        // Подсчитываем прогресс для этой линии
        let botProgress = 0;
        let playerProgress = 0;

        for (const idx of indices) {
            const cellHits = hits[idx] || [];
            if (cellHits.includes('bot')) {
                botProgress++;
            } else if (cellHits.length > 0 && !cellHits.includes('bot')) {
                playerProgress++;
            }
        }

        // ВАЖНО: Проверяем, не заблокирована ли линия игроком
        if (playerProgress >= 2) {
            // Линия заблокирована игроком - бот не может её завершить
            continue; // Пропускаем эту линию, проверяем следующую
        }

        // Если бот может завершить линию (3+ клетки) или игрок близок к победе (3+ клетки)
        if (botProgress >= 3 || playerProgress >= 3) {
            return true;
        }

        // Дополнительная проверка: если у бота 2+ клетки и линия не заблокирована
        if (botProgress >= 2 && playerProgress < 2) {
            return true;
        }
    }

    return false;
}

// Вспомогательная функция для получения всех линий, в которых участвует клетка
function getLinesForCell(cellIndex: number, size: number): Array<{ type: LineType, index: number }> {
    const lines: Array<{ type: LineType, index: number }> = [];

    // Ряд
    const row = Math.floor(cellIndex / size);
    lines.push({ type: 'row', index: row });

    // Столбец
    const col = cellIndex % size;
    lines.push({ type: 'col', index: col });

    // Диагонали (если клетка на диагонали)
    if (row === col) {
        lines.push({ type: 'diag', index: 0 }); // Главная диагональ
    }
    if (row + col === size - 1) {
        lines.push({ type: 'diag', index: 1 }); // Побочная диагональ
    }

    return lines;
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/**
 * Получение индексов для линии (ряд/столбец/диагональ)
 */
export function getLineIndices(
    type: LineType,
    index: number,
    boardSize: number
): number[] {
    if (type === 'row') {
        // Для ряда: все клетки в одном ряду
        const startIndex = index * boardSize;
        return Array.from({ length: boardSize }, (_, i) => startIndex + i);
    } else if (type === 'col') {
        // Для столбца: все клетки в одном столбце
        return Array.from({ length: boardSize }, (_, i) => i * boardSize + index);
    } else if (type === 'diag') {
        if (index === 0) {
            // Главная диагональ: (0,0) -> (4,4)
            return Array.from({ length: boardSize }, (_, i) => i * boardSize + i);
        } else if (index === 1) {
            // Побочная диагональ: (0,4) -> (4,0)
            return Array.from({ length: boardSize }, (_, i) => i * boardSize + (boardSize - 1 - i));
        }
    }
    return [];
}

/**
 * Расчет прогресса в линии
 */
export function calculateLineProgress(
    lineIndices: number[],
    hits: Record<number, string[]>,
    playerUid: string
): number {
    // TODO: Реализовать расчет прогресса
    // - Подсчет закрытых клеток игроком
    // - Возврат числа от 0 до 5
    return 0
}

/**
 * Оценка сложности линии
 */
export function evaluateLineDifficulty(
    lineIndices: number[],
    board: string[],
    goals: Record<string, Goal>
): number {
    // TODO: Реализовать оценку сложности
    // - Средняя сложность заданий в линии
    // - Возврат числа от 1 до 3
    return 2
}

/**
 * Найти динамический ход для завершения линии между последними ходами бота
 */
function findDynamicLineMove(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): {
    index: number;
    type: LineType;
    lineIndex: number;
    potential: number;
    reason: string;
} | null {
    const { board, hits, size } = boardState;

    console.log('  findDynamicLineMove: начало поиска');

    // Находим все клетки бота
    const botCells: number[] = [];
    for (let i = 0; i < board.length; i++) {
        const cellHits = hits[i] || [];
        if (cellHits.includes('bot')) {
            botCells.push(i);
        }
    }

    if (botCells.length < 2) {
        console.log('    ❌ У бота меньше 2 клеток, динамический анализ не нужен');
        return null;
    }

    console.log(`    У бота ${botCells.length} клеток:`, botCells);

    // Анализируем все возможные линии между клетками бота
    const lineOpportunities: Array<{
        type: LineType;
        lineIndex: number;
        botCellsInLine: number[];
        freeCells: number[];
        averageDifficulty: number;
        potential: number;
    }> = [];

    // Анализируем ряды
    for (let row = 0; row < size; row++) {
        const rowIndices: number[] = [];
        for (let col = 0; col < size; col++) {
            rowIndices.push(row * size + col);
        }

        const botCellsInRow = botCells.filter(cell => Math.floor(cell / size) === row);
        if (botCellsInRow.length >= 2) {
            const freeCells = rowIndices.filter(cell => {
                const cellHits = hits[cell] || [];
                return cellHits.length === 0;
            });

            if (freeCells.length > 0) {
                const difficulties = freeCells.map(cell => {
                    const goalId = board[cell];
                    const goal = goals[goalId];
                    return goal?.difficulty || 2;
                });
                const averageDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
                const potential = botCellsInRow.length * (3 - averageDifficulty); // Больше клеток + проще = выше потенциал

                lineOpportunities.push({
                    type: 'row',
                    lineIndex: row,
                    botCellsInLine: botCellsInRow,
                    freeCells,
                    averageDifficulty,
                    potential
                });

                console.log(`      Ряд ${row}: бот ${botCellsInRow.length} клетки, свободно ${freeCells.length}, средняя сложность ${averageDifficulty.toFixed(1)}, потенциал ${potential.toFixed(1)}`);
            }
        }
    }

    // Анализируем столбцы
    for (let col = 0; col < size; col++) {
        const colIndices: number[] = [];
        for (let row = 0; row < size; row++) {
            colIndices.push(row * size + col);
        }

        const botCellsInCol = botCells.filter(cell => cell % size === col);
        if (botCellsInCol.length >= 2) {
            const freeCells = colIndices.filter(cell => {
                const cellHits = hits[cell] || [];
                return cellHits.length === 0;
            });

            if (freeCells.length > 0) {
                const difficulties = freeCells.map(cell => {
                    const goalId = board[cell];
                    const goal = goals[goalId];
                    return goal?.difficulty || 2;
                });
                const averageDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
                const potential = botCellsInCol.length * (3 - averageDifficulty);

                lineOpportunities.push({
                    type: 'col',
                    lineIndex: col,
                    botCellsInLine: botCellsInCol,
                    freeCells,
                    averageDifficulty,
                    potential
                });

                console.log(`      Столбец ${col}: бот ${botCellsInCol.length} клетки, свободно ${freeCells.length}, средняя сложность ${averageDifficulty.toFixed(1)}, потенциал ${potential.toFixed(1)}`);
            }
        }
    }

    // Анализируем диагонали
    if (size === 5) {
        // Главная диагональ (0, 6, 12, 18, 24)
        const mainDiagIndices = [0, 6, 12, 18, 24];
        const botCellsInMainDiag = botCells.filter(cell => mainDiagIndices.includes(cell));
        if (botCellsInMainDiag.length >= 2) {
            const freeCells = mainDiagIndices.filter(cell => {
                const cellHits = hits[cell] || [];
                return cellHits.length === 0;
            });

            if (freeCells.length > 0) {
                const difficulties = freeCells.map(cell => {
                    const goalId = board[cell];
                    const goal = goals[goalId];
                    return goal?.difficulty || 2;
                });
                const averageDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
                const potential = botCellsInMainDiag.length * (3 - averageDifficulty);

                lineOpportunities.push({
                    type: 'diag',
                    lineIndex: 0,
                    botCellsInLine: botCellsInMainDiag,
                    freeCells,
                    averageDifficulty,
                    potential
                });

                console.log(`      Главная диагональ: бот ${botCellsInMainDiag.length} клетки, свободно ${freeCells.length}, средняя сложность ${averageDifficulty.toFixed(1)}, потенциал ${potential.toFixed(1)}`);
            }
        }

        // Побочная диагональ (4, 8, 12, 16, 20)
        const antiDiagIndices = [4, 8, 12, 16, 20];
        const botCellsInAntiDiag = botCells.filter(cell => antiDiagIndices.includes(cell));
        if (botCellsInAntiDiag.length >= 2) {
            const freeCells = antiDiagIndices.filter(cell => {
                const cellHits = hits[cell] || [];
                return cellHits.length === 0;
            });

            if (freeCells.length > 0) {
                const difficulties = freeCells.map(cell => {
                    const goalId = board[cell];
                    const goal = goals[goalId];
                    return goal?.difficulty || 2;
                });
                const averageDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
                const potential = botCellsInAntiDiag.length * (3 - averageDifficulty);

                lineOpportunities.push({
                    type: 'diag',
                    lineIndex: 1,
                    botCellsInLine: botCellsInAntiDiag,
                    freeCells,
                    averageDifficulty,
                    potential
                });

                console.log(`      Побочная диагональ: бот ${botCellsInAntiDiag.length} клетки, свободно ${freeCells.length}, средняя сложность ${averageDifficulty.toFixed(1)}, потенциал ${potential.toFixed(1)}`);
            }
        }
    }

    if (lineOpportunities.length === 0) {
        console.log('    ❌ Нет возможностей для динамических линий');
        return null;
    }

    // Сортируем по потенциалу (высокий > низкий)
    lineOpportunities.sort((a, b) => b.potential - a.potential);

    const bestOpportunity = lineOpportunities[0];
    console.log(`    🎯 Лучшая возможность: ${bestOpportunity.type} ${bestOpportunity.lineIndex} (потенциал: ${bestOpportunity.potential.toFixed(1)})`);

    // Выбираем лучшую свободную клетку в этой линии
    const sortedFreeCells = bestOpportunity.freeCells.sort((a, b) => {
        const goalA = goals[board[a]];
        const goalB = goals[board[b]];
        const diffA = goalA?.difficulty || 2;
        const diffB = goalB?.difficulty || 2;
        return diffA - diffB; // Сначала простые
    });

    const bestCell = sortedFreeCells[0];
    console.log(`    🎯 Выбираю клетку ${bestCell} (сложность: ${goals[board[bestCell]]?.difficulty || 'undefined'})`);

    return {
        index: bestCell,
        type: bestOpportunity.type,
        lineIndex: bestOpportunity.lineIndex,
        potential: bestOpportunity.potential,
        reason: `Динамическая линия ${bestOpportunity.type} ${bestOpportunity.lineIndex} (потенциал: ${bestOpportunity.potential.toFixed(1)})`
    };
}

/**
 * Анализ угроз игрока и блокировки бота
 */
function analyzeThreats(
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): {
    playerThreats: Array<{
        type: LineType;
        lineIndex: number;
        progress: number;
        freeCells: number[];
        threatLevel: 'critical' | 'high' | 'medium' | 'low';
        shouldBlock: boolean;
    }>;
    botBlocked: Array<{
        type: LineType;
        lineIndex: number;
        reason: string;
    }>;
    recommendedAction: 'block' | 'continue' | 'switch';
} {
    const { board, hits, size } = boardState;

    console.log('  === АНАЛИЗ УГРОЗ ===');

    const playerThreats: Array<{
        type: LineType;
        lineIndex: number;
        progress: number;
        freeCells: number[];
        threatLevel: 'critical' | 'high' | 'medium' | 'low';
        shouldBlock: boolean;
    }> = [];

    const botBlocked: Array<{
        type: LineType;
        lineIndex: number;
        reason: string;
    }> = [];

    // Анализируем все линии на угрозы игрока
    console.log('    Анализирую угрозы игрока...');

    // Ряды
    for (let row = 0; row < size; row++) {
        const rowIndices: number[] = [];
        for (let col = 0; col < size; col++) {
            rowIndices.push(row * size + col);
        }

        const threat = analyzeLineThreat(rowIndices, 'row', row, boardState, goals, config);
        if (threat) {
            playerThreats.push(threat);
        }
    }

    // Столбцы
    for (let col = 0; col < size; col++) {
        const colIndices: number[] = [];
        for (let row = 0; row < size; row++) {
            colIndices.push(row * size + col);
        }

        const threat = analyzeLineThreat(colIndices, 'col', col, boardState, goals, config);
        if (threat) {
            playerThreats.push(threat);
        }
    }

    // Диагонали
    if (size === 5) {
        const mainDiagIndices: number[] = [0, 6, 12, 18, 24];
        const mainThreat = analyzeLineThreat(mainDiagIndices, 'diag', 0, boardState, goals, config);
        if (mainThreat) {
            playerThreats.push(mainThreat);
        }

        const antiDiagIndices: number[] = [4, 8, 12, 16, 20];
        const antiThreat = analyzeLineThreat(antiDiagIndices, 'diag', 1, boardState, goals, config);
        if (antiThreat) {
            playerThreats.push(antiThreat);
        }
    }

    // Анализируем блокировку бота
    console.log('    Анализирую блокировку бота...');

    // Ряды
    for (let row = 0; row < size; row++) {
        const rowIndices: number[] = [];
        for (let col = 0; col < size; col++) {
            rowIndices.push(row * size + col);
        }

        const blocked = analyzeBotBlocked(rowIndices, 'row', row, boardState);
        if (blocked) {
            botBlocked.push(blocked);
        }
    }

    // Столбцы
    for (let col = 0; col < size; col++) {
        const colIndices: number[] = [];
        for (let row = 0; row < size; row++) {
            colIndices.push(row * size + col);
        }

        const blocked = analyzeBotBlocked(colIndices, 'col', col, boardState);
        if (blocked) {
            botBlocked.push(blocked);
        }
    }

    // Диагонали
    if (size === 5) {
        const mainDiagIndices: number[] = [0, 6, 12, 18, 24];
        const mainBlocked = analyzeBotBlocked(mainDiagIndices, 'diag', 0, boardState);
        if (mainBlocked) {
            botBlocked.push(mainBlocked);
        }

        const antiDiagIndices: number[] = [4, 8, 12, 16, 20];
        const antiBlocked = analyzeBotBlocked(antiDiagIndices, 'diag', 1, boardState);
        if (antiBlocked) {
            botBlocked.push(antiBlocked);
        }
    }

    // Определяем рекомендуемое действие
    let recommendedAction: 'block' | 'continue' | 'switch' = 'continue';

    if (playerThreats.some(threat => threat.shouldBlock)) {
        recommendedAction = 'block';
    } else if (botBlocked.length > 0) {
        recommendedAction = 'switch';
    }

    console.log(`    Рекомендуемое действие: ${recommendedAction}`);
    console.log(`    Угроз игрока: ${playerThreats.length}`);
    console.log(`    Заблокированных линий бота: ${botBlocked.length}`);

    return {
        playerThreats,
        botBlocked,
        recommendedAction
    };
}

/**
 * Анализ угрозы в конкретной линии
 */
function analyzeLineThreat(
    indices: number[],
    type: LineType,
    lineIndex: number,
    boardState: BoardState,
    goals: Record<string, Goal>,
    config: BotDifficultyConfig
): {
    type: LineType;
    lineIndex: number;
    progress: number;
    freeCells: number[];
    threatLevel: 'critical' | 'high' | 'medium' | 'low';
    shouldBlock: boolean;
} | null {
    const { board, hits } = boardState;

    let playerProgress = 0;
    let botProgress = 0;
    const freeCells: number[] = [];

    for (const idx of indices) {
        const cellHits = hits[idx] || [];
        if (cellHits.length > 0) {
            if (cellHits.includes('bot')) {
                botProgress++;
            } else {
                playerProgress++;
            }
        } else {
            freeCells.push(idx);
        }
    }

    // Если у игрока нет прогресса, угрозы нет
    if (playerProgress === 0) {
        return null;
    }

    // Определяем уровень угрозы
    let threatLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
    let shouldBlock = false;

    if (playerProgress >= 4) {
        threatLevel = 'critical';
        shouldBlock = true; // Критическая угроза - блокируем всегда
    } else if (playerProgress === 3) {
        threatLevel = 'high';
        shouldBlock = Math.random() < config.behavior.blockPlayerChance; // Блокируем с вероятностью из конфига
    } else if (playerProgress === 2) {
        threatLevel = 'medium';
        shouldBlock = Math.random() < (config.behavior.blockPlayerChance * 0.5); // Меньшая вероятность
    } else {
        threatLevel = 'low';
        shouldBlock = false;
    }

    console.log(`      ${type} ${lineIndex}: игрок ${playerProgress}, бот ${botProgress}, угроза ${threatLevel}, блокировать: ${shouldBlock}`);

    return {
        type,
        lineIndex,
        progress: playerProgress,
        freeCells,
        threatLevel,
        shouldBlock
    };
}

/**
 * Анализ блокировки бота в конкретной линии
 */
function analyzeBotBlocked(
    indices: number[],
    type: LineType,
    lineIndex: number,
    boardState: BoardState
): {
    type: LineType;
    lineIndex: number;
    reason: string;
} | null {
    const { hits } = boardState;

    let botProgress = 0;
    let playerProgress = 0;

    for (const idx of indices) {
        const cellHits = hits[idx] || [];
        if (cellHits.length > 0) {
            if (cellHits.includes('bot')) {
                botProgress++;
            } else {
                playerProgress++;
            }
        }
    }

    // Если у бота нет прогресса, блокировки нет
    if (botProgress === 0) {
        return null;
    }

    // Проверяем, может ли бот завершить линию
    if (playerProgress >= 2) {
        return {
            type,
            lineIndex,
            reason: `Игрок заблокировал линию (${playerProgress} клетки)`
        };
    }

    // Проверяем специальные случаи для диагоналей
    if (type === 'diag') {
        if (lineIndex === 0) { // Главная диагональ
            if (hits[12] && !hits[12].includes('bot')) { // Центр занят игроком
                return {
                    type,
                    lineIndex,
                    reason: 'Центр занят игроком'
                };
            }
            if ((hits[0] && !hits[0].includes('bot')) || (hits[24] && !hits[24].includes('bot'))) { // Углы заняты игроком
                return {
                    type,
                    lineIndex,
                    reason: 'Углы заняты игроком'
                };
            }
        } else if (lineIndex === 1) { // Побочная диагональ
            if ((hits[4] && !hits[4].includes('bot')) || (hits[20] && !hits[20].includes('bot'))) { // Углы заняты игроком
                return {
                    type,
                    lineIndex,
                    reason: 'Углы заняты игроком'
                };
            }
        }
    }

    return null;
}

/**
 * Найти ход для блокировки угроз на основе анализа
 */
function findBlockingMoveFromThreats(
    playerThreats: Array<{
        type: LineType;
        lineIndex: number;
        progress: number;
        freeCells: number[];
        threatLevel: 'critical' | 'high' | 'medium' | 'low';
        shouldBlock: boolean;
    }>,
    boardState: BoardState,
    goals: Record<string, Goal>
): {
    index: number;
    reason: string;
} | null {
    const { board } = boardState;

    console.log('    findBlockingMoveFromThreats: начало поиска');

    // Сортируем угрозы по приоритету: критические > высокие > средние
    const sortedThreats = playerThreats
        .filter(threat => threat.shouldBlock)
        .sort((a, b) => {
            if (a.threatLevel === 'critical' && b.threatLevel !== 'critical') return -1;
            if (b.threatLevel === 'critical' && a.threatLevel !== 'critical') return 1;
            if (a.threatLevel === 'high' && b.threatLevel !== 'high') return -1;
            if (b.threatLevel === 'high' && a.threatLevel !== 'high') return 1;
            return b.progress - a.progress; // Больше прогресса = выше приоритет
        });

    if (sortedThreats.length === 0) {
        console.log('      ❌ Нет угроз для блокировки');
        return null;
    }

    // Берем самую критическую угрозу
    const topThreat = sortedThreats[0];
    console.log(`      🚨 Блокирую угрозу: ${topThreat.type} ${topThreat.lineIndex} (уровень: ${topThreat.threatLevel}, прогресс: ${topThreat.progress})`);
    console.log(`      📊 Детали угрозы:`, topThreat);
    console.log(`      🔍 Свободные клетки в угрозе:`, topThreat.freeCells);

    // Проверяем, есть ли свободные клетки для блокировки
    if (!topThreat.freeCells || topThreat.freeCells.length === 0) {
        console.log('      ❌ КРИТИЧЕСКАЯ ОШИБКА: Нет свободных клеток для блокировки!');
        console.log('      🔍 Это означает, что игрок уже заблокировал линию полностью');
        return null;
    }

    // Выбираем лучшую клетку для блокировки (по сложности)
    const sortedFreeCells = topThreat.freeCells.sort((a, b) => {
        const goalA = goals[board[a]];
        const goalB = goals[board[b]];
        const diffA = goalA?.difficulty || 2;
        const diffB = goalB?.difficulty || 2;
        return diffA - diffB; // Сначала простые
    });

    const bestBlockingCell = sortedFreeCells[0];
    const goal = goals[board[bestBlockingCell]];

    console.log(`      🎯 Выбираю клетку ${bestBlockingCell} для блокировки (сложность: ${goal?.difficulty || 'undefined'})`);

    return {
        index: bestBlockingCell,
        reason: `Блокирую ${topThreat.threatLevel} угрозу в ${topThreat.type} ${topThreat.lineIndex} (прогресс игрока: ${topThreat.progress})`
    };
}

// ===== ЭКСПОРТ =====

export default {
    simpleBotAI,
    createPlan,
    isPlanViolated,
    recalculatePlan,
    selectBestMove,
    determineStrategy,
    detectThreats,
    shouldBluff,
    selectRandomMove,
    analyzeBoard
}

/**
 * Умный fallback - находит лучшие клетки по сложности и позиции
 */
function findSmartFallbackMove(
    boardState: BoardState,
    goals: Record<string, Goal>
): number {
    const { board, hits, size } = boardState;

    console.log('  findSmartFallbackMove: начало поиска умного fallback');

    // Находим все свободные клетки
    const freeCells: number[] = [];
    for (let i = 0; i < board.length; i++) {
        const cellHits = hits[i] || [];
        if (cellHits.length === 0) {
            freeCells.push(i);
        }
    }

    if (freeCells.length === 0) {
        console.log('  ❌ Нет свободных клеток - это ошибка!');
        return 0;
    }

    console.log(`  Найдено свободных клеток: ${freeCells.length}`);

    // Группируем клетки по сложности
    const cellsByDifficulty: {
        difficulty1: number[];
        difficulty2: number[];
        difficulty3: number[];
        unknown: number[];
    } = {
        difficulty1: [],
        difficulty2: [],
        difficulty3: [],
        unknown: []
    };

    for (const cellIndex of freeCells) {
        const goalId = board[cellIndex];
        const goal = goals[goalId];

        if (goal?.difficulty === 1) {
            cellsByDifficulty.difficulty1.push(cellIndex);
        } else if (goal?.difficulty === 2) {
            cellsByDifficulty.difficulty2.push(cellIndex);
        } else if (goal?.difficulty === 3) {
            cellsByDifficulty.difficulty3.push(cellIndex);
        } else {
            cellsByDifficulty.unknown.push(cellIndex);
        }
    }

    console.log(`  Клетки по сложности: 1=${cellsByDifficulty.difficulty1.length}, 2=${cellsByDifficulty.difficulty2.length}, 3=${cellsByDifficulty.difficulty3.length}, неизвестно=${cellsByDifficulty.unknown.length}`);

    // Выбираем лучшие клетки по сложности
    let bestCells: number[] = [];

    if (cellsByDifficulty.difficulty1.length > 0) {
        bestCells = cellsByDifficulty.difficulty1;
        console.log('  🎯 Использую клетки со сложностью 1');
    } else if (cellsByDifficulty.difficulty2.length > 0) {
        bestCells = cellsByDifficulty.difficulty2;
        console.log('  🎯 Использую клетки со сложностью 2');
    } else if (cellsByDifficulty.difficulty3.length > 0) {
        bestCells = cellsByDifficulty.difficulty3;
        console.log('  🎯 Использую клетки со сложностью 3');
    } else {
        bestCells = cellsByDifficulty.unknown;
        console.log('  🎯 Использую клетки с неизвестной сложностью');
    }

    if (bestCells.length === 0) {
        console.log('  ❌ Нет подходящих клеток, возвращаю первую свободную');
        return freeCells[0];
    }

    // Сортируем лучшие клетки по приоритету позиции
    const sortedCells = bestCells.sort((a, b) => {
        const priorityA = getCellPriority(a, size);
        const priorityB = getCellPriority(b, size);
        return priorityB - priorityA; // Высокий приоритет > низкий
    });

    const bestCell = sortedCells[0];
    const goal = goals[board[bestCell]];
    const priority = getCellPriority(bestCell, size);

    console.log(`  🎯 Выбрана лучшая клетка: ${bestCell} (сложность: ${goal?.difficulty || 'undefined'}, приоритет позиции: ${priority})`);

    return bestCell;
}

/**
 * Вычисляет приоритет позиции клетки
 */
function getCellPriority(cellIndex: number, size: number): number {
    const row = Math.floor(cellIndex / size);
    const col = cellIndex % size;

    // Углы - высший приоритет
    if ((row === 0 || row === size - 1) && (col === 0 || col === size - 1)) {
        return 5;
    }

    // Центр - высокий приоритет
    if (row === Math.floor(size / 2) && col === Math.floor(size / 2)) {
        return 4;
    }

    // Края - средний приоритет
    if (row === 0 || row === size - 1 || col === 0 || col === size - 1) {
        return 3;
    }

    // Диагональные клетки (не углы) - средний приоритет
    if (row === col || row + col === size - 1) {
        return 2;
    }

    // Остальные клетки - низкий приоритет
    return 1;
}

/**
 * Найти любую доступную стратегическую позицию
 */
function findAnyStrategicMove(
    boardState: BoardState,
    goals: Record<string, Goal>
): number | null {
    const { board, hits, size } = boardState;

    console.log('  findAnyStrategicMove: ищу любую доступную стратегическую позицию');

    // Определяем стратегические позиции (углы, центр, края)
    const strategicPositions: number[] = [];

    // Углы
    strategicPositions.push(0, size - 1, (size - 1) * size, size * size - 1);

    // Центр
    const centerIndex = Math.floor(size / 2) * size + Math.floor(size / 2);
    strategicPositions.push(centerIndex);

    // Края (исключая углы)
    for (let i = 1; i < size - 1; i++) {
        strategicPositions.push(i); // Верхний край
        strategicPositions.push(i * size); // Левый край
        strategicPositions.push((i + 1) * size - 1); // Правый край
        strategicPositions.push((size - 1) * size + i); // Нижний край
    }

    // Убираем дубликаты
    const uniqueStrategicPositions = [...new Set(strategicPositions)];

    // Ищем свободные стратегические позиции
    const freeStrategicPositions = uniqueStrategicPositions.filter(index => {
        const cellHits = hits[index] || [];
        return cellHits.length === 0;
    });

    if (freeStrategicPositions.length === 0) {
        console.log('  ⚠️ Нет свободных стратегических позиций - переключаюсь на любые свободные клетки');
        // Fallback: ищем любую свободную клетку
        const anyFreeCell = board.findIndex((_, index) => {
            const cellHits = hits[index] || [];
            return cellHits.length === 0;
        });
        if (anyFreeCell >= 0) {
            console.log(`  🆘 Fallback на любую свободную клетку: ${anyFreeCell}`);
            return anyFreeCell;
        }
        console.log('  ❌ Критическая ошибка: нет свободных клеток вообще!');
        return 0; // Последний fallback
    }

    // Сортируем по сложности и приоритету позиции
    const sortedPositions = freeStrategicPositions.sort((a, b) => {
        const goalA = goals[board[a]];
        const goalB = goals[board[b]];
        const diffA = goalA?.difficulty || 2;
        const diffB = goalB?.difficulty || 2;

        if (diffA !== diffB) {
            return diffA - diffB; // Сначала по сложности
        }

        // Если сложность одинаковая, по приоритету позиции
        const priorityA = getCellPriority(a, size);
        const priorityB = getCellPriority(b, size);
        return priorityB - priorityA;
    });

    const bestPosition = sortedPositions[0];
    const goal = goals[board[bestPosition]];
    const priority = getCellPriority(bestPosition, size);

    console.log(`  🎯 Выбрана лучшая стратегическая позиция: ${bestPosition} (сложность: ${goal?.difficulty || 'undefined'}, приоритет: ${priority})`);

    return bestPosition;
}

/**
 * Найти лучший доступный ход из оставшихся
 */
function findBestAvailableMove(
    boardState: BoardState,
    goals: Record<string, Goal>
): number {
    const { board, hits } = boardState;

    console.log('  findBestAvailableMove: ищу лучший доступный ход');

    // Находим все свободные клетки
    const freeCells: number[] = [];
    for (let i = 0; i < board.length; i++) {
        const cellHits = hits[i] || [];
        if (cellHits.length === 0) {
            freeCells.push(i);
        }
    }

    if (freeCells.length === 0) {
        console.log('  ❌ Нет свободных клеток - это ошибка!');
        return 0;
    }

    console.log(`  Найдено свободных клеток: ${freeCells.length}`);

    // Сортируем по сложности (приоритет простым)
    const sortedCells = freeCells.sort((a, b) => {
        const goalA = goals[board[a]];
        const goalB = goals[board[b]];
        const diffA = goalA?.difficulty || 2;
        const diffB = goalB?.difficulty || 2;
        return diffA - diffB;
    });

    const bestCell = sortedCells[0];
    const goal = goals[board[bestCell]];

    console.log(`  🎯 Выбран лучший доступный ход: ${bestCell} (сложность: ${goal?.difficulty || 'undefined'})`);

    return bestCell;
}
