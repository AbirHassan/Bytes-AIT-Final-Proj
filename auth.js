const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = mongoose.model('User');

function register(username, email, password, errorCallback, successCallback) {
  if(username.length < 8 || password.length < 8) {
    errorCallback({message:"USERNAME PASSWORD TOO SHORT"});
  } else {
    //check if user already exists
    User.findOne({username:username}, (err, result) => { 
      if(result) {
        errorCallback({message:"USERNAME ALREADY EXISTS"});
      } else {
        // if the user doesn't exist yet, then it's ok to go ahead and create a new user…
        // you can use a default value of 10 for salt rounds 
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, function(err, hash) {
          // do more stuff here!
          const newUser = new User({
            username: username,
            password: hash
          });
          newUser.save(function(err) {
            if(err) {
              errorCallback({message:"DOCUMENT SAVE ERROR"});
            } else {
              successCallback(newUser);
            }
          });
        });
      }
    });

  }
}

function login(username, password, errorCallback, successCallback) {
  User.findOne({username: username}, (err, user, count) => {
    if (!user) {
      errorCallback({message:"USER NOT FOUND"});
    }
    else if (!err && user) {
      // compare with form password!
      bcrypt.compare(password, user.password, (err, passwordMatch) => {
        // regenerate session if passwordMatch is true
        if(passwordMatch) {
          successCallback(user);
        } else {
          errorCallback({message:"PASSWORDS DO NOT MATCH"});
        }
      });
    }
   });

}

function startAuthenticatedSession(req, user, cb) {
  // assuming that user is the user retrieved from the database
  req.session.regenerate((err) => {
    if (!err) {
      req.session.user = user;
      req.session.username = user.username;
      req.session.email = user.email;
      cb();
    } else {
      // log out errorcall callback with error
      cb(err);
    }
  });
}

function endAuthenticatedSession(req) {
    // assuming that user is the user retrieved from the database
    req.session.destroy();
};

module.exports = {
  startAuthenticatedSession: startAuthenticatedSession,
  endAuthenticatedSession: endAuthenticatedSession,
  register: register,
  login: login
};
