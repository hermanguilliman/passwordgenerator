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
            class="lang-switch {$lang}"
            role="switch"
            aria-checked={$lang === "en"}
            aria-label={$t("a11y.language")}
            on:click={() => setLang($lang === "ru" ? "en" : "ru")}
        >
            <span class="track">
                <span class="lab lab-ru">RU</span>
                <span class="lab lab-en">EN</span>
                <span class="thumb">{$lang === "ru" ? "RU" : "EN"}</span>
            </span>
        </button>

        <button
            class="skull-switch {theme}"
            role="switch"
            aria-checked={theme === "light"}
            aria-label={$t("a11y.theme")}
            title={theme === "dark" ? $t("theme.dark") : $t("theme.light")}
            on:click={() => applyTheme(theme === "dark" ? "light" : "dark")}
        >
            <span class="track">
                <span class="thumb">
                    <img
                        class="skull"
                        src="/skull_192.webp"
                        alt=""
                        aria-hidden="true"
                        draggable="false"
                    />
                </span>
            </span>
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

    /* Переключатель языка — тумблер RU/EN с бегунком (как тема) */
    .lang-switch {
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        flex-shrink: 0;
    }
    .lang-switch .lab-ru {
        left: 14px;
    }
    .lang-switch .lab-en {
        right: 14px;
    }
    /* Подпись под бегунком прячется, противоположная — подсвечивается */
    .lang-switch.ru .lab-ru,
    .lang-switch.en .lab-en {
        opacity: 0;
    }
    .lang-switch.ru .lab-en,
    .lang-switch.en .lab-ru {
        color: var(--text-primary);
    }
    .lang-switch .thumb {
        font-family: var(--font-mono);
        font-size: var(--label);
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--accent-contrast);
    }
    .lang-switch.en .thumb {
        left: calc(100% - 38px);
    }
    .lang-switch:active .thumb {
        transform: translateY(-50%) scale(0.9);
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
        background-color: var(--surface-raised);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        overflow: hidden;
        transition: border-color 0.2s var(--motion);
    }

    .skull-switch:hover .track,
    .lang-switch:hover .track {
        border-color: var(--accent);
    }

    /* Подписи по краям трека (используется языковым тумблером) */
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

    /* Фон тумблера — пейзаж, соответствующий активной теме */
    .skull-switch.dark .track {
        background-image: url("/night.png");
    }
    .skull-switch.light .track {
        background-image: url("/day.png");
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
        object-fit: contain;
        display: block;
        user-select: none;
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
