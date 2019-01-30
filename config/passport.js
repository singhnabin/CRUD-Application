const localStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const flash = require("connect-flash");

///load model user from database
// require('../models/User');
const User = mongoose.model("user");

module.exports = function(passport) {
  passport.use(
    new localStrategy(
      {
        usernameField: "email"
      },
      (email, password, done) => {
        User.findOne({
          email: email
        })
          .then(user => {
            if (!user) {
              return done(null, false, {
                message: "No user found in the database"
              });
            }

            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) throw err;
              if (isMatch) {
                // req.flash('success_msg', 'You are successfully Logged in');
                return done(null, user);
              } else {
                return done(null, false, {
                  message: "Password Incorrect!"
                });
              }
            });
          })
          .catch(err => console.log(err));
      }
    )
  );

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
};
