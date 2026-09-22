const pool    = require('../config/database');
const crypto  = require('crypto');
const college = require('../config/college');

const SECTIONS_MPC  = ['math', 'physics', 'chemistry'];
const SECTIONS_BIPC = ['biology', 'physics', 'chemistry'];
const SEC_LABELS    = { math: 'Mathematics', physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology' };

function token() { return crypto.randomBytes(32).toString('hex'); }

async function loadSession(tok) {
  if (!tok) return null;
  const [rows] = await pool.query(
    `SELECT tse.*, ts.name as set_name, ts.timer_enabled, ts.duration_mins,
            st.name as student_name, st.phone, st.school, st.program as student_program
     FROM test_sessions_exam tse
     JOIN test_sets ts ON ts.id = tse.set_id
     JOIN test_students st ON st.id = tse.student_id
     WHERE tse.token = ?`, [tok]
  );
  return rows[0] || null;
}

async function expireIfOverdue(sess) {
  if (sess?.status === 'in_progress' && new Date() > new Date(sess.expires_at)) {
    await pool.query(`UPDATE test_sessions_exam SET status='expired' WHERE id=?`, [sess.id]);
    sess.status = 'expired';
  }
  return sess;
}

async function drawQuestions(setId, program) {
  const [rules] = await pool.query(
    `SELECT * FROM test_set_rules WHERE set_id=? ORDER BY section`, [setId]
  );
  const drawn = [];
  for (const rule of rules) {
    const total  = rule.total_qs;
    const hard   = Math.floor(total * rule.hard_pct / 100);
    const medium = Math.floor(total * rule.medium_pct / 100);
    const easy   = total - hard - medium;
    let order = 1;
    for (const [diff, cnt] of [['hard', hard], ['medium', medium], ['easy', easy]]) {
      if (cnt <= 0) continue;
      const [qs] = await pool.query(
        `SELECT id FROM test_questions
         WHERE section=? AND difficulty=? AND active=1 AND (program=? OR program='both')
         ORDER BY RAND() LIMIT ?`,
        [rule.section, diff, program, cnt]
      );
      for (const q of qs) drawn.push({ question_id: q.id, section: rule.section, q_order: order++ });
    }
  }
  return drawn;
}

// GET /test/register
exports.registerPage = (req, res) => {
  if (req.session.test_token) return res.redirect('/test');
  res.render('test/register', { title: 'Register | Scholarship Test', college, errors: null, old: {} });
};

// POST /test/register
exports.registerSubmit = async (req, res) => {
  const { name, phone, email, school, program } = req.body;
  const errors = [];
  if (!name?.trim())                                        errors.push('Full name is required');
  if (!phone?.trim() || !/^[6-9]\d{9}$/.test(phone.trim())) errors.push('Valid 10-digit mobile number required');
  if (!school?.trim())                                       errors.push('School / college name is required');
  if (!['MPC','BiPC'].includes(program))                     errors.push('Select a valid program');

  if (errors.length) {
    return res.render('test/register', { title: 'Register | Scholarship Test', college, errors, old: req.body });
  }

  // Check phone already exists
  const [existing] = await pool.query(
    `SELECT tse.token, tse.status
     FROM test_students st
     JOIN test_sessions_exam tse ON tse.student_id = st.id
     WHERE st.phone = ?
     ORDER BY tse.id DESC LIMIT 1`, [phone.trim()]
  );
  if (existing.length) {
    req.session.test_token = existing[0].token;
    return res.redirect(existing[0].status === 'submitted' ? '/test/results' : '/test');
  }

  // Find active set with fewest sessions (load balance)
  const [sets] = await pool.query(
    `SELECT ts.id, ts.name, ts.timer_enabled, ts.duration_mins,
            COUNT(tse.id) as cnt
     FROM test_sets ts
     LEFT JOIN test_sessions_exam tse ON tse.set_id = ts.id
     WHERE ts.program=? AND ts.active=1
     GROUP BY ts.id
     ORDER BY cnt ASC, ts.name ASC
     LIMIT 1`, [program]
  );
  if (!sets.length) {
    return res.render('test/register', { title: 'Register | Scholarship Test', college,
      errors: ['No active test sets available for your program. Please contact the college.'], old: req.body });
  }

  const set   = sets[0];
  const drawn = await drawQuestions(set.id, program);
  if (!drawn.length) {
    return res.render('test/register', { title: 'Register | Scholarship Test', college,
      errors: ['Not enough questions in the question bank yet. Please contact the college.'], old: req.body });
  }

  const [stResult] = await pool.query(
    `INSERT INTO test_students (name, phone, email, school, program) VALUES (?,?,?,?,?)`,
    [name.trim(), phone.trim(), email?.trim() || null, school.trim(), program]
  );
  const studentId = stResult.insertId;

  const tok = token();
  const expiresAt = new Date(Date.now() + set.duration_mins * 60 * 1000);
  const [sessResult] = await pool.query(
    `INSERT INTO test_sessions_exam (student_id, set_id, token, expires_at) VALUES (?,?,?,?)`,
    [studentId, set.id, tok, expiresAt]
  );
  const sessionId = sessResult.insertId;

  await pool.query(
    `INSERT INTO test_session_questions (session_id, question_id, section, q_order) VALUES ?`,
    [drawn.map(d => [sessionId, d.question_id, d.section, d.q_order])]
  );

  req.session.test_token = tok;
  res.redirect('/test');
};

// GET /test
exports.testPage = async (req, res) => {
  const tok = req.session.test_token;
  if (!tok) return res.redirect('/test/register');

  let sess = await loadSession(tok);
  if (!sess) { delete req.session.test_token; return res.redirect('/test/register'); }
  sess = await expireIfOverdue(sess);

  if (sess.status === 'submitted') return res.redirect('/test/results');
  if (sess.status === 'expired')   return res.redirect('/test/results');

  const [questions] = await pool.query(
    `SELECT tsq.section, tsq.q_order, tq.id, tq.question,
            tq.option_a, tq.option_b, tq.option_c, tq.option_d,
            ta.answer as saved_answer
     FROM test_session_questions tsq
     JOIN test_questions tq ON tq.id = tsq.question_id
     LEFT JOIN test_answers ta ON ta.session_id = tsq.session_id AND ta.question_id = tsq.question_id
     WHERE tsq.session_id = ?
     ORDER BY tsq.section, tsq.q_order`, [sess.id]
  );

  const sections = {};
  for (const q of questions) {
    if (!sections[q.section]) sections[q.section] = [];
    sections[q.section].push(q);
  }

  const sectionOrder = sess.student_program === 'MPC' ? SECTIONS_MPC : SECTIONS_BIPC;

  res.render('test/test', {
    title: 'Scholarship Test | Greenvaley',
    college, sess, sections, sectionOrder, SEC_LABELS,
    expiresAt: new Date(sess.expires_at).getTime()
  });
};

// POST /test/answer  (AJAX — no page reload)
exports.saveAnswer = async (req, res) => {
  const tok = req.session.test_token;
  if (!tok) return res.status(401).json({ ok: false, error: 'session_lost' });

  const { question_id, answer } = req.body;
  if (!question_id || !['A','B','C','D'].includes(answer))
    return res.status(400).json({ ok: false });

  const [rows] = await pool.query(
    `SELECT id, status, expires_at FROM test_sessions_exam WHERE token=?`, [tok]
  );
  const sess = rows[0];
  if (!sess || sess.status !== 'in_progress')
    return res.status(403).json({ ok: false, error: 'session_not_active' });
  if (new Date() > new Date(sess.expires_at)) {
    await pool.query(`UPDATE test_sessions_exam SET status='expired' WHERE id=?`, [sess.id]);
    return res.status(403).json({ ok: false, error: 'time_expired' });
  }

  const [qCheck] = await pool.query(
    `SELECT id FROM test_session_questions WHERE session_id=? AND question_id=?`,
    [sess.id, question_id]
  );
  if (!qCheck.length) return res.status(400).json({ ok: false });

  await pool.query(
    `INSERT INTO test_answers (session_id, question_id, answer) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE answer=VALUES(answer), saved_at=NOW()`,
    [sess.id, question_id, answer]
  );

  res.json({ ok: true });
};

// POST /test/submit
exports.submitTest = async (req, res) => {
  const tok = req.session.test_token;
  if (!tok) return res.redirect('/test/register');

  let sess = await loadSession(tok);
  if (!sess) return res.redirect('/test/register');
  if (sess.status === 'submitted') return res.redirect('/test/results');

  const [sqRows] = await pool.query(
    `SELECT tsq.section, tsq.question_id, tq.correct, ta.answer as student_answer
     FROM test_session_questions tsq
     JOIN test_questions tq ON tq.id = tsq.question_id
     LEFT JOIN test_answers ta ON ta.session_id=tsq.session_id AND ta.question_id=tsq.question_id
     WHERE tsq.session_id=?`, [sess.id]
  );

  const sectionOrder = sess.student_program === 'MPC' ? SECTIONS_MPC : SECTIONS_BIPC;
  const scores = {};
  for (const sec of sectionOrder) scores[sec] = 0;
  for (const row of sqRows) {
    if (row.student_answer === row.correct) scores[row.section] = (scores[row.section] || 0) + 1;
  }
  const [s1, s2, s3] = sectionOrder.map(s => scores[s] || 0);
  const total = s1 + s2 + s3;

  await pool.query(
    `UPDATE test_sessions_exam
     SET status='submitted', submitted_at=NOW(), sec1_score=?, sec2_score=?, sec3_score=?, total_score=?
     WHERE id=?`,
    [s1, s2, s3, total, sess.id]
  );

  res.redirect('/test/results');
};

// GET /test/results
exports.resultsPage = async (req, res) => {
  const tok = req.session.test_token;
  if (!tok) return res.redirect('/test/register');

  const [rows] = await pool.query(
    `SELECT tse.*, ts.name as set_name, ts.timer_enabled, ts.duration_mins,
            st.name as student_name, st.phone, st.school, st.program as student_program,
            TIMESTAMPDIFF(MINUTE, tse.start_time, COALESCE(tse.submitted_at, NOW())) as mins_taken
     FROM test_sessions_exam tse
     JOIN test_sets ts ON ts.id = tse.set_id
     JOIN test_students st ON st.id = tse.student_id
     WHERE tse.token=?`, [tok]
  );

  const sess = rows[0];
  if (!sess) return res.redirect('/test/register');
  if (sess.status === 'in_progress') return res.redirect('/test');

  const sectionOrder = sess.student_program === 'MPC' ? SECTIONS_MPC : SECTIONS_BIPC;

  res.render('test/results', { title: 'Your Results | Greenvaley', college, sess, sectionOrder, SEC_LABELS });
};

// GET /test/recover
exports.recoverPage = (req, res) => {
  res.render('test/recover', { title: 'Resume Test | Greenvaley', college, error: null });
};

// POST /test/recover
exports.recoverSubmit = async (req, res) => {
  const { phone } = req.body;
  if (!phone?.trim()) {
    return res.render('test/recover', { title: 'Resume Test | Greenvaley', college, error: 'Enter your registered phone number.' });
  }
  const [rows] = await pool.query(
    `SELECT tse.token, tse.status
     FROM test_students st
     JOIN test_sessions_exam tse ON tse.student_id = st.id
     WHERE st.phone=?
     ORDER BY tse.id DESC LIMIT 1`, [phone.trim()]
  );
  if (!rows.length) {
    return res.render('test/recover', { title: 'Resume Test | Greenvaley', college, error: 'No registration found for this phone number.' });
  }
  req.session.test_token = rows[0].token;
  res.redirect(rows[0].status === 'submitted' ? '/test/results' : '/test');
};
