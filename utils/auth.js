module.exports.ensureAdmin = (req, res, next) => {
  // Allow an environment override for local/dev testing
  if (process.env.ADMIN_OVERRIDE === 'true') return next();
  if (req.session && req.session.role === 'admin') return next();
  try { console.warn('ensureAdmin blocked request', { path: req.originalUrl, method: req.method, role: req.session && req.session.role }); } catch (e) {}
  return res.status(403).send('Forbidden');
};

module.exports.ensureFacilitator = (req, res, next) => {
  // Allow both Facilitator and Admin to access facilitator routes
  try { console.log('ensureFacilitator called', { path: req.originalUrl, method: req.method, hasSession: !!req.session, role: req.session && req.session.role }); } catch (e) {}
  if (req.session && (req.session.role === 'Facilitator' || req.session.role === 'admin')) return next();
  try { console.warn('ensureFacilitator blocked request', { path: req.originalUrl, method: req.method, role: req.session && req.session.role }); } catch (e) {}
  return res.status(403).send('Forbidden');
};
