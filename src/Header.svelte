<script lang="ts">
  import { onMount } from 'svelte';

  // Интерфейс для пропсов компонента
  interface GlitchTextProps {
    originalText?: string;
    glitchProbability?: number;
    minGlitches?: number;
    maxGlitches?: number;
    resetDelay?: number;
  }

  // Пропсы с значениями по умолчанию
  export let originalText: string = "Генератор паролей";
  export let glitchProbability: number = 0.05;
  export let minGlitches: number = 1;
  export let maxGlitches: number = 3;
  export let resetDelay: number = 150;

  // Константы
  const GLITCH_CHARS: string = "!@#$%^&*()_+-=[]{}|;:,.<>?`~";
  const INTERVAL_MS: number = 100;

  // Интерфейс для символа с цветом
  interface ColoredChar {
    char: string;
    color?: string;
    isSpace: boolean;
  }

  // Реактивная переменная для отображаемого текста
  let displayChars: ColoredChar[] = originalText.split('').map(char => ({
    char,
    isSpace: char === ' '
  }));

  // Функция для получения случайного числа в диапазоне
  const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Функция для генерации случайного цвета
  const getRandomColor = (): string => {
    const neonColors = [
      '#ff00ff', // магента
      '#00ff00', // ядовито-зеленый
      '#00ffff', // циан
      '#ff0000', // красный
      '#ffff00', // желтый
      '#0000ff', // синий
    ];
    return neonColors[Math.floor(Math.random() * neonColors.length)];
  };

  // Функция для создания глитч-эффекта
  const glitchText = (): void => {
    const shouldGlitch: boolean = Math.random() < glitchProbability;
    
    if (shouldGlitch) {
      const newDisplayChars: ColoredChar[] = originalText.split('').map(char => ({
        char,
        isSpace: char === ' '
      }));
      
      const numGlitches: number = getRandomInt(minGlitches, maxGlitches);
      
      for (let i = 0; i < numGlitches; i++) {
        const position: number = getRandomInt(0, originalText.length - 1);
        // Пропускаем пробелы при глитче
        if (!newDisplayChars[position].isSpace) {
          const glitchChar: string = GLITCH_CHARS[getRandomInt(0, GLITCH_CHARS.length - 1)];
          newDisplayChars[position] = {
            char: glitchChar,
            color: getRandomColor(),
            isSpace: false
          };
        }
      }
      
      displayChars = newDisplayChars;
      
      setTimeout(() => {
        displayChars = originalText.split('').map(char => ({
          char,
          isSpace: char === ' '
        }));
      }, resetDelay);
    }
  };

  // Управление жизненным циклом
  let interval: ReturnType<typeof setInterval>;
  
  onMount(() => {
    interval = setInterval(glitchText, INTERVAL_MS);
    
    return () => {
      clearInterval(interval);
    };
  });
</script>

<header>
  <h1>
    {#each displayChars as { char, color, isSpace }}
      <span 
        class:space={isSpace}
        style={color ? `color: ${color}; text-shadow: 0 0 5px ${color};` : ''}
      >{char}</span>
    {/each}
  </h1>
</header>

<style>
  header {
    background-color: var(--toxic-green);
    color: #000;
    padding: 1pt;
    text-align: center;
    font-family: "Handjet";
    font-size: 20pt;
    width: auto;
    position: relative;
    margin-bottom: 30pt;
  }

  span {
    display: inline-block;
    transition: color 0.1s ease;
    white-space: pre;
  }

  .space {
    width: 0.3em;  /* Можно настроить ширину пробела */
  }

  h1 {
    white-space: nowrap;
  }
</style>