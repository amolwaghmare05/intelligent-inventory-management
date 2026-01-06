const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    console.log('Authenticating user:', email);
    const user = getUserByEmail(email);
    
    if (!user) {
      console.log('User not found:', email);
      return done(null, false, { message: 'No user with that email' });
    }
    
    console.log('User found, checking password...');
    try {
      if (await User.comparePassword(password, user.password)) {
        console.log('Password correct, login successful');
        return done(null, user);
      } else {
        console.log('Password incorrect');
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (e) {
      console.error('Error during authentication:', e);
      return done(e);
    }
  };
  
  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
  
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id));
  });
}

module.exports = initialize;
