<script lang="ts">
    import { onMount, tick } from "svelte";
    import QRCode from "qrcode";
    import { t } from "./i18n";

    // --- Типы ---
    interface CharCategory {
        name: string;
        chars: string;
        size: number;
    }

    // Структурная единица детализации энтропии (переводимая на лету)
    interface EntropyDetail {
        key?: string;
        params?: Record<string, string | number>;
        label?: string; // фолбэк для старых записей истории
        bits: number;
    }

    // --- Состояние ---
    let mode: "standard" | "xkcd" | "phonetic" | "fio" = "standard";

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

    // Phonetic Mode
    let syllablesPerWord: number = 3;
    let phoneticWordCount: number = 3;
    let phoneticSeparator: string = "-";
    let phoneticCapitalize: boolean = true;
    let phoneticIncludeNumber: boolean = true;
    let phoneticNumberRange: "10" | "100" | "1000" = "100";
    let phoneticPattern: "cv" | "cvc" | "cvcc" | "ccvc" = "cv";
    let useCyrillicPhonetic: boolean = false;

    // ФИО Mode — имитация имён из псевдо-имён (Ф И О)
    let fioWordCount: number = 3;
    let fioSyllablesPerWord: number = 3;
    let fioSeparator: string = " ";
    let fioIncludeNumber: boolean = false;
    let fioNumberRange: "10" | "100" | "1000" = "100";
    let useCyrillicFio: boolean = false;

    // Общие
    let password: string = "";
    let errorKey: string = "";
    let errorParams: Record<string, string | number> | undefined;
    let copied: boolean = false;
    interface HistoryEntry {
        password: string;
        bits: number;
        details: EntropyDetail[];
    }
    let history: HistoryEntry[] = [];
    let showQR: boolean = false;
    let qrCanvas: HTMLCanvasElement;

    // Энтропия
    let entropyBits: number = 0;
    let entropyDetails: EntropyDetail[] = [];
    let showDetails: boolean = false;

    // Производные значения дисплея энтропии — реактивны к битам и языку,
    // поэтому корректно обновляются при смене языка и восстановлении из истории
    $: entropyColor = colorForBits(entropyBits);
    $: entropyPercent = Math.min((entropyBits / ENTROPY_MAX) * 100, 100);
    $: entropyLabel = password
        ? $t(labelKeyForBits(entropyBits))
        : $t("ent.calc");
    $: crackTime = password ? formatTime(crackSeconds(entropyBits), $t) : "";
    $: error = errorKey ? $t(errorKey, errorParams) : "";

    // Кол-во сегментов прогресс-бара энтропии
    const ENTROPY_SEGMENTS = 36;
    const ENTROPY_MAX = 256;
    const THRESHOLDS = [50, 80, 128, 192];

    // --- Константы символов ---
    const LATIN_LOWER = "abcdefghijklmnopqrstuvwxyz";
    const LATIN_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const CYRILLIC_LOWER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
    const CYRILLIC_UPPER = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
    const NUMBERS = "0123456789";
    const SYMBOLS = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\";

    // Фонетические константы
    const LATIN_CONSONANTS = "bcdfghjklmnprstvwz";
    const LATIN_VOWELS = "aeiou";
    const CYRILLIC_CONSONANTS = "бвгджзклмнпрстфхцчш";
    const CYRILLIC_VOWELS = "аеиоуыэюя";

    // --- Словарь XKCD ---
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
        // Диапазон Uint32 — [0, 2^32). Отсекаем «хвост», не кратный max,
        // чтобы rejection sampling давал строго равномерное распределение.
        const range = 0x100000000; // 2^32
        const maxValid = Math.floor(range / max) * max;

        do {
            crypto.getRandomValues(randomBuffer);
        } while (randomBuffer[0] >= maxValid);

        return randomBuffer[0] % max;
    };

    const secureRandomBool = (): boolean => secureRandomInt(2) === 1;

    const getSecureRandomChar = (str: string): string =>
        str.charAt(secureRandomInt(str.length));

    // --- Генерация ---
    // record=true — записать результат в журнал (явные действия: кнопки,
    // смена режима, копирование). record=false — «живой» предпросмотр при
    // перетаскивании ползунков и смене настроек, чтобы не засорять журнал.
    // Проверяем errorKey напрямую: реактивная `error` внутри этого вызова
    // ещё не обновлена (реактивные $:-выражения выполняются после тика).
    const generate = (record: boolean = true): void => {
        errorKey = "";
        errorParams = undefined;
        if (mode === "standard") generateStandard();
        else if (mode === "xkcd") generateXKCD();
        else if (mode === "phonetic") generatePhonetic();
        else if (mode === "fio") generateFio();
        calculateEntropy();
        if (record && !errorKey && password) addToHistory(password);
    };

    // Предпросмотр без записи в журнал — для настроек и ползунков
    const preview = (): void => generate(false);

    const generateStandard = (): void => {
        const categories = getActiveCategories();

        if (categories.length === 0) {
            errorKey = "err.noCategory";
            password = "";
            return;
        }

        const pool = categories.map((c) => c.chars).join("");
        const minLength = categories.length;

        if (length < minLength) {
            errorKey = "err.minLength";
            errorParams = { n: minLength };
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
    };

    // Генерация фонетического пароля
    const generatePhonetic = (): void => {
        const consonants = useCyrillicPhonetic
            ? CYRILLIC_CONSONANTS
            : LATIN_CONSONANTS;
        const vowels = useCyrillicPhonetic ? CYRILLIC_VOWELS : LATIN_VOWELS;

        const generateSyllable = (): string => {
            switch (phoneticPattern) {
                case "cv":
                    return (
                        getSecureRandomChar(consonants) +
                        getSecureRandomChar(vowels)
                    );
                case "cvc":
                    return (
                        getSecureRandomChar(consonants) +
                        getSecureRandomChar(vowels) +
                        getSecureRandomChar(consonants)
                    );
                case "cvcc":
                    return (
                        getSecureRandomChar(consonants) +
                        getSecureRandomChar(vowels) +
                        getSecureRandomChar(consonants) +
                        getSecureRandomChar(consonants)
                    );
                case "ccvc":
                    return (
                        getSecureRandomChar(consonants) +
                        getSecureRandomChar(consonants) +
                        getSecureRandomChar(vowels) +
                        getSecureRandomChar(consonants)
                    );
                default:
                    return (
                        getSecureRandomChar(consonants) +
                        getSecureRandomChar(vowels)
                    );
            }
        };

        const generateWord = (): string => {
            let word = "";
            for (let i = 0; i < syllablesPerWord; i++) {
                word += generateSyllable();
            }
            return word;
        };

        const words: string[] = [];
        for (let i = 0; i < phoneticWordCount; i++) {
            let word = generateWord();
            if (phoneticCapitalize) {
                word = word.charAt(0).toUpperCase() + word.slice(1);
            }
            words.push(word);
        }

        let pwd = words.join(phoneticSeparator);

        if (phoneticIncludeNumber) {
            const range = parseInt(phoneticNumberRange);
            const num = secureRandomInt(range);
            const padLength = phoneticNumberRange.length - 1;
            pwd += phoneticSeparator + String(num).padStart(padLength, "0");
        }

        password = pwd;
    };

    // Генерация пароля из псевдо-имён (режим ФИО)
    const generateFio = (): void => {
        const consonants = useCyrillicFio
            ? CYRILLIC_CONSONANTS
            : LATIN_CONSONANTS;
        const vowels = useCyrillicFio ? CYRILLIC_VOWELS : LATIN_VOWELS;

        // Имя-слово: N слогов CV + финальная согласная (последний слог CVC),
        // чтобы слово звучало как настоящая фамилия/имя (Ковадан, Милетор).
        const generateName = (): string => {
            let word = "";
            for (let i = 0; i < fioSyllablesPerWord; i++) {
                word +=
                    getSecureRandomChar(consonants) +
                    getSecureRandomChar(vowels);
            }
            word += getSecureRandomChar(consonants);
            // Имена всегда с заглавной буквы
            return word.charAt(0).toUpperCase() + word.slice(1);
        };

        const words: string[] = [];
        for (let i = 0; i < fioWordCount; i++) {
            words.push(generateName());
        }

        let pwd = words.join(fioSeparator);

        if (fioIncludeNumber) {
            const range = parseInt(fioNumberRange);
            const num = secureRandomInt(range);
            const padLength = fioNumberRange.length - 1;
            pwd += fioSeparator + String(num).padStart(padLength, "0");
        }

        password = pwd;
    };

    // Бит на одно имя-слово: N слогов CV + финальная согласная
    const getFioWordBits = (): number => {
        const consonants = useCyrillicFio
            ? CYRILLIC_CONSONANTS
            : LATIN_CONSONANTS;
        const vowels = useCyrillicFio ? CYRILLIC_VOWELS : LATIN_VOWELS;
        const cBits = Math.log2(consonants.length);
        const vBits = Math.log2(vowels.length);
        return fioSyllablesPerWord * (cBits + vBits) + cBits;
    };

    // Расчет бит на слог для фонетического режима
    const getPhoneticSyllableBits = (): number => {
        const consonants = useCyrillicPhonetic
            ? CYRILLIC_CONSONANTS
            : LATIN_CONSONANTS;
        const vowels = useCyrillicPhonetic ? CYRILLIC_VOWELS : LATIN_VOWELS;
        const cBits = Math.log2(consonants.length);
        const vBits = Math.log2(vowels.length);

        switch (phoneticPattern) {
            case "cv":
                return cBits + vBits;
            case "cvc":
                return cBits * 2 + vBits;
            case "cvcc":
                return cBits * 3 + vBits;
            case "ccvc":
                return cBits * 3 + vBits;
            default:
                return cBits + vBits;
        }
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
            return;
        }

        if (mode === "standard") {
            calculateStandardEntropy();
        } else if (mode === "xkcd") {
            calculateXKCDEntropy();
        } else if (mode === "phonetic") {
            calculatePhoneticEntropy();
        } else if (mode === "fio") {
            calculateFioEntropy();
        }
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
            entropyDetails.push({
                key: "det.category",
                params: { name: cat.name },
                bits,
            });
        }

        if (L > k) {
            const remainingBits = (L - k) * Math.log2(N);
            totalBits += remainingBits;
            entropyDetails.push({
                key: "det.pool",
                params: { N, count: L - k },
                bits: remainingBits,
            });
        }

        if (k > 0 && L > k) {
            const permutationBits = logBinomial(L, k);
            totalBits += permutationBits;
            entropyDetails.push({
                key: "det.permutation",
                params: { L, k },
                bits: permutationBits,
            });
        }

        const upperBound = L * Math.log2(N);
        entropyBits = Math.min(totalBits, upperBound);
        // Строку «верхняя граница» показываем только когда она реально
        // ограничивает итог, иначе она сбивает с толку (число больше суммы,
        // хотя в сумму не входит).
        if (totalBits > upperBound) {
            entropyDetails.push({ key: "det.upperBound", bits: upperBound });
        }
    };

    const calculateXKCDEntropy = (): void => {
        let totalBits = 0;

        const wordBits = wordCount * BITS_PER_WORD;
        totalBits += wordBits;
        entropyDetails.push({
            key: "det.words",
            params: { count: wordCount },
            bits: wordBits,
        });

        if (randomCapitalization) {
            const capBits = wordCount * 1;
            totalBits += capBits;
            entropyDetails.push({
                key: "det.randomCase",
                params: { count: wordCount },
                bits: capBits,
            });
        }

        if (includeNumberXKCD) {
            const range = parseInt(numberRange);
            const numBits = Math.log2(range);
            totalBits += numBits;
            entropyDetails.push({
                key: "det.number",
                params: { max: range - 1 },
                bits: numBits,
            });
        }

        entropyBits = totalBits;
    };

    // Расчет энтропии для фонетического режима
    const calculatePhoneticEntropy = (): void => {
        let totalBits = 0;
        const syllableBits = getPhoneticSyllableBits();
        const totalSyllables = syllablesPerWord * phoneticWordCount;

        const syllableEntropy = totalSyllables * syllableBits;
        totalBits += syllableEntropy;

        const patternLabel = phoneticPattern.toUpperCase();
        entropyDetails.push({
            key: "det.syllables",
            params: { pattern: patternLabel, count: totalSyllables },
            bits: syllableEntropy,
        });

        if (phoneticIncludeNumber) {
            const range = parseInt(phoneticNumberRange);
            const numBits = Math.log2(range);
            totalBits += numBits;
            entropyDetails.push({
                key: "det.number",
                params: { max: range - 1 },
                bits: numBits,
            });
        }

        entropyBits = totalBits;
    };

    // Расчет энтропии для режима ФИО
    const calculateFioEntropy = (): void => {
        let totalBits = 0;
        const wordBits = getFioWordBits();

        const namesEntropy = fioWordCount * wordBits;
        totalBits += namesEntropy;

        entropyDetails.push({
            key: "det.names",
            params: { count: fioWordCount },
            bits: namesEntropy,
        });

        if (fioIncludeNumber) {
            const range = parseInt(fioNumberRange);
            const numBits = Math.log2(range);
            totalBits += numBits;
            entropyDetails.push({
                key: "det.number",
                params: { max: range - 1 },
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

    // Цвет/метка/время — чистые функции от количества бит (+ переводчик).
    // Используются в реактивных $:-выражениях, поэтому реагируют на язык.
    const colorForBits = (bits: number): string => {
        if (bits < 50) return "var(--st-weak)";
        if (bits < 75) return "var(--st-fair)";
        if (bits >= 256) return "var(--text-display)";
        return "var(--st-strong)";
    };

    const labelKeyForBits = (bits: number): string => {
        if (bits < 28) return "ent.lvl.instant";
        if (bits < 40) return "ent.lvl.seconds";
        if (bits < 50) return "ent.lvl.minutes";
        if (bits < 60) return "ent.lvl.weak";
        if (bits < 75) return "ent.lvl.moderate";
        if (bits < 90) return "ent.lvl.good";
        if (bits < 112) return "ent.lvl.strong";
        if (bits < 128) return "ent.lvl.veryStrong";
        if (bits < 160) return "ent.lvl.crypto80";
        if (bits < 192) return "ent.lvl.crypto96";
        if (bits < 256) return "ent.lvl.aes192";
        return "ent.lvl.aes256";
    };

    const crackSeconds = (bits: number): number => {
        const combinations = Math.pow(2, bits);
        const speed = ATTACK_SPEEDS.offline_fast;
        return combinations / speed / 2;
    };

    const formatTime = (
        seconds: number,
        tr: (key: string, params?: Record<string, string | number>) => string,
    ): string => {
        if (!isFinite(seconds) || seconds > 1e30) return tr("time.infinite");

        const minute = 60;
        const hour = minute * 60;
        const day = hour * 24;
        const year = day * 365.25;
        const century = year * 100;
        const millennium = year * 1000;
        const universe = year * 13.8e9;

        if (seconds < 0.001) return tr("time.lt1ms");
        if (seconds < 1)
            return tr("time.ms", { v: (seconds * 1000).toFixed(0) });
        if (seconds < minute) return tr("time.sec", { v: seconds.toFixed(1) });
        if (seconds < hour)
            return tr("time.min", { v: (seconds / minute).toFixed(1) });
        if (seconds < day)
            return tr("time.hours", { v: (seconds / hour).toFixed(1) });
        if (seconds < year)
            return tr("time.days", { v: (seconds / day).toFixed(1) });
        if (seconds < century)
            return tr("time.years", { v: (seconds / year).toFixed(1) });
        if (seconds < millennium)
            return tr("time.centuries", { v: (seconds / century).toFixed(1) });
        if (seconds < universe)
            return tr("time.millennia", {
                v: (seconds / millennium).toFixed(0),
            });
        return tr("time.universe", { v: (seconds / universe).toFixed(2) });
    };

    // --- История ---
    const addToHistory = (pwd: string): void => {
        if (!pwd) return;
        const entry: HistoryEntry = {
            password: pwd,
            bits: entropyBits,
            details: [...entropyDetails],
        };
        // Полный дедуп: убираем прежнее вхождение и поднимаем запись наверх
        // (актуально при копировании/восстановлении уже виденного пароля).
        history = [entry, ...history.filter((h) => h.password !== pwd)].slice(
            0,
            20,
        );
        try {
            localStorage.setItem("pwd_history", JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history:", e);
        }
    };

    const loadHistory = (): void => {
        try {
            const stored = localStorage.getItem("pwd_history");
            if (!stored) return;
            const parsed: unknown = JSON.parse(stored);
            if (!Array.isArray(parsed)) return;
            // Совместимость со старыми форматами истории:
            // - массив строк (очень старый формат)
            // - объекты со снимком энтропии и details[].label (предыдущий формат)
            history = parsed.map((item) => {
                if (typeof item === "string") {
                    return {
                        password: item,
                        bits: 0,
                        details: [{ key: "hist.restored", bits: 0 }],
                    };
                }
                const e = item as Partial<HistoryEntry>;
                return {
                    password: e.password ?? "",
                    bits: typeof e.bits === "number" ? e.bits : 0,
                    details: Array.isArray(e.details) ? e.details : [],
                };
            });
        } catch (e) {
            console.error("Failed to load history:", e);
        }
    };

    const restoreFromHistory = (entry: HistoryEntry): void => {
        password = entry.password;
        entropyBits = entry.bits;
        entropyDetails = entry.details ?? [];
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
            // Пароль, который скопировали, — осознанно использован: в журнал.
            addToHistory(password);
            setTimeout(() => (copied = false), 2000);
        } catch {
            errorKey = "err.clipboard";
        }
    };

    const generateQR = async (): Promise<void> => {
        if (!password) return;
        // Пароль, для которого показали QR, — осознанно использован: в журнал.
        addToHistory(password);
        showQR = true;
        await tick();
        if (qrCanvas) {
            try {
                // Чёрные модули на токсично-зелёном фоне: тематично и сохраняет
                // правильную полярность (тёмное на светлом) для надёжного сканирования
                await QRCode.toCanvas(qrCanvas, password, {
                    width: 320,
                    margin: 2,
                    color: { dark: "#000000", light: "#9ef523" },
                    errorCorrectionLevel: "M",
                });
            } catch (e) {
                console.error("QR generation failed:", e);
            }
        }
    };

    const closeQR = (): void => {
        showQR = false;
    };
    const handleBackdropClick = (e: MouseEvent): void => {
        if (e.target === e.currentTarget) closeQR();
    };
    // Закрытие модалки по Escape независимо от фокуса
    const handleWindowKeydown = (e: KeyboardEvent): void => {
        if (showQR && e.key === "Escape") closeQR();
    };
    const handleOptionChange = (): void => preview();
    const toggleDetails = (): void => {
        showDetails = !showDetails;
    };
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<div class="app-grid">
    <section class="card generator">
        <!-- Режимы -->
        <div class="seg-control modes" role="tablist" aria-label={$t("a11y.mode")}>
            <button
                role="tab"
                aria-selected={mode === "standard"}
                class:active={mode === "standard"}
                on:click={() => {
                    mode = "standard";
                    generate();
                }}>{$t("mode.standard")}</button
            >
            <button
                role="tab"
                aria-selected={mode === "xkcd"}
                class:active={mode === "xkcd"}
                on:click={() => {
                    mode = "xkcd";
                    generate();
                }}>{$t("mode.xkcd")}</button
            >
            <button
                role="tab"
                aria-selected={mode === "phonetic"}
                class:active={mode === "phonetic"}
                on:click={() => {
                    mode = "phonetic";
                    generate();
                }}>{$t("mode.phonetic")}</button
            >
            <button
                role="tab"
                aria-selected={mode === "fio"}
                class:active={mode === "fio"}
                on:click={() => {
                    mode = "fio";
                    generate();
                }}>{$t("mode.fio")}</button
            >
        </div>

        <!-- Дисплей пароля -->
        <div class="pw-block">
            <div class="row-label">
                <span class="label">{$t("pw.label")}</span>
                <span class="label muted">{$t("pw.chars", { n: password.length })}</span>
            </div>
            <div class="pw-value" class:flash={copied}>
                {password || $t("pw.init")}
            </div>
            <div class="pw-actions">
                <button
                    class="btn btn-primary"
                    class:ok={copied}
                    on:click={copyToClipboard}
                >
                    {copied ? $t("pw.copied") : $t("pw.copy")}
                </button>
                <button
                    class="btn btn-secondary btn-qr"
                    on:click={generateQR}
                    title={$t("qr.title")}
                    aria-label={$t("a11y.qr")}
                >
                    <svg
                        class="qr-ico"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        fill="currentColor"
                    >
                        <path
                            d="M3 11h8V3H3v8zm2-6h4v4H5V5zm-2 16h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4z"
                        />
                        <path
                            d="M13 13h2v2h-2zM17 13h2v2h-2zM13 15h2v2h-2zM17 15h2v2h-2zM19 13h2v2h-2zM15 17h2v2h-2zM13 17h2v2h-2zM19 17h2v2h-2zM13 19h2v2h-2zM15 19h2v2h-2zM17 19h2v2h-2zM19 19h2v2h-2z"
                        />
                    </svg>
                    <span>QR</span>
                </button>
                <button
                    class="btn btn-secondary icon"
                    on:click={() => generate()}
                    title={$t("refresh.title")}
                    aria-label={$t("a11y.refresh")}>↻</button
                >
            </div>
        </div>

        <!-- Инструмент энтропии -->
        <div class="entropy">
            <div class="entropy-top">
                <div class="entropy-hero">
                    <span class="entropy-num" style="color: {entropyColor}"
                        >{entropyBits.toFixed(1)}</span
                    >
                    <span class="entropy-unit">{$t("ent.bit")}</span>
                </div>
                <span class="entropy-status" style="color: {entropyColor}"
                    >{entropyLabel}</span
                >
            </div>

            <!-- Сегментный прогресс-бар -->
            <div class="bar">
                <div class="segments" style="--c: {entropyColor}">
                    {#each Array(ENTROPY_SEGMENTS) as _, i}
                        <span
                            class="seg"
                            class:filled={i <
                                Math.round(
                                    (entropyPercent / 100) * ENTROPY_SEGMENTS
                                )}
                        ></span>
                    {/each}
                </div>
                <div class="ticks">
                    {#each THRESHOLDS as threshold}
                        <span
                            class="tick"
                            style="left: {(threshold / ENTROPY_MAX) * 100}%"
                            >{threshold}</span
                        >
                    {/each}
                </div>
            </div>

            <!-- Время подбора -->
            <div class="stat-row">
                <span class="label">{$t("ent.crackTitle")}</span>
                <span class="stat-val" style="color: {entropyColor}"
                    >{crackTime}</span
                >
            </div>

            <!-- Детализация -->
            <button class="details-toggle" on:click={toggleDetails}>
                <span class="ic">{showDetails ? "[−]" : "[+]"}</span>
                {$t("ent.breakdown")}
            </button>

            {#if showDetails && entropyDetails.length > 0}
                <div class="breakdown">
                    {#each entropyDetails as detail}
                        <div class="brk-row">
                            <span class="l"
                                >{detail.key
                                    ? $t(detail.key, detail.params)
                                    : detail.label}</span
                            >
                            <span class="d"></span>
                            <span class="v">{detail.bits.toFixed(2)}</span>
                        </div>
                    {/each}
                    <div class="brk-row total">
                        <span class="l">{$t("ent.total")}</span>
                        <span class="d"></span>
                        <span class="v"
                            >{entropyBits.toFixed(2)} {$t("ent.bit")}</span
                        >
                    </div>
                </div>
            {/if}
        </div>

        <!-- Параметры -->
        <div class="settings">
            <div class="section-label">{$t("set.label")}</div>

            {#if mode === "standard"}
                <div class="field">
                    <span class="label">{$t("set.alphabet")}</span>
                    <div class="seg-control block">
                        <button
                            class:active={!useCyrillic}
                            on:click={() => {
                                useCyrillic = false;
                                preview();
                            }}
                            >{$t("set.lat")} <span class="count"
                                >{LATIN_LOWER.length * 2}</span
                            ></button
                        >
                        <button
                            class:active={useCyrillic}
                            on:click={() => {
                                useCyrillic = true;
                                preview();
                            }}
                            >{$t("set.cyr")} <span class="count"
                                >{CYRILLIC_LOWER.length * 2}</span
                            ></button
                        >
                    </div>
                </div>

                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.length")}</span>
                        <span class="field-val">{length}</span>
                    </div>
                    <input
                        type="range"
                        bind:value={length}
                        min="4"
                        max="64"
                        on:input={preview}
                        aria-label={$t("a11y.length")}
                    />
                    <div class="range-minmax"><span>4</span><span>64</span></div>
                </div>

                <div class="field">
                    <div class="check-grid">
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={includeLowercase}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{useCyrillic ? "а-я" : "a-z"}
                                <span class="count"
                                    >{useCyrillic
                                        ? CYRILLIC_LOWER.length
                                        : LATIN_LOWER.length}</span
                                ></span
                            >
                        </label>
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={includeUppercase}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{useCyrillic ? "А-Я" : "A-Z"}
                                <span class="count"
                                    >{useCyrillic
                                        ? CYRILLIC_UPPER.length
                                        : LATIN_UPPER.length}</span
                                ></span
                            >
                        </label>
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={includeNumbers}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >0-9
                                <span class="count">{NUMBERS.length}</span></span
                            >
                        </label>
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={includeSymbols}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >!@#
                                <span class="count">{SYMBOLS.length}</span></span
                            >
                        </label>
                    </div>
                </div>
            {:else if mode === "xkcd"}
                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.wordCount")}</span>
                        <span class="field-val">{wordCount}</span>
                        <span class="field-hint"
                            >{$t("set.bitsHint", {
                                v: (wordCount * BITS_PER_WORD).toFixed(1),
                            })}</span
                        >
                    </div>
                    <input
                        type="range"
                        bind:value={wordCount}
                        min="3"
                        max="12"
                        on:input={preview}
                        aria-label={$t("a11y.wordCount")}
                    />
                    <div class="range-minmax"><span>3</span><span>12</span></div>
                </div>

                <div class="field">
                    <span class="label">{$t("set.separator")}</span>
                    <select
                        bind:value={separator}
                        on:change={preview}
                        class="sel"
                    >
                        <option value="-">{$t("sep.dash")}</option>
                        <option value="_">{$t("sep.underscore")}</option>
                        <option value=".">{$t("sep.dot")}</option>
                        <option value=" ">{$t("sep.space")}</option>
                        <option value="+">{$t("sep.plus")}</option>
                        <option value="">{$t("sep.none")}</option>
                    </select>
                </div>

                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.numberRange")}</span>
                        <span class="field-hint"
                            >{$t("set.bitsHintPlus", {
                                v: Math.log2(parseInt(numberRange)).toFixed(1),
                            })}</span
                        >
                    </div>
                    <select
                        bind:value={numberRange}
                        on:change={preview}
                        class="sel"
                        disabled={!includeNumberXKCD}
                    >
                        <option value="10">0-9</option>
                        <option value="100">00-99</option>
                        <option value="1000">000-999</option>
                        <option value="10000">0000-9999</option>
                    </select>
                </div>

                <div class="field">
                    <div class="check-grid cols-3">
                        <label
                            class="check"
                            class:disabled={randomCapitalization}
                        >
                            <input
                                type="checkbox"
                                bind:checked={capitalizeXKCD}
                                disabled={randomCapitalization}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{$t("chk.capitalize")}
                                <span class="tag zero">+0</span></span
                            >
                        </label>
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={randomCapitalization}
                                on:change={() => {
                                    if (randomCapitalization)
                                        capitalizeXKCD = false;
                                    handleOptionChange();
                                }}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{$t("chk.randomCase")}
                                <span class="tag plus">+{wordCount}</span></span
                            >
                        </label>
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={includeNumberXKCD}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{$t("chk.number")}
                                <span class="tag plus"
                                    >+{Math.log2(parseInt(numberRange)).toFixed(
                                        1
                                    )}</span
                                ></span
                            >
                        </label>
                    </div>
                </div>

                <div class="data-row">
                    <span>{$t("set.dictionary")}</span>
                    <span class="hl">{$t("set.wordsCount", { n: DICT_SIZE })}</span>
                    <span class="sep">/</span>
                    <span class="hl"
                        >{$t("set.bitsPerWord", {
                            v: BITS_PER_WORD.toFixed(4),
                        })}</span
                    >
                </div>
            {:else if mode === "phonetic"}
                <div class="field">
                    <span class="label">{$t("set.alphabet")}</span>
                    <div class="seg-control block">
                        <button
                            class:active={!useCyrillicPhonetic}
                            on:click={() => {
                                useCyrillicPhonetic = false;
                                preview();
                            }}
                            >{$t("set.lat")} <span class="count"
                                >{LATIN_CONSONANTS.length}C·{LATIN_VOWELS.length}V</span
                            ></button
                        >
                        <button
                            class:active={useCyrillicPhonetic}
                            on:click={() => {
                                useCyrillicPhonetic = true;
                                preview();
                            }}
                            >{$t("set.cyr")} <span class="count"
                                >{CYRILLIC_CONSONANTS.length}C·{CYRILLIC_VOWELS.length}V</span
                            ></button
                        >
                    </div>
                </div>

                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.syllPattern")}</span>
                        <span class="field-hint"
                            >{$t("set.bitsPerSyll", {
                                v: getPhoneticSyllableBits().toFixed(2),
                            })}</span
                        >
                    </div>
                    <select
                        bind:value={phoneticPattern}
                        on:change={preview}
                        class="sel"
                    >
                        <option value="cv">{$t("pat.cv")}</option>
                        <option value="cvc">{$t("pat.cvc")}</option>
                        <option value="cvcc">{$t("pat.cvcc")}</option>
                        <option value="ccvc">{$t("pat.ccvc")}</option>
                    </select>
                </div>

                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.syllPerWord")}</span>
                        <span class="field-val">{syllablesPerWord}</span>
                    </div>
                    <input
                        type="range"
                        bind:value={syllablesPerWord}
                        min="2"
                        max="6"
                        on:input={preview}
                        aria-label={$t("a11y.syllPerWord")}
                    />
                    <div class="range-minmax"><span>2</span><span>6</span></div>
                </div>

                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.wordCount")}</span>
                        <span class="field-val">{phoneticWordCount}</span>
                        <span class="field-hint"
                            >{$t("set.bitsHint", {
                                v: (
                                    phoneticWordCount *
                                    syllablesPerWord *
                                    getPhoneticSyllableBits()
                                ).toFixed(1),
                            })}</span
                        >
                    </div>
                    <input
                        type="range"
                        bind:value={phoneticWordCount}
                        min="2"
                        max="6"
                        on:input={preview}
                        aria-label={$t("a11y.wordCount")}
                    />
                    <div class="range-minmax"><span>2</span><span>6</span></div>
                </div>

                <div class="field">
                    <span class="label">{$t("set.separator")}</span>
                    <select
                        bind:value={phoneticSeparator}
                        on:change={preview}
                        class="sel"
                    >
                        <option value="-">{$t("sep.dash")}</option>
                        <option value="_">{$t("sep.underscore")}</option>
                        <option value=".">{$t("sep.dot")}</option>
                        <option value="">{$t("sep.none")}</option>
                    </select>
                </div>

                <div class="field">
                    <div class="check-grid">
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={phoneticCapitalize}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{$t("chk.capitalize")}
                                <span class="tag zero">+0</span></span
                            >
                        </label>
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={phoneticIncludeNumber}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{$t("chk.number")}
                                <span class="tag plus"
                                    >+{Math.log2(
                                        parseInt(phoneticNumberRange)
                                    ).toFixed(1)}</span
                                ></span
                            >
                        </label>
                    </div>
                </div>

                {#if phoneticIncludeNumber}
                    <div class="field">
                        <span class="label">{$t("set.numberRange")}</span>
                        <select
                            bind:value={phoneticNumberRange}
                            on:change={preview}
                            class="sel"
                        >
                            <option value="10">0-9</option>
                            <option value="100">00-99</option>
                            <option value="1000">000-999</option>
                        </select>
                    </div>
                {/if}

                <div class="data-row">
                    <span
                        >{$t("phon.dataRow", {
                            words: phoneticWordCount,
                            syll: syllablesPerWord,
                        })}</span
                    >
                    <span class="sep">=</span>
                    <span class="hl"
                        >{$t("phon.syllables", {
                            n: phoneticWordCount * syllablesPerWord,
                        })}</span
                    >
                </div>
            {:else if mode === "fio"}
                <div class="field">
                    <span class="label">{$t("set.alphabet")}</span>
                    <div class="seg-control block">
                        <button
                            class:active={!useCyrillicFio}
                            on:click={() => {
                                useCyrillicFio = false;
                                preview();
                            }}
                            >{$t("set.lat")} <span class="count"
                                >{LATIN_CONSONANTS.length}C·{LATIN_VOWELS.length}V</span
                            ></button
                        >
                        <button
                            class:active={useCyrillicFio}
                            on:click={() => {
                                useCyrillicFio = true;
                                preview();
                            }}
                            >{$t("set.cyr")} <span class="count"
                                >{CYRILLIC_CONSONANTS.length}C·{CYRILLIC_VOWELS.length}V</span
                            ></button
                        >
                    </div>
                </div>

                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.nameLength")}</span>
                        <span class="field-val">{fioSyllablesPerWord}</span>
                        <span class="field-hint"
                            >{$t("set.bitsPerWord", {
                                v: getFioWordBits().toFixed(1),
                            })}</span
                        >
                    </div>
                    <input
                        type="range"
                        bind:value={fioSyllablesPerWord}
                        min="2"
                        max="6"
                        on:input={preview}
                        aria-label={$t("a11y.nameLength")}
                    />
                    <div class="range-minmax"><span>2</span><span>6</span></div>
                </div>

                <div class="field">
                    <div class="field-head">
                        <span class="label">{$t("set.nameCount")}</span>
                        <span class="field-val">{fioWordCount}</span>
                        <span class="field-hint"
                            >{$t("set.bitsHint", {
                                v: (
                                    fioWordCount * getFioWordBits()
                                ).toFixed(1),
                            })}</span
                        >
                    </div>
                    <input
                        type="range"
                        bind:value={fioWordCount}
                        min="1"
                        max="6"
                        on:input={preview}
                        aria-label={$t("a11y.nameCount")}
                    />
                    <div class="range-minmax"><span>1</span><span>6</span></div>
                </div>

                <div class="field">
                    <span class="label">{$t("set.separator")}</span>
                    <select
                        bind:value={fioSeparator}
                        on:change={preview}
                        class="sel"
                    >
                        <option value=" ">{$t("sep.space")}</option>
                        <option value="-">{$t("sep.dash")}</option>
                        <option value="_">{$t("sep.underscore")}</option>
                        <option value=".">{$t("sep.dot")}</option>
                        <option value="">{$t("sep.none")}</option>
                    </select>
                </div>

                <div class="field">
                    <div class="check-grid">
                        <label class="check">
                            <input
                                type="checkbox"
                                bind:checked={fioIncludeNumber}
                                on:change={handleOptionChange}
                            />
                            <span class="box"></span>
                            <span class="check-text"
                                >{$t("chk.number")}
                                <span class="tag plus"
                                    >+{Math.log2(
                                        parseInt(fioNumberRange)
                                    ).toFixed(1)}</span
                                ></span
                            >
                        </label>
                    </div>
                </div>

                {#if fioIncludeNumber}
                    <div class="field">
                        <span class="label">{$t("set.numberRange")}</span>
                        <select
                            bind:value={fioNumberRange}
                            on:change={preview}
                            class="sel"
                        >
                            <option value="10">0-9</option>
                            <option value="100">00-99</option>
                            <option value="1000">000-999</option>
                        </select>
                    </div>
                {/if}

                <div class="data-row">
                    <span
                        >{$t("fio.dataRow", {
                            words: fioWordCount,
                            syll: fioSyllablesPerWord,
                        })}</span
                    >
                    <span class="sep">=</span>
                    <span class="hl"
                        >{$t("fio.syllables", {
                            n: fioWordCount * fioSyllablesPerWord,
                        })}</span
                    >
                </div>
            {/if}
        </div>

        {#if error}
            <div class="inline-error">{$t("err.prefix")} {error}</div>
        {/if}

        <button class="btn btn-generate" on:click={() => generate()}>
            {$t("btn.generate")}
        </button>
    </section>

    <!-- Журнал -->
    <aside class="card history">
        <div class="hist-head">
            <h2 class="hist-title">{$t("hist.title", { n: history.length })}</h2>
            {#if history.length > 0}
                <button class="clear" on:click={clearHistory}
                    >{$t("hist.clear")}</button
                >
            {/if}
        </div>
        <div class="hist-list">
            {#each history as item, i}
                <button class="hist-item" on:click={() => restoreFromHistory(item)}>
                    <span class="hist-i">{String(i + 1).padStart(2, "0")}</span>
                    <span class="hist-pw">{item.password}</span>
                </button>
            {/each}
            {#if history.length === 0}
                <div class="hist-empty">{$t("hist.empty")}</div>
            {/if}
        </div>
    </aside>
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
            <div class="modal-head">
                <span class="modal-title">{$t("qr.modalTitle")}</span>
                <button class="modal-close" on:click={closeQR}>[ X ]</button>
            </div>
            <div class="qr-box">
                <canvas bind:this={qrCanvas}></canvas>
            </div>
        </div>
    </div>
{/if}

<style>
    /* === СЕТКА === */
    .app-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-lg);
        width: 100%;
    }

    @media (min-width: 960px) {
        .app-grid {
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
            align-items: start;
        }
        .history {
            position: sticky;
            top: var(--space-lg);
        }
    }

    /* === КАРТОЧКА === */
    .card {
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: var(--space-lg);
    }

    @media (max-width: 600px) {
        .card {
            padding: var(--space-md);
            border-radius: 10px;
        }
    }

    /* === МЕТКИ === */
    .label {
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-secondary);
    }
    .label.muted {
        color: var(--text-disabled);
    }
    .section-label {
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: var(--space-md);
    }
    .count {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        color: var(--text-disabled);
    }

    /* === СЕГМЕНТНЫЙ КОНТРОЛ === */
    .seg-control {
        display: flex;
        gap: 4px;
        border: 2px solid var(--border-visible);
        border-radius: 999px;
        padding: 4px;
    }
    .seg-control.block {
        width: 100%;
    }
    .seg-control button {
        flex: 1;
        background: transparent;
        border: none;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-secondary);
        padding: 12px 12px;
        border-radius: 999px;
        white-space: nowrap;
        transition:
            color 0.2s var(--motion),
            background 0.2s var(--motion);
    }
    .seg-control button:hover {
        color: var(--text-primary);
    }
    .seg-control button.active {
        background: var(--text-display);
        color: var(--black);
    }
    .seg-control button.active .count {
        color: var(--black);
        opacity: 0.55;
    }

    /* Переключатель режимов — самый заметный контрол */
    .modes {
        margin-bottom: var(--space-xl);
        border-color: var(--accent);
        padding: 5px;
        background: var(--surface-raised);
    }
    .modes button {
        font-size: var(--body);
        padding: 14px 8px;
        letter-spacing: 0.06em;
        white-space: nowrap;
    }
    .modes button:hover {
        color: var(--accent-ink);
    }
    .modes button.active {
        background: var(--accent);
        color: var(--accent-contrast);
    }
    .modes button.active:hover {
        color: var(--accent-contrast);
    }

    /* === ПАРОЛЬ === */
    .pw-block {
        margin-bottom: var(--space-xl);
    }
    .row-label {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: var(--space-sm);
    }
    .pw-value {
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: clamp(1.05rem, 3.4vw, 1.6rem);
        line-height: 1.4;
        color: var(--text-display);
        word-break: break-all;
        background: var(--black);
        border: 2px solid var(--border-visible);
        border-radius: 8px;
        padding: var(--space-md);
        min-height: 3.75rem;
        display: flex;
        align-items: center;
    }
    .pw-value.flash {
        animation: flash 0.4s var(--motion);
    }
    @keyframes flash {
        0% {
            background: var(--accent);
            color: var(--accent-contrast);
            border-color: var(--accent);
        }
        100% {
            background: var(--black);
            color: var(--text-display);
        }
    }
    .pw-actions {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: var(--space-sm);
        margin-top: var(--space-sm);
    }

    /* === КНОПКИ === */
    .btn {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        cursor: pointer;
        min-height: 48px;
        padding: 12px 20px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition:
            opacity 0.15s var(--motion),
            border-color 0.15s var(--motion),
            background 0.15s var(--motion),
            color 0.15s var(--motion);
    }
    .btn-primary {
        background: var(--text-display);
        color: var(--black);
        border: 2px solid var(--text-display);
    }
    .btn-primary:hover {
        opacity: 0.85;
    }
    .btn-primary.ok {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--accent-contrast);
    }
    .btn-secondary {
        background: var(--surface-raised);
        border: 2px solid var(--border-visible);
        color: var(--text-display);
        font-size: var(--body);
    }
    .btn-secondary:hover {
        border-color: var(--accent);
        color: var(--accent-ink);
    }
    .btn-secondary.icon {
        padding: 12px 18px;
        font-size: 1.4rem;
    }
    .btn-qr {
        gap: 8px;
        padding: 12px 18px;
    }
    .btn-qr .qr-ico {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
    }
    .btn-qr:hover {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--accent-contrast);
        box-shadow: 0 0 16px rgba(158, 245, 35, 0.35);
    }
    .btn-generate {
        width: 100%;
        background: var(--accent);
        border: 2px solid var(--accent);
        color: var(--accent-contrast);
        font-size: var(--subheading);
        font-weight: 700;
        letter-spacing: 0.14em;
        padding: 18px;
        margin-top: var(--space-lg);
    }
    .btn-generate:hover {
        opacity: 0.9;
    }

    /* === ЭНТРОПИЯ === */
    .entropy {
        border-top: 2px solid var(--border-visible);
        border-bottom: 2px solid var(--border-visible);
        padding: var(--space-lg) 0;
        margin-bottom: var(--space-xl);
    }
    .entropy-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: var(--space-md);
        flex-wrap: wrap;
        margin-bottom: var(--space-lg);
    }
    .entropy-hero {
        display: flex;
        align-items: baseline;
        gap: 8px;
    }
    .entropy-num {
        font-family: var(--font-display);
        font-weight: 600;
        font-size: var(--display-lg);
        line-height: 1;
        letter-spacing: -0.02em;
        transition: color 0.3s var(--motion);
    }
    .entropy-unit {
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--text-secondary);
    }
    .entropy-status {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-align: right;
        transition: color 0.3s var(--motion);
    }

    /* Сегментный бар */
    .bar {
        margin-bottom: var(--space-md);
    }
    .segments {
        display: flex;
        gap: 3px;
        height: 24px;
    }
    .segments .seg {
        flex: 1;
        background: var(--segment-empty);
        transition: background 0.3s var(--motion);
    }
    .segments .seg.filled {
        background: var(--c, var(--accent));
    }
    .ticks {
        position: relative;
        height: 24px;
        margin-top: 6px;
    }
    .tick {
        position: absolute;
        transform: translateX(-50%);
        font-family: var(--font-mono);
        font-size: var(--caption);
        color: var(--text-disabled);
        padding-top: 9px;
    }
    .tick::before {
        content: "";
        position: absolute;
        top: 0;
        left: 50%;
        width: 1px;
        height: 6px;
        background: var(--border-visible);
    }

    /* Стат-строка */
    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-md);
        padding: var(--space-md) 0;
        border-top: 1px solid var(--border);
    }
    .stat-val {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        transition: color 0.3s var(--motion);
    }

    /* Детализация */
    .details-toggle {
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: var(--space-sm) 0 0;
    }
    .details-toggle:hover {
        color: var(--text-primary);
    }
    .details-toggle .ic {
        color: var(--accent-ink);
    }
    .breakdown {
        margin-top: var(--space-sm);
    }
    .brk-row {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: 7px 0;
        font-family: var(--font-mono);
        font-size: var(--body-sm);
    }
    .brk-row .l {
        color: var(--text-secondary);
        flex-shrink: 0;
    }
    .brk-row .d {
        flex: 1;
        border-bottom: 1px dotted var(--border-visible);
        min-width: 16px;
    }
    .brk-row .v {
        color: var(--text-primary);
        flex-shrink: 0;
    }
    .brk-row.total {
        border-top: 1px solid var(--border);
        margin-top: 4px;
        padding-top: 10px;
    }
    .brk-row.total .l,
    .brk-row.total .v {
        color: var(--accent-ink);
        font-weight: 700;
    }

    /* === ПАРАМЕТРЫ === */
    .settings {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    .field > .label {
        display: block;
        margin-bottom: var(--space-sm);
    }
    .field-head {
        display: flex;
        align-items: baseline;
        gap: var(--space-sm);
        margin-bottom: var(--space-sm);
        flex-wrap: wrap;
    }
    .field-val {
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: var(--subheading);
        color: var(--text-display);
    }
    .field-hint {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        color: var(--text-secondary);
        margin-left: auto;
    }

    /* Ползунок */
    input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 24px;
        background: transparent;
        cursor: pointer;
        margin: 0;
    }
    input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
        background: var(--border-visible);
    }
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--accent);
        border: 3px solid var(--surface);
        box-shadow: 0 0 0 2px var(--accent);
        margin-top: -9px;
    }
    input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: var(--border-visible);
    }
    input[type="range"]::-moz-range-progress {
        height: 4px;
        border-radius: 2px;
        background: var(--accent);
    }
    input[type="range"]::-moz-range-thumb {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--accent);
        border: 3px solid var(--surface);
        box-shadow: 0 0 0 2px var(--accent);
    }
    .range-minmax {
        display: flex;
        justify-content: space-between;
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        color: var(--text-disabled);
        margin-top: 4px;
    }

    /* Чекбоксы */
    .check-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-sm);
    }
    @media (min-width: 600px) {
        .check-grid.cols-3 {
            grid-template-columns: repeat(3, 1fr);
        }
    }
    @media (max-width: 480px) {
        .check-grid {
            grid-template-columns: 1fr;
        }
    }
    .check {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        padding: 14px;
        border: 2px solid var(--border-visible);
        border-radius: 8px;
        transition:
            border-color 0.15s var(--motion),
            background 0.15s var(--motion);
    }
    .check:hover {
        border-color: var(--text-secondary);
        background: var(--surface-raised);
    }
    .check.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .check input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }
    .box {
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-visible);
        border-radius: 5px;
        flex-shrink: 0;
        position: relative;
        transition:
            background 0.15s var(--motion),
            border-color 0.15s var(--motion);
    }
    .check input:checked + .box {
        background: var(--accent);
        border-color: var(--accent);
    }
    .check input:checked + .box::after {
        content: "";
        position: absolute;
        left: 6px;
        top: 2px;
        width: 6px;
        height: 11px;
        border: solid var(--accent-contrast);
        border-width: 0 3px 3px 0;
        transform: rotate(45deg);
    }
    .check input:focus-visible + .box {
        outline: 2px solid var(--accent-ink);
        outline-offset: 2px;
    }
    .check-text {
        font-family: var(--font-sans);
        font-size: var(--body);
        font-weight: 600;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    /* Теги энтропии */
    .tag {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 999px;
        border: 1px solid var(--border-visible);
    }
    .tag.zero {
        color: var(--text-disabled);
    }
    .tag.plus {
        color: var(--accent-ink);
        border-color: var(--accent-ink);
    }

    /* Селект */
    .sel {
        width: 100%;
        background: var(--surface-raised);
        color: var(--text-display);
        border: 2px solid var(--border-visible);
        border-radius: 8px;
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        padding: 13px 12px;
        min-height: 48px;
        cursor: pointer;
    }
    .sel:hover {
        border-color: var(--text-secondary);
    }
    .sel:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .sel option {
        background: var(--surface-raised);
        color: var(--text-primary);
    }

    /* Строка данных */
    .data-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-sm);
        flex-wrap: wrap;
        padding: var(--space-md);
        border: 2px dashed var(--border-visible);
        border-radius: 8px;
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-secondary);
    }
    .data-row .hl {
        color: var(--accent-ink);
    }
    .data-row .sep {
        color: var(--border-visible);
    }

    /* Ошибка */
    .inline-error {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        color: var(--st-weak);
        border: 1px solid var(--st-weak);
        border-radius: 8px;
        padding: var(--space-md);
        margin-top: var(--space-md);
    }

    /* === ЖУРНАЛ === */
    .history {
        display: flex;
        flex-direction: column;
    }
    .hist-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-md);
        padding-bottom: var(--space-md);
        border-bottom: 1px solid var(--border);
    }
    .hist-title {
        margin: 0;
        font-family: var(--font-mono);
        font-size: var(--caption);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        font-weight: 700;
    }
    .clear {
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-disabled);
        transition: color 0.15s var(--motion);
    }
    .clear:hover {
        color: var(--st-weak);
    }
    .hist-list {
        display: flex;
        flex-direction: column;
        max-height: 560px;
        overflow-y: auto;
    }
    .hist-item {
        display: flex;
        gap: var(--space-md);
        align-items: baseline;
        text-align: left;
        background: none;
        border: none;
        border-bottom: 1px solid var(--border-visible);
        border-left: 3px solid transparent;
        cursor: pointer;
        padding: 14px 10px;
        transition:
            background 0.15s var(--motion),
            border-left-color 0.15s var(--motion);
    }
    .hist-item:hover {
        background: var(--surface-raised);
        border-left-color: var(--accent);
    }
    .hist-i {
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        color: var(--text-disabled);
        flex-shrink: 0;
    }
    .hist-pw {
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        font-weight: 700;
        color: var(--text-primary);
        word-break: break-all;
        line-height: 1.45;
    }
    .hist-empty {
        padding: var(--space-2xl) var(--space-md);
        text-align: center;
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        letter-spacing: 0.1em;
        color: var(--text-disabled);
    }

    /* === МОДАЛКА === */
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: var(--space-md);
    }
    .modal {
        background: var(--surface);
        border: 1px solid var(--border-visible);
        border-radius: 16px;
        padding: var(--space-lg);
        width: 100%;
        max-width: 380px;
        display: flex;
        flex-direction: column;
        gap: var(--space-lg);
    }
    .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .modal-title {
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
    }
    .modal-close {
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: var(--body-sm);
        color: var(--text-secondary);
        letter-spacing: 0.05em;
    }
    .modal-close:hover {
        color: var(--text-primary);
    }
    .qr-box {
        position: relative;
        background: var(--surface-raised);
        border: 1px solid var(--border-visible);
        border-radius: 10px;
        padding: 18px;
        display: flex;
        justify-content: center;
        box-shadow:
            0 0 28px rgba(158, 245, 35, 0.22),
            inset 0 0 0 1px rgba(158, 245, 35, 0.08);
    }
    /* Угловые скобки в стиле декоративных панелей */
    .qr-box::before,
    .qr-box::after {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        border: 2px solid var(--accent);
        pointer-events: none;
    }
    .qr-box::before {
        top: 7px;
        left: 7px;
        border-right: none;
        border-bottom: none;
    }
    .qr-box::after {
        bottom: 7px;
        right: 7px;
        border-left: none;
        border-top: none;
    }
    .qr-box canvas {
        display: block;
        max-width: 100%;
        height: auto;
        image-rendering: pixelated;
        border-radius: 4px;
    }

    /* === АДАПТИВ === */
    @media (max-width: 600px) {
        .modes {
            margin-bottom: var(--space-lg);
        }
        .modes button {
            font-size: var(--caption);
            padding: 12px 4px;
            letter-spacing: 0.02em;
        }
        .pw-block {
            margin-bottom: var(--space-lg);
        }
        .entropy {
            margin-bottom: var(--space-lg);
        }
        .entropy-status {
            text-align: left;
        }
        .pw-actions {
            grid-template-columns: 1fr auto auto;
        }
        .btn {
            padding: 12px 14px;
            font-size: var(--caption);
        }
    }
</style>
