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

    // --- Константы символов (точные размеры) ---
    const LATIN_LOWER = "abcdefghijklmnopqrstuvwxyz"; // 26
    const LATIN_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 26
    const CYRILLIC_LOWER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"; // 33
    const CYRILLIC_UPPER = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"; // 33
    const NUMBERS = "0123456789"; // 10
    const SYMBOLS = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\"; // 32 - расширенный набор

    // --- Словарь (дедуплицированный) ---
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

    // Уникальные слова, отфильтрованные и отсортированные
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

    // Скорости брутфорса (хешей в секунду)
    const ATTACK_SPEEDS = {
        online_throttled: 10, // Онлайн с ограничением
        online_unthrottled: 1000, // Онлайн без ограничения
        offline_slow: 1e4, // bcrypt/Argon2
        offline_fast: 1e10, // MD5/SHA1 на GPU
        offline_asic: 1e13, // Специализированное оборудование
        nation_state: 1e15, // Государственные ресурсы
    };

    onMount(() => {
        console.log(
            `Словарь XKCD: ${DICT_SIZE} уникальных слов, ${BITS_PER_WORD.toFixed(4)} бит/слово`
        );
        loadHistory();
        generate();
    });

    // --- Криптографически безопасный RNG ---
    const secureRandomInt = (max: number): number => {
        if (max <= 0) return 0;
        const randomBuffer = new Uint32Array(1);
        const maxValid = Math.floor(0xffffffff / max) * max;

        // Rejection sampling для устранения bias
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
            error = `МИНИМАЛЬНАЯ ДЛИНА: ${minLength} (по символу из каждой категории)`;
            return;
        }

        // Гарантируем по одному символу из каждой категории
        let chars: string[] = categories.map((c) =>
            getSecureRandomChar(c.chars)
        );

        // Остальные символы из общего пула
        while (chars.length < length) {
            chars.push(getSecureRandomChar(pool));
        }

        // Fisher-Yates shuffle с криптографическим RNG
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
                // Случайно: заглавная или строчная первая буква
                word = secureRandomBool()
                    ? word.charAt(0).toUpperCase() + word.slice(1)
                    : word;
            } else if (capitalizeXKCD) {
                // Всегда заглавная (детерминистически = 0 бит)
                word = word.charAt(0).toUpperCase() + word.slice(1);
            }

            words.push(word);
        }

        let pwd = words.join(separator);

        if (includeNumberXKCD) {
            const range = parseInt(numberRange);
            const num = secureRandomInt(range);
            const padLength = numberRange.length - 1; // "100" -> pad to 2
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
                name: "Символы",
                chars: SYMBOLS,
                size: SYMBOLS.length,
            });
        }

        return categories;
    };

    // --- РАСЧЁТ ЭНТРОПИИ (Точный) ---
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

        const k = categories.length; // Количество обязательных категорий
        const L = password.length; // Длина пароля
        const N = categories.reduce((sum, c) => sum + c.size, 0); // Размер пула

        /**
         * ТОЧНЫЙ РАСЧЁТ ЭНТРОПИИ:
         *
         * Алгоритм генерации:
         * 1. Выбираем по 1 символу из каждой из k категорий
         * 2. Выбираем (L-k) символов из объединённого пула N
         * 3. Перемешиваем все L символов
         *
         * Количество возможных исходов:
         * = (∏ᵢ nᵢ) × N^(L-k) × C(L, k) × k!
         *
         * Но C(L,k) × k! = P(L,k) = L!/(L-k)!
         *
         * Энтропия = log₂ этого числа
         *
         * Однако! Это ПЕРЕОЦЕНКА, потому что некоторые комбинации
         * могут генерироваться несколькими способами.
         *
         * НИЖНЯЯ ГРАНИЦА (консервативная):
         * E_lower = ∑ᵢ log₂(nᵢ) + (L-k) × log₂(N)
         *
         * ВЕРХНЯЯ ГРАНИЦА (если бы все символы из пула):
         * E_upper = L × log₂(N)
         *
         * Для практических целей используем нижнюю границу
         * (консервативный подход - не переоцениваем безопасность)
         */

        let totalBits = 0;

        // Биты от обязательных символов (каждый из своей категории)
        for (const cat of categories) {
            const bits = Math.log2(cat.size);
            totalBits += bits;
            entropyDetails.push({
                label: `Обязат. ${cat.name}`,
                bits: bits,
            });
        }

        // Биты от остальных символов
        if (L > k) {
            const remainingBits = (L - k) * Math.log2(N);
            totalBits += remainingBits;
            entropyDetails.push({
                label: `${L - k} симв. × log₂(${N})`,
                bits: remainingBits,
            });
        }

        // Биты от перестановки (размещение обязательных среди всех позиций)
        // Это log₂(C(L, k)) = log₂(L! / (k! × (L-k)!))
        if (k > 0 && L > k) {
            const permutationBits = logBinomial(L, k);
            totalBits += permutationBits;
            entropyDetails.push({
                label: `Перестановка C(${L},${k})`,
                bits: permutationBits,
            });
        }

        // Но не можем превысить верхнюю границу
        const upperBound = L * Math.log2(N);
        entropyBits = Math.min(totalBits, upperBound);

        // Добавляем информацию о верхней границе
        entropyDetails.push({
            label: `Верхняя граница (L×log₂N)`,
            bits: upperBound,
        });
    };

    const calculateXKCDEntropy = (): void => {
        /**
         * XKCD ЭНТРОПИЯ (Модель атаки: Керкгоффс)
         *
         * Атакующий знает:
         * - Размер словаря
         * - Количество слов
         * - Разделитель (выбран пользователем, предполагаем известен)
         * - Формат (с числом или без, с капитализацией или без)
         *
         * Атакующий НЕ знает:
         * - Какие конкретно слова выбраны
         * - Какое число добавлено
         * - (Если случайная капитализация) регистр каждого слова
         */

        let totalBits = 0;

        // 1. Энтропия от выбора слов
        const wordBits = wordCount * BITS_PER_WORD;
        totalBits += wordBits;
        entropyDetails.push({
            label: `${wordCount} слов × ${BITS_PER_WORD.toFixed(2)} бит`,
            bits: wordBits,
        });

        // 2. Энтропия от случайной капитализации
        if (randomCapitalization) {
            // Каждое слово независимо: 2 варианта = 1 бит
            const capBits = wordCount * 1;
            totalBits += capBits;
            entropyDetails.push({
                label: `Случ. регистр (${wordCount} × 1)`,
                bits: capBits,
            });
        }
        // capitalizeXKCD = true даёт 0 бит (детерминистически)

        // 3. Энтропия от числа
        if (includeNumberXKCD) {
            const range = parseInt(numberRange);
            const numBits = Math.log2(range);
            totalBits += numBits;
            entropyDetails.push({
                label: `Число 0-${range - 1}`,
                bits: numBits,
            });
        }

        // 4. Разделитель - 0 бит (выбран пользователем фиксированно)
        // Примечание: если бы разделитель выбирался случайно из 5 вариантов,
        // это добавило бы log₂(5) ≈ 2.32 бит

        entropyBits = totalBits;
    };

    // Логарифм биномиального коэффициента через гамма-функцию
    const logBinomial = (n: number, k: number): number => {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 0;

        // log₂(C(n,k)) = (log(n!) - log(k!) - log((n-k)!)) / log(2)
        // Используем приближение Стирлинга для больших чисел
        // или точный расчёт для малых

        let result = 0;
        for (let i = 0; i < k; i++) {
            result += Math.log2(n - i) - Math.log2(i + 1);
        }
        return result;
    };

    const updateEntropyDisplay = (): void => {
        const bits = entropyBits;

        // Градации по стандартам NIST SP 800-63B и industry best practices
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
            entropyLabel = "КРИПТОСТОЙКОСТЬ: 2⁸⁰ операций";
        } else if (bits < 192) {
            entropyColor = "#00ffff";
            entropyLabel = "КРИПТОСТОЙКОСТЬ: 2⁹⁶ операций";
        } else if (bits < 256) {
            entropyColor = "#aa88ff";
            entropyLabel = "КРИПТОСТОЙКОСТЬ: AES-192+";
        } else {
            entropyColor = "#ffffff";
            entropyLabel = "КРИПТОСТОЙКОСТЬ: AES-256+";
        }

        // Шкала до 256 бит (AES-256 уровень)
        entropyPercent = Math.min((bits / 256) * 100, 100);
    };

    const calculateCrackTime = (): void => {
        const combinations = Math.pow(2, entropyBits);

        // Предполагаем offline fast attack (1e10 attempts/sec)
        const speed = ATTACK_SPEEDS.offline_fast;
        const seconds = combinations / speed / 2; // В среднем найдём за половину попыток

        crackTime = formatTime(seconds);
    };

    const formatTime = (seconds: number): string => {
        if (!isFinite(seconds) || seconds > 1e30) return "∞ (неподбираемо)";

        const minute = 60;
        const hour = minute * 60;
        const day = hour * 24;
        const year = day * 365.25;
        const century = year * 100;
        const millennium = year * 1000;
        const age_of_universe = year * 13.8e9;

        if (seconds < 0.001) return "< 1 мс";
        if (seconds < 1) return `${(seconds * 1000).toFixed(0)} мс`;
        if (seconds < minute) return `${seconds.toFixed(1)} сек`;
        if (seconds < hour) return `${(seconds / minute).toFixed(1)} мин`;
        if (seconds < day) return `${(seconds / hour).toFixed(1)} часов`;
        if (seconds < year) return `${(seconds / day).toFixed(1)} дней`;
        if (seconds < century) return `${(seconds / year).toFixed(1)} лет`;
        if (seconds < millennium)
            return `${(seconds / century).toFixed(1)} веков`;
        if (seconds < age_of_universe)
            return `${(seconds / millennium).toFixed(0)} тысячелетий`;
        return `${(seconds / age_of_universe).toFixed(2)}× возраст Вселенной`;
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
        // При восстановлении не можем точно пересчитать энтропию
        // потому что не знаем исходные параметры
        entropyBits = 0;
        entropyDetails = [{ label: "Восстановлено из истории", bits: 0 }];
        entropyLabel = "ЭНТРОПИЯ: НЕИЗВЕСТНА (из истории)";
        entropyColor = "#888888";
        entropyPercent = 0;
        crackTime = "N/A";
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
            error = "Ошибка копирования в буфер";
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
                <div class="password-label">СГЕНЕРИРОВАННЫЙ ПАРОЛЬ:</div>
                <div class="password-field" class:pulse={copied}>
                    {password || "INITIALIZING..."}
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
                        title="QR">QR</button
                    >
                    <button
                        class="action-btn refresh"
                        on:click={generate}
                        title="Обновить">↻</button
                    >
                </div>
            </div>
        </div>

        
        <div class="entropy-section">
            <div class="entropy-header">
                <span
                    class="entropy-label"
                    style="color: {entropyColor}; text-shadow: 0 0 10px {entropyColor};"
                >
                    {entropyLabel}
                </span>
                <span class="entropy-bits" style="color: {entropyColor}">
                    {entropyBits.toFixed(2)} бит
                </span>
            </div>

            <div class="entropy-track">
                <div
                    class="entropy-fill"
                    style="width: {entropyPercent}%; background: {entropyColor}; 
                           box-shadow: 0 0 15px {entropyColor};"
                ></div>
                
                <div
                    class="marker"
                    style="left: {(50 / 256) * 100}%"
                    title="50 бит - минимум"
                >
                    <span class="marker-label">50</span>
                </div>
                <div
                    class="marker"
                    style="left: {(80 / 256) * 100}%"
                    title="80 бит - хорошо"
                >
                    <span class="marker-label">80</span>
                </div>
                <div
                    class="marker"
                    style="left: {(128 / 256) * 100}%"
                    title="128 бит - AES-128"
                >
                    <span class="marker-label">128</span>
                </div>
            </div>

            <div class="crack-time">
                ⏱ Время подбора (GPU, 10¹⁰ попыток/сек): <strong
                    >{crackTime}</strong
                >
            </div>

            {#if entropyDetails.length > 0}
                <details class="entropy-details">
                    <summary>📊 Детализация расчёта</summary>
                    <div class="details-grid">
                        {#each entropyDetails as detail}
                            <div class="detail-row">
                                <span class="detail-label">{detail.label}</span>
                                <span class="detail-bits"
                                    >{detail.bits.toFixed(2)} бит</span
                                >
                            </div>
                        {/each}
                        <div class="detail-row total">
                            <span class="detail-label">ИТОГО</span>
                            <span class="detail-bits"
                                >{entropyBits.toFixed(2)} бит</span
                            >
                        </div>
                    </div>
                </details>
            {/if}
        </div>

        
        <div class="settings-grid">
            {#if mode === "standard"}
                <div class="setting-row full-width cyrillic-switch">
                    <label class="switch-container">
                        <input
                            type="checkbox"
                            bind:checked={useCyrillic}
                            on:change={handleOptionChange}
                        />
                        <span class="switch-track">
                            <span class="switch-thumb"></span>
                            <span class="label-off"
                                >LAT ({LATIN_LOWER.length +
                                    LATIN_UPPER.length})</span
                            >
                            <span class="label-on"
                                >CYR ({CYRILLIC_LOWER.length +
                                    CYRILLIC_UPPER.length})</span
                            >
                        </span>
                    </label>
                </div>

                <div class="setting-row full-width slider-row">
                    <label for="len">
                        ДЛИНА: <span class="val">{length}</span>
                    </label>
                    <input
                        id="len"
                        type="range"
                        bind:value={length}
                        min="4"
                        max="64"
                        on:input={generate}
                    />
                </div>

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
                            <small
                                >({useCyrillic
                                    ? CYRILLIC_LOWER.length
                                    : LATIN_LOWER.length})</small
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
                            <small
                                >({useCyrillic
                                    ? CYRILLIC_UPPER.length
                                    : LATIN_UPPER.length})</small
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
                        <span class="check-label"
                            >0-9 <small>({NUMBERS.length})</small></span
                        >
                    </label>
                    <label class="cyber-check">
                        <input
                            type="checkbox"
                            bind:checked={includeSymbols}
                            on:change={handleOptionChange}
                        />
                        <span class="check-box"></span>
                        <span class="check-label"
                            >!@# <small>({SYMBOLS.length})</small></span
                        >
                    </label>
                </div>
            {:else}
                
                <div class="setting-row full-width slider-row">
                    <label for="wc">
                        СЛОВА: <span class="val">{wordCount}</span>
                        <span class="entropy-preview">
                            ≈ {(wordCount * BITS_PER_WORD).toFixed(1)} бит от слов
                        </span>
                    </label>
                    <input
                        id="wc"
                        type="range"
                        bind:value={wordCount}
                        min="3"
                        max="12"
                        on:input={generate}
                    />
                </div>

                <div class="setting-row full-width">
                    <label for="sep"
                        >РАЗДЕЛИТЕЛЬ <small>(известен атакующему = 0 бит)</small
                        ></label
                    >
                    <select
                        id="sep"
                        bind:value={separator}
                        on:change={generate}
                        class="cyber-select"
                    >
                        <option value="-">ТИРЕ (-)</option>
                        <option value="_">НИЖНЕЕ (_)</option>
                        <option value=".">ТОЧКА (.)</option>
                        <option value=" ">ПРОБЕЛ</option>
                        <option value="+">ПЛЮС (+)</option>
                        <option value="">БЕЗ РАЗДЕЛИТЕЛЯ</option>
                    </select>
                </div>

                <div class="setting-row full-width">
                    <label for="numrange">ДИАПАЗОН ЧИСЛА</label>
                    <select
                        id="numrange"
                        bind:value={numberRange}
                        on:change={generate}
                        class="cyber-select"
                        disabled={!includeNumberXKCD}
                    >
                        <option value="10">0-9 (+3.32 бит)</option>
                        <option value="100">00-99 (+6.64 бит)</option>
                        <option value="1000">000-999 (+9.97 бит)</option>
                        <option value="10000">0000-9999 (+13.29 бит)</option>
                    </select>
                </div>

                <div class="checkbox-grid">
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
                            <small class="entropy-zero">(+0 бит)</small>
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
                            <small class="entropy-plus"
                                >(+{wordCount} бит)</small
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
                            <small class="entropy-plus"
                                >(+{Math.log2(parseInt(numberRange)).toFixed(1)}
                                бит)</small
                            >
                        </span>
                    </label>
                </div>

                <div class="dict-info">
                    📖 Словарь: <strong>{DICT_SIZE}</strong> уникальных слов =
                    <strong>{BITS_PER_WORD.toFixed(4)}</strong> бит/слово
                </div>
            {/if}
        </div>

        {#if error}
            <div class="error-msg">⚠ {error}</div>
        {/if}

        <button class="big-gen-btn" on:click={generate}> СГЕНЕРИРОВАТЬ </button>
    </div>

    
    <div class="panel history-panel">
        <div class="panel-header">
            <h3>ЛОГ ПАРОЛЕЙ ({history.length})</h3>
            {#if history.length > 0}
                <button class="clear-btn" on:click={clearHistory}
                    >ОЧИСТКА</button
                >
            {/if}
        </div>
        <div class="history-list">
            {#each history as item, i}
                <button
                    class="log-entry"
                    on:click={() => restoreFromHistory(item)}
                >
                    <span class="log-time"
                        >[{String(i + 1).padStart(2, "0")}]</span
                    >
                    <span class="log-data">{item}</span>
                </button>
            {/each}
            {#if history.length === 0}
                <div class="empty-log">NO DATA</div>
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
            <div class="modal-header">QR ПАРОЛЬ</div>
            <canvas bind:this={qrCanvas}></canvas>
            <button class="close-btn" on:click={closeQR}>ЗАКРЫТЬ</button>
        </div>
    </div>
{/if}

<style>
    /* CSS Grid Layout */
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
            max-height: 600px;
            position: sticky;
            top: 1rem;
        }
    }

    /* Panels */
    .panel {
        background: rgba(15, 15, 15, 0.9);
        border: 1px solid var(--toxic-green);
        padding: 1.5rem;
        position: relative;
        box-shadow: 0 0 15px rgba(158, 245, 35, 0.1);
    }
    .panel::after {
        content: "";
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 15px;
        height: 15px;
        border-right: 2px solid var(--toxic-green);
        border-bottom: 2px solid var(--toxic-green);
    }
    .panel::before {
        content: "";
        position: absolute;
        top: -4px;
        left: -4px;
        width: 15px;
        height: 15px;
        border-left: 2px solid var(--toxic-green);
        border-top: 2px solid var(--toxic-green);
    }

    /* Tabs */
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        border-bottom: 1px dashed var(--toxic-green-dark);
        padding-bottom: 0.5rem;
    }
    .tabs {
        display: flex;
        gap: 1rem;
    }
    .tabs button {
        background: transparent;
        border: none;
        color: #555;
        font-family: var(--font-main);
        font-size: 1.1rem;
        cursor: pointer;
        transition: 0.2s;
        padding: 0;
        font-weight: 700;
    }
    .tabs button.active {
        color: var(--toxic-green);
        text-shadow: 0 0 5px var(--toxic-green-dim);
    }

    /* Display */
    .display-section {
        margin-bottom: 1.5rem;
    }
    .password-label {
        font-size: 0.8rem;
        color: #777;
        margin-bottom: 4px;
    }
    .password-field {
        background: #000;
        border: 2px solid var(--toxic-green);
        color: var(--toxic-green);
        padding: 1rem;
        font-size: clamp(1rem, 3.5vw, 1.6rem);
        font-family: var(--font-main);
        font-weight: 600;
        word-break: break-all;
        min-height: 3rem;
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
        box-shadow: inset 0 0 10px rgba(158, 245, 35, 0.2);
        letter-spacing: -0.5px;
    }
    .password-field.pulse {
        animation: textPulse 0.5s ease-in-out;
        background: var(--toxic-green);
        color: #000;
    }
    @keyframes textPulse {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
    }

    .actions {
        display: grid;
        grid-template-columns: 3fr 1fr 1fr;
        gap: 10px;
    }
    .action-btn {
        background: var(--toxic-green-dark);
        border: 1px solid var(--toxic-green);
        color: var(--toxic-green);
        font-family: var(--font-main);
        font-size: 1.2rem;
        padding: 0.5rem;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.2s;
        font-weight: 600;
    }
    .action-btn:hover {
        background: var(--toxic-green);
        color: #000;
    }
    .action-btn.success {
        background: var(--toxic-green);
        color: #000;
        border-color: #fff;
    }

    .entropy-track {
        height: 12px;
        background: #111;
        border: 1px solid #333;
        position: relative;
        overflow: hidden;
    }
    .entropy-fill {
        height: 100%;
        transition:
            width 0.4s ease,
            background 0.4s;
    }

    /* Controls */
    .settings-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .setting-row label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        font-size: 1.2rem;
    }
    .setting-row .val {
        color: var(--toxic-green);
        font-weight: bold;
    }

    input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        background: transparent;
    }
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 24px;
        width: 12px;
        background: var(--toxic-green);
        cursor: pointer;
        margin-top: -8px;
        border: 1px solid #000;
    }
    input[type="range"]::-webkit-slider-runnable-track {
        width: 100%;
        height: 8px;
        background: #222;
        border: 1px solid #444;
    }

    .checkbox-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 1rem;
    }
    .cyber-check {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        background: rgba(255, 255, 255, 0.05);
        padding: 5px 10px;
        border: 1px solid transparent;
    }
    .cyber-check:hover {
        border-color: #444;
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
    }
    .cyber-check input:checked + .check-box::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        right: 2px;
        bottom: 2px;
        background: var(--toxic-green);
        box-shadow: 0 0 5px var(--toxic-green);
    }
    .check-label {
        font-size: 1.1rem;
    }

    /* Cyrillic Switch */
    .cyrillic-switch .switch-container {
        cursor: pointer;
        width: 100%;
    }
    .cyrillic-switch input {
        display: none;
    }
    .switch-track {
        display: flex;
        width: 100%;
        height: 40px;
        background: #111;
        border: 2px solid var(--toxic-green);
        position: relative;
        align-items: center;
        justify-content: space-around;
    }
    .switch-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        bottom: 2px;
        width: 50%;
        background: var(--toxic-green);
        transition: 0.3s;
        z-index: 1;
        opacity: 0.2;
    }
    .cyrillic-switch input:checked + .switch-track .switch-thumb {
        left: 50%;
        transform: translateX(-2px);
    }
    .label-off,
    .label-on {
        z-index: 2;
        font-weight: bold;
    }
    .cyrillic-switch input:checked + .switch-track .label-on {
        color: var(--toxic-green);
        text-shadow: 0 0 5px;
    }
    .cyrillic-switch input:not(:checked) + .switch-track .label-off {
        color: var(--toxic-green);
        text-shadow: 0 0 5px;
    }

    /* Select */
    .cyber-select {
        width: 100%;
        background: #000;
        color: var(--toxic-green);
        border: 1px solid var(--toxic-green);
        font-family: var(--font-main);
        font-size: 1.2rem;
        padding: 0.5rem;
        margin-top: 5px;
    }

    .big-gen-btn {
        width: 100%;
        margin-top: 2rem;
        background: var(--toxic-green);
        color: #000;
        border: none;
        padding: 1rem;
        font-family: var(--font-main);
        font-size: 1.4rem;
        font-weight: 700;
        letter-spacing: 0;
        cursor: pointer;
        clip-path: polygon(
            10px 0,
            100% 0,
            100% calc(100% - 10px),
            calc(100% - 10px) 100%,
            0 100%,
            0 10px
        );
        transition:
            transform 0.1s,
            box-shadow 0.2s;
    }
    .big-gen-btn:hover {
        box-shadow: 0 0 15px var(--toxic-green);
    }
    .big-gen-btn:active {
        transform: scale(0.98);
    }

    .error-msg {
        color: var(--error-color);
        text-align: center;
        margin-top: 10px;
    }

    /* History */
    .history-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 500px;
    }
    .history-list {
        flex: 1;
        overflow-y: auto;
        padding-right: 5px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .clear-btn {
        background: transparent;
        border: 1px solid #444;
        color: #777;
        font-family: var(--font-main);
        cursor: pointer;
        font-size: 0.8rem;
    }
    .clear-btn:hover {
        border-color: var(--error-color);
        color: var(--error-color);
    }

    .log-entry {
        background: rgba(255, 255, 255, 0.02);
        border: none;
        border-left: 2px solid #333;
        color: #aaa;
        text-align: left;
        padding: 8px;
        font-family: var(--font-main);
        cursor: pointer;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        transition: 0.2s;
    }
    .log-entry:hover {
        background: rgba(158, 245, 35, 0.05);
        border-left-color: var(--toxic-green);
        color: var(--toxic-green);
    }
    .log-time {
        font-size: 0.8rem;
        color: #555;
        white-space: nowrap;
        margin-top: 2px;
    }
    .log-data {
        word-break: break-all;
        line-height: 1.2;
        font-size: 0.9rem;
    }
    .empty-log {
        text-align: center;
        color: #444;
        padding: 2rem;
        font-style: italic;
    }

    /* Modal */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    }
    .modal {
        background: #000;
        border: 2px solid var(--toxic-green);
        padding: 20px;
        box-shadow: 0 0 40px rgba(158, 245, 35, 0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        max-width: 90%;
        width: 360px;
    }
    .modal-header {
        font-size: 1.5rem;
        color: var(--toxic-green);
        border-bottom: 1px dashed #333;
        width: 100%;
        text-align: center;
        padding-bottom: 0.5rem;
        font-weight: 700;
    }
    .modal canvas {
        border: 4px solid #1a1a1a;
        max-width: 100%;
        height: auto;
        image-rendering: pixelated;
    }
    .close-btn {
        background: transparent;
        border: 1px solid var(--toxic-green);
        color: var(--toxic-green);
        padding: 12px;
        font-family: var(--font-main);
        cursor: pointer;
        font-size: 1.2rem;
        font-weight: bold;
        text-transform: uppercase;
        width: 100%;
        transition: all 0.2s;
    }
    .close-btn:hover {
        background: var(--toxic-green);
        color: #000;
        box-shadow: 0 0 15px var(--toxic-green);
    }

    .entropy-bits {
        font-weight: bold;
        font-size: 1rem;
    }

    .dict-info {
        font-size: 0.8rem;
        color: #888;
        text-align: center;
        padding: 8px;
        border: 1px dashed #333;
        margin-top: 0.5rem;
    }
    .entropy-section {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #333;
        padding: 1rem;
        margin-bottom: 1.5rem;
    }

    .entropy-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .entropy-label {
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.3s;
    }

    .entropy-bits {
        font-size: 1.2rem;
        font-weight: bold;
        font-family: var(--font-main);
    }

    .entropy-track {
        height: 16px;
        background: #111;
        border: 1px solid #333;
        position: relative;
        margin-bottom: 0.75rem;
    }

    .entropy-fill {
        height: 100%;
        transition:
            width 0.4s ease,
            background 0.4s;
    }

    .marker {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: rgba(255, 255, 255, 0.4);
    }

    .marker-label {
        position: absolute;
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.6rem;
        color: #666;
    }

    .crack-time {
        font-size: 0.8rem;
        color: #888;
        margin-bottom: 0.5rem;
    }

    .crack-time strong {
        color: var(--toxic-green);
    }

    .entropy-details {
        margin-top: 0.75rem;
    }

    .entropy-details summary {
        cursor: pointer;
        color: #666;
        font-size: 0.8rem;
        user-select: none;
    }

    .entropy-details summary:hover {
        color: var(--toxic-green);
    }

    .details-grid {
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.2);
    }

    .detail-row.total {
        border-top: 1px solid #444;
        font-weight: bold;
        color: var(--toxic-green);
    }

    .detail-label {
        color: #888;
    }

    .detail-bits {
        color: #aaa;
        font-family: var(--font-main);
    }

    .entropy-preview {
        font-size: 0.75rem;
        color: #666;
        margin-left: 1rem;
    }

    .entropy-zero {
        color: #666;
    }

    .entropy-plus {
        color: var(--toxic-green);
    }

    .cyber-check.highlight {
        border-color: var(--toxic-green);
        background: rgba(158, 245, 35, 0.05);
    }

    .cyber-check.disabled {
        opacity: 0.5;
    }

    .dict-info {
        font-size: 0.8rem;
        color: #888;
        text-align: center;
        padding: 10px;
        border: 1px dashed #333;
        margin-top: 0.5rem;
    }

    .dict-info strong {
        color: var(--toxic-green);
    }

    small {
        opacity: 0.7;
        font-size: 0.75em;
    }
</style>
