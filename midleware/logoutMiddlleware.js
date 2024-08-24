
const logoutMiddleware = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged' });
};

module.exports = logoutMiddleware;
