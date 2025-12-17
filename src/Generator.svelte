<script lang="ts">
    import { onMount, tick } from "svelte";
    import QRCode from "qrcode";

    // --- Состояние ---
    let mode: "standard" | "xkcd" = "standard";

    // Standard Mode Vars
    let length: number = 15;
    let includeLowercase: boolean = true;
    let includeUppercase: boolean = true;
    let includeNumbers: boolean = true;
    let includeSymbols: boolean = true;
    let useCyrillic: boolean = false;

    // XKCD Mode Vars
    let wordCount: number = 4;
    let separator: string = "-";
    let capitalizeXKCD: boolean = true;
    let includeNumberXKCD: boolean = true;

    // Общие
    let password: string = "";
    let error: string = "";
    let copied: boolean = false;
    let history: string[] = [];
    let showHistory: boolean = false;
    let showQR: boolean = false;
    let qrCanvas: HTMLCanvasElement;

    // Энтропия
    let entropyBits: number = 0;
    let entropyColor: string = "var(--toxic-green)";
    let entropyLabel: string = "Низкая";

    // Словарь для XKCD
    const ENGLISH_WORDS = [
        "correct",
        "horse",
        "battery",
        "staple",
        "house",
        "table",
        "chair",
        "pencil",
        "purple",
        "monkey",
        "dishwasher",
        "absolute",
        "jungle",
        "crypto",
        "network",
        "shadow",
        "system",
        "neural",
        "link",
        "matrix",
        "ghost",
        "shell",
        "cyber",
        "punk",
        "neon",
        "laser",
        "future",
        "chrome",
        "data",
        "access",
        "denied",
        "granted",
        "protocol",
        "bunker",
        "vector",
        "pixel",
        "grid",
        "node",
        "signal",
        "router",
        "server",
        "cloud",
        "storm",
        "rain",
        "blade",
        "runner",
        "android",
        "electric",
        "dream",
        "sheep",
        "logic",
        "memory",
        "core",
        "virus",
        "trojan",
        "firewall",
        "proxy",
        "token",
        "chain",
        "block",
        "cipher",
        "hash",
        "salt",
        "key",
        "public",
        "private",
        "tunnel",
        "bridge",
        "gate",
        "star",
        "wars",
        "trek",
        "space",
        "ship",
        "planet",
        "moon",
        "mars",
        "jupiter",
        "orbit",
        "gravity",
    ];

    onMount(() => {
        loadHistory();
        generate();
    });

    const handleBackdropClick = (e: MouseEvent) => {
        // e.target — элемент, по которому кликнули
        // e.currentTarget — элемент, на котором висит обработчик (наш backdrop)
        // Если они совпадают, значит кликнули в черную область, а не в модалку
        if (e.target === e.currentTarget) {
            closeQR();
        }
    };
    // --- Логика Генерации ---

    const generate = () => {
        if (mode === "standard") {
            generateStandard();
        } else {
            generateXKCD();
        }
        calculateEntropy();
    };

    const generateStandard = () => {
        const latinLower = "abcdefghijklmnopqrstuvwxyz";
        const latinUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const cyrillicLower = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
        const cyrillicUpper = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+[]{}|;:,.<>?";

        let characters = "";
        if (includeLowercase)
            characters += useCyrillic ? cyrillicLower : latinLower;
        if (includeUppercase)
            characters += useCyrillic ? cyrillicUpper : latinUpper;
        if (includeNumbers) characters += numbers;
        if (includeSymbols) characters += symbols;

        if (characters.length === 0) {
            error = "Выберите типы символов";
            return;
        }
        error = "";

        let tempPwd = "";
        if (includeLowercase)
            tempPwd += getRandomChar(useCyrillic ? cyrillicLower : latinLower);
        if (includeUppercase)
            tempPwd += getRandomChar(useCyrillic ? cyrillicUpper : latinUpper);
        if (includeNumbers) tempPwd += getRandomChar(numbers);
        if (includeSymbols) tempPwd += getRandomChar(symbols);

        while (tempPwd.length < length) {
            tempPwd += getRandomChar(characters);
        }

        password = shuffleString(tempPwd);
        addToHistory(password);
    };

    const generateXKCD = () => {
        let words: string[] = [];
        for (let i = 0; i < wordCount; i++) {
            let w =
                ENGLISH_WORDS[Math.floor(Math.random() * ENGLISH_WORDS.length)];
            if (capitalizeXKCD) w = w.charAt(0).toUpperCase() + w.slice(1);
            words.push(w);
        }

        let pwd = words.join(separator);

        if (includeNumberXKCD) {
            pwd += separator + Math.floor(Math.random() * 100);
        }

        password = pwd;
        error = "";
        addToHistory(password);
    };

    // --- Утилиты ---

    const getRandomChar = (str: string) =>
        str.charAt(Math.floor(Math.random() * str.length));

    const shuffleString = (str: string) => {
        const arr = str.split("");
        for (let i = arr.length - 1; i > 0; i--) {
            const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join("");
    };

    // --- Энтропия ---

    const calculateEntropy = () => {
        if (!password) {
            entropyBits = 0;
            return;
        }

        let poolSize = 0;
        if (mode === "standard") {
            if (includeLowercase) poolSize += useCyrillic ? 33 : 26;
            if (includeUppercase) poolSize += useCyrillic ? 33 : 26;
            if (includeNumbers) poolSize += 10;
            if (includeSymbols) poolSize += 24;
            entropyBits = Math.floor(
                password.length * Math.log2(poolSize || 1)
            );
        } else {
            let wordEntropy = Math.log2(ENGLISH_WORDS.length);
            entropyBits = Math.floor(wordCount * wordEntropy);
            if (includeNumberXKCD) entropyBits += Math.floor(Math.log2(100));
        }

        if (entropyBits < 40) {
            entropyColor = "#ff0033";
            entropyLabel = "Слабый";
        } else if (entropyBits < 70) {
            entropyColor = "#ffff00";
            entropyLabel = "Норм";
        } else {
            entropyColor = "#00ff00";
            entropyLabel = "Надежный";
        }
    };

    // --- История ---

    const addToHistory = (pwd: string) => {
        if (history.length > 0 && history[0] === pwd) return;
        history = [pwd, ...history].slice(0, 10);
        localStorage.setItem("pwd_history", JSON.stringify(history));
    };

    const loadHistory = () => {
        const stored = localStorage.getItem("pwd_history");
        if (stored) {
            try {
                history = JSON.parse(stored);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const restoreFromHistory = (pwd: string) => {
        password = pwd;
        calculateEntropy();
        copyToClipboard();
    };

    // --- Действия ---

    const copyToClipboard = () => {
        if (!password) return;
        navigator.clipboard
            .writeText(password)
            .then(() => {
                copied = true;
                setTimeout(() => (copied = false), 2000);
            })
            .catch(() => (error = "Ошибка копирования"));
    };

    const generateQR = async () => {
        if (!password) return;
        showQR = true;
        await tick();
        if (qrCanvas) {
            QRCode.toCanvas(
                qrCanvas,
                password,
                {
                    width: 200,
                    margin: 2,
                    color: { dark: "#000000", light: "#9ef523" },
                },
                function (error) {
                    if (error) console.error(error);
                }
            );
        }
    };

    const closeQR = () => {
        showQR = false;
    };

    const handleBackdropKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.key === "Enter") {
            closeQR();
        }
    };

    // Реактивность для перегенерации
    $: if (
        mode === "standard" &&
        (length || useCyrillic !== undefined || includeLowercase !== undefined)
    ) {
        // Опционально: авто-генерация при смене параметров (можно убрать, если мешает)
    }
</script>

<div class="wrap">
    <div class="card">
        <div class="tabs">
            <button
                class:active={mode === "standard"}
                on:click={() => {
                    mode = "standard";
                    generate();
                }}>Символы</button
            >
            <button
                class:active={mode === "xkcd"}
                on:click={() => {
                    mode = "xkcd";
                    generate();
                }}>XKCD Фраза</button
            >
        </div>

        <!-- Дисплей Пароля -->
        <div class="password-display">
            <div class="password-text" class:fade-in={password}>
                {password || "..."}
            </div>
            <button
                on:click={copyToClipboard}
                class="copy-button"
                class:copied
                aria-label="Скопировать пароль"
            >
                {copied ? "OK!" : "📋"}
            </button>
        </div>

        <!-- Энтропия -->
        <div class="entropy-container">
            <div class="entropy-bar">
                <div
                    class="fill"
                    style="width: {Math.min(
                        entropyBits,
                        128
                    )}%; background-color: {entropyColor}; box-shadow: 0 0 10px {entropyColor}"
                ></div>
            </div>
            <div class="entropy-info">
                <span>{entropyBits} bits</span>
                <span style="color: {entropyColor}">{entropyLabel}</span>
            </div>
        </div>

        <!-- Настройки -->
        {#if mode === "standard"}
            <div class="alphabet-switch">
                <label class="switch">
                    <input
                        type="checkbox"
                        bind:checked={useCyrillic}
                        on:change={generate}
                    />
                    <span class="slider">
                        <span class="latin">ABC</span>
                        <span class="cyrillic">АБВ</span>
                    </span>
                </label>
            </div>

            <div class="options">
                <div class="option full-width">
                    <label for="length-range">Длина: {length}</label>
                    <!-- Добавлен id и связан с label -->
                    <input
                        id="length-range"
                        type="range"
                        bind:value={length}
                        min="4"
                        max="64"
                        on:input={generate}
                    />
                </div>

                <div class="checkbox-options">
                    <div class="option">
                        <label
                            ><input
                                type="checkbox"
                                bind:checked={includeLowercase}
                                on:change={generate}
                            /><span>{useCyrillic ? "а-я" : "a-z"}</span></label
                        >
                    </div>
                    <div class="option">
                        <label
                            ><input
                                type="checkbox"
                                bind:checked={includeUppercase}
                                on:change={generate}
                            /><span>{useCyrillic ? "А-Я" : "A-Z"}</span></label
                        >
                    </div>
                    <div class="option">
                        <label
                            ><input
                                type="checkbox"
                                bind:checked={includeNumbers}
                                on:change={generate}
                            /><span>0-9</span></label
                        >
                    </div>
                    <div class="option">
                        <label
                            ><input
                                type="checkbox"
                                bind:checked={includeSymbols}
                                on:change={generate}
                            /><span>!@#</span></label
                        >
                    </div>
                </div>
            </div>
        {:else}
            <!-- XKCD Настройки -->
            <div class="options" style="margin-top: 20px;">
                <div class="option full-width">
                    <label for="word-count-range">Слов: {wordCount}</label>
                    <!-- Добавлен id и связан с label -->
                    <input
                        id="word-count-range"
                        type="range"
                        bind:value={wordCount}
                        min="3"
                        max="8"
                        on:input={generate}
                    />
                </div>
                <div class="option">
                    <label for="separator-select">Разделитель:</label>
                    <!-- Добавлен id и связан с label -->
                    <select
                        id="separator-select"
                        bind:value={separator}
                        on:change={generate}
                        class="cyber-select"
                    >
                        <option value="-">-</option>
                        <option value="_">_</option>
                        <option value=".">.</option>
                        <option value=" ">Пробел</option>
                    </select>
                </div>
                <div class="checkbox-options">
                    <div class="option">
                        <label
                            ><input
                                type="checkbox"
                                bind:checked={capitalizeXKCD}
                                on:change={generate}
                            /><span>Заглавные</span></label
                        >
                    </div>
                    <div class="option">
                        <label
                            ><input
                                type="checkbox"
                                bind:checked={includeNumberXKCD}
                                on:change={generate}
                            /><span>Число</span></label
                        >
                    </div>
                </div>
            </div>
        {/if}

        <div class="action-buttons">
            <button on:click={generate} class="generate-button primary">
                СГЕНЕРИРОВАТЬ
            </button>
            <button
                on:click={generateQR}
                class="generate-button icon-btn"
                title="QR Код"
                aria-label="Показать QR код"
            >
                QR
            </button>
        </div>

        <!-- История -->
        <div class="history-section">
            <button
                class="history-toggle"
                on:click={() => (showHistory = !showHistory)}
            >
                {showHistory ? "▼" : "▶"} SYSTEM LOG ({history.length})
            </button>
            {#if showHistory}
                <div class="history-list">
                    {#each history as item, i}
                        <button
                            class="history-item"
                            on:click={() => restoreFromHistory(item)}
                        >
                            <span class="history-index">[{i + 1}]</span>
                            <span class="history-pwd">{item}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    {#if error}
        <p class="error">{error}</p>
    {/if}

    <!-- Модалка QR: Исправлена доступность -->
    {#if showQR}
        <div
            class="modal-backdrop"
            role="button"
            tabindex="0"
            on:click={handleBackdropClick}
            on:keydown={handleBackdropKeydown}
            aria-label="Закрыть модальное окно"
        >
            <!-- 
            Убрали on:click|stopPropagation.
            tabindex="-1" остался, чтобы элемент мог принимать фокус (role="dialog").
            Теперь Svelte не будет ругаться, так как здесь нет обработчиков мыши.
        -->
            <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
                <h3>Scan Me</h3>
                <canvas bind:this={qrCanvas}></canvas>
                <button class="close-btn" on:click={closeQR}>Закрыть</button>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Основные стили */
    .tabs {
        display: flex;
        margin-bottom: 1rem;
        border-bottom: 2px solid var(--toxic-green-dark);
    }
    .tabs button {
        flex: 1;
        background: none;
        border: none;
        color: #555;
        font-family: "Handjet";
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        transition: all 0.3s;
    }
    .tabs button.active {
        color: var(--toxic-green);
        background: rgba(158, 245, 35, 0.1);
        border-bottom: 2px solid var(--toxic-green);
    }

    .entropy-container {
        margin-bottom: 1.5rem;
    }
    .entropy-bar {
        height: 6px;
        background: #333;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 4px;
    }
    .entropy-bar .fill {
        height: 100%;
        transition:
            width 0.5s ease,
            background-color 0.5s ease;
    }
    .entropy-info {
        display: flex;
        justify-content: space-between;
        font-size: 1rem;
        color: #777;
    }

    .action-buttons {
        display: flex;
        gap: 10px;
    }
    .generate-button.primary {
        flex-grow: 1;
    }
    .generate-button.icon-btn {
        width: 60px;
    }

    .cyber-select {
        background: var(--dark-background);
        color: var(--toxic-green);
        border: 1px solid var(--toxic-green);
        font-family: "Handjet";
        font-size: 1.2rem;
        padding: 0 10px;
        height: 30px;
        border-radius: 4px;
    }

    /* History */
    .history-section {
        margin-top: 1.5rem;
        border-top: 1px dashed var(--toxic-green); /* Пунктирная линия как в чеке/логе */
        padding-top: 0.5rem;
        width: 100%;
    }

    .history-toggle {
        background: none;
        border: none;
        color: #777;
        font-family: "Handjet";
        cursor: pointer;
        width: 100%;
        text-align: left;
        font-size: 1.1rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        padding: 10px 0;
        transition: color 0.3s;
    }

    .history-toggle:hover {
        color: var(--toxic-green);
    }

    .history-list {
        display: flex;
        flex-direction: column;
        gap: 8px; /* Отступ между элементами */
        margin-top: 5px;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 5px; /* Место для скроллбара */
    }

    /* Кастомизация скроллбара для списка */
    .history-list::-webkit-scrollbar {
        width: 6px;
    }
    .history-list::-webkit-scrollbar-track {
        background: #111;
    }
    .history-list::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 3px;
    }

    .history-item {
        display: flex;
        align-items: flex-start; /* Выравнивание по верху, если несколько строк */
        background: rgba(20, 20, 20, 0.8);
        border: 1px solid #333;
        color: #bbb;
        padding: 8px 10px;
        text-align: left;
        font-family: "Handjet", monospace;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;

        /* КЛЮЧЕВЫЕ СВОЙСТВА ДЛЯ ПЕРЕНОСА */
        white-space: normal; /* Разрешить перенос строк */
        word-break: break-all; /* Ломать длинные слова/строки без пробелов */
        line-height: 1.2; /* Плотность строк */
        height: auto; /* Высота подстраивается под контент */
    }

    .history-item:hover {
        border-color: var(--toxic-green);
        color: var(--toxic-green);
        background: rgba(158, 245, 35, 0.05);
        transform: translateX(2px); /* Небольшой сдвиг вправо при наведении */
    }

    .history-index {
        color: #555;
        margin-right: 10px;
        user-select: none; /* Чтобы не выделялось при копировании мышкой */
        white-space: nowrap; /* Индекс всегда в одну строку */
        font-size: 0.9em;
        margin-top: 1px;
    }

    .history-pwd {
        flex: 1; /* Занимает все оставшееся место */
    }

    /* Modal */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
    }
    .modal {
        background: #1a1a1a;
        padding: 2rem;
        border: 2px solid var(--toxic-green);
        text-align: center;
        box-shadow: 0 0 20px var(--toxic-green-dark);
        cursor: default;
    }
    .modal canvas {
        margin: 1rem 0;
        border: 5px solid var(--toxic-green);
    }
    .close-btn {
        display: block;
        width: 100%;
        padding: 0.5rem;
        background: transparent;
        border: 1px solid var(--toxic-green);
        color: var(--toxic-green);
        font-family: "Handjet";
        font-size: 1.2rem;
        cursor: pointer;
    }
    .close-btn:hover {
        background: var(--toxic-green);
        color: black;
    }

    /* Shared (Original) */
    .card {
        text-align: center;
        flex: 1;
        margin: 0 auto;
        background-color: var(--dark-background);
        width: 100%;
        max-width: 500px;
        padding: 1rem;
        box-sizing: border-box;
        font-family: "Handjet";
        font-weight: 500;
        font-size: clamp(2rem, 4vw, 1.5rem);
    }
    .password-display {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
        width: 100%;
        height: 48px;
        background: #2c2c2c;
        border-radius: 8px;
        border: 2px solid var(--toxic-green);
        overflow: hidden;
    }
    .password-text {
        flex-grow: 1;
        padding: 0.75rem;
        font-family: "Handjet";
        font-weight: 500;
        font-size: clamp(1.2rem, 4vw, 1.8rem);
        color: var(--toxic-green);
        text-align: left;
        white-space: nowrap;
        overflow-x: hidden;
        text-overflow: ellipsis;
        background: #1a1a1a;
        letter-spacing: 0.1em;
        line-height: 1;
    }
    .copy-button {
        padding: 0.75rem 1rem;
        font-size: clamp(1.2rem, 4vw, 1.8rem);
        background-color: var(--toxic-green);
        color: rgb(0, 0, 0);
        border: none;
        border-radius: 0 4px 4px 0;
        cursor: pointer;
        transition: background-color 0.3s ease;
        white-space: nowrap;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .generate-button {
        font-family: "Handjet";
        padding: 0.75rem;
        font-size: clamp(1.2rem, 5vw, 2rem);
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        background-color: var(--toxic-green);
        color: black;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 250px;
        height: 48px;
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #2c2c2c;
        transition: 0.4s;
        border-radius: 10px;
        border: 2px solid var(--toxic-green);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 30px;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 38px;
        width: 122px;
        left: 2px;
        bottom: 3px;
        background-color: var(--toxic-green);
        transition: 0.4s;
        border-radius: 5px;
        z-index: 1;
    }
    .latin,
    .cyrillic {
        color: black;
        font-weight: 700;
        z-index: 2;
        font-size: 1.4em;
        transition: color 0.4s;
        width: 60px;
        text-align: center;
    }
    input:checked + .slider:before {
        transform: translateX(120px);
    }
    input:checked + .slider .latin {
        color: var(--toxic-green);
    }
    input:not(:checked) + .slider .cyrillic {
        color: var(--toxic-green);
    }
    input:checked + .slider .cyrillic {
        color: black;
    }
    input:not(:checked) + .slider .latin {
        color: black;
    }
    .alphabet-switch {
        margin: 1.5rem 0;
        display: flex;
        justify-content: center;
    }

    .checkbox-options {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.5rem;
        margin-top: 1rem;
    }
    .checkbox-options .option {
        flex: 0 1 auto;
        min-width: 80px;
        margin: 0;
    }
    .options {
        margin-bottom: 1rem;
    }
    .option {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
        gap: 0.5rem;
        color: var(--text-color);
    }
    /* Специальный класс для ползунков, чтобы они занимали всю ширину */
    .option.full-width {
        width: 100%;
        display: block;
        text-align: left;
    }
    .option.full-width label {
        display: block;
        margin-bottom: 5px;
    }

    .option label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        white-space: nowrap;
        color: var(--text-color);
    }

    input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        margin: 0;
        border-radius: 10px;
        cursor: pointer;
        width: 1.2em;
        height: 1.2em;
        background-color: var(--toxic-green-dark);
        border: 2px solid var(--toxic-green);
        position: relative;
    }
    input[type="checkbox"]:checked {
        background-color: var(--toxic-green);
    }
    input[type="checkbox"]:checked::after {
        content: "✔";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: black;
        font-size: 0.8em;
    }
    input[type="range"] {
        flex: 1;
        min-width: 0;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 100%;
        height: 10px;
        background: var(--toxic-green-dark);
        border-radius: 5px;
        outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: #00ff00;
        border-radius: 20%;
        cursor: pointer;
    }
    input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: var(--toxic-green);
        border-radius: 20%;
        border-width: 0px;
        cursor: pointer;
    }

    .error {
        color: #d32f2f;
        font-size: 1.2rem;
        margin-top: 10px;
    }
</style>
