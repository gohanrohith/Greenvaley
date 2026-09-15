const db      = require('../config/database');
const college = require('../config/college');
const { sendMail } = require('../config/mailer');

// ── Public portal ─────────────────────────────────────────────────────────────

exports.portal = (req, res) => {
  res.render('main/scholarship', {
    college,
    title: `Scholarship Portal | ${college.shortName}`,
  });
};

exports.applyForm = (req, res) => {
  res.render('main/scholarship-apply', {
    college,
    title: `Apply for Scholarship | ${college.shortName}`,
  });
};

exports.applySubmit = async (req, res) => {
  const { name, dob, program, roll_number, father_name, mother_name,
          phone, email, address, annual_income, caste_category, bank_account,
          bank_ifsc, bank_name } = req.body;
  try {
    const [r] = await db.query(
      `INSERT INTO scholarship_applications
         (name, dob, program, roll_number, father_name, mother_name,
          phone, email, address, annual_income, caste_category,
          bank_account, bank_ifsc, bank_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, dob, program, roll_number || null, father_name, mother_name,
       phone, email || null, address, annual_income || null, caste_category || null,
       bank_account || null, bank_ifsc || null, bank_name || null]
    );
    const appId = r.insertId;
    await sendMail({
      to: college.email,
      subject: `New scholarship application — ${name} (${program})`,
      html: `<p><b>ID:</b> ${appId}<br><b>Name:</b> ${name}<br><b>Program:</b> ${program}<br><b>Phone:</b> ${phone}</p>`,
    }).catch(() => {});
    res.redirect(`/scholarship/status?app_id=${appId}&applied=1`);
  } catch (e) {
    console.error(e);
    res.redirect('/scholarship/apply?error=1');
  }
};

exports.statusForm = (req, res) => {
  res.render('main/scholarship-status', {
    college,
    title: `Check Scholarship Status | ${college.shortName}`,
    application: null,
    searched: false,
    app_id: req.query.app_id || '',
    applied: req.query.applied || null,
  });
};

exports.checkStatus = async (req, res) => {
  const { app_id, phone } = req.body;
  try {
    const [[application]] = await db.query(
      'SELECT * FROM scholarship_applications WHERE id=? AND phone=?',
      [app_id, phone]
    );
    res.render('main/scholarship-status', {
      college,
      title: `Check Scholarship Status | ${college.shortName}`,
      application: application || null,
      searched: true,
      app_id,
      applied: null,
    });
  } catch (e) {
    res.render('main/scholarship-status', {
      college,
      title: `Check Scholarship Status | ${college.shortName}`,
      application: null,
      searched: true,
      app_id,
      applied: null,
      error: 'Server error',
    });
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

exports.adminList = async (req, res) => {
  const { status, program } = req.query;
  try {
    let q = 'SELECT * FROM scholarship_applications WHERE 1=1';
    const params = [];
    if (status)  { q += ' AND status=?';  params.push(status); }
    if (program) { q += ' AND program=?'; params.push(program); }
    q += ' ORDER BY created_at DESC';
    const [applications] = await db.query(q, params);
    res.render('admin/scholarship/list', {
      college,
      title: 'Scholarship Applications | Admin',
      applications, status, program,
    });
  } catch (e) {
    console.error(e);
    res.redirect('/admin?error=1');
  }
};

exports.adminView = async (req, res) => {
  try {
    const [[application]] = await db.query(
      'SELECT * FROM scholarship_applications WHERE id=?', [req.params.id]
    );
    if (!application) return res.redirect('/admin/scholarship');
    res.render('admin/scholarship/view', {
      college,
      title: `Application #${application.id} | Admin`,
      application,
    });
  } catch (e) {
    res.redirect('/admin/scholarship');
  }
};

exports.updateStatus = async (req, res) => {
  const { status, remarks } = req.body;
  try {
    await db.query(
      'UPDATE scholarship_applications SET status=?, admin_remarks=? WHERE id=?',
      [status, remarks || null, req.params.id]
    );
    res.redirect(`/admin/scholarship/${req.params.id}?success=1`);
  } catch (e) {
    res.redirect(`/admin/scholarship/${req.params.id}?error=1`);
  }
};

exports.saveResult = async (req, res) => {
  const { scholarship_type, amount, disbursement_date, result_remarks } = req.body;
  try {
    await db.query(
      `INSERT INTO scholarship_results (application_id, scholarship_type, amount, disbursement_date, remarks)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE scholarship_type=VALUES(scholarship_type),
         amount=VALUES(amount), disbursement_date=VALUES(disbursement_date), remarks=VALUES(remarks)`,
      [req.params.id, scholarship_type, amount || null, disbursement_date || null, result_remarks || null]
    );
    await db.query(
      'UPDATE scholarship_applications SET status="sanctioned" WHERE id=?',
      [req.params.id]
    );
    res.redirect(`/admin/scholarship/${req.params.id}?success=1`);
  } catch (e) {
    res.redirect(`/admin/scholarship/${req.params.id}?error=1`);
  }
};

exports.deleteApplication = async (req, res) => {
  try {
    await db.query('DELETE FROM scholarship_applications WHERE id=?', [req.params.id]);
    res.redirect('/admin/scholarship?success=1');
  } catch (e) {
    res.redirect(`/admin/scholarship/${req.params.id}?error=1`);
  }
};
