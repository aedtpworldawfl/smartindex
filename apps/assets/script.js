/* APPTUFLY — shared client JS */

function awToggleSwitchMenu() {
  const el = document.getElementById('awSwitchMenu');
  if (el) el.style.display = (el.style.display === 'block') ? 'none' : 'block';
}

document.addEventListener('click', function (e) {
  const menu = document.getElementById('awSwitchMenu');
  const btn = document.getElementById('awSwitchBtn');
  if (!menu || !btn) return;
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.style.display = 'none';
  }
});

function awTrackDownload(slug, owner) {
  try {
    fetch('/apps/track.php?slug=' + encodeURIComponent(slug) + '&owner=' + encodeURIComponent(owner), { method: 'POST' });
  } catch (e) { /* non-blocking */ }
}

/* ── App detail page: favorite / follow / reviews (v1.0) ───────────── */

let awSelectedRating = 0;

function awInitAppPage(owner, slug) {
  fetch('/apps/state.php?owner=' + encodeURIComponent(owner) + '&slug=' + encodeURIComponent(slug))
    .then(r => r.json())
    .then(state => {
      const favBtn = document.getElementById('awFavBtn');
      if (favBtn) {
        if (!state.logged_in) {
          favBtn.onclick = () => location.href = '/apps/login.php';
        } else {
          awSetFavBtn(favBtn, state.is_favorited);
        }
      }

      const followBtn = document.getElementById('awFollowBtn');
      if (followBtn && state.can_follow && !state.is_owner) {
        followBtn.style.display = 'inline-block';
        awSetFollowBtn(followBtn, state.is_following);
      }

      const form = document.getElementById('awCommentForm');
      if (form && state.logged_in) {
        form.style.display = 'block';
        if (state.my_rating) awSetStars(state.my_rating);
      }

      awRenderComments(state.comments || []);
    })
    .catch(() => {});

  const picker = document.getElementById('awStarPicker');
  if (picker) {
    picker.querySelectorAll('span').forEach(s => {
      s.addEventListener('click', () => awSetStars(parseInt(s.dataset.v, 10)));
    });
  }
}

function awSetStars(v) {
  awSelectedRating = v;
  const picker = document.getElementById('awStarPicker');
  if (!picker) return;
  picker.querySelectorAll('span').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.v, 10) <= v);
  });
}

function awSetFavBtn(btn, favorited) {
  btn.textContent = favorited ? '❤️ Saved' : '🤍 Save';
  btn.classList.toggle('active', favorited);
  btn.dataset.state = favorited ? '1' : '0';
}

function awSetFollowBtn(btn, following) {
  btn.textContent = following ? '✓ Following' : '+ Follow';
  btn.classList.toggle('active', following);
  btn.dataset.state = following ? '1' : '0';
}

function awToggleFavorite(owner, slug) {
  const btn = document.getElementById('awFavBtn');
  if (!btn) return;
  const adding = btn.dataset.state !== '1';
  fetch('/apps/favorite.php?action=' + (adding ? 'add' : 'remove') + '&owner=' + encodeURIComponent(owner) + '&slug=' + encodeURIComponent(slug), { method: 'POST' })
    .then(r => r.json())
    .then(res => {
      if (res.error) { alert(res.error); return; }
      awSetFavBtn(btn, res.favorited);
    });
}

function awToggleFollow(target, btnId) {
  const btn = document.getElementById(btnId || 'awFollowBtn');
  if (!btn) return;
  const fd = new FormData();
  fd.append('target', target);
  fetch('/apps/follow.php', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(res => {
      if (res.error) { alert(res.error); return; }
      awSetFollowBtn(btn, res.following);
    });
}

function awSubmitComment(owner, slug) {
  if (!awSelectedRating) { alert('Please pick a star rating first.'); return; }
  const text = document.getElementById('awCommentText').value.trim();
  const fd = new FormData();
  fd.append('owner', owner);
  fd.append('slug', slug);
  fd.append('rating', awSelectedRating);
  fd.append('text', text);
  fetch('/apps/comment.php', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(res => {
      if (res.error) { alert(res.error); return; }
      const pill = document.getElementById('awRatingPill');
      if (pill) pill.textContent = '★ ' + res.avg_rating + ' (' + res.total_reviews + ')';
      fetch('/apps/state.php?owner=' + encodeURIComponent(owner) + '&slug=' + encodeURIComponent(slug))
        .then(r => r.json())
        .then(state => awRenderComments(state.comments || []));
    });
}

function awRenderComments(comments) {
  const list = document.getElementById('awCommentsList');
  if (!list) return;
  if (!comments.length) {
    list.innerHTML = '<div class="aw-empty">No reviews yet — be the first!</div>';
    return;
  }
  list.innerHTML = comments.map(c => {
    const stars = '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating);
    const text = c.text ? awEscHtml(c.text) : '';
    return '<div class="aw-comment"><div class="aw-comment-head"><span class="aw-comment-user">' + awEscHtml(c.username) + '</span>' +
      '<span class="aw-comment-stars">' + stars + '</span></div>' +
      (text ? '<div class="aw-comment-text">' + text + '</div>' : '') + '</div>';
  }).join('');
}

function awEscHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
