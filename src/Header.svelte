<script lang="ts">
  import { onMount } from 'svelte';

  interface GlitchTextProps {
    originalText?: string;
    glitchProbability?: number;
    minGlitches?: number;
    maxGlitches?: number;
    resetDelay?: number;
  }

  export let originalText: string = "Генератор паролей";
  export let glitchProbability: number = 0.1;
  export let minGlitches: number = 1;
  export let maxGlitches: number = 3;
  export let resetDelay: number = 150;

  const GLITCH_CHARS: string = "!@#$%^&*()_+-=[]{}|;:,.<>?`~";
  const INTERVAL_MS: number = 100;

  interface ColoredChar {
    char: string;
    color?: string;
  }

  let displayChars: ColoredChar[] = originalText.split('').map(char => ({
    char
  }));

  const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const getRandomColor = (): string => {
    const neonColors = [
      '#ff00ff',
      '#00ff00', 
      '#00ffff',
      '#ff0000',
      '#ffff00',
      '#0000ff',
    ];
    return neonColors[Math.floor(Math.random() * neonColors.length)];
  };

  const glitchText = (): void => {
    const shouldGlitch: boolean = Math.random() < glitchProbability;
    
    if (shouldGlitch) {
      const newDisplayChars: ColoredChar[] = originalText.split('').map(char => ({
        char
      }));
      
      const numGlitches: number = getRandomInt(minGlitches, maxGlitches);
      
      for (let i = 0; i < numGlitches; i++) {
        const position: number = getRandomInt(0, originalText.length - 1);
        const glitchChar: string = GLITCH_CHARS[getRandomInt(0, GLITCH_CHARS.length - 1)];
        newDisplayChars[position] = {
          char: glitchChar,
          color: getRandomColor()
        };
      }
      
      displayChars = newDisplayChars;
      
      setTimeout(() => {
        displayChars = originalText.split('').map(char => ({
          char
        }));
      }, resetDelay);
    }
  };

  let interval: ReturnType<typeof setInterval>;
  
  onMount(() => {
    interval = setInterval(glitchText, INTERVAL_MS);
    return () => clearInterval(interval);
  });
</script>

<header>
  <h1>
    {#each displayChars as { char, color }}
      <span 
        class="char"
        style={color ? `color: ${color}; text-shadow: 0 0 5px ${color};` : ''}
      >{char}</span>
    {/each}
  </h1>
</header>

<style>
  header {
    background-color: var(--toxic-green);
    color: #000;
    text-align: center;
    font-family: 'HandJet';  /* Используем моноширинный шрифт */
    font-size: 18pt;
    padding: 0;
    width: auto;
    position: relative;
    margin-bottom: 30pt;
  }

  .char {
    display: inline-block;
    width: 1ch;  /* Фиксированная ширина символа */
    text-align: center;
    font-weight: 500;
  }

  h1 {
    font-weight: 500;
    letter-spacing: 0;  /* Убираем дополнительные отступы между буквами */
    line-height: 1.2;
  }
</style>