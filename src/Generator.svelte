<script lang="ts">
  import { onMount } from "svelte";

  let length: number = 15;
  let includeLowercase: boolean = true;
  let includeUppercase: boolean = true;
  let includeNumbers: boolean = true;
  let includeSymbols: boolean = true;
  let useCyrillic: boolean = false;
  let escapeForDocker: boolean = false; // Новая опция для экранирования
  let password: string = "";
  let error: string = "";
  let copied: boolean = false;

  onMount(() => {
    generatePassword();
  });

  const generatePassword = () => {
    const latinLower = "abcdefghijklmnopqrstuvwxyz";
    const latinUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const cyrillicLower = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
    const cyrillicUpper = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+[]{}|;:,.<>?"; // Убедитесь, что символы безопасны

    let characters = "";
    if (includeLowercase)
      characters += useCyrillic ? cyrillicLower : latinLower;
    if (includeUppercase)
      characters += useCyrillic ? cyrillicUpper : latinUpper;
    if (includeNumbers) characters += numbers;
    if (includeSymbols) characters += symbols;

    if (characters.length === 0) {
      error = "Выберите хотя бы один тип символов";
      password = "";
      return;
    }

    error = "";
    password = "";

    // Ensure at least one character from each selected type
    if (includeLowercase)
      password += characters.charAt(
        Math.floor(
          Math.random() *
            (useCyrillic ? cyrillicLower.length : latinLower.length)
        )
      );
    if (includeUppercase)
      password += characters.charAt(
        Math.floor(
          Math.random() *
            (useCyrillic ? cyrillicUpper.length : latinUpper.length)
        )
      );
    if (includeNumbers)
      password += characters.charAt(Math.floor(Math.random() * numbers.length));
    if (includeSymbols)
      password += characters.charAt(Math.floor(Math.random() * symbols.length));

    // Fill the rest of the password length with random characters
    for (let i = password.length; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }

    // Shuffle the password to ensure randomness
    password = shuffleArray(password.split("")).join("");

    // Экранирование для Docker, если включена опция
    if (escapeForDocker) {
      password = escapeDockerSpecialChars(password);
    }
  };

  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Функция для экранирования специальных символов для Docker
  const escapeDockerSpecialChars = (str: string): string => {
    // Экранируем $ и \, так как они имеют особое значение в Docker
    return str
      .replace(/\\/g, "\\\\") // Экранируем обратный слэш
      .replace(/\$/g, "\\$") // Экранируем знак доллара
      .replace(/#/g, "\\#") // Экранируем # (для комментариев)
      .replace(/"/g, '\\"') // Экранируем кавычки
      .replace(/'/g, "\\'"); // Экранируем одинарные кавычки
  };

  const copyToClipboard = () => {
    if (!password) {
      error = "Сначала сгенерируйте пароль";
      return;
    }
    navigator.clipboard
      .writeText(password)
      .then(() => {
        copied = true;
        setTimeout(() => (copied = false), 2000);
      })
      .catch((err) => {
        console.error("Ошибка при копировании: ", err);
        error = "Не удалось скопировать пароль";
      });
  };

  $: {
    if (length < 1) length = 1;
    if (length > 100) length = 100;
  }

  $: if (useCyrillic !== undefined || escapeForDocker !== undefined) {
    generatePassword();
  }

  $: if (length >= 1 && length <= 100) {
    generatePassword();
  }

  $: if (includeLowercase || !includeLowercase) {
    generatePassword();
  }

  $: if (includeUppercase || !includeUppercase) {
    generatePassword();
  }

  $: if (includeNumbers || !includeNumbers) {
    generatePassword();
  }

  $: if (includeSymbols || !includeSymbols) {
    generatePassword();
  }

  $: if (!includeSymbols && escapeForDocker) {
    escapeForDocker = false;
  }
</script>

<div class="wrap">
  <div class="card">
    Ваш новый пароль:
    <div class="password-display">
      <input type="text" value={password} readonly />
      <button on:click={copyToClipboard} class="copy-button" class:copied>
        {copied ? "Скопировано!" : "📋"}
      </button>
    </div>
    <div class="alphabet-switch">
      <label class="switch">
        <input type="checkbox" bind:checked={useCyrillic} />
        <span class="slider">
          <span class="latin">ABC</span>
          <span class="cyrillic">АБВ</span>
        </span>
      </label>
    </div>
    <div class="options">
      <div class="option">
        <label for="length">Длина:</label>
        <input type="range" bind:value={length} min="15" max="100" />
        <span>{length}</span>
      </div>
      <div class="checkbox-options">
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={includeLowercase} />
            <span>{useCyrillic ? "а-я" : "a-z"}</span>
          </label>
        </div>
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={includeUppercase} />
            <span>{useCyrillic ? "А-Я" : "A-Z"}</span>
          </label>
        </div>
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={includeNumbers} />
            <span>0-9</span>
          </label>
        </div>
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={includeSymbols} />
            <span>!@#$%^&*</span>
          </label>
        </div>
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={escapeForDocker} />
            <span>Для Docker</span>
          </label>
        </div>
      </div>
    </div>
    <button on:click={generatePassword} class="generate-button">
      Сгенерировать пароль
    </button>
  </div>
  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>

<style>
  .card {
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
    margin-bottom: 1rem;
    width: 100%;
    font-size: clamp(1.5rem, 4vw, 1.5rem);
  }

  input[type="text"] {
    font-family: "HandJet";
    font-weight: 500;
    background-color: #f5f5dc;
    color: #000000 !important;
    letter-spacing: 0.1em;
    flex-grow: 1;
    padding: 0.75rem;
    font-size: clamp(1.2rem, 5vw, 2.5rem);
    border: 1px solid var(--toxic-green);
    border-radius: 4px 0 0 4px;
    width: 0;
    min-width: 0;
    overflow-x: auto;
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
  }

  .alphabet-switch {
    margin: 1.5rem 0;
    display: flex;
    justify-content: center;
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

  .options span {
    display: inline-block;
    width: 2.5em;
    /* Ширина для мобильных устройств */
    text-align: center;
  }

  @media (min-width: 1000px) {
    .options span {
      display: contents;
    }
  }

  .option {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
    color: var(--text-color);
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
    accent-color: var(--toxic-green);
    margin: 0;
    cursor: pointer;
    width: 1.2em;
    height: 1.2em;
  }

  input[type="range"] {
    flex: 1;
    min-width: 0;
    appearance: none; /* Стандартное свойство */
    -webkit-appearance: none; /* Для WebKit браузеров */
    -moz-appearance: none; /* Для Firefox */
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

  /* Стили для ползунка в Firefox */
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: var(--toxic-green);
    border-radius: 20%;
    border-width: 0px;
    cursor: pointer;
  }

  .generate-button {
    font-family: "HandJet";
    width: 100%;
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
    word-wrap: break-word;
  }

  .error {
    font-family: "Handjet";
    font-weight: 700;
    font-size: 25pt;
    color: #d32f2f;
    font-size: 20pt;
    margin-top: 1rem;
    text-align: center;
    word-wrap: break-word;
  }

  @media (max-width: 1000px) {
    .card {
      padding: 0.75rem;
    }

    .checkbox-options {
      flex-direction: column;
    }

    .checkbox-options .option {
      width: 100%;
    }

    .option {
      margin-bottom: 0.25rem;
    }

    input[type="text"] {
      font-size: clamp(1rem, 5vw, 1.8rem);
      padding: 0.5rem;
      color: #000000 !important;
    }

    .copy-button {
      padding: 0.5rem 0.75rem;
      font-size: clamp(1rem, 4vw, 1.5rem);
    }

    .switch {
      width: 184px;
      height: 40px;
    }

    .slider {
      padding: 0 20px;
    }

    .slider:before {
      height: 32px;
      width: 85px;
      bottom: 2px;
    }

    .latin,
    .cyrillic {
      font-size: 1.2em;
      width: 45px;
    }

    input:checked + .slider:before {
      transform: translateX(90px);
    }
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

  @media (max-width: 1000px) {
    .checkbox-options {
      flex-direction: column;
    }

    .checkbox-options .option {
      width: 100%;
    }
  }
</style>
