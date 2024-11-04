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
      <div class="checkbox-options">
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
    padding: 1rem;
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
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    transition: background-color 0.3s ease;
    white-space: nowrap;
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
</style>