function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    res.locals.adminName = req.session.adminName;
    res.locals.adminRole = req.session.adminRole;
    return next();
  }
  res.redirect('/admin/login');
}

function requireSuper(req, res, next) {
  if (req.session && req.session.adminRole === 'super') return next();
  res.status(403).render('500', { title: 'Access Denied | Greenvaley' });
}

module.exports = { requireAdmin, requireSuper };
