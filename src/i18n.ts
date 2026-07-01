import { writable, derived, type Readable } from "svelte/store";

export type Lang = "ru" | "en";

const STORAGE_KEY = "gpass_lang";

const initialLang = (): Lang => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "ru" || stored === "en") return stored;
    } catch {
        /* localStorage недоступен — игнорируем */
    }
    return "ru";
};

export const lang = writable<Lang>(initialLang());

lang.subscribe((l) => {
    try {
        localStorage.setItem(STORAGE_KEY, l);
    } catch {
        /* localStorage недоступен — игнорируем */
    }
    if (typeof document !== "undefined") {
        document.documentElement.lang = l;
    }
});

export const setLang = (l: Lang): void => lang.set(l);

type Dict = Record<string, string>;
type Params = Record<string, string | number>;

const ru: Dict = {
    // --- Шапка ---
    tagline: "TERMINAL · ГЕНЕРАТОР ПАРОЛЕЙ",
    "a11y.theme": "Переключить тему оформления",
    "theme.dark": "Тема: тёмная",
    "theme.light": "Тема: светлая",
    "a11y.language": "Выбор языка",

    // --- Режимы ---
    "a11y.mode": "Режим генерации",
    "mode.standard": "СТАНДАРТ",
    "mode.xkcd": "XKCD",
    "mode.phonetic": "ФОНЕТИК",
    "mode.fio": "ФИО",

    // --- Блок пароля ---
    "pw.label": "// ПАРОЛЬ",
    "pw.chars": "{n} СИМВОЛОВ",
    "pw.init": "ИНИЦИАЛИЗАЦИЯ...",
    "pw.copy": "КОПИРОВАТЬ",
    "pw.copied": "СКОПИРОВАНО",
    "qr.title": "QR-код",
    "a11y.qr": "Показать QR-код",
    "refresh.title": "Обновить",
    "a11y.refresh": "Сгенерировать заново",

    // --- Энтропия ---
    "ent.bit": "БИТ",
    "ent.calc": "БЕЗОПАСНОСТЬ: ВЫЧИСЛЕНИЕ...",
    "ent.crackTitle": "ВРЕМЯ ПОДБОРА · 10¹⁰/С",
    "ent.breakdown": "РАСЧЁТ ЭНТРОПИИ",
    "ent.total": "ИТОГО",
    "ent.lvl.instant": "ВЗЛОМ: МГНОВЕННЫЙ",
    "ent.lvl.seconds": "ВЗЛОМ: СЕКУНДЫ",
    "ent.lvl.minutes": "ВЗЛОМ: МИНУТЫ",
    "ent.lvl.weak": "БЕЗОПАСНОСТЬ: СЛАБАЯ",
    "ent.lvl.moderate": "БЕЗОПАСНОСТЬ: УМЕРЕННАЯ",
    "ent.lvl.good": "БЕЗОПАСНОСТЬ: ХОРОШАЯ",
    "ent.lvl.strong": "БЕЗОПАСНОСТЬ: СИЛЬНАЯ",
    "ent.lvl.veryStrong": "БЕЗОПАСНОСТЬ: ОЧЕНЬ СИЛЬНАЯ",
    "ent.lvl.crypto80": "КРИПТО: 2^80 ОПЕРАЦИЙ",
    "ent.lvl.crypto96": "КРИПТО: 2^96 ОПЕРАЦИЙ",
    "ent.lvl.aes192": "КРИПТО: AES-192+",
    "ent.lvl.aes256": "КРИПТО: AES-256+",

    // --- Время подбора ---
    "time.infinite": "БЕСКОНЕЧНОСТЬ",
    "time.lt1ms": "< 1 мс",
    "time.ms": "{v} мс",
    "time.sec": "{v} сек",
    "time.min": "{v} мин",
    "time.hours": "{v} часов",
    "time.days": "{v} дней",
    "time.years": "{v} лет",
    "time.centuries": "{v} веков",
    "time.millennia": "{v} тысячелетий",
    "time.universe": "{v}x возраст Вселенной",

    // --- Детализация расчёта ---
    "det.category": "[{name}] ×1",
    "det.pool": "[ПУЛ:{N}] ×{count}",
    "det.permutation": "ПЕРЕСТАНОВКА C({L},{k})",
    "det.upperBound": "ВЕРХНЯЯ ГРАНИЦА",
    "det.words": "СЛОВА ×{count}",
    "det.randomCase": "СЛУЧ. РЕГИСТР ×{count}",
    "det.number": "ЧИСЛО [0-{max}]",
    "det.syllables": "СЛОГИ [{pattern}] ×{count}",
    "det.names": "ИМЕНА ×{count}",

    // --- Параметры ---
    "set.label": "// ПАРАМЕТРЫ",
    "set.alphabet": "АЛФАВИТ",
    "set.lat": "LAT",
    "set.cyr": "КИР",
    "set.length": "ДЛИНА",
    "a11y.length": "Длина пароля",
    "set.wordCount": "КОЛИЧЕСТВО СЛОВ",
    "a11y.wordCount": "Количество слов",
    "set.separator": "РАЗДЕЛИТЕЛЬ",
    "sep.dash": "ТИРЕ [-]",
    "sep.underscore": "НИЖНЕЕ [_]",
    "sep.dot": "ТОЧКА [.]",
    "sep.space": "ПРОБЕЛ [ ]",
    "sep.plus": "ПЛЮС [+]",
    "sep.none": "БЕЗ РАЗДЕЛИТЕЛЯ",
    "set.numberRange": "ДИАПАЗОН ЧИСЛА",
    "chk.capitalize": "Заглавные",
    "chk.randomCase": "Случ. регистр",
    "chk.number": "Число",
    "set.dictionary": "СЛОВАРЬ",
    "set.wordsCount": "{n} СЛОВ",
    "set.bitsPerWord": "{v} БИТ/СЛОВО",
    "set.syllPattern": "ПАТТЕРН СЛОГА",
    "set.bitsPerSyll": "{v} бит/слог",
    "set.syllPerWord": "СЛОГОВ В СЛОВЕ",
    "a11y.syllPerWord": "Слогов в слове",
    "set.bitsHint": "~{v} бит",
    "set.bitsHintPlus": "+{v} бит",
    "phon.dataRow": "{words} слов × {syll} слогов",
    "phon.syllables": "{n} слогов",
    "set.nameLength": "ДЛИНА ИМЕНИ (СЛОГОВ)",
    "a11y.nameLength": "Длина имени в слогах",
    "set.nameCount": "КОЛИЧЕСТВО ИМЁН",
    "a11y.nameCount": "Количество имён",
    "fio.dataRow": "{words} имён × {syll} слогов",
    "fio.syllables": "{n} слогов",
    "pat.cv": "CV (ба, ке, ми)",
    "pat.cvc": "CVC (бак, кем, мир)",
    "pat.cvcc": "CVCC (банк, керн)",
    "pat.ccvc": "CCVC (стар, крик)",

    // --- Ошибки ---
    "err.prefix": "[ОШИБКА]",
    "err.noCategory": "ВЫБЕРИТЕ ХОТЯ БЫ ОДНУ КАТЕГОРИЮ",
    "err.minLength": "МИНИМАЛЬНАЯ ДЛИНА: {n}",
    "err.clipboard": "ОШИБКА БУФЕРА ОБМЕНА",

    // --- Прочее ---
    "btn.generate": "СГЕНЕРИРОВАТЬ",
    "hist.title": "ЖУРНАЛ [{n}]",
    "hist.clear": "ОЧИСТИТЬ",
    "hist.empty": "НЕТ ЗАПИСЕЙ",
    "hist.restored": "ВОССТАНОВЛЕНО ИЗ ЖУРНАЛА",
    "qr.modalTitle": "// QR-КОД",
};

const en: Dict = {
    // --- Header ---
    tagline: "TERMINAL · PASSWORD GENERATOR",
    "a11y.theme": "Toggle color theme",
    "theme.dark": "Theme: dark",
    "theme.light": "Theme: light",
    "a11y.language": "Language",

    // --- Modes ---
    "a11y.mode": "Generation mode",
    "mode.standard": "STANDARD",
    "mode.xkcd": "XKCD",
    "mode.phonetic": "PHONETIC",
    "mode.fio": "FULL NAME",

    // --- Password block ---
    "pw.label": "// PASSWORD",
    "pw.chars": "{n} CHARS",
    "pw.init": "INITIALIZING...",
    "pw.copy": "COPY",
    "pw.copied": "COPIED",
    "qr.title": "QR code",
    "a11y.qr": "Show QR code",
    "refresh.title": "Refresh",
    "a11y.refresh": "Regenerate",

    // --- Entropy ---
    "ent.bit": "BITS",
    "ent.calc": "SECURITY: CALCULATING...",
    "ent.crackTitle": "CRACK TIME · 10¹⁰/S",
    "ent.breakdown": "ENTROPY BREAKDOWN",
    "ent.total": "TOTAL",
    "ent.lvl.instant": "CRACK: INSTANT",
    "ent.lvl.seconds": "CRACK: SECONDS",
    "ent.lvl.minutes": "CRACK: MINUTES",
    "ent.lvl.weak": "SECURITY: WEAK",
    "ent.lvl.moderate": "SECURITY: MODERATE",
    "ent.lvl.good": "SECURITY: GOOD",
    "ent.lvl.strong": "SECURITY: STRONG",
    "ent.lvl.veryStrong": "SECURITY: VERY STRONG",
    "ent.lvl.crypto80": "CRYPTO: 2^80 OPERATIONS",
    "ent.lvl.crypto96": "CRYPTO: 2^96 OPERATIONS",
    "ent.lvl.aes192": "CRYPTO: AES-192+",
    "ent.lvl.aes256": "CRYPTO: AES-256+",

    // --- Crack time ---
    "time.infinite": "INFINITY",
    "time.lt1ms": "< 1 ms",
    "time.ms": "{v} ms",
    "time.sec": "{v} sec",
    "time.min": "{v} min",
    "time.hours": "{v} hours",
    "time.days": "{v} days",
    "time.years": "{v} years",
    "time.centuries": "{v} centuries",
    "time.millennia": "{v} millennia",
    "time.universe": "{v}x age of the Universe",

    // --- Breakdown ---
    "det.category": "[{name}] ×1",
    "det.pool": "[POOL:{N}] ×{count}",
    "det.permutation": "PERMUTATION C({L},{k})",
    "det.upperBound": "UPPER BOUND",
    "det.words": "WORDS ×{count}",
    "det.randomCase": "RANDOM CASE ×{count}",
    "det.number": "NUMBER [0-{max}]",
    "det.syllables": "SYLLABLES [{pattern}] ×{count}",
    "det.names": "NAMES ×{count}",

    // --- Settings ---
    "set.label": "// PARAMETERS",
    "set.alphabet": "ALPHABET",
    "set.lat": "LAT",
    "set.cyr": "CYR",
    "set.length": "LENGTH",
    "a11y.length": "Password length",
    "set.wordCount": "WORD COUNT",
    "a11y.wordCount": "Word count",
    "set.separator": "SEPARATOR",
    "sep.dash": "DASH [-]",
    "sep.underscore": "UNDERSCORE [_]",
    "sep.dot": "DOT [.]",
    "sep.space": "SPACE [ ]",
    "sep.plus": "PLUS [+]",
    "sep.none": "NO SEPARATOR",
    "set.numberRange": "NUMBER RANGE",
    "chk.capitalize": "Capitalize",
    "chk.randomCase": "Random case",
    "chk.number": "Number",
    "set.dictionary": "DICTIONARY",
    "set.wordsCount": "{n} WORDS",
    "set.bitsPerWord": "{v} BITS/WORD",
    "set.syllPattern": "SYLLABLE PATTERN",
    "set.bitsPerSyll": "{v} bits/syll",
    "set.syllPerWord": "SYLLABLES PER WORD",
    "a11y.syllPerWord": "Syllables per word",
    "set.bitsHint": "~{v} bits",
    "set.bitsHintPlus": "+{v} bits",
    "phon.dataRow": "{words} words × {syll} syllables",
    "phon.syllables": "{n} syllables",
    "set.nameLength": "NAME LENGTH (SYLLABLES)",
    "a11y.nameLength": "Name length in syllables",
    "set.nameCount": "NAME COUNT",
    "a11y.nameCount": "Name count",
    "fio.dataRow": "{words} names × {syll} syllables",
    "fio.syllables": "{n} syllables",
    "pat.cv": "CV (ba, ke, mi)",
    "pat.cvc": "CVC (bak, kem, mir)",
    "pat.cvcc": "CVCC (bank, kern)",
    "pat.ccvc": "CCVC (star, krik)",

    // --- Errors ---
    "err.prefix": "[ERROR]",
    "err.noCategory": "SELECT AT LEAST ONE CATEGORY",
    "err.minLength": "MINIMUM LENGTH: {n}",
    "err.clipboard": "CLIPBOARD ERROR",

    // --- Misc ---
    "btn.generate": "GENERATE",
    "hist.title": "LOG [{n}]",
    "hist.clear": "CLEAR",
    "hist.empty": "NO ENTRIES",
    "hist.restored": "RESTORED FROM LOG",
    "qr.modalTitle": "// QR CODE",
};

const translations: Record<Lang, Dict> = { ru, en };

const interpolate = (str: string, params?: Params): string => {
    if (!params) return str;
    let result = str;
    for (const [key, value] of Object.entries(params)) {
        result = result.replace(
            new RegExp(`\\{${key}\\}`, "g"),
            String(value),
        );
    }
    return result;
};

export type Translator = (key: string, params?: Params) => string;

export const t: Readable<Translator> = derived(lang, ($lang) => {
    const dict = translations[$lang] ?? translations.ru;
    return (key: string, params?: Params): string => {
        const template = dict[key] ?? translations.ru[key] ?? key;
        return interpolate(template, params);
    };
});
