const LocalStrategy = require('passport-local').Strategy
const { comparePassword, isPasswordHashed } = require('./utils/passwordUtils')

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    const user = getUserByEmail(email)
    if (user == null) {
      return done(null, false, { message: 'No user with that email' })
    }

    try {
      // Check if the password is already hashed
      if (isPasswordHashed(user.password)) {
        // Use bcrypt to compare hashed password
        const match = await comparePassword(password, user.password);
        if (match) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      } else {
        // For backward compatibility with non-hashed passwords
        // This should be temporary until all passwords are hashed
        if (password === user.password) {
          console.warn('WARNING: Using unhashed password for user:', user.email);
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      }
    } catch (e) {
      return done(e)
    }
  }

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize