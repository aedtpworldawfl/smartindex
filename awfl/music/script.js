




async function loadMusicPages() {
  const container = document.getElementById('music-container');
  const status    = document.getElementById('status');

  try {
    // 1. Fetch index.json
    const indexRes = await fetch('pages/index.json');
    if (!indexRes.ok) throw new Error(`index.json fetch failed: ${indexRes.status}`);
    const pages = await indexRes.json();

    // Hide loader
    status.style.display = 'none';

    if (!pages.length) {
      container.innerHTML = '<p style="padding:40px;color:#666;font-family:monospace;">No music entries found.</p>';
      return;
    }

    // 2. Loop through each music entry
    for (const item of pages) {
      try {
        const htmlRes = await fetch(`${item.file}`);
        if (!htmlRes.ok) throw new Error(`${item.file} fetch failed: ${htmlRes.status}`);
        const rawHtml = await htmlRes.text();

        // 3. Parse and extract body content only
        const parser = new DOMParser();
        const doc    = parser.parseFromString(rawHtml, 'text/html');
        const bodyContent = doc.body.innerHTML;

        // 4. Inject card
        const card = document.createElement('div');
        card.className = 'business-card'; // shared system

        card.innerHTML = `
          <div class="card-header">
            <h2>${item.name}</h2>
            <span class="card-tag">MUSIC</span>
          </div>
          <div class="business-content">
            ${bodyContent}
          </div>
        `;

        container.appendChild(card);

      } catch (err) {
        console.warn(`Could not load ${item.file}:`, err);

        const errCard = document.createElement('div');
        errCard.className = 'business-card';
        errCard.innerHTML = `
          <div class="card-header">
            <h2>${item.name}</h2>
            <span class="card-tag">ERROR</span>
          </div>
          <div class="business-content" style="color:#666;font-family:monospace;font-size:13px;padding:20px 0;">
            Could not load music entry for <b style="color:#aaa;">${item.name}</b>.
          </div>
        `;

        container.appendChild(errCard);
      }
    }

  } catch (err) {
    status.innerHTML = `<span style="color:#ff4d00;">⚠ Failed to load music index: ${err.message}</span>`;
    console.error(err);
  }
}

loadMusicPages();






