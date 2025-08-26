/**
 * Bot_Config.ts - Конфигурация бота для TinyBingo v2.0
 * 
 * Содержит настройки для каждого уровня сложности:
 * - Временные интервалы между ходами
 * - Агрессивность игры
 * - Вероятность блефа
 * - Глубина планирования
 * - Приоритеты стратегий
 */

export interface BotDifficultyConfig {
    // Временные интервалы (в миллисекундах)
    timing: {
        minInterval: number;  // Минимальный интервал между ходами
        maxInterval: number;  // Максимальный интервал между ходами
        firstMoveDelay?: number; // Задержка первого хода (опционально)
    };

    // Поведение ИИ
    behavior: {
        aggressiveness: number;        // 0-1: насколько агрессивно играет
        defensiveness: number;         // 0-1: насколько активно защищается
        planningDepth: number;         // Глубина планирования (количество ходов)
        bluffChance: number;           // 0-1: вероятность случайного хода
        threatResponseThreshold: number; // 0-5: при каком прогрессе игрока блокировать
        blockPlayerChance: number; // Вероятность помешать игроку (0-1)
        strategicMoveDifficultyThreshold: number; // Максимальная сложность для стратегических ходов
    };

    // Стратегические приоритеты
    strategy: {
        lineCompletionPriority: number;
        blockingPriority: number;
        quantityBingoPriority: number;
        difficultyPreference: number;
        preferLineCompletion: number; // Приоритет завершения линий (0-1)
        preferBlocking: number; // Приоритет блокировки игрока (0-1)
    };

    // Адаптивность
    adaptation: {
        planChangeThreshold: number;       // 0-1: когда менять план
        strategySwitchFrequency: number;   // 0-1: частота смены стратегии
        learningRate: number;              // 0-1: скорость обучения на ошибках
    };
}

export type BotDifficulty = 'test' | 'easy' | 'medium' | 'hard';

export const BOT_CONFIGS: Record<BotDifficulty, BotDifficultyConfig> = {
    test: {
        timing: {
            minInterval: 10_000,      // 10 секунд
            maxInterval: 30_000,      // 30 секунд
            firstMoveDelay: 1_000     // Первый ход через 1 секунду
        },
        behavior: {
            aggressiveness: 0.5,      // Средняя агрессивность
            defensiveness: 0.5,       // Средняя защита
            planningDepth: 1,         // Планирование на 1 ход
            bluffChance: 0.1,         // 10% случайных ходов
            threatResponseThreshold: 4, // Блокировать только при 4+ клетках игрока
            blockPlayerChance: 0.1,    // Вероятность помешать игроку (0-1)
            strategicMoveDifficultyThreshold: 0.5 // Максимальная сложность для стратегических ходов
        },
        strategy: {
            lineCompletionPriority: 0.3,   // Низкий приоритет линий
            blockingPriority: 0.2,         // Низкий приоритет блокировки
            quantityBingoPriority: 0.8,    // Высокий приоритет количества
            difficultyPreference: 0.6,     // Умеренное предпочтение простых
            preferLineCompletion: 0.3,
            preferBlocking: 0.2
        },
        adaptation: {
            planChangeThreshold: 0.5,      // Умеренно меняет планы
            strategySwitchFrequency: 0.3,  // Редко меняет стратегию
            learningRate: 0.3              // Медленно учится
        }
    },

    easy: {
        timing: {
            minInterval: 20 * 60_000, // 20 минут
            maxInterval: 40 * 60_000, // 40 минут
            firstMoveDelay: 15 * 60_000     // Первый ход через 15 минут
        },
        behavior: {
            aggressiveness: 0.4,      // Низкая агрессивность
            defensiveness: 0.3,       // Низкая защита
            planningDepth: 2,         // Планирование на 2 хода
            bluffChance: 0.40,         // 40% случайных ходов
            threatResponseThreshold: 4, // Блокировать только при 4+ клетках игрока
            blockPlayerChance: 0.2,    // Вероятность помешать игроку (0-1)
            strategicMoveDifficultyThreshold: 0.3 // Максимальная сложность для стратегических ходов
        },
        strategy: {
            lineCompletionPriority: 0.3,   // Низкий приоритет линий
            blockingPriority: 0.2,         // Низкий приоритет блокировки
            quantityBingoPriority: 0.8,    // Высокий приоритет количества
            difficultyPreference: 0.6,     // Умеренное предпочтение простых
            preferLineCompletion: 0.3,
            preferBlocking: 0.2
        },
        adaptation: {
            planChangeThreshold: 0.5,      // Умеренно меняет планы
            strategySwitchFrequency: 0.3,  // Редко меняет стратегию
            learningRate: 0.3              // Медленно учится
        }
    },

    medium: {
        timing: {
            minInterval: 15 * 60_000, // 15 минут
            maxInterval: 30 * 60_000, // 30 минут
            firstMoveDelay: 10 * 60_000     // Первый ход через 10 минут
        },
        behavior: {
            aggressiveness: 0.6,      // Средняя агрессивность
            defensiveness: 0.5,       // Средняя защита
            planningDepth: 3,         // Планирование на 3 хода
            bluffChance: 0.3,         // 30% случайных ходов
            threatResponseThreshold: 3, // Блокировать при 3+ клетках игрока
            blockPlayerChance: 0.4,    // Вероятность помешать игроку (0-1)
            strategicMoveDifficultyThreshold: 0.7 // Максимальная сложность для стратегических ходов
        },
        strategy: {
            lineCompletionPriority: 0.6,   // Средний приоритет линий
            blockingPriority: 0.4,         // Средний приоритет блокировки
            quantityBingoPriority: 0.6,    // Средний приоритет количества
            difficultyPreference: 0.7,     // Высокое предпочтение простых
            preferLineCompletion: 0.6,
            preferBlocking: 0.4
        },
        adaptation: {
            planChangeThreshold: 0.4,      // Часто меняет планы
            strategySwitchFrequency: 0.5,  // Умеренно меняет стратегию
            learningRate: 0.5              // Быстро учится
        }
    },

    hard: {
        timing: {
            minInterval: 10_000,//10 * 60_000,  // 10 минут
            maxInterval: 20_000,//20 * 60_000,  // 20 минут
            firstMoveDelay: 2_000      // Первый ход через 2 секунды
        },
        behavior: {
            aggressiveness: 0.9,      // Очень высокая агрессивность
            defensiveness: 0.8,       // Очень высокая защита
            planningDepth: 5,         // Планирование на 5 ходов
            bluffChance: 0.1,         // 10% случайных ходов
            threatResponseThreshold: 4, // Блокировать при 3+ клетках игрока
            blockPlayerChance: 0.9,    // Вероятность помешать игроку (0-1)
            strategicMoveDifficultyThreshold: 0.9 // Максимальная сложность для стратегических ходов
        },
        strategy: {
            lineCompletionPriority: 0.9,   // Очень высокий приоритет линий
            blockingPriority: 0.9,         // Очень высокий приоритет блокировки
            quantityBingoPriority: 0.2,    // Низкий приоритет количества
            difficultyPreference: 0.9,     // Низкое предпочтение простых
            preferLineCompletion: 0.9,
            preferBlocking: 0.9
        },
        adaptation: {
            planChangeThreshold: 0.3,      // Очень часто меняет планы
            strategySwitchFrequency: 0.7,  // Часто меняет стратегию
            learningRate: 0.7              // Очень быстро учится
        }
    }
};

/**
 * Получить конфигурацию для конкретного уровня сложности
 */
export function getBotConfig(difficulty: BotDifficulty): BotDifficultyConfig {
    return BOT_CONFIGS[difficulty];
}

/**
 * Получить случайный интервал времени для хода бота
 */
export function getRandomInterval(difficulty: BotDifficulty): number {
    const config = getBotConfig(difficulty);
    const { minInterval, maxInterval } = config.timing;
    return minInterval + Math.random() * (maxInterval - minInterval);
}

/**
 * Получить задержку первого хода
 */
export function getFirstMoveDelay(difficulty: BotDifficulty): number {
    const config = getBotConfig(difficulty);
    return config.timing.firstMoveDelay || 0;
}

/**
 * Проверить, должен ли бот блокировать угрозу
 */
export function shouldBlockThreat(difficulty: BotDifficulty, playerProgress: number): boolean {
    const config = getBotConfig(difficulty);
    return playerProgress >= config.behavior.threatResponseThreshold;
}

/**
 * Получить приоритет стратегии
 */
export function getStrategyPriority(difficulty: BotDifficulty, strategy: keyof BotDifficultyConfig['strategy']): number {
    const config = getBotConfig(difficulty);
    return config.strategy[strategy];
}

/**
 * Проверить, нужно ли менять план
 */
export function shouldChangePlan(difficulty: BotDifficulty, planViolationLevel: number): boolean {
    const config = getBotConfig(difficulty);
    return planViolationLevel >= config.adaptation.planChangeThreshold;
}

/**
 * Получить вероятность смены стратегии
 */
export function getStrategySwitchProbability(difficulty: BotDifficulty): number {
    const config = getBotConfig(difficulty);
    return config.adaptation.strategySwitchFrequency;
}

export default BOT_CONFIGS;
