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
  let tg;

  onMount(() => {
    // Подключаем скрипт Telegram Web App
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      // После загрузки скрипта инициализируем объект telegram-web-app
      tg = window.Telegram.WebApp;
      // Расширяем окно на всю высоту
      tg.expand();
      // Генерируем начальный пароль
      generatePassword();
    };
    document.head.appendChild(script);
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
    
    const hasLower = !includeLowercase || (useCyrillic ? 
      password.match(/[а-яё]/i) : 
      password.match(/[a-z]/));
    const hasUpper = !includeUppercase || (useCyrillic ? 
      password.match(/[А-ЯЁ]/i) : 
      password.match(/[A-Z]/));
    const hasNumbers = !includeNumbers || password.match(/[0-9]/);
    const hasSymbols = !includeSymbols || password.match(/[!@#$%^&*()_+\[\]{}|;:,.<>?]/);
    
    if (!(hasLower && hasUpper && hasNumbers && hasSymbols)) {
      // Добавляем тактильный отклик при генерации
      if (tg) {
        tg.HapticFeedback.impactOccurred('light');
      }
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
      // Добавляем тактильный отклик при копировании
      if (tg) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      setTimeout(() => copied = false, 2000);
    }).catch(err => {
      console.error('Ошибка при копировании: ', err);
      error = 'Не удалось скопировать пароль';
      // Добавляем тактильный отклик при ошибке
      if (tg) {
        tg.HapticFeedback.notificationOccurred('error');
      }
    });
  };

  $: {
    if (length < 1) length = 1;
    if (length > 100) length = 100;
  }

  $: if (useCyrillic !== undefined) {
    generatePassword();
  }

  $: if (length >= 1 && length <= 100) {
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
    <div class="alphabet-switch">
      <label class="switch">
        <input type="checkbox" bind:checked={useCyrillic}>
        <span class="slider">
          <span class="latin">ABC</span>
          <span class="cyrillic">АБВ</span>
        </span>
      </label>
    </div>
    <div class="options">
      <div class="option">
        <label for="length">Длина:</label>
        <input type="range" bind:value={length} min="1" max="100" />
        <span>{length}</span>
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
