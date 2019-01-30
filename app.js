const express = require("express");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");
const { ensureAuthenticated } = require("./auth/auth");

const app = express();

//for models mongoose
require("./models/Explore");
require("./models/User");

///passportjs config fot local strategy
require("./config/passport")(passport);

///middleware handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main"
  })
);
app.set("view engine", "handlebars");

///map global promise--get rid of warning
// mongoose.Promise = global.Promise;
mongoose.Promise = global.Promise;
////connet to mongoose
mongoose
  .connect(
    "mongodb://localhost/bucket",
    {
      useNewUrlParser: true
    }
  )
  .then(() => {
    console.log("connected to database");
  })
  .catch(err => console.log(err));

//require for model for database

const Place = mongoose.model("place");

const User = mongoose.model("user");

///middleware for body-parser
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

///middleware for method override
app.use(methodOverride("_method"));

///middleware for custom css to work
app.use(express.static(path.join(__dirname, "public")));

///middleware for express
app.use(
  session({
    secret: "vidjotApp",
    resave: true,
    saveUninitialized: true
  })
);

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

///set flash message function
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null;
  next();
});

//get route for home page
app.get("/", (req, res) => {
  res.render("home");
});
//get route for home page
app.get("/home", (req, res) => {
  res.render("home");
});

//get route for about page
app.get("/about", (req, res) => {
  res.render("about");
});

//get route for show all
app.get("/index", (req, res) => {
  res.render("index");
});

app.get("/explore/add", ensureAuthenticated, (req, res) => {
  res.render("explore/add");
});

app.post("/explore", ensureAuthenticated, (req, res) => {
  let errors = [];
  if (!req.body.photoTitle) {
    errors.push({
      text: "Please add photo title"
    });
  }
  if (!req.body.details) {
    errors.push({
      text: "Please add detail of the pic"
    });
  }
  if (errors.length > 0) {
    res.render("explore/add", {
      errors: errors,
      title: req.body.photoDetail,
      details: req.body.details
    });
  } else {
    const newPlace = {
      title: req.body.photoTitle,
      details: req.body.details,
      user: req.user.id
    };
    new Place(newPlace)
      .save()
      .then(place => {
        req.flash("success_msg", "Your post added successfully");
        res.redirect("places");
      })
      .catch(err => console.log(err));
  }
});

////get ideas route
app.get("/list", (req, res) => {
  Place.find({})
    .sort({
      date: "desc"
    })
    .then(places => {
      // console.log(currentUser.id)
      res.render("explore/list", {
        places: places
      });
    });
});

////get ideas route
app.get("/places", ensureAuthenticated, (req, res) => {
  // console.log(req.user.id);
  Place.find({})
    .sort({
      date: "desc"
    })
    .then(places => {
      if (places.user == req.body.user) {
        res.render("explore/index", {
          places: places
          // currentUser: CurrentUser
        });
      } else {
        res.render("explore/list", {
          places: places
        });
      }
    });
});

////get route for edit
app.get("/:id/edit", ensureAuthenticated, (req, res) => {
  Place.findOne({
    _id: req.params.id
  })
    .then(place => {
      res.render("explore/edit", {
        place: place
      });
    })
    .catch(err => console.log(err));
});

//Update route
app.put("/explore/:id", ensureAuthenticated, (req, res) => {
  Place.findOne({
    _id: req.params.id
  })
    .then(place => {
      place.title = req.body.photoTitle;
      place.details = req.body.details;
      place
        .save()
        .then(() => {
          req.flash("success_msg", "Your post edited successfully...");
          res.redirect("/places");
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
});

//Delete Route
app.delete("/explore/:id", ensureAuthenticated, (req, res) => {
  Place.findOneAndRemove({
    _id: req.params.id
  })

    .then(() => {
      req.flash("success_msg", "Your post deleted successfully..");
      res.redirect("/places");
    })
    .catch(err => console.log(err));
});

//======================================================================
// register user and login route
// =====================================================================

///get route for register
app.get("/register", (req, res) => {
  res.render("users/register");
});

//get route for login form
app.get("/login", (req, res) => {
  res.render("users/login");
});

///post route for register
app.post("/register", (req, res) => {
  let errors = [];
  if (!req.body.firstname && !req.body.lastname) {
    errors.push({
      text: "Please add first name or last name"
    });
  }
  if (!req.body.email) {
    errors.push({
      text: "Please add email field"
    });
  }
  if (req.body.password != req.body.password1) {
    errors.push({
      text: "Password did not match"
    });
  }
  if (req.body.password.length < 4) {
    errors.push({
      text: "Password must be at least 4 character"
    });
  }
  if (errors.length > 0) {
    res.render("users/register", {
      errors: errors,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email
    });
  } else {
    User.findOne({
      email: req.body.email
    })
      .then(user => {
        if (user) {
          res.redirect("/register");
        } else {
          const newUser = new User({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            password: req.body.password
          });
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw err;
              newUser.password = hash;
              newUser
                .save()
                .then(user => {
                  ///flash message
                  req.flash(
                    "success_msg",
                    "You have successfully register your account. You can login now"
                  );
                  res.redirect("/login");
                })
                .catch(err => console.log(err));
              return;
            });
          });
        }
      })
      .catch(err => console.log(err));
  }
});
/////post login route
app.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/places",
    failureRedirect: "/login",
    failureFlash: true
  })(req, res, next);
});

///logout route

app.get("/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "You are successfully Logged out");
  res.redirect("/login");
});

const port = 5500;
app.listen(port, () => {
  console.log("app in running");
});
