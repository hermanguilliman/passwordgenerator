<script lang="ts">
    let currentYear: number = new Date().getFullYear();
</script>

<footer>
    <span class="seg">GUILLIMAN</span>
    <span class="dot">/</span>
    <span class="seg">G-PASS TERMINAL v3.0</span>
    <span class="dot">/</span>
    <span class="seg">{currentYear}</span>
</footer>

<style>
    footer {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: var(--space-sm);
        margin-top: var(--space-2xl);
        padding-top: var(--space-lg);
        border-top: 1px solid var(--border);
        font-family: var(--font-mono);
        font-size: var(--caption);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-disabled);
    }

    .dot {
        color: var(--border-visible);
    }
</style>
