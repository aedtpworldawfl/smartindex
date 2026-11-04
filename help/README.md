# AEDTP WORLD HELP CENTER

A self-contained PHP + JSON help center. No database and no external API
required — articles are stored in `helpfiles.json` and published as static
`.html` files that `index.html` lists automatically.

## What's inside

| File / folder        | Purpose |
|-----------------------|---------|
| `index.html`          | Public homepage. Fetches `helpfiles.json` client-side and renders a searchable article grid. Fully static — works with or without PHP running. |
| `helpfiles.json`       | The article index (source of truth): title, filename, SEO description, HTML content, timestamps. |
| `How_TO_ApplY.html`, `Get_Paid_-Now.html` | Example published articles (static, standalone pages), matching the two sample entries in `helpfiles.json`. |
| `login.php`           | Admin sign-in (bcrypt-hashed password, CSRF-protected, lockout after repeated failed attempts). |
| `allfiles.php`         | Admin dashboard: lists every article, with Edit / View / Rebuild / Delete actions and a live filter box. |
| `edit.php`             | Edit an existing article (rich-text editor), rebuild its filename/slug, or delete it. |
| `write.php`            | Create a new article with the same rich-text editor. |
| `save.php`             | Shared save handler for create + update: sanitizes input, updates `helpfiles.json`, republishes the static `.html` file. |
| `delete.php`           | Removes an entry from `helpfiles.json` and deletes its published file. |
| `sitemap.php`          | Generates an XML sitemap from `helpfiles.json` for search engines. |
| `robots.txt`           | Points crawlers at the sitemap and blocks the admin scripts. |
| `includes/config.php`  | Site name, base URL, admin username/password hash — **edit this first**. |
| `includes/auth.php`    | Session bootstrap, login checks, CSRF helpers, flash messages. |
| `includes/functions.php` | JSON read/write, filename/slug generation, a light HTML sanitizer, and the article template used to publish `.html` files. |
| `assets/css/style.css` | Public site + article styling (also used inside the admin panel). |
| `assets/css/admin.css` | Admin-only styling (login, dashboard table, editor). |
| `assets/js/app.js`     | Homepage: loads `helpfiles.json`, renders + filters the article grid. |
| `assets/js/editor.js`  | Rich-text toolbar logic for `write.php` / `edit.php` (bold/italic/headings/lists/links/images/raw-HTML view). |
| `assets/js/admin.js`   | Live filter box on the "All Files" dashboard table. |

## How publishing works

Every article lives in **two places**, kept in sync automatically:

1. **`helpfiles.json`** — the editable source of truth (title, description, HTML content, timestamps).
2. **A standalone `.html` file** at the site root (e.g. `How_TO_ApplY.html`) — a fully static page generated from the template in `includes/functions.php`, so articles work even if PHP isn't running (e.g. hosted as pure static files) and are directly indexable by search engines.

Saving in `write.php`/`edit.php` updates both. If a static file ever gets out of sync (template changes, manual edits, etc.), use **Rebuild** (single file) or **Rebuild All** on the `allfiles.php` dashboard to regenerate it from the saved JSON content.

A space in a title becomes an underscore in the filename (`"Get Paid -Now"` → `Get_Paid_-Now.html`), matching the existing convention. Filenames are locked at creation time — use **Rebuild Slug & Save** on `edit.php` if you rename a title and want the URL to match (this renames the file and updates the old one).

## Running locally

No API keys or database needed. From the project folder:

```bash
php -S localhost:8000
```

Then open `http://localhost:8000/` for the public site and `http://localhost:8000/login.php` for the admin panel.

Make sure the folder is **writable** by the PHP process (it needs to write `helpfiles.json` and the published `.html` files):

```bash
chmod 664 helpfiles.json
chmod 775 .
```

## Deploying to `https://aedtpworld.com/help/`

1. Upload the entire folder contents into the `/help/` directory on your server (so `index.html` sits at `https://aedtpworld.com/help/index.html`).
2. Make sure `helpfiles.json` and the site root are writable by the web server user (e.g. `chmod 664 helpfiles.json`, `chmod 775 .` — or whatever your host's PHP user needs).
3. Confirm `includes/config.php` → `BASE_URL` is set to `https://aedtpworld.com/help` (already the default).
4. Visit `/login.php` and sign in.

## Before you go live — please do this

- **Change the admin password.** The password used to generate this project was shared in plain text in chat, so treat it as already compromised. Generate a new hash and paste it into `includes/config.php`:
  ```bash
  php -r "echo password_hash('your-new-password', PASSWORD_DEFAULT), PHP_EOL;"
  ```
  Replace the value of `ADMIN_PASSWORD_HASH` with the output, and change `ADMIN_USERNAME` too if you'd like.
- **Serve over HTTPS** and uncomment `'secure' => true` in `includes/auth.php`'s cookie settings once it is.
- Consider moving `includes/config.php` outside the web root (or at least confirm `.htaccess` is active) so it can never be served directly if PHP execution is ever misconfigured.

## Notes on the rich-text editor

`write.php` and `edit.php` use a `contenteditable` area with a formatting toolbar (bold, italic, underline, strikethrough, headings, quote, code block, lists, indent, links, images, horizontal rule, clear formatting) plus a raw **`</>` HTML** toggle for full manual control. Content is sanitized server-side in `save.php` (scripts, event handlers, and `javascript:` URLs are stripped) before it's written to `helpfiles.json` or published as a static file — it is a light sanitizer suited to trusted admin input, not a substitute for restricting who has admin access.

## SEO

- Each article gets its own `<title>`, meta description, canonical URL, Open Graph/Twitter tags, and `Article` JSON-LD, generated from the `title`/`description` fields you enter in the editor.
- `sitemap.php` lists every article dynamically — submit `https://aedtpworld.com/help/sitemap.php` to Google Search Console / Bing Webmaster Tools.
- `robots.txt` allows indexing of articles and blocks the admin scripts.
