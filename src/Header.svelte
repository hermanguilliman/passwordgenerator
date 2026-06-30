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

    <button
        class="skull-switch {theme}"
        role="switch"
        aria-checked={theme === "light"}
        aria-label="Переключить тему оформления"
        title={theme === "dark" ? "Тема: тёмная" : "Тема: светлая"}
        on:click={() => applyTheme(theme === "dark" ? "light" : "dark")}
    >
        <span class="track">
            <span class="lab lab-dark">DARK</span>
            <span class="lab lab-light">LIGHT</span>
            <span class="thumb">
                <svg
                    class="skull"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        fill="currentColor"
                        d="M12 2.5c-4.7 0-8 3.2-8 7.7 0 2.3 1 4 2.2 5.1.5.5.8.8.8 1.5v1.4c0 .9.7 1.6 1.6 1.6h.4v-1.6c0-.4.3-.7.7-.7s.7.3.7.7V19h1.8v-1.6c0-.4.3-.7.7-.7s.7.3.7.7V19h.4c.9 0 1.6-.7 1.6-1.6v-1.4c0-.7.3-1 .8-1.5C19 14 20 12.3 20 10c0-4.5-3.3-7.7-8-7.7Z"
                    />
                    <circle class="hole" cx="8.7" cy="10.2" r="1.9" />
                    <circle class="hole" cx="15.3" cy="10.2" r="1.9" />
                    <path class="hole" d="M12 11.6l-1.1 2.2h2.2z" />
                </svg>
            </span>
        </span>
    </button>
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

    /* Переключатель темы — тумблер с черепом-бегунком */
    .skull-switch {
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        flex-shrink: 0;
    }

    .track {
        position: relative;
        display: flex;
        align-items: center;
        width: 104px;
        height: 44px;
        border: 2px solid var(--border-visible);
        border-radius: 999px;
        background: var(--surface-raised);
        transition: border-color 0.2s var(--motion);
    }

    .skull-switch:hover .track {
        border-color: var(--accent);
    }

    .lab {
        position: absolute;
        font-family: var(--font-mono);
        font-size: var(--label);
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--text-disabled);
        transition:
            opacity 0.2s var(--motion),
            color 0.2s var(--motion);
    }
    .lab-dark {
        left: 14px;
    }
    .lab-light {
        right: 12px;
    }
    /* Подпись под бегунком прячется, противоположная — подсвечивается */
    .skull-switch.dark .lab-dark,
    .skull-switch.light .lab-light {
        opacity: 0;
    }
    .skull-switch.dark .lab-light,
    .skull-switch.light .lab-dark {
        color: var(--text-primary);
    }

    .thumb {
        position: absolute;
        top: 50%;
        left: 4px;
        transform: translateY(-50%);
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            left 0.3s var(--motion),
            transform 0.15s var(--motion);
    }
    .skull-switch.light .thumb {
        left: calc(100% - 38px);
    }
    .skull-switch:active .thumb {
        transform: translateY(-50%) scale(0.9);
    }

    .skull {
        width: 24px;
        height: 24px;
        color: var(--accent-contrast);
    }
    .skull .hole {
        fill: var(--accent);
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
