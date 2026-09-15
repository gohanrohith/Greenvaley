# Greenvaley Junior College — Project Progress

## Stack
Node.js + Express + EJS + MySQL · Port **8569**

---

## 2026-09-01 — Content update from artifact (design unchanged)

### Source
Artifact `69260dd9` — Greenvaley Junior College single-page prototype (artifact design NOT applied; only data extracted).

### Files changed

#### `config/college.js`
- `phone` → `7207904044`
- `phone2` → `7207904045`
- `email` → `info@greenvaleycollege.com`
- `address` → `Yellapur, Hanamkonda`
- `whatsapp` → `917207904044`
- `tagline` → `IIT-JEE & NEET | Class 11 & 12`
- `programs` → `['IIT-JEE Main & Advanced', 'IIT-JEE Main & EAPCET', 'NEET']`

#### `views/main/home.ejs`
- Hero badge: `Yellapur, Hanamkonda`
- Hero h1: *"Two years that decide the next twenty."*
- Hero sub: IIT-JEE & NEET positioning copy
- CTA: `Apply for up to 90% scholarship` → `/scholarship/apply`
- CTA 2: `Call 7207904044` → `tel:` link
- 3 stream cards in hero-right: JEE, NEET, EAPCET (replaced MPC/BiPC)
- Stats strip: 3 streams · 90% max scholarship · TSBIE · 1 campus Hanamkonda
- Scholarship strip: updated copy for merit-based 90% scholarship
- Bento cards: faculty description updated to IIT-JEE/NEET focus

#### `views/partials/footer.ejs`
- Programmes column: IIT-JEE Main & Advanced, IIT-JEE Main & EAPCET, NEET UG
- Reach Us column: phone, phone2, email, WhatsApp — all pulled from `college` config
- Copyright line: uses `college.address`

---

## Earlier work (pre-2026-09-01)

### Site setup
- Full Node/Express/EJS/MySQL stack at `D:\Greenvaley`
- Routes: main public routes + admin panel
- Session: express-session + MySQLStore
- CSRF protection on all POST forms

### Public pages
| Route | View |
|---|---|
| `/` | `views/main/home.ejs` |
| `/about` | `views/main/about.ejs` |
| `/programs` | `views/main/programs.ejs` |
| `/admissions` | `views/main/admissions.ejs` |
| `/faculty` | `views/main/faculty.ejs` |
| `/results` | `views/main/results.ejs` |
| `/question-papers` | `views/main/question-papers.ejs` |
| `/scholarship` | `views/main/scholarship.ejs` |
| `/scholarship/apply` | `views/main/scholarship-apply.ejs` |
| `/scholarship/status` | `views/main/scholarship-status.ejs` |
| `/mandatory-disclosure` | `views/main/mandatory-disclosure.ejs` |
| `/gallery` | `views/main/gallery.ejs` |
| `/events` | `views/main/events.ejs` |
| `/news` | `views/main/news.ejs` |
| `/news/:slug` | `views/main/news-article.ejs` |
| `/contact` | `views/main/contact.ejs` |

### Design
- Font: Outfit (Google Fonts)
- Primary: `#4d7034` (green), Accent: `#b78d49` (gold), BG: `#f8f8f6`
- Split hero layout (hero-left + hero-right green panel)
- Black stats strip, bento feature grid, dark scholarship strip

### Key files
| File | Purpose |
|---|---|
| `app.js` | Express entry point |
| `routes/main.js` | Public routes |
| `routes/admin.js` | Admin routes |
| `controllers/mainController.js` | Public page handlers |
| `config/college.js` | College identity & contact info |
| `public/css/style.css` | All public styles |
| `public/css/admin.css` | Admin panel styles |
| `public/js/main.js` | Nav toggle (mobile) |
| `views/partials/head.ejs` | `<head>` + font |
| `views/partials/nav.ejs` | Navigation bar |
| `views/partials/footer.ejs` | Footer + scripts |
