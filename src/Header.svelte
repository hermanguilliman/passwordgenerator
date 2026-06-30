<script lang="ts">
    import { onMount } from "svelte";

    // --- Тема ---
    type Theme = "dark" | "light";
    let theme: Theme = "dark";

    const applyTheme = (t: Theme): void => {
        theme = t;
        document.documentElement.setAttribute("data-theme", t);
        try {
            localStorage.setItem("gpass_theme", t);
        } catch {
            /* localStorage недоступен — игнорируем */
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta)
            meta.setAttribute("content", t === "light" ? "#f5f5f5" : "#000000");
    };

    // --- Glitch-эффект заголовка ---
    export let originalText: string = "G-PASS";
    export let glitchProbability: number = 0.12;
    export let minGlitches: number = 1;
    export let maxGlitches: number = 2;
    export let resetDelay: number = 140;

    const GLITCH_CHARS: string = "!@#$%^&*()_+-=[]{}|;:,.<>?/\\01";
    const INTERVAL_MS: number = 100;

    interface ColoredChar {
        char: string;
        color?: string;
    }

    let displayChars: ColoredChar[] = originalText
        .split("")
        .map((char) => ({ char }));

    const getRandomInt = (min: number, max: number): number =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    const getRandomColor = (): string => {
        const neonColors = [
            "#9ef523",
            "#00ffff",
            "#ff00ff",
            "#ffff00",
            "#ff3b3b",
            "#ffffff",
        ];
        return neonColors[Math.floor(Math.random() * neonColors.length)];
    };

    const glitchText = (): void => {
        if (Math.random() >= glitchProbability) return;

        const next: ColoredChar[] = originalText
            .split("")
            .map((char) => ({ char }));
        const numGlitches: number = getRandomInt(minGlitches, maxGlitches);

        for (let i = 0; i < numGlitches; i++) {
            const position: number = getRandomInt(0, originalText.length - 1);
            const glitchChar: string =
                GLITCH_CHARS[getRandomInt(0, GLITCH_CHARS.length - 1)];
            next[position] = { char: glitchChar, color: getRandomColor() };
        }

        displayChars = next;
        setTimeout(() => {
            displayChars = originalText.split("").map((char) => ({ char }));
        }, resetDelay);
    };

    onMount(() => {
        const current = document.documentElement.getAttribute("data-theme");
        theme = current === "light" ? "light" : "dark";

        const interval = setInterval(glitchText, INTERVAL_MS);
        return () => clearInterval(interval);
    });
</script>

<header class="topbar">
    <div class="brand">
        <span class="status-dot" aria-hidden="true"></span>
        <div class="brand-text">
            <h1 class="wordmark" aria-label={originalText}>
                {#each displayChars as { char, color }}
                    <span
                        class="char"
                        style={color
                            ? `color: ${color}; text-shadow: 0 0 10px ${color};`
                            : ""}>{char}</span
                    >
                {/each}
            </h1>
            <p class="tagline">TERMINAL · ГЕНЕРАТОР ПАРОЛЕЙ</p>
        </div>
    </div>

    <div
        class="theme-toggle"
        role="group"
        aria-label="Переключатель темы оформления"
    >
        <button
            class:active={theme === "dark"}
            aria-pressed={theme === "dark"}
            on:click={() => applyTheme("dark")}>DARK</button
        >
        <button
            class:active={theme === "light"}
            aria-pressed={theme === "light"}
            on:click={() => applyTheme("light")}>LIGHT</button
        >
    </div>
</header>

<style>
    .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-md);
        flex-wrap: wrap;
        padding-bottom: var(--space-lg);
        margin-bottom: var(--space-xl);
        border-bottom: 2px solid var(--border-visible);
    }

    .brand {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        min-width: 0;
    }

    .status-dot {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--accent);
        animation: pulse 2.4s var(--motion) infinite;
    }

    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(158, 245, 35, 0.55);
        }
        70% {
            box-shadow: 0 0 0 9px rgba(158, 245, 35, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(158, 245, 35, 0);
        }
    }

    .brand-text {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .wordmark {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: var(--display-md);
        line-height: 0.95;
        letter-spacing: 0.01em;
        color: var(--text-display);
        white-space: nowrap;
    }

    .char {
        display: inline-block;
        width: 1ch;
        text-align: center;
    }

    .tagline {
        margin: 0;
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Сегментный переключатель темы */
    .theme-toggle {
        display: inline-flex;
        border: 2px solid var(--border-visible);
        border-radius: 999px;
        padding: 3px;
        flex-shrink: 0;
    }

    .theme-toggle button {
        background: transparent;
        border: none;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        padding: 10px 18px;
        border-radius: 999px;
        transition:
            color 0.2s var(--motion),
            background 0.2s var(--motion);
    }

    .theme-toggle button:hover {
        color: var(--text-primary);
    }

    .theme-toggle button.active {
        background: var(--text-display);
        color: var(--black);
    }

    @media (max-width: 480px) {
        .topbar {
            margin-bottom: var(--space-lg);
        }
        .wordmark {
            font-size: 2rem;
        }
    }
</style>
