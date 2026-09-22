const db     = require('../config/database');
const bcrypt = require('bcrypt');
const college = require('../config/college');
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads');

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function diskStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS_BASE, subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  });
}

const uploadGallery = multer({ storage: diskStorage('gallery'), limits: { fileSize: 8 * 1024 * 1024 } });
const uploadPaper   = multer({ storage: diskStorage('papers'),  limits: { fileSize: 20 * 1024 * 1024 } });
const uploadAvatar  = multer({ storage: diskStorage('avatars'), limits: { fileSize: 2 * 1024 * 1024 } });
const uploadNews    = multer({ storage: diskStorage('news'),    limits: { fileSize: 4 * 1024 * 1024 } });

// ── Auth ──────────────────────────────────────────────────────────────────────

exports.loginPage = (req, res) => {
  if (req.session?.adminId) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login | Greenvaley', college });
};

exports.loginSubmit = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [[admin]] = await db.query('SELECT * FROM admins WHERE username=?', [username]);
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.render('admin/login', {
        title: 'Admin Login | Greenvaley', college,
        error: 'Invalid username or password.',
      });
    }
    req.session.adminId   = admin.id;
    req.session.adminName = admin.name;
    req.session.adminRole = admin.role;
    res.redirect('/admin');
  } catch (e) {
    console.error(e);
    res.render('admin/login', { title: 'Admin Login | Greenvaley', college, error: 'Server error.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

exports.dashboard = async (req, res) => {
  try {
    const [
      [newsRow], [eventsRow], [papersRow], [scholarshipsRow], [enquiriesRow]
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS n FROM news'),
      db.query('SELECT COUNT(*) AS n FROM events'),
      db.query('SELECT COUNT(*) AS n FROM question_papers'),
      db.query('SELECT COUNT(*) AS n FROM scholarship_applications WHERE status="pending"'),
      db.query('SELECT COUNT(*) AS n FROM contact_enquiries WHERE seen=0'),
    ]);
    res.render('admin/dashboard', {
      title: 'Dashboard | Admin', college,
      stats: {
        news:         newsRow[0].n,
        events:       eventsRow[0].n,
        papers:       papersRow[0].n,
        scholarships: scholarshipsRow[0].n,
        enquiries:    enquiriesRow[0].n,
      },
    });
  } catch (e) {
    console.error(e);
    res.render('admin/dashboard', { title: 'Dashboard | Admin', college, stats: {} });
  }
};

// ── News ──────────────────────────────────────────────────────────────────────

exports.newsList = async (req, res) => {
  const [news] = await db.query('SELECT * FROM news ORDER BY created_at DESC');
  res.render('admin/news/list', { title: 'News | Admin', college, news });
};

exports.newsForm = (req, res) => {
  res.render('admin/news/form', { title: 'New Article | Admin', college, item: null });
};

exports.createNews = [
  uploadNews.single('image'),
  async (req, res) => {
    const { title, excerpt, content, published } = req.body;
    const s = slug(title) + '-' + Date.now();
    const image = req.file ? `/uploads/news/${req.file.filename}` : null;
    try {
      await db.query(
        'INSERT INTO news (title, slug, excerpt, content, image, published) VALUES (?,?,?,?,?,?)',
        [title, s, excerpt?.trim() || null, content, image, published === '1' ? 1 : 0]
      );
      res.redirect('/admin/news?success=1');
    } catch (e) {
      res.redirect('/admin/news/new?error=1');
    }
  },
];

exports.editNewsForm = async (req, res) => {
  const [[item]] = await db.query('SELECT * FROM news WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/news');
  res.render('admin/news/form', { title: 'Edit Article | Admin', college, item });
};

exports.updateNews = [
  uploadNews.single('image'),
  async (req, res) => {
    const { title, excerpt, content, published, remove_image } = req.body;
    const newImage = req.file ? `/uploads/news/${req.file.filename}` : null;
    try {
      let image;
      if (newImage) {
        image = newImage;
      } else if (remove_image === '1') {
        image = null;
      }
      if (image !== undefined) {
        await db.query('UPDATE news SET title=?,excerpt=?,content=?,image=?,published=? WHERE id=?',
          [title, excerpt?.trim() || null, content, image, published === '1' ? 1 : 0, req.params.id]);
      } else {
        await db.query('UPDATE news SET title=?,excerpt=?,content=?,published=? WHERE id=?',
          [title, excerpt?.trim() || null, content, published === '1' ? 1 : 0, req.params.id]);
      }
      res.redirect('/admin/news?success=1');
    } catch (e) {
      res.redirect(`/admin/news/${req.params.id}/edit?error=1`);
    }
  },
];

exports.deleteNews = async (req, res) => {
  await db.query('DELETE FROM news WHERE id=?', [req.params.id]);
  res.redirect('/admin/news?success=1');
};

// ── Events ────────────────────────────────────────────────────────────────────

exports.eventsList = async (req, res) => {
  const [events] = await db.query('SELECT * FROM events ORDER BY event_date DESC');
  res.render('admin/events/list', { title: 'Events | Admin', college, events });
};

exports.eventForm = (req, res) => {
  res.render('admin/events/form', { title: 'New Event | Admin', college, item: null });
};

exports.createEvent = async (req, res) => {
  const { title, description, event_date, venue } = req.body;
  try {
    await db.query('INSERT INTO events (title, description, event_date, venue) VALUES (?,?,?,?)',
      [title, description || null, event_date, venue || null]);
    res.redirect('/admin/events?success=1');
  } catch (e) {
    res.redirect('/admin/events/new?error=1');
  }
};

exports.editEventForm = async (req, res) => {
  const [[item]] = await db.query('SELECT * FROM events WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/events');
  res.render('admin/events/form', { title: 'Edit Event | Admin', college, item });
};

exports.updateEvent = async (req, res) => {
  const { title, description, event_date, venue } = req.body;
  try {
    await db.query('UPDATE events SET title=?,description=?,event_date=?,venue=? WHERE id=?',
      [title, description || null, event_date, venue || null, req.params.id]);
    res.redirect('/admin/events?success=1');
  } catch (e) {
    res.redirect(`/admin/events/${req.params.id}/edit?error=1`);
  }
};

exports.deleteEvent = async (req, res) => {
  await db.query('DELETE FROM events WHERE id=?', [req.params.id]);
  res.redirect('/admin/events?success=1');
};

// ── Gallery ───────────────────────────────────────────────────────────────────

exports.galleryList = async (req, res) => {
  const [albums] = await db.query(
    `SELECT a.*, COUNT(p.id) AS photo_count
     FROM gallery_albums a LEFT JOIN gallery_photos p ON p.album_id=a.id
     GROUP BY a.id ORDER BY a.created_at DESC`
  );
  res.render('admin/gallery/list', { title: 'Gallery | Admin', college, albums });
};

exports.albumForm = (req, res) => {
  res.render('admin/gallery/album-form', { title: 'New Album | Admin', college });
};

exports.createAlbum = async (req, res) => {
  const { title, description } = req.body;
  try {
    await db.query('INSERT INTO gallery_albums (title, description) VALUES (?,?)',
      [title, description || null]);
    res.redirect('/admin/gallery?success=1');
  } catch (e) {
    res.redirect('/admin/gallery/new?error=1');
  }
};

exports.albumUploadForm = async (req, res) => {
  const [[album]] = await db.query('SELECT * FROM gallery_albums WHERE id=?', [req.params.id]);
  if (!album) return res.redirect('/admin/gallery');
  const [photos] = await db.query('SELECT * FROM gallery_photos WHERE album_id=? ORDER BY sort_order ASC, id ASC', [album.id]);
  res.render('admin/gallery/upload', { title: `Upload Photos | Admin`, college, album, photos });
};

exports.uploadPhotos = [
  uploadGallery.array('photos', 30),
  async (req, res) => {
    const albumId = req.params.id;
    try {
      for (const file of req.files || []) {
        await db.query('INSERT INTO gallery_photos (album_id, filename) VALUES (?,?)',
          [albumId, file.filename]);
      }
      res.redirect(`/admin/gallery/${albumId}/upload?success=1`);
    } catch (e) {
      res.redirect(`/admin/gallery/${albumId}/upload?error=1`);
    }
  },
];

exports.deleteAlbum = async (req, res) => {
  await db.query('DELETE FROM gallery_albums WHERE id=?', [req.params.id]);
  res.redirect('/admin/gallery?success=1');
};

exports.movePhoto = async (req, res) => {
  const { direction } = req.body;
  const [[photo]] = await db.query('SELECT * FROM gallery_photos WHERE id=?', [req.params.id]);
  if (!photo) return res.redirect('/admin/gallery');
  const albumId = photo.album_id;
  const [photos] = await db.query(
    'SELECT id, sort_order FROM gallery_photos WHERE album_id=? ORDER BY sort_order ASC, id ASC',
    [albumId]
  );
  for (let i = 0; i < photos.length; i++) {
    await db.query('UPDATE gallery_photos SET sort_order=? WHERE id=?', [i, photos[i].id]);
    photos[i].sort_order = i;
  }
  const idx = photos.findIndex(p => p.id === photo.id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx >= 0 && swapIdx < photos.length) {
    await db.query('UPDATE gallery_photos SET sort_order=? WHERE id=?', [swapIdx, photo.id]);
    await db.query('UPDATE gallery_photos SET sort_order=? WHERE id=?', [idx, photos[swapIdx].id]);
  }
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return res.json({ ok: true });
  res.redirect(`/admin/gallery/${albumId}/upload`);
};

exports.reorderPhotos = async (req, res) => {
  const ids = [].concat(req.body.ids || []);
  for (let i = 0; i < ids.length; i++) {
    await db.query('UPDATE gallery_photos SET sort_order=? WHERE id=? AND album_id=?', [i, ids[i], req.params.id]);
  }
  res.json({ ok: true });
};

exports.deletePhoto = async (req, res) => {
  const [[photo]] = await db.query('SELECT * FROM gallery_photos WHERE id=?', [req.params.id]);
  if (photo) {
    const filePath = path.join(UPLOADS_BASE, 'gallery', photo.filename);
    fs.unlink(filePath, () => {});
    await db.query('DELETE FROM gallery_photos WHERE id=?', [req.params.id]);
    return res.redirect(`/admin/gallery/${photo.album_id}/upload?success=1`);
  }
  res.redirect('/admin/gallery');
};

// ── Question Papers ───────────────────────────────────────────────────────────

exports.papersList = async (req, res) => {
  const [papers] = await db.query('SELECT * FROM question_papers ORDER BY year DESC, subject ASC');
  res.render('admin/papers/list', { title: 'Question Papers | Admin', college, papers });
};

exports.paperForm = (req, res) => {
  res.render('admin/papers/form', { title: 'Upload Paper | Admin', college });
};

exports.uploadPaper = [
  uploadPaper.single('file'),
  async (req, res) => {
    const { title, subject, program, year, exam_type } = req.body;
    if (!req.file) return res.redirect('/admin/question-papers/new?error=nofile');
    try {
      await db.query(
        'INSERT INTO question_papers (title, subject, program, year, exam_type, filename) VALUES (?,?,?,?,?,?)',
        [title, subject, program, year, exam_type || null, req.file.filename]
      );
      res.redirect('/admin/question-papers?success=1');
    } catch (e) {
      res.redirect('/admin/question-papers/new?error=1');
    }
  },
];

exports.deletePaper = async (req, res) => {
  const [[paper]] = await db.query('SELECT * FROM question_papers WHERE id=?', [req.params.id]);
  if (paper) {
    const filePath = path.join(UPLOADS_BASE, 'papers', paper.filename);
    fs.unlink(filePath, () => {});
    await db.query('DELETE FROM question_papers WHERE id=?', [req.params.id]);
  }
  res.redirect('/admin/question-papers?success=1');
};

// ── Exam Results ──────────────────────────────────────────────────────────────

exports.resultsList = async (req, res) => {
  const [results] = await db.query('SELECT * FROM exam_results ORDER BY created_at DESC LIMIT 100');
  res.render('admin/results/list', { title: 'Results | Admin', college, results });
};

exports.resultForm = (req, res) => {
  res.render('admin/results/form', { title: 'Add Result | Admin', college, item: null });
};

exports.createResult = async (req, res) => {
  const { roll_number, name, program, exam_type, year,
          marks_physics, marks_chemistry, marks_maths,
          marks_biology, marks_english, marks_second_lang,
          total_marks, max_marks, grade, published } = req.body;
  try {
    await db.query(
      `INSERT INTO exam_results
         (roll_number, name, program, exam_type, year,
          marks_physics, marks_chemistry, marks_maths,
          marks_biology, marks_english, marks_second_lang,
          total_marks, max_marks, grade, published)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [roll_number, name, program, exam_type, year,
       marks_physics || null, marks_chemistry || null, marks_maths || null,
       marks_biology || null, marks_english || null, marks_second_lang || null,
       total_marks || null, max_marks || null, grade || null,
       published === '1' ? 1 : 0]
    );
    res.redirect('/admin/results?success=1');
  } catch (e) {
    console.error(e);
    res.redirect('/admin/results/new?error=1');
  }
};

exports.editResultForm = async (req, res) => {
  const [[item]] = await db.query('SELECT * FROM exam_results WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/results');
  res.render('admin/results/form', { title: 'Edit Result | Admin', college, item });
};

exports.updateResult = async (req, res) => {
  const { name, marks_physics, marks_chemistry, marks_maths,
          marks_biology, marks_english, marks_second_lang,
          total_marks, max_marks, grade, published } = req.body;
  try {
    await db.query(
      `UPDATE exam_results SET name=?,
         marks_physics=?, marks_chemistry=?, marks_maths=?,
         marks_biology=?, marks_english=?, marks_second_lang=?,
         total_marks=?, max_marks=?, grade=?, published=?
       WHERE id=?`,
      [name, marks_physics || null, marks_chemistry || null, marks_maths || null,
       marks_biology || null, marks_english || null, marks_second_lang || null,
       total_marks || null, max_marks || null, grade || null,
       published === '1' ? 1 : 0, req.params.id]
    );
    res.redirect('/admin/results?success=1');
  } catch (e) {
    res.redirect(`/admin/results/${req.params.id}/edit?error=1`);
  }
};

exports.deleteResult = async (req, res) => {
  await db.query('DELETE FROM exam_results WHERE id=?', [req.params.id]);
  res.redirect('/admin/results?success=1');
};

exports.importResults = (req, res) => {
  res.redirect('/admin/results?error=import-not-implemented');
};

// ── Mandatory Disclosure ──────────────────────────────────────────────────────

exports.disclosureForm = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM settings WHERE `key` LIKE "disclosure_%"');
  const d = {};
  rows.forEach(r => { d[r.key.replace('disclosure_', '')] = r.value; });
  res.render('admin/disclosure', { title: 'Mandatory Disclosure | Admin', college, d });
};

exports.saveDisclosure = async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.query(
        'INSERT INTO settings (`key`, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)',
        [`disclosure_${key}`, value]
      );
    }
    res.redirect('/admin/disclosure?success=1');
  } catch (e) {
    res.redirect('/admin/disclosure?error=1');
  }
};

// ── Users ─────────────────────────────────────────────────────────────────────

exports.usersList = async (req, res) => {
  const [users] = await db.query('SELECT id,name,username,role,created_at FROM admins ORDER BY created_at DESC');
  res.render('admin/users/list', { title: 'Users | Admin', college, users });
};

exports.userForm = (req, res) => {
  res.render('admin/users/form', { title: 'New User | Admin', college, item: null });
};

exports.createUser = async (req, res) => {
  const { name, username, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO admins (name, username, password_hash, role) VALUES (?,?,?,?)',
      [name, username, hash, role || 'editor']);
    res.redirect('/admin/users?success=1');
  } catch (e) {
    res.redirect('/admin/users/new?error=1');
  }
};

exports.editUserForm = async (req, res) => {
  const [[item]] = await db.query('SELECT id,name,username,role FROM admins WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/users');
  res.render('admin/users/form', { title: 'Edit User | Admin', college, item });
};

exports.updateUser = async (req, res) => {
  const { name, username, password, role } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await db.query('UPDATE admins SET name=?,username=?,password_hash=?,role=? WHERE id=?',
        [name, username, hash, role, req.params.id]);
    } else {
      await db.query('UPDATE admins SET name=?,username=?,role=? WHERE id=?',
        [name, username, role, req.params.id]);
    }
    res.redirect('/admin/users?success=1');
  } catch (e) {
    res.redirect(`/admin/users/${req.params.id}/edit?error=1`);
  }
};

exports.deleteUser = async (req, res) => {
  await db.query('DELETE FROM admins WHERE id=? AND id!=?', [req.params.id, req.session.adminId]);
  res.redirect('/admin/users?success=1');
};

// ── Settings ──────────────────────────────────────────────────────────────────

exports.settings = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM settings WHERE `key` NOT LIKE "disclosure_%"');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.render('admin/settings', { title: 'Settings | Admin', college, settings });
};

exports.saveSettings = async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.query(
        'INSERT INTO settings (`key`, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)',
        [key, value]
      );
    }
    res.redirect('/admin/settings?success=1');
  } catch (e) {
    res.redirect('/admin/settings?error=1');
  }
};

// ── Profile ───────────────────────────────────────────────────────────────────

exports.profileForm = async (req, res) => {
  const [[admin]] = await db.query('SELECT id,name,username,avatar FROM admins WHERE id=?', [req.session.adminId]);
  res.render('admin/profile', { title: 'My Profile | Admin', college, admin });
};

exports.saveProfile = [
  uploadAvatar.single('avatar'),
  async (req, res) => {
    const { name } = req.body;
    const avatar = req.file ? `/uploads/avatars/${req.file.filename}` : null;
    try {
      if (avatar) {
        await db.query('UPDATE admins SET name=?,avatar=? WHERE id=?', [name, avatar, req.session.adminId]);
      } else {
        await db.query('UPDATE admins SET name=? WHERE id=?', [name, req.session.adminId]);
      }
      req.session.adminName = name;
      res.redirect('/admin/profile?success=1');
    } catch (e) {
      res.redirect('/admin/profile?error=1');
    }
  },
];

// ── Toppers ───────────────────────────────────────────────────────────────────

const uploadTopper = multer({ storage: diskStorage('toppers'), limits: { fileSize: 4 * 1024 * 1024 } });

exports.toppersList = async (req, res) => {
  const [toppers] = await db.query('SELECT * FROM toppers ORDER BY sort_order ASC, created_at DESC');
  res.render('admin/toppers/list', { title: 'Toppers | Admin', college, toppers });
};

exports.topperForm = (req, res) => {
  res.render('admin/toppers/form', { title: 'New Topper | Admin', college, item: null });
};

exports.createTopper = [
  uploadTopper.single('photo'),
  async (req, res) => {
    const { name, exam, rank_label, score, highlight, year, program, published, sort_order } = req.body;
    const photo = req.file ? `/uploads/toppers/${req.file.filename}` : null;
    try {
      await db.query(
        'INSERT INTO toppers (name, photo, exam, rank_label, score, highlight, year, program, published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [name, photo, exam, rank_label, score || null, highlight || null, year, program, published === '1' ? 1 : 0, sort_order || 0]
      );
      res.redirect('/admin/toppers?success=1');
    } catch (e) {
      console.error(e);
      res.redirect('/admin/toppers/new?error=1');
    }
  },
];

exports.editTopperForm = async (req, res) => {
  const [[item]] = await db.query('SELECT * FROM toppers WHERE id=?', [req.params.id]);
  if (!item) return res.redirect('/admin/toppers');
  res.render('admin/toppers/form', { title: 'Edit Topper | Admin', college, item });
};

exports.updateTopper = [
  uploadTopper.single('photo'),
  async (req, res) => {
    const { name, exam, rank_label, score, highlight, year, program, published, sort_order, remove_photo } = req.body;
    const newPhoto = req.file ? `/uploads/toppers/${req.file.filename}` : null;
    try {
      let photo;
      if (newPhoto) { photo = newPhoto; }
      else if (remove_photo === '1') { photo = null; }
      if (photo !== undefined) {
        await db.query(
          'UPDATE toppers SET name=?,photo=?,exam=?,rank_label=?,score=?,highlight=?,year=?,program=?,published=?,sort_order=? WHERE id=?',
          [name, photo, exam, rank_label, score || null, highlight || null, year, program, published === '1' ? 1 : 0, sort_order || 0, req.params.id]
        );
      } else {
        await db.query(
          'UPDATE toppers SET name=?,exam=?,rank_label=?,score=?,highlight=?,year=?,program=?,published=?,sort_order=? WHERE id=?',
          [name, exam, rank_label, score || null, highlight || null, year, program, published === '1' ? 1 : 0, sort_order || 0, req.params.id]
        );
      }
      res.redirect('/admin/toppers?success=1');
    } catch (e) {
      console.error(e);
      res.redirect(`/admin/toppers/${req.params.id}/edit?error=1`);
    }
  },
];

exports.deleteTopper = async (req, res) => {
  await db.query('DELETE FROM toppers WHERE id=?', [req.params.id]);
  res.redirect('/admin/toppers?success=1');
};

// ── Contact Enquiries ────────────────────────────────────────────────────────

exports.enquiriesList = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM contact_enquiries ORDER BY created_at DESC');
  await db.query('UPDATE contact_enquiries SET seen=1 WHERE seen=0');
  res.render('admin/contact/list', { title: 'Contact Enquiries', enquiries: rows });
};

exports.deleteEnquiry = async (req, res) => {
  await db.query('DELETE FROM contact_enquiries WHERE id=?', [req.params.id]);
  res.redirect('/admin/enquiries?success=1');
};
