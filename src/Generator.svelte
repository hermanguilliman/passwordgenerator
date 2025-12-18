<script lang="ts">
    import { onMount, tick } from "svelte";
    import QRCode from "qrcode";

    // --- Состояние ---
    let mode: "standard" | "xkcd" = "standard";

    // Standard Mode Vars
    let length: number = 16;
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
    let showQR: boolean = false;
    let qrCanvas: HTMLCanvasElement;

    // Энтропия
    let entropyBits: number = 0;
    let entropyColor: string = "var(--toxic-green)";
    let entropyLabel: string = "НИЗКАЯ";
    let entropyPercent: number = 0;
    const WORD_SOURCE =
        "correct horse battery staple system hacking cyber neural matrix logic ghost shell neon laser future data access denied granted protocol bunker vector pixel grid node signal router server cloud storm rain blade runner android electric dream sheep memory core virus trojan firewall proxy token chain block cipher hash salt key public private tunnel bridge gate star wars orbit gravity quantum physics plasma void galaxy nebula cosmos alien signal radio frequency bandwidth analog digital binary hex code script python rust java linux unix kernel root sudo admin user guest login logout abort retry fail error warning debug stack heap queue array list graph tree forest swamp mountain river ocean city tokyo night rain street car bike drone robot mech armor weapon shield sword magic mana health power energy fusion nuclear atomic orbit flight space ship pilot drive warp speed light sound sonic wave pulse beat rhythm bass synth drums guitar voice text chat bot ai learning deep mining crypto money cash credit debit bank vault safe lock pick door wall floor roof window glass steel iron copper gold silver bronze metal alloy carbon silicon fiber optic lens camera eye vision sight sound ear hear listen speak talk voice shout whisper secret hidden dark black white red green blue cyan magenta yellow orange purple violet indigo ultraviolet infrared gamma xray radio microwave radar sonar lidar sensor motor engine gear wheel cog piston pump valve pipe tube wire cable circuit chip board card slot port socket jack plug connect disconnect online offline remote local host domain dns ip tcp udp http ssh ftp smtp pop imap sql db query request response header body footer tag element attribute value variable function class object method property event loop scope closure promise async await sync thread process task job worker service daemon cron time date year month day hour minute second millisecond nano pico femto atto zepto yocto mega giga tera peta exa zetta yotta alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega zero one two three four five six seven eight nine ten hundred thousand million billion trillion infinite finite limit integral derivative vector scalar tensor matrix fract chaos entropy energy force mass acceleration velocity speed distance time space dimension universe multiverse string theory relativity gravity electromagnetic weak strong interaction boson fermion lepton quark gluon photon graviton higgs field wave particle duality uncertainty principle evolution mutation selection dna rna gene cell tissue organ body brain heart lung liver kidney stomach skin bone blood nerve neuron synapse axon dendrite receptor hormone enzyme protein lipid sugar carb vitamin mineral water air fire earth wind spirit soul mind thought idea concept meme culture art music sound video image picture photo graph chart map plan design build create destroy fix break hack slash crash burn freeze melt boil evaporate condense sublimate solid liquid gas plasma state phase transition entropy thermodynamics mechanics optics acoustics electronics robotics bionics genetics genomics proteomics informatics cybernetics systems control automation intelligence wisdom knowledge data information communication network internet web site page link url uri urn uuid guid hash md5 sha rsa dsa ecc aes des blowfish twofish serpent idea cast rc4 rc5 rc6 seal wake";
    const ENGLISH_WORDS = WORD_SOURCE.split(" ");
    onMount(() => {
        loadHistory();
        generate();
    });

    const handleBackdropClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) closeQR();
    };

    // --- Логика ---
    const generate = () => {
        if (mode === "standard") generateStandard();
        else generateXKCD();
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
            error = "ОШИБКА: НЕТ СИМВОЛОВ";
            return;
        }
        error = "";

        let tempPwd = "";
        // Гарантируем наличие выбранных типов
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
        if (includeNumberXKCD)
            pwd += separator + Math.floor(Math.random() * 100);

        password = pwd;
        error = "";
        addToHistory(password);
    };

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

    const calculateEntropy = () => {
        if (!password) {
            entropyBits = 0;
            return;
        }

        let poolSize = 0;
        if (mode === "standard") {
            // Стандартный режим (тут без изменений)
            if (includeLowercase) poolSize += useCyrillic ? 33 : 26;
            if (includeUppercase) poolSize += useCyrillic ? 33 : 26;
            if (includeNumbers) poolSize += 10;
            if (includeSymbols) poolSize += 24;

            if (poolSize === 0) {
                entropyBits = 0;
            } else {
                entropyBits = Math.floor(password.length * Math.log2(poolSize));
            }
        } else {
            // XKCD Режим
            // 1. Энтропия слов: кол-во слов * log2(размера_словаря)
            // Словарь теперь ~460 слов, log2(460) ≈ 8.84 бита на слово
            let wordEntropy = Math.log2(ENGLISH_WORDS.length);

            // 2. Энтропия разделителя (если их несколько на выбор, но у нас пользователь выбирает один конкретный,
            // поэтому с точки зрения взломщика, если он знает формат, энтропия разделителя = 0.
            // Однако, если мы считаем "стойкость пароля в вакууме", разделитель увеличивает длину.
            // Но правильно считать энтропию именно выбора слов).
            entropyBits = Math.floor(wordCount * wordEntropy);

            // 3. Число в конце (0-99) добавляет log2(100) ≈ 6.64 бита
            if (includeNumberXKCD) {
                entropyBits += Math.floor(Math.log2(100));
            }

            // 4. Заглавные буквы.
            // В текущей реализации мы либо делаем ВСЕ заглавными, либо нет.
            // Это не добавляет энтропии (взломщик просто проверяет два варианта).
            // Поэтому тут мы ничего не плюсуем.
        }

        // Обновляем визуализацию
        // Шкала до 128 бит
        entropyPercent = Math.min(entropyBits, 128);

        // Градации безопасности
        if (entropyBits < 45) {
            entropyColor = "#ff3333";
            entropyLabel = "СЛАБЫЙ";
        } else if (entropyBits < 65) {
            entropyColor = "#ffff00";
            entropyLabel = "СРЕДНИЙ";
        } else if (entropyBits < 90) {
            // 90 бит - это очень хорошо
            entropyColor = "#9ef523";
            entropyLabel = "НАДЕЖНЫЙ";
        } else {
            // > 90 бит - параноидальный уровень
            entropyColor = "#00ffff"; // Голубой цвет (Cyan) для супер-защиты
            entropyLabel = "УЛЬТРА";
        }
    };

    // --- История ---
    const addToHistory = (pwd: string) => {
        if (history.length > 0 && history[0] === pwd) return;
        history = [pwd, ...history].slice(0, 20); // Увеличил лимит до 20
        localStorage.setItem("pwd_history", JSON.stringify(history));
    };

    const loadHistory = () => {
        const stored = localStorage.getItem("pwd_history");
        if (stored)
            try {
                history = JSON.parse(stored);
            } catch (e) {
                console.error(e);
            }
    };

    const restoreFromHistory = (pwd: string) => {
        password = pwd;
        calculateEntropy();
        copyToClipboard();
    };

    const clearHistory = () => {
        history = [];
        localStorage.removeItem("pwd_history");
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
            .catch(() => (error = "Ошибка буфера"));
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
                    width: 240,
                    margin: 2,
                    color: { dark: "#000000", light: "#9ef523" },
                },
                (e) => {
                    if (e) console.error(e);
                }
            );
        }
    };

    const closeQR = () => {
        showQR = false;
    };

    // Авто-генерация при изменении чекбоксов (не ползунков)
    const handleOptionChange = () => generate();
</script>

<div class="cyber-container">
    <!-- Панель Генератора -->
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
                    [ В СТИЛЕ XKCD ]
                </button>
            </div>
            <div
                class="status-light"
                style="background: {entropyColor}; box-shadow: 0 0 10px {entropyColor}"
            ></div>
        </div>

        <!-- Дисплей -->
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
                        title="QR Code">QR</button
                    >
                    <button
                        class="action-btn refresh"
                        on:click={generate}
                        title="Обновить">↻</button
                    >
                </div>
            </div>
        </div>

        <!-- Индикатор Энтропии -->
        <div class="entropy-bar-container">
            <div class="entropy-meta">
                <span>БЕЗОПАСНОСТЬ: {entropyLabel}</span>
                <span>{entropyBits} BITS</span>
            </div>
            <div class="entropy-track">
                <div
                    class="entropy-fill"
                    style="width: {entropyPercent /
                        1.28}%; background: {entropyColor}; box-shadow: 0 0 8px {entropyColor}"
                ></div>
                <!-- Маркеры сетки -->
                {#each Array(10) as _, i}
                    <div class="grid-line" style="left: {i * 10}%"></div>
                {/each}
            </div>
        </div>

        <!-- Настройки -->
        <div class="settings-grid">
            {#if mode === "standard"}
                <!-- Кириллица Переключатель -->
                <div class="setting-row full-width cyrillic-switch">
                    <label class="switch-container">
                        <input
                            type="checkbox"
                            bind:checked={useCyrillic}
                            on:change={handleOptionChange}
                        />
                        <span class="switch-track">
                            <span class="switch-thumb"></span>
                            <span class="label-off">LAT</span>
                            <span class="label-on">CYR</span>
                        </span>
                    </label>
                </div>

                <!-- Длина -->
                <div class="setting-row full-width slider-row">
                    <label for="len"
                        >ДЛИНА: <span class="val">{length}</span></label
                    >
                    <input
                        id="len"
                        type="range"
                        bind:value={length}
                        min="4"
                        max="64"
                        on:input={generate}
                    />
                </div>

                <!-- Чекбоксы -->
                <div class="checkbox-grid">
                    <label class="cyber-check">
                        <input
                            type="checkbox"
                            bind:checked={includeLowercase}
                            on:change={handleOptionChange}
                        />
                        <span class="check-box"></span>
                        <span class="check-label"
                            >{useCyrillic ? "строчные" : "a-z"}</span
                        >
                    </label>
                    <label class="cyber-check">
                        <input
                            type="checkbox"
                            bind:checked={includeUppercase}
                            on:change={handleOptionChange}
                        />
                        <span class="check-box"></span>
                        <span class="check-label"
                            >{useCyrillic ? "ЗАГЛАВНЫЕ" : "A-Z"}</span
                        >
                    </label>
                    <label class="cyber-check">
                        <input
                            type="checkbox"
                            bind:checked={includeNumbers}
                            on:change={handleOptionChange}
                        />
                        <span class="check-box"></span>
                        <span class="check-label">0-9</span>
                    </label>
                    <label class="cyber-check">
                        <input
                            type="checkbox"
                            bind:checked={includeSymbols}
                            on:change={handleOptionChange}
                        />
                        <span class="check-box"></span>
                        <span class="check-label">!@#</span>
                    </label>
                </div>
            {:else}
                <!-- XKCD Настройки -->
                <div class="setting-row full-width slider-row">
                    <label for="wc"
                        >КОЛИЧЕСТВО СЛОВ: <span class="val">{wordCount}</span
                        ></label
                    >
                    <input
                        id="wc"
                        type="range"
                        bind:value={wordCount}
                        min="3"
                        max="8"
                        on:input={generate}
                    />
                </div>

                <div class="setting-row full-width">
                    <label for="sep">РАЗДЕЛИТЕЛЬ</label>
                    <select
                        id="sep"
                        bind:value={separator}
                        on:change={generate}
                        class="cyber-select"
                    >
                        <option value="-">ТИРЕ (-)</option>
                        <option value="_">НИЖНЕЕ ПОДЧЕРКИВАНИЕ (_)</option>
                        <option value=".">ТОЧКА (.)</option>
                        <option value=" ">ПРОБЕЛ</option>
                    </select>
                </div>

                <div class="checkbox-grid">
                    <label class="cyber-check">
                        <input
                            type="checkbox"
                            bind:checked={capitalizeXKCD}
                            on:change={handleOptionChange}
                        />
                        <span class="check-box"></span>
                        <span class="check-label">Заглавные</span>
                    </label>
                    <label class="cyber-check">
                        <input
                            type="checkbox"
                            bind:checked={includeNumberXKCD}
                            on:change={handleOptionChange}
                        />
                        <span class="check-box"></span>
                        <span class="check-label">Число в конце</span>
                    </label>
                </div>
            {/if}
        </div>

        {#if error}
            <div class="error-msg">⚠ {error}</div>
        {/if}

        <button class="big-gen-btn" on:click={generate}>
            СГЕНЕРИРОВАТЬ КОД
        </button>
    </div>

    <!-- Панель Истории -->
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
                        >[{i < 9 ? "0" + (i + 1) : i + 1}]</span
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

<!-- Модалка -->
{#if showQR}
    <div
        class="modal-backdrop"
        on:click={handleBackdropClick}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === "Escape" && closeQR()}
    >
        <div class="modal">
            <div class="modal-header">QR ACCESS</div>
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

    /* На больших экранах история справа */
    @media (min-width: 900px) {
        .cyber-container {
            grid-template-columns: 2fr 1fr;
            align-items: start;
        }
        .history-panel {
            max-height: 600px; /* Фикс высота для десктопа */
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
        font-family: var(--font-main); /* Используем переменную */
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
        padding: 0;
    }
    .tabs button.active {
        color: var(--toxic-green);
        text-shadow: 0 0 5px var(--toxic-green-dim);
    }
    .status-light {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #333;
    }

    /* Password Display */
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
        font-size: clamp(1rem, 3.5vw, 1.6rem); /* Было 1.2rem - 2rem */
        font-family: var(--font-main);
        font-weight: 700; /* Делаем сам пароль жирнее */
        letter-spacing: -0.5px; /* Чуть плотнее, так как моноширинный шрифт широкий */
        word-break: break-all;
        min-height: 3rem;
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
        box-shadow: inset 0 0 10px rgba(158, 245, 35, 0.2);
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

    /* Entropy */
    .entropy-bar-container {
        margin-bottom: 2rem;
    }
    .entropy-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        margin-bottom: 4px;
        color: #aaa;
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
    .grid-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2;
    }

    /* Controls Grid */
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

    /* Custom Slider */
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

    /* Custom Checkboxes Grid */
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
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 1.5rem;
        font-weight: bold;
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

    /* History Styles */
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
        font-size: 0.9rem;
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
        font-size: 1rem;
    }
    .empty-log {
        text-align: center;
        color: #444;
        padding: 2rem;
        font-style: italic;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(4px); /* Размытие фона */
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

        /* Flexbox для жесткого центрирования */
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem; /* Отступы между элементами */

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

    /* Настройки для самого QR */
    .modal canvas {
        border: 4px solid #1a1a1a; /* Рамка вокруг кода */
        max-width: 100%;
        height: auto;
        image-rendering: pixelated; /* Чтобы пиксели были четкими */
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

        /* Растягиваем кнопку на всю ширину для удобства */
        width: 100%;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: var(--toxic-green);
        color: #000;
        box-shadow: 0 0 15px var(--toxic-green);
    }
</style>
