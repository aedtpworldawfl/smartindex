// AWFLWIKI share button — copies the page link to clipboard
document.addEventListener('DOMContentLoaded', () => {
    const shareBtn = document.getElementById('shareBtn');
    if (!shareBtn) return;
    shareBtn.addEventListener('click', async () => {
        const url = shareBtn.dataset.url || window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            const original = shareBtn.textContent;
            shareBtn.textContent = 'Link copied!';
            setTimeout(() => { shareBtn.textContent = original; }, 1800);
        } catch (e) {
            prompt('Copy this link:', url);
        }
    });
});
