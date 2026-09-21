const db      = require('../config/database');
const college = require('../config/college');
const { sendMail } = require('../config/mailer');

const V = {
  render: (res, view, data = {}) => res.render(view, { college, ...data }),
};

exports.home = async (req, res) => {
  try {
    const [[news], [events], [papers], [toppers], [topperYears]] = await Promise.all([
      db.query('SELECT * FROM news WHERE published=1 ORDER BY created_at DESC LIMIT 4'),
      db.query('SELECT * FROM events ORDER BY event_date ASC LIMIT 3'),
      db.query('SELECT * FROM question_papers ORDER BY created_at DESC LIMIT 3'),
      db.query('SELECT * FROM toppers WHERE published=1 ORDER BY year DESC, sort_order ASC, created_at DESC LIMIT 60'),
      db.query('SELECT DISTINCT year FROM toppers WHERE published=1 ORDER BY year DESC'),
    ]);
    V.render(res, 'main/home', { title: college.name, news, events, papers, toppers, topperYears });
  } catch (e) {
    console.error(e);
    V.render(res, 'main/home', { title: college.name, news: [], events: [], papers: [], toppers: [], topperYears: [] });
  }
};

exports.about = (req, res) => {
  V.render(res, 'main/about', { title: `About | ${college.shortName}` });
};

exports.programs = (req, res) => {
  V.render(res, 'main/programs', { title: `Programs | ${college.shortName}` });
};

exports.admissions = (req, res) => {
  V.render(res, 'main/admissions', { title: `Admissions | ${college.shortName}` });
};

exports.faculty = async (req, res) => {
  try {
    const [faculty] = await db.query('SELECT * FROM faculty ORDER BY sort_order ASC, name ASC');
    V.render(res, 'main/faculty', { title: `Faculty | ${college.shortName}`, faculty });
  } catch (e) {
    V.render(res, 'main/faculty', { title: `Faculty | ${college.shortName}`, faculty: [] });
  }
};

exports.gallery = async (req, res) => {
  try {
    const [albums] = await db.query(
      `SELECT a.*, COUNT(p.id) AS photo_count
       FROM gallery_albums a LEFT JOIN gallery_photos p ON p.album_id=a.id
       GROUP BY a.id ORDER BY a.created_at DESC`
    );
    V.render(res, 'main/gallery', { title: `Gallery | ${college.shortName}`, albums });
  } catch (e) {
    V.render(res, 'main/gallery', { title: `Gallery | ${college.shortName}`, albums: [] });
  }
};

exports.events = async (req, res) => {
  try {
    const [events] = await db.query('SELECT * FROM events ORDER BY event_date DESC');
    V.render(res, 'main/events', { title: `Events | ${college.shortName}`, events });
  } catch (e) {
    V.render(res, 'main/events', { title: `Events | ${college.shortName}`, events: [] });
  }
};

exports.news = async (req, res) => {
  try {
    const [news] = await db.query('SELECT * FROM news WHERE published=1 ORDER BY created_at DESC');
    V.render(res, 'main/news', { title: `News | ${college.shortName}`, news });
  } catch (e) {
    V.render(res, 'main/news', { title: `News | ${college.shortName}`, news: [] });
  }
};

exports.newsArticle = async (req, res) => {
  try {
    const [[article]] = await db.query('SELECT * FROM news WHERE slug=? AND published=1', [req.params.slug]);
    if (!article) return res.status(404).render('404', { title: '404 | Greenvaley' });
    V.render(res, 'main/news-article', { title: `${article.title} | ${college.shortName}`, article });
  } catch (e) {
    res.status(500).render('500', { title: '500 | Greenvaley' });
  }
};

exports.scholarshipTerms = (req, res) => {
  V.render(res, 'main/scholarship-terms', { title: `Scholarship Terms | ${college.shortName}` });
};

exports.achievements = async (req, res) => {
  try {
    const exam = req.query.exam || '';
    const year = req.query.year || '';
    let sql = 'SELECT * FROM toppers WHERE published=1';
    const params = [];
    if (exam) { sql += ' AND exam=?'; params.push(exam); }
    if (year) { sql += ' AND year=?'; params.push(year); }
    sql += ' ORDER BY sort_order ASC, created_at DESC';
    const [toppers] = await db.query(sql, params);
    const [years] = await db.query('SELECT DISTINCT year FROM toppers WHERE published=1 ORDER BY year DESC');
    V.render(res, 'main/achievements', {
      title: `Student Achievements | ${college.shortName}`,
      toppers, years, activeExam: exam, activeYear: year,
    });
  } catch (e) {
    console.error(e);
    V.render(res, 'main/achievements', {
      title: `Student Achievements | ${college.shortName}`,
      toppers: [], years: [], activeExam: '', activeYear: '',
    });
  }
};

exports.contact = (req, res) => {
  V.render(res, 'main/contact', { title: `Contact | ${college.shortName}` });
};

exports.contactSubmit = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  try {
    await db.query(
      'INSERT INTO contact_enquiries (name, email, phone, subject, message) VALUES (?,?,?,?,?)',
      [name, email, phone || null, subject || null, message]
    );
    await sendMail({
      to: college.email,
      subject: `Contact enquiry from ${name}`,
      html: `<p><b>Name:</b> ${name}<br><b>Email:</b> ${email}<br><b>Phone:</b> ${phone || '-'}</p><p>${message}</p>`,
    }).catch(() => {});
    res.redirect('/contact?success=1');
  } catch (e) {
    console.error(e);
    res.redirect('/contact?error=1');
  }
};

exports.mandatoryDisclosure = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM settings WHERE `key` LIKE "disclosure_%"');
    const disclosure = {};
    rows.forEach(r => { disclosure[r.key.replace('disclosure_', '')] = r.value; });
    V.render(res, 'main/mandatory-disclosure', {
      title: `Mandatory Disclosure | ${college.shortName}`,
      disclosure,
    });
  } catch (e) {
    V.render(res, 'main/mandatory-disclosure', {
      title: `Mandatory Disclosure | ${college.shortName}`,
      disclosure: {},
    });
  }
};

exports.resultsPage = (req, res) => {
  V.render(res, 'main/results', { title: `Results | ${college.shortName}`, result: null, searched: false });
};

exports.checkResult = async (req, res) => {
  const { roll_number, exam_type } = req.body;
  try {
    const [[result]] = await db.query(
      'SELECT * FROM exam_results WHERE roll_number=? AND exam_type=? AND published=1',
      [roll_number?.trim(), exam_type]
    );
    V.render(res, 'main/results', {
      title:  `Results | ${college.shortName}`,
      result: result || null,
      searched: true,
      roll_number,
      exam_type,
    });
  } catch (e) {
    V.render(res, 'main/results', { title: `Results | ${college.shortName}`, result: null, searched: true, error: 'Server error' });
  }
};

exports.questionPapers = async (req, res) => {
  const { program, subject, year } = req.query;
  try {
    let q = 'SELECT * FROM question_papers WHERE 1=1';
    const params = [];
    if (program) { q += ' AND program=?'; params.push(program); }
    if (subject) { q += ' AND subject=?'; params.push(subject); }
    if (year)    { q += ' AND year=?';    params.push(year); }
    q += ' ORDER BY year DESC, subject ASC';
    const [papers] = await db.query(q, params);
    V.render(res, 'main/question-papers', {
      title: `Question Papers | ${college.shortName}`,
      papers, program, subject, year,
    });
  } catch (e) {
    V.render(res, 'main/question-papers', { title: `Question Papers | ${college.shortName}`, papers: [], program: program || null, subject: subject || null, year: year || null });
  }
};

exports.sitemap = async (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const staticRoutes = ['', '/about', '/programs', '/admissions', '/faculty',
    '/gallery', '/events', '/news', '/contact', '/results', '/question-papers',
    '/scholarship', '/mandatory-disclosure'];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes.map(r => `  <url><loc>${base}${r}</loc></url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
};

exports.robots = (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n');
};
