<script>
  import { onMount } from 'svelte';
  
  let length = 12;
  let includeLowercase = true;
  let includeUppercase = true;
  let includeNumbers = true;
  let includeSymbols = true;
  let password = '';
  let error = '';
  let copied = false;

  onMount(() => {
    generatePassword();
  });

  const generatePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+[]{}|;:,.<>?';
    
    let characters = '';
    if (includeLowercase) characters += lowercase;
    if (includeUppercase) characters += uppercase;
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
    
    let hasLowercase = !includeLowercase || password.match(/[a-z]/);
    let hasUppercase = !includeUppercase || password.match(/[A-Z]/);
    let hasNumbers = !includeNumbers || password.match(/[0-9]/);
    let hasSymbols = !includeSymbols || password.match(/[!@#$%^&*()_+\[\]{}|;:,.<>?]/);
    
    if (!(hasLowercase && hasUppercase && hasNumbers && hasSymbols)) {
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
</script>

<main>
  <h1>Генератор паролей</h1>
  <div class="card">
    <div class="password-display">
      <input type="text" value={password} readonly />
      <button on:click={copyToClipboard} class="copy-button" class:copied>
        {copied ? '✓' : '📋'}
      </button>
    </div>
    <div class="options">
      <div class="option">
        <label for="length">Длина:</label>
        <input type="range" bind:value={length} min="1" max="100" />
        <span>{length}</span>
      </div>
      <div class="option">
        <label>
          <input type="checkbox" bind:checked={includeLowercase} />
          <span>a-z</span>
        </label>
      </div>
      <div class="option">
        <label>
          <input type="checkbox" bind:checked={includeUppercase} />
          <span>A-Z</span>
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
  }

  h1 {
	font-size: 50pt;
    margin-bottom: 1rem;
    color: var(--primary-color);
  }

  .card {
    background-color: var(--card-background);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    width: 100%;
    max-width: 500px;
    font-family: 'Nunito Sans';
    font-size: 14pt;
  }

  .password-display {
    display: flex;
    margin-bottom: 1rem;
  }

  input[type="text"] {
    font-family: 'HandJet';
    font-weight: 600;
    background-color: #fff372;
    letter-spacing: .2rem;
    flex-grow: 1;
    padding: 0.5rem;
    font-size: 2rem;
    border: 1px solid #93ff05;
    border-radius: 1px 0 0 1px;
  }

  .copy-button {
    padding: 0.5rem 1rem;
    font-size: 1.5rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .copy-button:hover {
    background-color: #bdfa68;
  }

  .copy-button.copied {
    background-color: var(--secondary-color);
  }

  .options {
    margin-bottom: 1rem;
  }

  .option {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .option label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  input[type="range"] {
    color: #FFF;
    width: 100%;
    margin-right: 0.5rem;
  }

  .generate-button {
    font-family: 'HandJet';
    width: 100%;
    padding: 0.75rem;
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: .2rem;
    text-transform: uppercase;
    background-color: var(--primary-color);
    color: black;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .generate-button:hover {
    background-color: #bdfa68;
	
  }

  .error {
    color: #d32f2f;
    margin-top: 1rem;
  }
</style>