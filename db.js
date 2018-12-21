const mongoose = require('mongoose');
// my schema goes here!
// define the data in our collection

// users
// * our site requires authentication...
// * so users have a username and password
// * they also can have 0 or more restuarants in their profile
const User = new mongoose.Schema({
    username: String,
    password: String,
    lists:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restuarant' }]
});
mongoose.model("User", User);

/*
const MenuItem = new mongoose.Schema({
  name: {type: String, required: true},
  price: {type: Number, required: true},
  rating: {type: Number, required: true},
  restuarant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restuarant' }
}, {
_id: true
});*/

// item(s) on a restuarant's men
// * each restuarant must have a related user
// * a list can have 0 or more items
const Restuarant = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
  name: {type: String, required: true},
  location: {type: String, required: true},
  items: [{
    itemName: String,
    price: Number,
    rating: Number 
    //type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem'
  }],
  yelp_info: {
    url: String,
    rating: Number,
    price: Number,
    phone: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }
});
mongoose.model("Restuarant", Restuarant);

// is the environment variable, NODE_ENV, set to PRODUCTION? 
let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
 // if we're in PRODUCTION mode, then read the configration from a file
 // use blocking file io to do this...
 const fs = require('fs');
 const path = require('path');
 const fn = path.join(__dirname, 'config.json');
 const data = fs.readFileSync(fn);

 // our configuration file will be in json, so parse it and set the
 // conenction string appropriately!
 const conf = JSON.parse(data);
 dbconf = conf.dbconf;
} else {
 // if we're not in PRODUCTION mode, then use
 dbconf = 'mongodb://localhost/bytes';
}

mongoose.connect(dbconf, { useNewUrlParser: true });