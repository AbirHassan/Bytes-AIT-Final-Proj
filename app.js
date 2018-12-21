const express = require('express');
const path = require('path');
const fs = require('fs');
const regression = require("regression");
const publicPath = path.resolve(__dirname, 'public');
const bodyParser = require('body-parser');
const session = require('express-session');
require( './db' );
const auth = require('./auth.js');

//Code from Yelp API Docs: https://github.com/Yelp/yelp-fusion/tree/master/fusion/node
//Setting up yelp API and Google Maps API keys
const yelp = require('yelp-fusion');
let yelpApiKey;
let googleApiKey;
if (process.env.NODE_ENV === 'PRODUCTION') {
    yelpApiKey = process.env.YELP_API_KEY;
    googleApiKey = process.env.GOOGLE_API_KEY

} else {
    const fn = path.join(__dirname, 'env.json');
    const data = fs.readFileSync(fn);
    const creds = JSON.parse(data);
    yelpApiKey = creds.yelp_API_KEY;
    googleApiKey = creds.google_API_KEY;
}
const client = yelp.client(yelpApiKey);

// use function to create application object
// (web application, allows you to serve web pages)
const app = express();
const mongoose = require('mongoose');

const Restuarant = mongoose.model('Restuarant');

app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');

app.use(express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
	secret: 'keyboard cat',
	cookie: {},
	resave: false,
	saveUninitialized: true
}));

app.use((req, res, next)=> {
    res.locals.user = req.session.user;
    next();
});

app.get('/', (req, res) => {
	if(!req.session.user) {
		res.redirect('/login');
	} else {
		Restuarant.find({user:res.locals.user._id}, (err, restuarants) => {
			if(err) {
				console.log(err);
			} else {
				res.render('index', {restuarants: restuarants, googleApiKey: googleApiKey});
			}
		});
	}
});

app.get('/restuarant/add', (req, res) => {
    if(!req.session.user.username) {
        res.redirect('/login');
    } else {
        Restuarant.find({user:res.locals.user._id}, (err, restuarants) => {
			if(err) {
				console.log(err);
			} else {
                res.render('restuarant-add', {restuarants});
			}
		});
    }
});

app.post('/restuarant/add', (req, res) => {
    if(!req.session.user.username) {
        res.redirect('/login');
    } else {
        const searchRequest = {
            term:req.body.name,
            location: req.body.location
        };
          
        client.search(searchRequest).then(response => {
            const firstResult = response.jsonBody.businesses[0]; //Everything from yelp in here
            const prettyJson = JSON.stringify(firstResult, null, 4);
            //console.log(prettyJson);
            const newData = {
                url: firstResult["url"],
                rating: firstResult["rating"] * 2,
                price: firstResult["price"].length,
                phone: firstResult["display_phone"],
                coordinates: {
                    "latitude": firstResult["coordinates"]["latitude"],
                    "longitude": firstResult["coordinates"]["longitude"]
                },
            };
            const newRest = new Restuarant({
                name: req.body.name,
                location: req.body.location,
                user: req.session.user._id,
                yelp_info: newData
            });
            
            newRest.save((err, newRest) => {
                if(err) {
                    res.render('restuarant-add', {message: "Failed"});
                } else {
                    res.redirect('/');
                }
            });
            
        }).catch(e => {
            console.log(e);
            const newData = {
                url: "https://yelp.com",
                rating: 1,
                price: 1,
                phone: "(404)404-4040",
                coordinates: {
                    "latitude": 0,
                    "longitude": 0
                },
            };
            const newRest = new Restuarant({
                name: req.body.name,
                location: req.body.location,
                user: req.session.user._id,
                yelp_info: newData
            });
            
            newRest.save((err, newRest) => {
                if(err) {
                    res.render('restuarant-add', {message: "Failed"});
                } else {
                    res.redirect('/');
                }
            });
        });
    }
});

app.get('/menu/add', (req, res) => {
    if(!req.session.user.username) {
        res.redirect('/login');
    } else {
        Restuarant.find({user:res.locals.user._id}, (err, restuarants) => {
			if(err) {
				console.log(err);
			} else {
                res.render('restuarant-add', {restuarants});
			}
		});
    }
});

app.post('/menu/add', (req, res) => {
    if(!req.session.user.username) {
        res.redirect('/login');
    } else {
        //find restuarant
        const restuarantName = req.body.restuarant;
        const menuItem = {
            "itemName": req.body.name,
            "price": req.body.price,
            "rating": req.body.rating,
        };
        Restuarant.findOne({user:res.locals.user._id, name:restuarantName}, (err, restuarant) => {
			if(err) {
				console.log(err);
			} else {
                //update list of menuItems
                restuarant.items.push(menuItem);
                restuarant.save(function(err) {
                    if(!err) {
                        res.redirect('/');
                    }
                    else {
                        console.log("Error: could not save menuItem " + menuItem.name);
                    }
                });
			}
		});
    }
});

app.post('/restuarant/delete', (req, res) => {
    if(!req.session.user.username) {
        res.redirect('/login');
    } else {
        //find restuarant
        const restuarantName = req.body.restuarant;
        
        Restuarant.deleteOne({user:res.locals.user._id, name:restuarantName}, (err, restuarant) => {
			if(err) {
				console.log(err);
			} else {
                res.redirect('/');
			}
		});
    }
});

app.post('/menu/delete', (req, res) => {
    if(!req.session.user.username) {
        res.redirect('/login');
    } else {
        const deleteItem = req.body.menuItem;
        const rest = deleteItem.split('-')[0];
        const menuItem = deleteItem.split('-')[1];

        Restuarant.findOne({user:res.locals.user._id, name:rest}, (err, restuarant) => {
			if(err) {
				console.log(err);
			} else {
                //update list of menuItems
                restuarant.items = restuarant.items.filter(function(el) { return el.itemName != menuItem; }); 
                //restuarant.items.push(menuItem);
                restuarant.save(function(err) {
                    if(!err) {
                        res.redirect('/');
                    }
                    else {
                        console.log("Error: could not save menuItem " + menuItem.name);
                    }
                });
			}
		});
    }
});

app.get("/restuarant/grade", (req, res) => {
    if(!req.session.user.username) {
        res.redirect('/login');
    } else {
        //Get list of restuarant's prices and ratings
        // for user-entered menu items, calculate average price and average rating
        // for yelp data, use provided values
        // generate two regression lines
        Restuarant.find({user:res.locals.user._id}, (err, restuarants) => {
			if(err) {
				console.log(err);
			} else {
                let points = [];
                let restPoints = [];
                for (let i = 0; i < restuarants.length; i++) {
                    let curItems = restuarants[i].items;
                    if(curItems.length === 0) {
                        // USE YELP'S DATA
                        //console.log("RATING: ", restuarants[i].yelp_info["rating"]);
                        //console.log("PRICE: ", restuarants[i].yelp_info["price"]);
                        const dollarMapping = { //average prices for number of dollar signs
                            1: 10,
                            2: 20,
                            3: 45,
                            4: 75
                        };
                        points.push( [ restuarants[i].yelp_info["rating"] , dollarMapping[restuarants[i].yelp_info["price"]] ]);
                        restPoints.push({
                            "name": restuarants[i].name,
                            "point": [ restuarants[i].yelp_info["rating"] , dollarMapping[restuarants[i].yelp_info["price"]] ]
                        });
                    } else {
                        // Iterate through items and calculate restuarants average price and rating
                        let totPrice = 0;
                        let totRating = 0;
                        for (let j = 0; j < curItems.length; j++) {
                            totPrice += curItems[j].price;
                            totRating += curItems[j].rating;
                        }
                        const avgPrice = totPrice / curItems.length;
                        const avgRating = totRating / curItems.length;
                        //console.log("RATING: ", avgRating);
                        //console.log("PRICE: ", avgPrice);
                        points.push([avgRating, avgPrice]);
                        restPoints.push({
                            "name": restuarants[i].name,
                            "point": [avgRating, avgPrice]
                        });
                    }
                }
                const result = regression.linear(points); //result.points are the points on the line
                const gradient = result.equation[0];
                const yIntercept = result.equation[1];
                let linepts = result.points;

                //rudimentary grading system based on residuals
                const grades = {
                    "4":"A+",
                    "3.5":"A",
                    "3":"A",
                    "2.5": "A-",
                    "2":"A-",
                    "1.5":"B+",
                    "1": "B+",
                    "0.5":"B",
                    "0":"B",
                    "-0.5":"B-",
                    "-1":"C+",
                    "-1.5":"C+",
                    "-2":"C-",
                    "-2.5":"C-",
                    "-3":"D",
                    "-3.5": "D",
                    "-4": "F"
                }
                console.log(restPoints);
                
                restPoints = restPoints.map( (cur) => {
                    const x = cur["point"][0];
                    //compute difference from line
                    const yhat = x * gradient + yIntercept;
                    const y = cur["point"][1];
                    const residual = yhat - y;
                    
                    let letterGrade = round(residual, 0.5);
                    if (letterGrade < -4) {
                        letterGrade = -4;
                    } else if (letterGrade > 4) {
                        letterGrade = 4;
                    }
                    letterGrade = grades[letterGrade.toString()];
                    cur["grade"] = letterGrade;
                    return cur 
                });
                console.log(restPoints)
                res.render('grade', {linepts:linepts, points: points, restPoints: restPoints});
			}
		});     
    }
});

//reference: https://stackoverflow.com/questions/6137986/javascript-roundoff-number-to-nearest-0-5
function round(value, step) {
    step || (step = 1.0);
    var inv = 1.0 / step;
    return Math.round(value * inv) / inv;
}

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    auth.register(req.body.username, req.body.email, req.body.password, (err) => {
        res.render('register', {message: err.message});
    },
    (user) => {
        auth.startAuthenticatedSession(req, user, () => {
            res.redirect('/');
        });
    });
});
        

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    auth.login(req.body.username, req.body.password, (err) => {
        res.render('login', {message: err.message});
    },
    (user) => {
        auth.startAuthenticatedSession(req, user, () => {
            res.redirect('/');
        });
    });
});

app.get('/logout', (req, res) => {
	auth.endAuthenticatedSession(req);
	res.redirect('/');
});

app.listen(process.env.PORT || 3000);