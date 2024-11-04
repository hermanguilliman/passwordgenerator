<script>
  import { onMount } from 'svelte';
  
  let length = 12;
  let includeLowercase = true;
  let includeUppercase = true;
  let includeNumbers = true;
  let includeSymbols = true;
  let useCyrillic = false;
  let password = '';
  let error = '';
  let copied = false;

  onMount(() => {
    generatePassword();
  });

  const generatePassword = () => {
    const latinLower = 'abcdefghijklmnopqrstuvwxyz';
    const latinUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cyrillicLower = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    const cyrillicUpper = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+[]{}|;:,.<>?';
    
    let characters = '';
    if (includeLowercase) characters += useCyrillic ? cyrillicLower : latinLower;
    if (includeUppercase) characters += useCyrillic ? cyrillicUpper : latinUpper;
    if (includeNumbers) characters += numbers;
    if (includeSymbols) characters += symbols;
    
    if (characters.length === 0) {
      error = 'Выберите хотя бы один тип символов';
      password = '';
      return;
    }
    
    error = '';
    password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }
    
    // Проверяем наличие всех выбранных типов символов
    const hasLower = !includeLowercase || (useCyrillic ? 
      password.match(/[а-яё]/i) : 
      password.match(/[a-z]/));
    const hasUpper = !includeUppercase || (useCyrillic ? 
      password.match(/[А-ЯЁ]/i) : 
      password.match(/[A-Z]/));
    const hasNumbers = !includeNumbers || password.match(/[0-9]/);
    const hasSymbols = !includeSymbols || password.match(/[!@#$%^&*()_+\[\]{}|;:,.<>?]/);
    
    if (!(hasLower && hasUpper && hasNumbers && hasSymbols)) {
      generatePassword();
    }
  };

  const copyToClipboard = () => {
    if (!password) {
      error = 'Сначала сгенерируйте пароль';
      return;
    }
    navigator.clipboard.writeText(password).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    }).catch(err => {
      console.error('Ошибка при копировании: ', err);
      error = 'Не удалось скопировать пароль';
    });
  };

  $: {
    if (length < 1) length = 1;
    if (length > 100) length = 100;
  }

  // При изменении типа алфавита генерируем новый пароль
  $: if (useCyrillic !== undefined) {
    generatePassword();
  }
</script>

<main>
  <h1>Генератор паролей</h1>
  <div class="card">
    <div class="password-display">
      <input type="text" value={password} readonly />
      <button on:click={copyToClipboard} class="copy-button" class:copied>
        {copied ? 'Скопировано!' : '📋'}
      </button>
    </div>
    <div class="options">
      <div class="option">
        <label for="length">Длина:</label>
        <input type="range" bind:value={length} min="1" max="100" />
        <span>{length}</span>
      </div>
      <div class="alphabet-switch">
        <label class="switch">
          <input type="checkbox" bind:checked={useCyrillic}>
          <span class="slider">
            <span class="latin">ABC</span>
            <span class="cyrillic">АБВ</span>
          </span>
        </label>
      </div>
      <div class="checkbox-options">
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={includeLowercase} />
            <span>{useCyrillic ? 'а-я' : 'a-z'}</span>
          </label>
        </div>
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={includeUppercase} />
            <span>{useCyrillic ? 'А-Я' : 'A-Z'}</span>
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
      </div>
    </div>
    <button on:click={generatePassword} class="generate-button">Сгенерировать пароль</button>
  </div>
  {#if error}
    <p class="error">{error}</p>
  {/if}
</main>

<style>
  :root {
    --primary-color: #9ef523;
    --secondary-color: #9ef523;
    --background-color: #ffffff00;
    --card-background: #000000;
    --text-color: #FFF;
  }

  main {
    font-family: 'HandJet';
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    background-color: var(--background-color);
    color: var(--text-color);
    padding: 0.5rem;
    box-sizing: border-box;
    width: 100%;
  }

  h1 {
    font-size: clamp(2rem, 8vw, 4rem);
    margin-bottom: 1rem;
    color: var(--primary-color);
    text-align: center;
    word-wrap: break-word;
  }

  .card {
    background-color: var(--card-background);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
    padding: 1rem;
    box-sizing: border-box;
    font-family: 'Nunito Sans';
    font-size: clamp(1rem, 4vw, 1.5rem);
  }

  .password-display {
    display: flex;
    margin-bottom: 1rem;
    width: 100%;
  }

  input[type="text"] {
    font-family: 'HandJet';
    font-weight: 600;
    background-color: #fff372;
    letter-spacing: 0.1em;
    flex-grow: 1;
    padding: 0.5rem;
    font-size: clamp(1rem, 5vw, 2rem);
    border: 1px solid #93ff05;
    border-radius: 4px 0 0 4px;
    width: 0;
    min-width: 0;
    overflow-x: auto;
  }

  .copy-button {
    padding: 0.5rem;
    font-size: clamp(1rem, 4vw, 1.5rem);
    background-color: var(--primary-color);
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
    width: 250px; /* Увеличили ширину с 160px до 240px */
    height: 48px; /* Увеличили высоту с 40px до 48px */
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
    border-radius: 10px; /* Увеличили радиус для соответствия новому размеру */
    border: 2px solid var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px; /* Увеличили отступы с 15px до 30px */
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 38px; /* Увеличили высоту ползунка */
    width: 122px; /* Увеличили ширину ползунка */
    left: 2px;
    bottom: 3px;
    background-color: var(--primary-color);
    transition: 0.4s;
    border-radius: 5px; /* Половина высоты для скругления */
    z-index: 1;
  }

  .latin, .cyrillic {
    color: black;
    font-weight: bold;
    z-index: 2;
    font-size: 1.4em; /* Увеличили размер шрифта */
    transition: color 0.4s;
    width: 60px; /* Фиксированная ширина для текста */
    text-align: center; /* Центрирование текста */
  }

  input:checked + .slider:before {
    transform: translateX(120px); /* Увеличили смещение в соответствии с новой шириной */
  }

  input:checked + .slider .latin {
    color: var(--primary-color);
  }

  input:not(:checked) + .slider .cyrillic {
    color: var(--primary-color);
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

  .option {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }

  .option label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    white-space: nowrap;
  }

  input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
    width: 1.2em;
    height: 1.2em;
  }

  input[type="range"] {
    flex: 1;
    min-width: 0;
  }

  .generate-button {
    font-family: 'HandJet';
    width: 100%;
    padding: 0.75rem;
    font-size: clamp(1.2rem, 5vw, 2rem);
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background-color: var(--primary-color);
    color: black;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    word-wrap: break-word;
  }

  .error {
    color: #d32f2f;
    margin-top: 1rem;
    text-align: center;
    word-wrap: break-word;
  }

  @media (max-width: 480px) {
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
      font-size: 1rem;
      padding: 0.25rem;
    }

    .copy-button {
      padding: 0.25rem 0.5rem;
    }
  }
  @media (max-width: 480px) {
    .switch {
      width: 184px; /* Уменьшаем размер на мобильных */
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

    .latin, .cyrillic {
      font-size: 1.2em;
      width: 45px;
    }

    input:checked + .slider:before {
      transform: translateX(90px);
    }
  }
</style>