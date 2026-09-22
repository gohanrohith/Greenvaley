const pool = require('../config/database');

// ── Dashboard ───────────────────────────────────────────────────────────────
exports.dashboard = async (req, res) => {
  const [[stats]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM test_questions WHERE active=1)            AS questions,
      (SELECT COUNT(*) FROM test_sets WHERE active=1)                 AS sets,
      (SELECT COUNT(*) FROM test_students)                            AS registered,
      (SELECT COUNT(*) FROM test_sessions_exam WHERE status='in_progress') AS active_sessions,
      (SELECT COUNT(*) FROM test_sessions_exam WHERE status='submitted')   AS submitted
  `);

  const [recent] = await pool.query(`
    SELECT st.name, st.phone, st.program, ts.name AS set_name,
           tse.sec1_score, tse.sec2_score, tse.sec3_score, tse.total_score, tse.submitted_at
    FROM test_sessions_exam tse
    JOIN test_students st ON st.id = tse.student_id
    JOIN test_sets ts ON ts.id = tse.set_id
    WHERE tse.status='submitted'
    ORDER BY tse.submitted_at DESC LIMIT 10
  `);

  res.render('admin/test/dashboard', { title: 'Test Dashboard | Admin', stats, recent });
};

// ── Question Bank ───────────────────────────────────────────────────────────
exports.questionsList = async (req, res) => {
  const { section, difficulty, program } = req.query;
  let where = '1=1'; const params = [];
  if (section)    { where += ' AND section=?';                         params.push(section); }
  if (difficulty) { where += ' AND difficulty=?';                      params.push(difficulty); }
  if (program)    { where += ' AND (program=? OR program="both")';     params.push(program); }

  const [questions] = await pool.query(
    `SELECT * FROM test_questions WHERE ${where} ORDER BY section, difficulty, id DESC`, params
  );

  // Pool counts per section+difficulty for warnings
  const [counts] = await pool.query(
    `SELECT section, difficulty, COUNT(*) AS cnt FROM test_questions WHERE active=1 GROUP BY section, difficulty`
  );

  res.render('admin/test/questions', { title: 'Question Bank | Admin', questions, counts, q: req.query });
};

exports.questionForm = (req, res) => {
  res.render('admin/test/question-form', { title: 'Add Question | Admin', question: null, errors: null });
};

exports.createQuestion = async (req, res) => {
  const { program, section, difficulty, question, option_a, option_b, option_c, option_d, correct } = req.body;
  const errors = [];
  if (!program)              errors.push('Program is required');
  if (!section)              errors.push('Section is required');
  if (!difficulty)           errors.push('Difficulty is required');
  if (!question?.trim())     errors.push('Question text is required');
  if (!option_a?.trim() || !option_b?.trim() || !option_c?.trim() || !option_d?.trim())
                             errors.push('All 4 options are required');
  if (!['A','B','C','D'].includes(correct)) errors.push('Correct answer must be A, B, C, or D');

  if (errors.length)
    return res.render('admin/test/question-form', { title: 'Add Question | Admin', question: req.body, errors });

  await pool.query(
    `INSERT INTO test_questions (program, section, difficulty, question, option_a, option_b, option_c, option_d, correct)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [program, section, difficulty, question.trim(), option_a.trim(), option_b.trim(), option_c.trim(), option_d.trim(), correct]
  );

  res.redirect('/admin/test/questions?success=1');
};

exports.editQuestionForm = async (req, res) => {
  const [[question]] = await pool.query(`SELECT * FROM test_questions WHERE id=?`, [req.params.id]);
  if (!question) return res.redirect('/admin/test/questions');
  res.render('admin/test/question-form', { title: 'Edit Question | Admin', question, errors: null });
};

exports.updateQuestion = async (req, res) => {
  const { program, section, difficulty, question, option_a, option_b, option_c, option_d, correct, active } = req.body;
  await pool.query(
    `UPDATE test_questions
     SET program=?, section=?, difficulty=?, question=?,
         option_a=?, option_b=?, option_c=?, option_d=?, correct=?, active=?
     WHERE id=?`,
    [program, section, difficulty, question?.trim(),
     option_a?.trim(), option_b?.trim(), option_c?.trim(), option_d?.trim(),
     correct, active ? 1 : 0, req.params.id]
  );
  res.redirect('/admin/test/questions?success=1');
};

exports.deleteQuestion = async (req, res) => {
  await pool.query(`DELETE FROM test_questions WHERE id=?`, [req.params.id]);
  res.redirect('/admin/test/questions?success=1');
};

// ── Sets ────────────────────────────────────────────────────────────────────
exports.setsList = async (req, res) => {
  const [sets] = await pool.query(`
    SELECT ts.*, COUNT(tse.id) AS session_count
    FROM test_sets ts
    LEFT JOIN test_sessions_exam tse ON tse.set_id = ts.id
    GROUP BY ts.id
    ORDER BY ts.program, ts.name
  `);

  // Attach rules
  const [rules] = await pool.query(`SELECT * FROM test_set_rules ORDER BY set_id, section`);
  const ruleMap = {};
  for (const r of rules) {
    if (!ruleMap[r.set_id]) ruleMap[r.set_id] = [];
    ruleMap[r.set_id].push(r);
  }
  for (const s of sets) s.rules = ruleMap[s.id] || [];

  res.render('admin/test/sets', { title: 'Test Sets | Admin', sets });
};

exports.setForm = (req, res) => {
  res.render('admin/test/set-form', { title: 'Create Set | Admin', set: null, rules: [], errors: null });
};

exports.createSet = async (req, res) => {
  const { name, program, timer_enabled, duration_mins } = req.body;
  const sections  = [].concat(req.body.rule_section  || []);
  const hardPcts  = [].concat(req.body.hard_pct      || []);
  const medPcts   = [].concat(req.body.medium_pct    || []);
  const easyPcts  = [].concat(req.body.easy_pct      || []);
  const totalQs   = [].concat(req.body.total_qs      || []);
  const errors    = [];

  if (!name?.trim())                    errors.push('Set name is required');
  if (!['MPC','BiPC'].includes(program)) errors.push('Program is required');
  if (!sections.length)                 errors.push('Add at least one section rule');
  sections.forEach((sec, i) => {
    const sum = parseInt(hardPcts[i]||0) + parseInt(medPcts[i]||0) + parseInt(easyPcts[i]||0);
    if (sum !== 100) errors.push(`${sec}: Hard + Medium + Easy must total 100% (got ${sum}%)`);
  });

  if (errors.length) {
    return res.render('admin/test/set-form', { title: 'Create Set | Admin', set: req.body,
      rules: sections.map((s,i) => ({ section:s, hard_pct:hardPcts[i], medium_pct:medPcts[i], easy_pct:easyPcts[i], total_qs:totalQs[i] })),
      errors });
  }

  const [sr] = await pool.query(
    `INSERT INTO test_sets (name, program, timer_enabled, duration_mins) VALUES (?,?,?,?)`,
    [name.trim().toUpperCase(), program, timer_enabled ? 1 : 0, parseInt(duration_mins)||60]
  );
  const setId = sr.insertId;

  for (let i = 0; i < sections.length; i++) {
    await pool.query(
      `INSERT INTO test_set_rules (set_id, section, total_qs, hard_pct, medium_pct, easy_pct) VALUES (?,?,?,?,?,?)`,
      [setId, sections[i], parseInt(totalQs[i])||15, parseInt(hardPcts[i]), parseInt(medPcts[i]), parseInt(easyPcts[i])]
    );
  }

  res.redirect('/admin/test/sets?success=1');
};

exports.editSetForm = async (req, res) => {
  const [[set]] = await pool.query(`SELECT * FROM test_sets WHERE id=?`, [req.params.id]);
  if (!set) return res.redirect('/admin/test/sets');
  const [rules] = await pool.query(`SELECT * FROM test_set_rules WHERE set_id=? ORDER BY section`, [req.params.id]);
  res.render('admin/test/set-form', { title: 'Edit Set | Admin', set, rules, errors: null });
};

exports.updateSet = async (req, res) => {
  const { name, program, timer_enabled, duration_mins, active } = req.body;
  const sections = [].concat(req.body.rule_section  || []);
  const hardPcts = [].concat(req.body.hard_pct      || []);
  const medPcts  = [].concat(req.body.medium_pct    || []);
  const easyPcts = [].concat(req.body.easy_pct      || []);
  const totalQs  = [].concat(req.body.total_qs      || []);

  await pool.query(
    `UPDATE test_sets SET name=?, program=?, timer_enabled=?, duration_mins=?, active=? WHERE id=?`,
    [name?.trim().toUpperCase(), program, timer_enabled ? 1 : 0, parseInt(duration_mins)||60, active ? 1 : 0, req.params.id]
  );

  await pool.query(`DELETE FROM test_set_rules WHERE set_id=?`, [req.params.id]);
  for (let i = 0; i < sections.length; i++) {
    await pool.query(
      `INSERT INTO test_set_rules (set_id, section, total_qs, hard_pct, medium_pct, easy_pct) VALUES (?,?,?,?,?,?)`,
      [req.params.id, sections[i], parseInt(totalQs[i])||15, parseInt(hardPcts[i]), parseInt(medPcts[i]), parseInt(easyPcts[i])]
    );
  }

  res.redirect('/admin/test/sets?success=1');
};

exports.toggleSet = async (req, res) => {
  await pool.query(`UPDATE test_sets SET active = NOT active WHERE id=?`, [req.params.id]);
  res.redirect('/admin/test/sets');
};

exports.deleteSet = async (req, res) => {
  await pool.query(`DELETE FROM test_sets WHERE id=?`, [req.params.id]);
  res.redirect('/admin/test/sets?success=1');
};

// ── Results ─────────────────────────────────────────────────────────────────
exports.resultsList = async (req, res) => {
  const { program, set_name, date } = req.query;
  let where = 'tse.status="submitted"'; const params = [];
  if (program)  { where += ' AND st.program=?';             params.push(program); }
  if (set_name) { where += ' AND ts.name=?';                params.push(set_name); }
  if (date)     { where += ' AND DATE(tse.submitted_at)=?'; params.push(date); }

  const [results] = await pool.query(`
    SELECT st.name, st.phone, st.email, st.school, st.program,
           ts.name AS set_name,
           tse.sec1_score, tse.sec2_score, tse.sec3_score, tse.total_score,
           tse.start_time, tse.submitted_at,
           TIMESTAMPDIFF(MINUTE, tse.start_time, tse.submitted_at) AS mins_taken
    FROM test_sessions_exam tse
    JOIN test_students st ON st.id = tse.student_id
    JOIN test_sets ts ON ts.id = tse.set_id
    WHERE ${where}
    ORDER BY tse.total_score DESC, tse.submitted_at DESC
  `, params);

  const [setNames] = await pool.query(`SELECT DISTINCT name FROM test_sets ORDER BY name`);

  res.render('admin/test/results', { title: 'Test Results | Admin', results, setNames, q: req.query });
};

exports.exportCsv = async (req, res) => {
  const [results] = await pool.query(`
    SELECT st.name, st.phone, st.email, st.school, st.program, ts.name AS set_name,
           tse.sec1_score, tse.sec2_score, tse.sec3_score, tse.total_score,
           tse.start_time, tse.submitted_at,
           TIMESTAMPDIFF(MINUTE, tse.start_time, tse.submitted_at) AS mins_taken
    FROM test_sessions_exam tse
    JOIN test_students st ON st.id = tse.student_id
    JOIN test_sets ts ON ts.id = tse.set_id
    WHERE tse.status='submitted'
    ORDER BY tse.total_score DESC
  `);

  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = 'Name,Phone,Email,School,Program,Set,Sec1,Sec2,Sec3,Total,Start,Submitted,Minutes\n';
  const rows = results.map(r =>
    [r.name,r.phone,r.email,r.school,r.program,r.set_name,
     r.sec1_score,r.sec2_score,r.sec3_score,r.total_score,
     r.start_time,r.submitted_at,r.mins_taken].map(esc).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="test-results-${Date.now()}.csv"`);
  res.send(header + rows);
};

// ── Live Sessions ────────────────────────────────────────────────────────────
exports.liveSessions = async (req, res) => {
  const [sessions] = await pool.query(`
    SELECT st.name, st.phone, st.program, ts.name AS set_name,
           tse.start_time, tse.expires_at,
           (SELECT COUNT(*) FROM test_answers ta WHERE ta.session_id = tse.id) AS answers_saved
    FROM test_sessions_exam tse
    JOIN test_students st ON st.id = tse.student_id
    JOIN test_sets ts ON ts.id = tse.set_id
    WHERE tse.status='in_progress'
    ORDER BY tse.start_time DESC
  `);
  res.render('admin/test/live', { title: 'Live Sessions | Admin', sessions });
};
