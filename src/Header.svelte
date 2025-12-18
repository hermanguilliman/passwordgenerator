<script lang="ts">
    import { onMount } from "svelte";

    export let originalText: string = "ГЕНЕРАТОР ПАРОЛЕЙ";
    // ... (Остальной код скрипта оставлен без изменений, логика глюка отличная)
    export let glitchProbability: number = 0.1;
    export let minGlitches: number = 1;
    export let maxGlitches: number = 3;
    export let resetDelay: number = 150;

    const GLITCH_CHARS: string = "!@#$%^&*()_+-=[]{}|;:,.<>?`~";
    const INTERVAL_MS: number = 100;

    interface ColoredChar {
        char: string;
        color?: string;
    }

    let displayChars: ColoredChar[] = originalText
        .split("")
        .map((char) => ({ char }));

    // ... (функции getRandomInt, getRandomColor, glitchText, onMount - без изменений)
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
        <div class="scan-line"></div>
    </div>
</header>

<style>
    header {
        font-family: var(--font-main);
        width: 100%;
        margin-bottom: 2rem;
        display: flex;
        justify-content: center;
    }

    .header-border {
        border-bottom: 2px solid var(--toxic-green);
        padding: 0.5rem 2rem;
        position: relative;
        background: rgba(0, 0, 0, 0.3);
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
        font-weight: 800; /* Самый жирный для заголовка */
        letter-spacing: -1px; /* Чуть плотнее */
        font-size: clamp(1.5rem, 5vw, 3rem);
        margin: 0;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        line-height: 1;
    }

    .char {
        display: inline-block;
        min-width: 0.6ch;
    }
</style>
