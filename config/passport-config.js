const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

function initialize(passport) {
  const authenticateUser = async (email, password, done) => {
    console.log('Authenticating user:', email);
    
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        console.log('User not found:', email);
        return done(null, false, { message: 'No user with that email' });
      }
      
      console.log('User found, checking password...');
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
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  });
}

module.exports = initialize;
