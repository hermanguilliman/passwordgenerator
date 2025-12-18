<script lang="ts">
    import { onMount, tick } from "svelte";
    import QRCode from "qrcode";

    // --- Типы ---
    interface CharCategory {
        name: string;
        chars: string;
        size: number;
    }

    // --- Состояние ---
    let mode: "standard" | "xkcd" = "standard";

    // Standard Mode
    let length: number = 20;
    let includeLowercase: boolean = true;
    let includeUppercase: boolean = true;
    let includeNumbers: boolean = true;
    let includeSymbols: boolean = true;
    let useCyrillic: boolean = false;

    // XKCD Mode
    let wordCount: number = 5;
    let separator: string = "-";
    let capitalizeXKCD: boolean = true;
    let includeNumberXKCD: boolean = true;
    let randomCapitalization: boolean = false;
    let numberRange: "10" | "100" | "1000" | "10000" = "100";

    // Общие
    let password: string = "";
    let error: string = "";
    let copied: boolean = false;
    let history: string[] = [];
    let showQR: boolean = false;
    let qrCanvas: HTMLCanvasElement;

    // Энтропия
    let entropyBits: number = 0;
    let entropyColor: string = "var(--toxic-green)";
    let entropyLabel: string = "БЕЗОПАСНОСТЬ: ВЫЧИСЛЕНИЕ...";
    let entropyPercent: number = 0;
    let entropyDetails: { label: string; bits: number }[] = [];
    let crackTime: string = "";
    let showDetails: boolean = false;

    // --- Константы символов ---
    const LATIN_LOWER = "abcdefghijklmnopqrstuvwxyz";
    const LATIN_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const CYRILLIC_LOWER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
    const CYRILLIC_UPPER = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
    const NUMBERS = "0123456789";
    const SYMBOLS = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\";

    // --- Словарь ---
    const WORD_SOURCE = `
        correct horse battery staple system hacking cyber neural matrix logic 
        ghost shell neon laser future data access denied granted protocol bunker 
        vector pixel grid node signal router server cloud storm rain blade runner 
        android electric dream sheep memory core virus trojan firewall proxy token 
        chain block cipher hash salt key public private tunnel bridge gate star 
        orbit gravity quantum physics plasma void galaxy nebula cosmos alien radio 
        frequency bandwidth analog digital binary code script python rust java 
        linux unix kernel root sudo admin user guest login logout abort retry 
        fail error warning debug stack heap queue array list graph tree forest 
        swamp mountain river ocean city tokyo night street car bike drone robot 
        mech armor weapon shield sword magic mana health power energy fusion 
        nuclear atomic flight space ship pilot drive warp speed light sound sonic 
        wave pulse beat rhythm bass synth drums guitar text chat bot learning 
        deep mining crypto money cash credit debit bank vault safe lock pick door 
        wall floor roof window glass steel iron copper gold silver bronze metal 
        alloy carbon silicon fiber optic lens camera eye vision sight ear hear 
        listen speak talk shout whisper secret hidden dark black white red green 
        blue cyan magenta yellow orange purple violet indigo gamma sensor motor 
        engine gear wheel piston pump valve pipe tube wire cable circuit chip 
        board card slot port socket jack plug connect online offline remote local 
        host domain time date year month hour minute second alpha beta delta 
        epsilon theta lambda sigma omega zero one two three four five six seven 
        eight nine hundred thousand million billion limit integral derivative 
        tensor chaos entropy force mass acceleration velocity distance dimension 
        universe string theory relativity electromagnetic interaction boson 
        fermion lepton quark gluon photon field particle duality uncertainty 
        evolution mutation selection gene cell tissue organ body brain heart lung 
        liver kidney stomach skin bone blood nerve neuron synapse receptor enzyme 
        protein water fire earth wind spirit soul mind thought idea concept meme 
        culture art music video image picture photo chart map plan design build 
        create destroy fix break crash burn freeze melt solid liquid state phase 
        transition thermodynamics mechanics optics acoustics electronics robotics 
        genetics informatics cybernetics control automation intelligence wisdom 
        knowledge information network internet web site page link thread process 
        task worker service daemon command terminal batch module library framework 
        platform console render shader texture model mesh collision layer scene 
        asset resource package bundle version release patch feature glitch bug 
        static noise shadow echo silence phantom mirage
    `;

    const ENGLISH_WORDS: string[] = [
        ...new Set(
            WORD_SOURCE.toLowerCase()
                .split(/\s+/)
                .map((w) => w.trim())
                .filter((w) => w.length >= 3 && /^[a-z]+$/.test(w))
        ),
    ].sort();

    const DICT_SIZE: number = ENGLISH_WORDS.length;
    const BITS_PER_WORD: number = Math.log2(DICT_SIZE);

    const ATTACK_SPEEDS = {
        online_throttled: 10,
        online_unthrottled: 1000,
        offline_slow: 1e4,
        offline_fast: 1e10,
        offline_asic: 1e13,
        nation_state: 1e15,
    };

    onMount(() => {
        loadHistory();
        generate();
    });

    // --- Криптографически безопасный RNG ---
    const secureRandomInt = (max: number): number => {
        if (max <= 0) return 0;
        const randomBuffer = new Uint32Array(1);
        const maxValid = Math.floor(0xffffffff / max) * max;

        do {
            crypto.getRandomValues(randomBuffer);
        } while (randomBuffer[0] >= maxValid);

        return randomBuffer[0] % max;
    };

    const secureRandomBool = (): boolean => secureRandomInt(2) === 1;

    const getSecureRandomChar = (str: string): string =>
        str.charAt(secureRandomInt(str.length));

    // --- Генерация ---
    const generate = (): void => {
        error = "";
        if (mode === "standard") generateStandard();
        else generateXKCD();
        calculateEntropy();
    };

    const generateStandard = (): void => {
        const categories = getActiveCategories();

        if (categories.length === 0) {
            error = "ОШИБКА: ВЫБЕРИТЕ ХОТЯ БЫ ОДНУ КАТЕГОРИЮ";
            password = "";
            return;
        }

        const pool = categories.map((c) => c.chars).join("");
        const minLength = categories.length;

        if (length < minLength) {
            error = `МИНИМАЛЬНАЯ ДЛИНА: ${minLength}`;
            return;
        }

        let chars: string[] = categories.map((c) =>
            getSecureRandomChar(c.chars)
        );

        while (chars.length < length) {
            chars.push(getSecureRandomChar(pool));
        }

        for (let i = chars.length - 1; i > 0; i--) {
            const j = secureRandomInt(i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }

        password = chars.join("");
        addToHistory(password);
    };

    const generateXKCD = (): void => {
        const words: string[] = [];

        for (let i = 0; i < wordCount; i++) {
            let word = ENGLISH_WORDS[secureRandomInt(DICT_SIZE)];

            if (randomCapitalization) {
                word = secureRandomBool()
                    ? word.charAt(0).toUpperCase() + word.slice(1)
                    : word;
            } else if (capitalizeXKCD) {
                word = word.charAt(0).toUpperCase() + word.slice(1);
            }

            words.push(word);
        }

        let pwd = words.join(separator);

        if (includeNumberXKCD) {
            const range = parseInt(numberRange);
            const num = secureRandomInt(range);
            const padLength = numberRange.length - 1;
            pwd += separator + String(num).padStart(padLength, "0");
        }

        password = pwd;
        addToHistory(password);
    };

    const getActiveCategories = (): CharCategory[] => {
        const categories: CharCategory[] = [];

        if (includeLowercase) {
            const chars = useCyrillic ? CYRILLIC_LOWER : LATIN_LOWER;
            categories.push({
                name: useCyrillic ? "а-я" : "a-z",
                chars,
                size: chars.length,
            });
        }
        if (includeUppercase) {
            const chars = useCyrillic ? CYRILLIC_UPPER : LATIN_UPPER;
            categories.push({
                name: useCyrillic ? "А-Я" : "A-Z",
                chars,
                size: chars.length,
            });
        }
        if (includeNumbers) {
            categories.push({
                name: "0-9",
                chars: NUMBERS,
                size: NUMBERS.length,
            });
        }
        if (includeSymbols) {
            categories.push({
                name: "SYM",
                chars: SYMBOLS,
                size: SYMBOLS.length,
            });
        }

        return categories;
    };

    // --- РАСЧЁТ ЭНТРОПИИ ---
    const calculateEntropy = (): void => {
        entropyDetails = [];

        if (!password) {
            entropyBits = 0;
            updateEntropyDisplay();
            return;
        }

        if (mode === "standard") {
            calculateStandardEntropy();
        } else {
            calculateXKCDEntropy();
        }

        updateEntropyDisplay();
        calculateCrackTime();
    };

    const calculateStandardEntropy = (): void => {
        const categories = getActiveCategories();

        if (categories.length === 0) {
            entropyBits = 0;
            return;
        }

        const k = categories.length;
        const L = password.length;
        const N = categories.reduce((sum, c) => sum + c.size, 0);

        let totalBits = 0;

        for (const cat of categories) {
            const bits = Math.log2(cat.size);
            totalBits += bits;
            entropyDetails.push({ label: `[${cat.name}] x1`, bits });
        }

        if (L > k) {
            const remainingBits = (L - k) * Math.log2(N);
            totalBits += remainingBits;
            entropyDetails.push({
                label: `[ПУЛ:${N}] x${L - k}`,
                bits: remainingBits,
            });
        }

        if (k > 0 && L > k) {
            const permutationBits = logBinomial(L, k);
            totalBits += permutationBits;
            entropyDetails.push({
                label: `ПЕРЕСТАНОВКА C(${L},${k})`,
                bits: permutationBits,
            });
        }

        const upperBound = L * Math.log2(N);
        entropyBits = Math.min(totalBits, upperBound);
        entropyDetails.push({ label: `ВЕРХНЯЯ ГРАНИЦА`, bits: upperBound });
    };

    const calculateXKCDEntropy = (): void => {
        let totalBits = 0;

        const wordBits = wordCount * BITS_PER_WORD;
        totalBits += wordBits;
        entropyDetails.push({ label: `СЛОВА x${wordCount}`, bits: wordBits });

        if (randomCapitalization) {
            const capBits = wordCount * 1;
            totalBits += capBits;
            entropyDetails.push({
                label: `СЛУЧ. РЕГИСТР x${wordCount}`,
                bits: capBits,
            });
        }

        if (includeNumberXKCD) {
            const range = parseInt(numberRange);
            const numBits = Math.log2(range);
            totalBits += numBits;
            entropyDetails.push({
                label: `ЧИСЛО [0-${range - 1}]`,
                bits: numBits,
            });
        }

        entropyBits = totalBits;
    };

    const logBinomial = (n: number, k: number): number => {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 0;

        let result = 0;
        for (let i = 0; i < k; i++) {
            result += Math.log2(n - i) - Math.log2(i + 1);
        }
        return result;
    };

    const updateEntropyDisplay = (): void => {
        const bits = entropyBits;

        if (bits < 20) {
            entropyColor = "#ff0000";
            entropyLabel = "ВЗЛОМ: МГНОВЕННЫЙ";
        } else if (bits < 30) {
            entropyColor = "#ff2200";
            entropyLabel = "ВЗЛОМ: СЕКУНДЫ";
        } else if (bits < 40) {
            entropyColor = "#ff4400";
            entropyLabel = "ВЗЛОМ: МИНУТЫ";
        } else if (bits < 50) {
            entropyColor = "#ff7700";
            entropyLabel = "БЕЗОПАСНОСТЬ: СЛАБАЯ";
        } else if (bits < 60) {
            entropyColor = "#ffaa00";
            entropyLabel = "БЕЗОПАСНОСТЬ: БАЗОВАЯ";
        } else if (bits < 75) {
            entropyColor = "#ffdd00";
            entropyLabel = "БЕЗОПАСНОСТЬ: УМЕРЕННАЯ";
        } else if (bits < 90) {
            entropyColor = "#ccff00";
            entropyLabel = "БЕЗОПАСНОСТЬ: ХОРОШАЯ";
        } else if (bits < 112) {
            entropyColor = "#88ff00";
            entropyLabel = "БЕЗОПАСНОСТЬ: СИЛЬНАЯ";
        } else if (bits < 128) {
            entropyColor = "#44ff44";
            entropyLabel = "БЕЗОПАСНОСТЬ: ОЧЕНЬ СИЛЬНАЯ";
        } else if (bits < 160) {
            entropyColor = "#00ffaa";
            entropyLabel = "КРИПТО: 2^80 ОПЕРАЦИЙ";
        } else if (bits < 192) {
            entropyColor = "#00ffff";
            entropyLabel = "КРИПТО: 2^96 ОПЕРАЦИЙ";
        } else if (bits < 256) {
            entropyColor = "#aa88ff";
            entropyLabel = "КРИПТО: AES-192+";
        } else {
            entropyColor = "#ffffff";
            entropyLabel = "КРИПТО: AES-256+";
        }

        entropyPercent = Math.min((bits / 256) * 100, 100);
    };

    const calculateCrackTime = (): void => {
        const combinations = Math.pow(2, entropyBits);
        const speed = ATTACK_SPEEDS.offline_fast;
        const seconds = combinations / speed / 2;
        crackTime = formatTime(seconds);
    };

    const formatTime = (seconds: number): string => {
        if (!isFinite(seconds) || seconds > 1e30) return "БЕСКОНЕЧНОСТЬ";

        const minute = 60;
        const hour = minute * 60;
        const day = hour * 24;
        const year = day * 365.25;
        const century = year * 100;
        const millennium = year * 1000;
        const universe = year * 13.8e9;

        if (seconds < 0.001) return "< 1 мс";
        if (seconds < 1) return `${(seconds * 1000).toFixed(0)} мс`;
        if (seconds < minute) return `${seconds.toFixed(1)} сек`;
        if (seconds < hour) return `${(seconds / minute).toFixed(1)} мин`;
        if (seconds < day) return `${(seconds / hour).toFixed(1)} часов`;
        if (seconds < year) return `${(seconds / day).toFixed(1)} дней`;
        if (seconds < century) return `${(seconds / year).toFixed(1)} лет`;
        if (seconds < millennium)
            return `${(seconds / century).toFixed(1)} веков`;
        if (seconds < universe)
            return `${(seconds / millennium).toFixed(0)} тысячелетий`;
        return `${(seconds / universe).toFixed(2)}x возраст Вселенной`;
    };

    // --- История ---
    const addToHistory = (pwd: string): void => {
        if (!pwd || (history.length > 0 && history[0] === pwd)) return;
        history = [pwd, ...history].slice(0, 20);
        localStorage.setItem("pwd_history", JSON.stringify(history));
    };

    const loadHistory = (): void => {
        try {
            const stored = localStorage.getItem("pwd_history");
            if (stored) history = JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load history:", e);
        }
    };

    const restoreFromHistory = (pwd: string): void => {
        password = pwd;
        entropyBits = 0;
        entropyDetails = [{ label: "ВОССТАНОВЛЕНО ИЗ ЖУРНАЛА", bits: 0 }];
        entropyLabel = "ЭНТРОПИЯ: НЕИЗВЕСТНА";
        entropyColor = "#888888";
        entropyPercent = 0;
        crackTime = "Н/Д";
        copyToClipboard();
    };

    const clearHistory = (): void => {
        history = [];
        localStorage.removeItem("pwd_history");
    };

    const copyToClipboard = async (): Promise<void> => {
        if (!password) return;
        try {
            await navigator.clipboard.writeText(password);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        } catch {
            error = "ОШИБКА БУФЕРА ОБМЕНА";
        }
    };

    const generateQR = async (): Promise<void> => {
        if (!password) return;
        showQR = true;
        await tick();
        if (qrCanvas) {
            QRCode.toCanvas(qrCanvas, password, {
                width: 300,
                margin: 2,
                color: { dark: "#9ef523", light: "#000000" },
                errorCorrectionLevel: "M",
            });
        }
    };

    const closeQR = (): void => {
        showQR = false;
    };
    const handleBackdropClick = (e: MouseEvent): void => {
        if (e.target === e.currentTarget) closeQR();
    };
    const handleOptionChange = (): void => generate();
    const toggleDetails = (): void => {
        showDetails = !showDetails;
    };
</script>

<div class="cyber-container">
    <div class="panel main-panel">
        <div class="panel-header">
            <div class="tabs">
                <button
                    class:active={mode === "standard"}
                    on:click={() => {
                        mode = "standard";
                        generate();
                    }}
                >
                    [ СТАНДАРТ ]
                </button>
                <button
                    class:active={mode === "xkcd"}
                    on:click={() => {
                        mode = "xkcd";
                        generate();
                    }}
                >
                    [ XKCD ]
                </button>
            </div>
        </div>

        <div class="display-section">
            <div class="password-display-wrapper">
                <div class="password-label">// СГЕНЕРИРОВАННЫЙ ПАРОЛЬ</div>
                <div class="password-field" class:pulse={copied}>
                    {password || "ИНИЦИАЛИЗАЦИЯ..."}
                </div>
                <div class="actions">
                    <button
                        class="action-btn copy"
                        on:click={copyToClipboard}
                        class:success={copied}
                    >
                        {copied ? "СКОПИРОВАНО" : "КОПИРОВАТЬ"}
                    </button>
                    <button
                        class="action-btn qr"
                        on:click={generateQR}
                        title="QR-код">QR</button
                    >
                    <button
                        class="action-btn refresh"
                        on:click={generate}
                        title="Обновить">↻</button
                    >
                </div>
            </div>
        </div>

        <!-- Панель энтропии -->
        <div class="entropy-section">
            <div class="entropy-header">
                <span
                    class="entropy-status"
                    style="color: {entropyColor}; text-shadow: 0 0 8px {entropyColor};"
                >
                    {entropyLabel}
                </span>
                <span class="entropy-value" style="color: {entropyColor}">
                    {entropyBits.toFixed(2)} БИТ
                </span>
            </div>

            <div class="entropy-track">
                <div
                    class="entropy-fill"
                    style="width: {entropyPercent}%; background: {entropyColor}; 
                           box-shadow: 0 0 12px {entropyColor}, inset 0 0 8px rgba(255,255,255,0.2);"
                ></div>
                <div class="marker" style="left: {(50 / 256) * 100}%">
                    <span>50</span>
                </div>
                <div class="marker" style="left: {(80 / 256) * 100}%">
                    <span>80</span>
                </div>
                <div class="marker" style="left: {(128 / 256) * 100}%">
                    <span>128</span>
                </div>
                <div class="marker" style="left: {(192 / 256) * 100}%">
                    <span>192</span>
                </div>
            </div>

            <div class="crack-info">
                <span class="crack-label">ВРЕМЯ ПОДБОРА [10^10/сек]:</span>
                <span class="crack-value" style="color: {entropyColor}"
                    >{crackTime}</span
                >
            </div>

            <!-- Детализация -->
            <div class="details-section">
                <button class="details-toggle" on:click={toggleDetails}>
                    <span class="toggle-icon"
                        >{showDetails ? "[-]" : "[+]"}</span
                    >
                    РАСЧЁТ ЭНТРОПИИ
                </button>

                {#if showDetails && entropyDetails.length > 0}
                    <div class="details-content">
                        {#each entropyDetails as detail, i}
                            <div
                                class="detail-row"
                                class:last={i === entropyDetails.length - 1}
                            >
                                <span class="detail-label">{detail.label}</span>
                                <span class="detail-dots"></span>
                                <span class="detail-bits"
                                    >{detail.bits.toFixed(2)}</span
                                >
                            </div>
                        {/each}
                        <div class="detail-row total">
                            <span class="detail-label">ИТОГО</span>
                            <span class="detail-dots"></span>
                            <span class="detail-bits"
                                >{entropyBits.toFixed(2)} БИТ</span
                            >
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Настройки -->
        <div class="settings-section">
            <div class="section-header">// НАСТРОЙКИ</div>

            {#if mode === "standard"}
                <div class="setting-group">
                    <div class="cyrillic-switch">
                        <label class="switch-container">
                            <input
                                type="checkbox"
                                bind:checked={useCyrillic}
                                on:change={handleOptionChange}
                            />
                            <span class="switch-track">
                                <span class="switch-thumb"></span>
                                <span class="label-off"
                                    >ЛАТИНИЦА [{LATIN_LOWER.length * 2}]</span
                                >
                                <span class="label-on"
                                    >КИРИЛЛИЦА [{CYRILLIC_LOWER.length *
                                        2}]</span
                                >
                            </span>
                        </label>
                    </div>
                </div>

                <div class="setting-group">
                    <div class="slider-row">
                        <div class="slider-header">
                            <span class="slider-label">ДЛИНА</span>
                            <span class="slider-value">{length}</span>
                        </div>
                        <input
                            type="range"
                            bind:value={length}
                            min="4"
                            max="64"
                            on:input={generate}
                        />
                        <div class="slider-range">
                            <span>4</span>
                            <span>64</span>
                        </div>
                    </div>
                </div>

                <div class="setting-group">
                    <div class="checkbox-grid">
                        <label class="cyber-check">
                            <input
                                type="checkbox"
                                bind:checked={includeLowercase}
                                on:change={handleOptionChange}
                            />
                            <span class="check-box"></span>
                            <span class="check-label">
                                {useCyrillic ? "а-я" : "a-z"}
                                <span class="char-count"
                                    >[{useCyrillic
                                        ? CYRILLIC_LOWER.length
                                        : LATIN_LOWER.length}]</span
                                >
                            </span>
                        </label>
                        <label class="cyber-check">
                            <input
                                type="checkbox"
                                bind:checked={includeUppercase}
                                on:change={handleOptionChange}
                            />
                            <span class="check-box"></span>
                            <span class="check-label">
                                {useCyrillic ? "А-Я" : "A-Z"}
                                <span class="char-count"
                                    >[{useCyrillic
                                        ? CYRILLIC_UPPER.length
                                        : LATIN_UPPER.length}]</span
                                >
                            </span>
                        </label>
                        <label class="cyber-check">
                            <input
                                type="checkbox"
                                bind:checked={includeNumbers}
                                on:change={handleOptionChange}
                            />
                            <span class="check-box"></span>
                            <span class="check-label">
                                0-9
                                <span class="char-count"
                                    >[{NUMBERS.length}]</span
                                >
                            </span>
                        </label>
                        <label class="cyber-check">
                            <input
                                type="checkbox"
                                bind:checked={includeSymbols}
                                on:change={handleOptionChange}
                            />
                            <span class="check-box"></span>
                            <span class="check-label">
                                !@#
                                <span class="char-count"
                                    >[{SYMBOLS.length}]</span
                                >
                            </span>
                        </label>
                    </div>
                </div>
            {:else}
                <!-- XKCD Mode -->
                <div class="setting-group">
                    <div class="slider-row">
                        <div class="slider-header">
                            <span class="slider-label">КОЛИЧЕСТВО СЛОВ</span>
                            <span class="slider-value">{wordCount}</span>
                            <span class="slider-hint"
                                >~{(wordCount * BITS_PER_WORD).toFixed(1)} бит</span
                            >
                        </div>
                        <input
                            type="range"
                            bind:value={wordCount}
                            min="3"
                            max="12"
                            on:input={generate}
                        />
                        <div class="slider-range">
                            <span>3</span>
                            <span>12</span>
                        </div>
                    </div>
                </div>

                <div class="setting-group">
                    <div class="select-row">
                        <span class="select-label">РАЗДЕЛИТЕЛЬ</span>
                        <span class="select-hint">[+0 бит]</span>
                        <select
                            bind:value={separator}
                            on:change={generate}
                            class="cyber-select"
                        >
                            <option value="-">ТИРЕ [-]</option>
                            <option value="_">НИЖНЕЕ [_]</option>
                            <option value=".">ТОЧКА [.]</option>
                            <option value=" ">ПРОБЕЛ [ ]</option>
                            <option value="+">ПЛЮС [+]</option>
                            <option value="">БЕЗ РАЗДЕЛИТЕЛЯ</option>
                        </select>
                    </div>
                </div>

                <div class="setting-group">
                    <div class="select-row">
                        <span class="select-label">ДИАПАЗОН ЧИСЛА</span>
                        <span class="select-hint"
                            >[+{Math.log2(parseInt(numberRange)).toFixed(1)} бит]</span
                        >
                        <select
                            bind:value={numberRange}
                            on:change={generate}
                            class="cyber-select"
                            disabled={!includeNumberXKCD}
                        >
                            <option value="10">0-9</option>
                            <option value="100">00-99</option>
                            <option value="1000">000-999</option>
                            <option value="10000">0000-9999</option>
                        </select>
                    </div>
                </div>

                <div class="setting-group">
                    <div class="checkbox-grid xkcd-options">
                        <label
                            class="cyber-check"
                            class:disabled={randomCapitalization}
                        >
                            <input
                                type="checkbox"
                                bind:checked={capitalizeXKCD}
                                disabled={randomCapitalization}
                                on:change={handleOptionChange}
                            />
                            <span class="check-box"></span>
                            <span class="check-label">
                                Заглавные
                                <span class="entropy-tag zero">[+0]</span>
                            </span>
                        </label>
                        <label class="cyber-check highlight">
                            <input
                                type="checkbox"
                                bind:checked={randomCapitalization}
                                on:change={() => {
                                    if (randomCapitalization)
                                        capitalizeXKCD = false;
                                    handleOptionChange();
                                }}
                            />
                            <span class="check-box"></span>
                            <span class="check-label">
                                Случ. регистр
                                <span class="entropy-tag plus"
                                    >[+{wordCount}]</span
                                >
                            </span>
                        </label>
                        <label class="cyber-check">
                            <input
                                type="checkbox"
                                bind:checked={includeNumberXKCD}
                                on:change={handleOptionChange}
                            />
                            <span class="check-box"></span>
                            <span class="check-label">
                                Число
                                <span class="entropy-tag plus"
                                    >[+{Math.log2(
                                        parseInt(numberRange)
                                    ).toFixed(1)}]</span
                                >
                            </span>
                        </label>
                    </div>
                </div>

                <div class="dict-info">
                    <span class="dict-label">СЛОВАРЬ:</span>
                    <span class="dict-value">{DICT_SIZE} СЛОВ</span>
                    <span class="dict-separator">/</span>
                    <span class="dict-value"
                        >{BITS_PER_WORD.toFixed(4)} БИТ/СЛОВО</span
                    >
                </div>
            {/if}
        </div>

        {#if error}
            <div class="error-msg">[!] {error}</div>
        {/if}

        <button class="big-gen-btn" on:click={generate}>
            <span class="btn-icon">&gt;</span>
            СГЕНЕРИРОВАТЬ
            <span class="btn-icon">&lt;</span>
        </button>
    </div>

    <!-- История -->
    <div class="panel history-panel">
        <div class="panel-header">
            <h3>// ЖУРНАЛ [{history.length}]</h3>
            {#if history.length > 0}
                <button class="clear-btn" on:click={clearHistory}
                    >ОЧИСТИТЬ</button
                >
            {/if}
        </div>
        <div class="history-list">
            {#each history as item, i}
                <button
                    class="log-entry"
                    on:click={() => restoreFromHistory(item)}
                >
                    <span class="log-index"
                        >{String(i + 1).padStart(2, "0")}</span
                    >
                    <span class="log-data">{item}</span>
                </button>
            {/each}
            {#if history.length === 0}
                <div class="empty-log">НЕТ ЗАПИСЕЙ</div>
            {/if}
        </div>
    </div>
</div>

{#if showQR}
    <div
        class="modal-backdrop"
        on:click={handleBackdropClick}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === "Escape" && closeQR()}
    >
        <div class="modal">
            <div class="modal-header">// QR-КОД ДОСТУПА</div>
            <div class="qr-wrapper">
                <canvas bind:this={qrCanvas}></canvas>
            </div>
            <button class="close-btn" on:click={closeQR}>[ ЗАКРЫТЬ ]</button>
        </div>
    </div>
{/if}

<style>
    /* === BASE === */
    .cyber-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
        width: 100%;
    }

    @media (min-width: 900px) {
        .cyber-container {
            grid-template-columns: 2fr 1fr;
            align-items: start;
        }
        .history-panel {
            max-height: 700px;
            position: sticky;
            top: 1rem;
        }
    }

    /* === PANELS === */
    .panel {
        background: rgba(10, 10, 10, 0.95);
        border: 1px solid var(--toxic-green);
        padding: 1.5rem;
        position: relative;
        box-shadow:
            0 0 20px rgba(158, 245, 35, 0.1),
            inset 0 0 60px rgba(0, 0, 0, 0.5);
    }

    .panel::before,
    .panel::after {
        content: "";
        position: absolute;
        width: 20px;
        height: 20px;
    }

    .panel::before {
        top: -2px;
        left: -2px;
        border-left: 2px solid var(--toxic-green);
        border-top: 2px solid var(--toxic-green);
    }

    .panel::after {
        bottom: -2px;
        right: -2px;
        border-right: 2px solid var(--toxic-green);
        border-bottom: 2px solid var(--toxic-green);
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid rgba(158, 245, 35, 0.2);
    }

    .panel-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--toxic-green);
        font-weight: 400;
    }

    /* === TABS === */
    .tabs {
        display: flex;
        gap: 1.5rem;
    }

    .tabs button {
        background: transparent;
        border: none;
        color: #777;
        font-family: var(--font-main);
        font-size: 1.1rem;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
        font-weight: 600;
        letter-spacing: 1px;
    }

    .tabs button:hover {
        color: #999;
    }

    .tabs button.active {
        color: var(--toxic-green);
        text-shadow: 0 0 10px var(--toxic-green);
    }

    /* === PASSWORD DISPLAY === */
    .display-section {
        margin-bottom: 1.5rem;
    }

    .password-label {
        font-size: 0.9rem;
        color: #888;
        margin-bottom: 8px;
        letter-spacing: 1px;
    }

    .password-field {
        background: #000;
        border: 2px solid var(--toxic-green);
        color: var(--toxic-green);
        padding: 1rem 1.25rem;
        font-size: clamp(1rem, 3vw, 1.5rem);
        font-family: var(--font-main);
        font-weight: 600;
        word-break: break-all;
        min-height: 3.5rem;
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        box-shadow:
            inset 0 0 20px rgba(158, 245, 35, 0.1),
            0 0 10px rgba(158, 245, 35, 0.1);
        letter-spacing: 0.5px;
        line-height: 1.4;
    }

    .password-field.pulse {
        animation: fieldPulse 0.4s ease-out;
    }

    @keyframes fieldPulse {
        0% {
            background: var(--toxic-green);
            color: #000;
        }
        100% {
            background: #000;
            color: var(--toxic-green);
        }
    }

    .actions {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 8px;
    }

    .action-btn {
        background: rgba(158, 245, 35, 0.1);
        border: 1px solid var(--toxic-green);
        color: var(--toxic-green);
        font-family: var(--font-main);
        font-size: 1rem;
        padding: 0.7rem;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.15s;
        font-weight: 600;
        letter-spacing: 1px;
    }

    .action-btn:hover {
        background: var(--toxic-green);
        color: #000;
        box-shadow: 0 0 15px rgba(158, 245, 35, 0.4);
    }

    .action-btn.success {
        background: var(--toxic-green);
        color: #000;
    }

    /* === ENTROPY SECTION === */
    .entropy-section {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid #333;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
    }

    .entropy-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .entropy-status {
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 1px;
        transition: all 0.3s;
    }

    .entropy-value {
        font-size: 1.4rem;
        font-weight: 700;
        font-family: var(--font-main);
        transition: all 0.3s;
    }

    .entropy-track {
        height: 16px;
        background: #0a0a0a;
        border: 1px solid #444;
        position: relative;
        margin-bottom: 1rem;
        overflow: visible;
    }

    .entropy-fill {
        height: 100%;
        transition:
            width 0.4s ease,
            background 0.4s;
        position: relative;
    }

    .entropy-fill::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.2),
            transparent
        );
    }

    .marker {
        position: absolute;
        top: -22px;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .marker::after {
        content: "";
        width: 1px;
        height: 38px;
        background: rgba(255, 255, 255, 0.2);
    }

    .marker span {
        font-size: 0.8rem;
        color: #777;
        margin-bottom: 2px;
    }

    .crack-info {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        padding: 0.75rem 0;
        border-top: 1px dashed #333;
        margin-bottom: 0.75rem;
    }

    .crack-label {
        font-size: 0.9rem;
        color: #999;
        letter-spacing: 0.5px;
    }

    .crack-value {
        font-size: 1rem;
        font-weight: 600;
        font-family: var(--font-main);
    }

    /* === DETAILS === */
    .details-section {
        border-top: 1px dashed #333;
        padding-top: 0.75rem;
    }

    .details-toggle {
        background: none;
        border: none;
        color: #999;
        font-family: var(--font-main);
        font-size: 0.95rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0;
        transition: color 0.2s;
        letter-spacing: 1px;
    }

    .details-toggle:hover {
        color: var(--toxic-green);
    }

    .toggle-icon {
        color: var(--toxic-green);
    }

    .details-content {
        margin-top: 0.75rem;
        background: rgba(0, 0, 0, 0.3);
        border-left: 2px solid #444;
        padding: 0.5rem 0;
    }

    .detail-row {
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
    }

    .detail-row.last {
        border-bottom: 1px dashed #333;
        margin-bottom: 0.5rem;
        padding-bottom: 0.75rem;
    }

    .detail-row.total {
        color: var(--toxic-green);
        font-weight: 600;
    }

    .detail-label {
        color: #aaa;
        flex-shrink: 0;
    }

    .detail-dots {
        flex: 1;
        border-bottom: 1px dotted #555;
        margin: 0 0.75rem;
        min-width: 20px;
    }

    .detail-bits {
        color: #bbb;
        font-family: var(--font-main);
        flex-shrink: 0;
    }

    .detail-row.total .detail-bits {
        color: var(--toxic-green);
    }

    /* === SETTINGS === */
    .settings-section {
        margin-bottom: 1.5rem;
    }

    .section-header {
        font-size: 0.9rem;
        color: #888;
        margin-bottom: 1rem;
        letter-spacing: 1px;
    }

    .setting-group {
        margin-bottom: 1rem;
    }

    .setting-group:last-child {
        margin-bottom: 0;
    }

    /* Cyrillic Switch */
    .cyrillic-switch .switch-container {
        cursor: pointer;
        display: block;
    }

    .cyrillic-switch input {
        display: none;
    }

    .switch-track {
        display: flex;
        height: 48px;
        background: #0a0a0a;
        border: 1px solid var(--toxic-green);
        position: relative;
        align-items: center;
        justify-content: space-around;
    }

    .switch-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        bottom: 2px;
        width: calc(50% - 2px);
        background: rgba(158, 245, 35, 0.15);
        transition: 0.25s;
        border: 1px solid rgba(158, 245, 35, 0.3);
    }

    .cyrillic-switch input:checked + .switch-track .switch-thumb {
        left: 50%;
    }

    .label-off,
    .label-on {
        z-index: 2;
        font-weight: 600;
        font-size: 1rem;
        color: #666;
        transition: all 0.25s;
        letter-spacing: 1px;
    }

    .cyrillic-switch input:not(:checked) + .switch-track .label-off {
        color: var(--toxic-green);
        text-shadow: 0 0 8px var(--toxic-green);
    }

    .cyrillic-switch input:checked + .switch-track .label-on {
        color: var(--toxic-green);
        text-shadow: 0 0 8px var(--toxic-green);
    }

    /* Slider */
    .slider-row {
        background: rgba(0, 0, 0, 0.2);
        padding: 1rem;
        border: 1px solid #333;
    }

    .slider-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .slider-label {
        font-size: 1rem;
        color: #aaa;
        letter-spacing: 1px;
    }

    .slider-value {
        font-size: 1.3rem;
        color: var(--toxic-green);
        font-weight: 700;
        font-family: var(--font-main);
    }

    .slider-hint {
        font-size: 0.9rem;
        color: #888;
        margin-left: auto;
    }

    input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        background: transparent;
        margin: 0.5rem 0;
    }

    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 24px;
        width: 12px;
        background: var(--toxic-green);
        cursor: pointer;
        margin-top: -8px;
        border: 1px solid #000;
        box-shadow: 0 0 8px var(--toxic-green);
    }

    input[type="range"]::-webkit-slider-runnable-track {
        width: 100%;
        height: 8px;
        background: #111;
        border: 1px solid #444;
    }

    .slider-range {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #777;
    }

    /* Checkbox Grid */
    .checkbox-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .checkbox-grid.xkcd-options {
        grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 600px) {
        .checkbox-grid.xkcd-options {
            grid-template-columns: 1fr;
        }
    }

    .cyber-check {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        background: rgba(0, 0, 0, 0.2);
        padding: 10px 12px;
        border: 1px solid #333;
        transition: all 0.15s;
    }

    .cyber-check:hover {
        border-color: #555;
        background: rgba(158, 245, 35, 0.03);
    }

    .cyber-check.highlight {
        border-color: rgba(158, 245, 35, 0.4);
        background: rgba(158, 245, 35, 0.05);
    }

    .cyber-check.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .cyber-check input {
        display: none;
    }

    .check-box {
        width: 16px;
        height: 16px;
        border: 2px solid var(--toxic-green);
        display: inline-block;
        position: relative;
        flex-shrink: 0;
    }

    .cyber-check input:checked + .check-box::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        right: 2px;
        bottom: 2px;
        background: var(--toxic-green);
        box-shadow: 0 0 6px var(--toxic-green);
    }

    .check-label {
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        color: #ccc;
    }

    .char-count {
        font-size: 0.9rem;
        color: #888;
    }

    .entropy-tag {
        font-size: 0.85rem;
        padding: 2px 6px;
        border-radius: 2px;
    }

    .entropy-tag.zero {
        color: #888;
        background: rgba(255, 255, 255, 0.05);
    }

    .entropy-tag.plus {
        color: var(--toxic-green);
        background: rgba(158, 245, 35, 0.1);
    }

    /* Select */
    .select-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        background: rgba(0, 0, 0, 0.2);
        padding: 1rem;
        border: 1px solid #333;
    }

    .select-label {
        font-size: 1rem;
        color: #aaa;
        letter-spacing: 1px;
    }

    .select-hint {
        font-size: 0.9rem;
        color: #888;
    }

    .cyber-select {
        flex: 1;
        min-width: 150px;
        background: #000;
        color: var(--toxic-green);
        border: 1px solid var(--toxic-green);
        font-family: var(--font-main);
        font-size: 1rem;
        padding: 0.6rem;
        cursor: pointer;
    }

    .cyber-select:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .cyber-select option {
        background: #000;
        color: var(--toxic-green);
    }

    /* Dict Info */
    .dict-info {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 1rem;
        border: 1px dashed #444;
        margin-top: 0.5rem;
        background: rgba(0, 0, 0, 0.2);
    }

    .dict-label {
        font-size: 0.9rem;
        color: #999;
        letter-spacing: 1px;
    }

    .dict-value {
        font-size: 1rem;
        color: var(--toxic-green);
        font-weight: 600;
    }

    .dict-separator {
        color: #555;
    }

    /* Error */
    .error-msg {
        color: #ff4444;
        text-align: center;
        padding: 1rem;
        font-size: 1rem;
        background: rgba(255, 0, 0, 0.05);
        border: 1px solid rgba(255, 0, 0, 0.2);
        margin-bottom: 1rem;
    }

    /* Generate Button */
    .big-gen-btn {
        width: 100%;
        background: var(--toxic-green);
        color: #000;
        border: none;
        padding: 1.1rem 1.5rem;
        font-family: var(--font-main);
        font-size: 1.3rem;
        font-weight: 700;
        letter-spacing: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        clip-path: polygon(
            12px 0,
            100% 0,
            100% calc(100% - 12px),
            calc(100% - 12px) 100%,
            0 100%,
            0 12px
        );
        transition: all 0.15s;
        text-transform: uppercase;
    }

    .big-gen-btn:hover {
        box-shadow:
            0 0 20px var(--toxic-green),
            inset 0 0 20px rgba(0, 0, 0, 0.2);
        transform: translateY(-1px);
    }

    .big-gen-btn:active {
        transform: translateY(1px);
    }

    .btn-icon {
        opacity: 0.6;
    }

    /* === HISTORY === */
    .history-panel {
        display: flex;
        flex-direction: column;
    }

    .history-list {
        flex: 1;
        overflow-y: auto;
        max-height: 500px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .clear-btn {
        background: transparent;
        border: 1px solid #444;
        color: #888;
        font-family: var(--font-main);
        cursor: pointer;
        font-size: 0.9rem;
        padding: 6px 10px;
        letter-spacing: 1px;
        transition: all 0.15s;
    }

    .clear-btn:hover {
        border-color: #ff4444;
        color: #ff4444;
    }

    .log-entry {
        background: rgba(0, 0, 0, 0.3);
        border: none;
        border-left: 2px solid #333;
        color: #aaa;
        text-align: left;
        padding: 12px;
        font-family: var(--font-main);
        cursor: pointer;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        transition: all 0.15s;
    }

    .log-entry:hover {
        background: rgba(158, 245, 35, 0.05);
        border-left-color: var(--toxic-green);
        color: var(--toxic-green);
    }

    .log-index {
        font-size: 0.9rem;
        color: #777;
        flex-shrink: 0;
        padding-top: 2px;
    }

    .log-data {
        word-break: break-all;
        line-height: 1.4;
        font-size: 1rem;
    }

    .empty-log {
        text-align: center;
        color: #666;
        padding: 2rem;
        font-size: 1rem;
        letter-spacing: 2px;
    }

    /* === MODAL === */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    }

    .modal {
        background: #000;
        border: 2px solid var(--toxic-green);
        padding: 1.5rem;
        box-shadow:
            0 0 40px rgba(158, 245, 35, 0.2),
            inset 0 0 60px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        max-width: 90%;
        width: 380px;
        position: relative;
    }

    .modal::before,
    .modal::after {
        content: "";
        position: absolute;
        width: 25px;
        height: 25px;
    }

    .modal::before {
        top: -2px;
        left: -2px;
        border-left: 2px solid var(--toxic-green);
        border-top: 2px solid var(--toxic-green);
    }

    .modal::after {
        bottom: -2px;
        right: -2px;
        border-right: 2px solid var(--toxic-green);
        border-bottom: 2px solid var(--toxic-green);
    }

    .modal-header {
        font-size: 1.1rem;
        color: var(--toxic-green);
        width: 100%;
        text-align: center;
        padding-bottom: 0.75rem;
        border-bottom: 1px dashed #444;
        letter-spacing: 2px;
    }

    .qr-wrapper {
        border: 3px solid #222;
        padding: 10px;
        background: #000;
    }

    .qr-wrapper canvas {
        display: block;
        max-width: 100%;
        height: auto;
        image-rendering: pixelated;
    }

    .close-btn {
        background: transparent;
        border: 1px solid var(--toxic-green);
        color: var(--toxic-green);
        padding: 0.9rem 1.5rem;
        font-family: var(--font-main);
        cursor: pointer;
        font-size: 1rem;
        letter-spacing: 2px;
        transition: all 0.15s;
        width: 100%;
    }

    .close-btn:hover {
        background: var(--toxic-green);
        color: #000;
        box-shadow: 0 0 15px var(--toxic-green);
    }
</style>
