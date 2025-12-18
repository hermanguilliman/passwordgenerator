<script>
    let currentYear = new Date().getFullYear();
</script>

<footer>
    <div class="line"></div>
    <p>Guilliman // G-PASS TERMINAL v2.2 // {currentYear}</p>
</footer>

<style>
    footer {
        font-family: var(--font-main);
        font-size: 1rem;
        width: 100%;
        color: #444;
        padding: 1rem;
        text-align: center;
        margin-top: auto;
    }
    .line {
        width: 100%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #333, transparent);
        margin-bottom: 0.5rem;
    }
    footer p {
        margin: 0;
        letter-spacing: 2px;
    }
</style>
