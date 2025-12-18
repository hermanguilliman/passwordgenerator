<script lang="ts">
    import { onMount } from "svelte";

    export let originalText: string = "ГЕНЕРАТОР ПАРОЛЕЙ";
    export let glitchProbability: number = 0.1;
    export let minGlitches: number = 1;
    export let maxGlitches: number = 3;
    export let resetDelay: number = 150;

    const GLITCH_CHARS: string = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const INTERVAL_MS: number = 100;

    interface ColoredChar {
        char: string;
        color?: string;
    }

    let displayChars: ColoredChar[] = originalText
        .split("")
        .map((char) => ({ char }));

    const getRandomInt = (min: number, max: number): number => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const getRandomColor = (): string => {
        const neonColors = [
            "#ff00ff",
            "#00ff00",
            "#00ffff",
            "#ff0000",
            "#ffff00",
            "#0000ff",
        ];
        return neonColors[Math.floor(Math.random() * neonColors.length)];
    };

    const glitchText = (): void => {
        const shouldGlitch: boolean = Math.random() < glitchProbability;

        if (shouldGlitch) {
            const newDisplayChars: ColoredChar[] = originalText
                .split("")
                .map((char) => ({ char }));
            const numGlitches: number = getRandomInt(minGlitches, maxGlitches);

            for (let i = 0; i < numGlitches; i++) {
                const position: number = getRandomInt(
                    0,
                    originalText.length - 1
                );
                const glitchChar: string =
                    GLITCH_CHARS[getRandomInt(0, GLITCH_CHARS.length - 1)];
                newDisplayChars[position] = {
                    char: glitchChar,
                    color: getRandomColor(),
                };
            }

            displayChars = newDisplayChars;

            setTimeout(() => {
                displayChars = originalText.split("").map((char) => ({ char }));
            }, resetDelay);
        }
    };

    let interval: ReturnType<typeof setInterval>;

    onMount(() => {
        interval = setInterval(glitchText, INTERVAL_MS);
        return () => clearInterval(interval);
    });
</script>

<header>
    <div class="header-border">
        <h1>
            {#each displayChars as { char, color }}
                <span
                    class="char"
                    style={color
                        ? `color: ${color}; text-shadow: 0 0 8px ${color};`
                        : ""}>{char}</span
                >
            {/each}
        </h1>
    </div>
</header>

<style>
    header {
        width: 100%;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: center;
        /* Предотвращает появление горизонтальной прокрутки, если глюк будет сильным */
        overflow: hidden;
    }

    .header-border {
        border-bottom: 2px solid var(--toxic-green);
        padding: 0.5rem 1rem; /* Уменьшили боковые отступы */
        position: relative;
        background: rgba(0, 0, 0, 0.3);
        display: inline-block; /* Контейнер сжимается по ширине текста */
    }

    /* Декоративные уголки */
    .header-border::before,
    .header-border::after {
        content: "";
        position: absolute;
        bottom: -6px;
        width: 6px;
        height: 6px;
        background: var(--toxic-green);
    }
    .header-border::before {
        left: 0;
    }
    .header-border::after {
        right: 0;
    }

    h1 {
        font-family: var(--font-main);
        font-weight: 700;
        /* Уменьшили размер: было до 3rem, стало макс 2.2rem */
        font-size: clamp(1.2rem, 5vw, 2.2rem);
        margin: 0;
        letter-spacing: normal;
        line-height: 1;
        /* КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Запрещаем перенос строк */
        white-space: nowrap;
    }

    .char {
        display: inline-block;
        /* Фиксируем ширину каждого символа равной 1 знаку (моноширинность) */
        /* Это предотвращает "дрожание" ширины строки при смене символов */
        width: 1ch;
        text-align: center;
    }
</style>
