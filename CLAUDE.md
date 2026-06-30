# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

G-PASS TERMINAL — криптографически безопасный генератор паролей с тремя режимами генерации (стандартный, XKCD, фонетический), расчётом энтропии и киберпанк-интерфейсом. Single-page application на Svelte 5.

Сайт: https://password.guilliman.ru/ — авто-деплой из `main` на Netlify.

## Commands

- `npm run dev` — запустить Vite dev-сервер (http://localhost:5173)
- `npm run build` — production-сборка
- `npm run preview` — локальный просмотр собранной версии
- `npm run check` — проверка типов Svelte + TypeScript (`svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json`)

Тестов нет.

## Architecture

### Стек
- **Svelte 5** (с `mount()` API, runes-ready)
- **TypeScript** (strict mode)
- **Vite 6** с плагинами `@sveltejs/vite-plugin-svelte` и `vite-plugin-pwa`
- **PWA** (service worker с автообновлением, манифест)
- QR-коды — библиотека `qrcode`

### Структура проекта

```
src/
  main.ts          — точка входа, монтирует Svelte приложение
  App.svelte       — корневой компонент (Header + Generator + Footer)
  Generator.svelte — главный компонент со всей логикой (~2200 строк)
  Header.svelte    — анимированный заголовок с glitch-эффектом
  Footer.svelte    — нижний колонтитул (версия, год)
  app.css          — глобальные стили, CSS-переменные, scanline-эффект
```

### Ключевые особенности

**Генерация паролей — `Generator.svelte`:**
- Весь стейт, UI и бизнес-логика в одном компоненте (нет разделения на store/utils)
- Три режима, переключаемые табами: `"standard" | "xkcd" | "phonetic"`
- Криптографически безопасный RNG: `crypto.getRandomValues()` с rejection sampling (функция `secureRandomInt`)
- Поддержка кириллицы (стандартный и фонетический режимы)

**Расчёт энтропии:**
- Стандартный режим: сумма битов по категориям + остаток из пула + перестановки `C(L,k)`
- XKCD: слова × `log₂(dict_size)` + опционально случайный регистр и число
- Фонетический: слоги × биты на слог по паттерну (CV/CVC/CVCC/CCVC)
- Шкала от "мгновенный" (< 20 бит) до "AES-256+" (256+ бит)
- Время подбора: `2^n / (10¹⁰ × 2)` секунд

**XKCD-словарь:**
- ~500 слов (английские, встроены в исходник как строковая константа `WORD_SOURCE`)

**История:**
- Последние 20 паролей в `localStorage` (ключ `pwd_history`)
- Восстановление пароля из истории с копированием

**UI:**
- Киберпанк-стилистика: `toxic-green` (#9ef523), чёрный фон, scanline-эффект
- Шрифт JetBrains Mono
- Адаптивная сетка: 2 колонки на десктопе, 1 на мобильных
- Декоративные уголки панелей через `::before`/`::after`
- Анимация пульсации при копировании
- QR-модальное окно

### Конфигурация

- `vite.config.ts` — Vite + Svelte + PWA
- `svelte.config.js` — vitePreprocess
- `tsconfig.json` — два reference: `tsconfig.app.json` (src) + `tsconfig.node.json` (vite.config)
- `index.html` — мета-теги, PWA-иконки, OGP для соцсетей, Yandex-верификация
- `.gitignore` — стандартный Vite + `.vscode`/`.idea`
- `.vscode/extensions.json` — рекомендовано расширение `svelte.svelte-vscode`

### Примечания

- Нет тестов, нет маршрутизации, нет бэкенда — всё выполняется в браузере
- Stricter TypeScript: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`
- Деплой на Netlify: `main` → авто-деплой
