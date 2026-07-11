<script lang="ts">
    import { onMount } from "svelte";
    import { lang, setLang, t } from "./i18n";

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
            <p class="tagline">{$t("tagline")}</p>
        </div>
    </div>

    <div class="controls">
        <button
            class="icon-btn lang-btn"
            role="switch"
            aria-checked={$lang === "en"}
            aria-label={$t("a11y.language")}
            on:click={() => setLang($lang === "ru" ? "en" : "ru")}
        >{$lang.toUpperCase()}</button>

        <button
            class="icon-btn theme-btn {theme}"
            role="switch"
            aria-checked={theme === "light"}
            aria-label={$t("a11y.theme")}
            title={theme === "dark" ? $t("theme.dark") : $t("theme.light")}
            on:click={() => applyTheme(theme === "dark" ? "light" : "dark")}
        >
            {#if theme === "dark"}
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            {:else}
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
            {/if}
        </button>
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

    /* Правый блок управления: язык + тема */
    .controls {
        display: flex;
        align-items: center;
        gap: var(--space-md);
        flex-shrink: 0;
    }

    /* Компактные кнопки-иконки */
    .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid var(--border-visible);
        background: var(--surface-raised);
        cursor: pointer;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            border-color 0.2s var(--motion),
            transform 0.15s var(--motion),
            background 0.2s var(--motion);
    }
    .icon-btn:hover {
        border-color: var(--accent);
    }
    .icon-btn:active {
        transform: scale(0.92);
    }

    /* Кнопка языка — текст внутри */
    .lang-btn {
        font-family: var(--font-mono);
        font-size: var(--label);
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--text-primary);
    }

    /* Кнопка темы — SVG иконка */
    .theme-btn .icon {
        width: 18px;
        height: 18px;
        color: var(--text-primary);
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
