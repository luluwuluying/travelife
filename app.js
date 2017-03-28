'use strict';

const Hapi = require('hapi');
const Blipp = require('blipp');
const Vision = require('vision');
const Inert = require('inert');
const Path = require('path');
const Handlebars = require('handlebars');
const fs = require("fs");
const Sequelize = require('sequelize');
const FormData = require("form-data");
const pg = require('pg');

const server = new Hapi.Server({
    connections: {
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'public')
            }
        }
    }
});

var sequelize;


server.connection({
    port: (process.env.PORT || 3000)
});


if (process.env.DATABASE_URL) {
    // the application is executed on Heroku ... use the postgres database
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: true //false
    })
} else {
    sequelize = new Sequelize('db', 'username', 'password', {
        host: 'localhost',
        dialect: 'sqlite',

        pool: {
            max: 5,
            min: 0,
            idle: 10000
        },

        // SQLite only
        storage: 'db.sqlite'
    });
}

   
var Trip = sequelize.define('trip', {
    tripName: {
        type: Sequelize.STRING
    },
    departure: {
        type: Sequelize.STRING
    },
    destination: {
        type: Sequelize.STRING
    },
    startdate: {
        type: Sequelize.DATEONLY
    },
    enddate: {
        type: Sequelize.DATEONLY
    },
});


server.register([Blipp, Inert, Vision], () => {});

server.views({
    engines: {
        html: Handlebars
    },
    path: 'views',
    layoutPath: 'views/layout',
    layout: 'layout',
    helpersPath: 'views/helpers',
    //partialsPath: 'views/partials'
});


server.route({
    method: 'GET',
    path: '/',
    handler: {
        view: {
            template: 'index'
        }
    }
});


server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: './',
            listing: false,
            index: false
        }
    }
});

server.route({
    method: 'GET',
    path: '/createDB',
    handler: function (request, reply) {
        // force: true will drop the table if it already exists
        Trip.sync({
            force: true
        })
        reply("Database Created")
    }
});

server.route({

    method: 'POST',
    path: '/add',
    handler: function (request, reply) {
        var formresponse = JSON.stringify(request.payload);
        var parsing = JSON.parse(formresponse);
        //console.log(parsing);

        Trip.create(parsing).then(function (currentTrip) {
            Trip.sync();
            console.log("...syncing");
            console.log(currentTrip);
            return (currentTrip);
        }).then(function (currentTrip) {

            reply().redirect("/displayAll");

        });
    }
});


server.route({
    method: 'GET',
    path: '/destroyAll',
    handler: function (request, reply) {

        Trip.drop();

        reply("destroy all");
    }
});


server.route({
    method: 'GET',
    path: '/createTrip',
    handler: {
        view: {
            template: 'createTrip'
        }
    }
});


server.route({

    method: 'POST',
    path: '/formTrip',
    handler: function (request, reply) {
        var formresponse = JSON.stringify(request.payload);
        var parsing = JSON.parse(formresponse);
        //var days=Days.daysBetween(startdate, enddate).getDays();
       
        //console.log(parsing);
        
        var d1 = new Date(parsing.startdate);
        var d2 = new Date(parsing.enddate);
        
//        //Get 1 day in milliseconds
       var one_day = 1000 * 60 * 60 * 24;
//
//        // Convert both dates to milliseconds
       var date1_ms = d1.getTime();
       var date2_ms = d2.getTime();
//
//        // Calculate the difference in milliseconds
      var difference_ms = date2_ms - date1_ms;
//
//        // Convert back to days and return
       var days = Math.ceil(difference_ms / one_day);
        
        console.log("Number of days: " + days);
//        
       // parsing["days"] = days;

        Trip.create(parsing).then(function (currentTrip) {
            Trip.sync();
            console.log("...syncing");
            console.log(currentTrip);
            return (currentTrip);
        }).then(function (currentTrip) {
            currentTrip["days"] = days;
            reply.view('formresponse', {
                formresponse: currentTrip
            });
        });
    }
});

//findAll returns an array of users, Uses helper to loop through array

server.route({
    method: 'GET',
    path: '/displayAll',
    handler: function (request, reply) {
        Trip.findAll().then(function (users) {
            // projects will be an array of all User instances
            //console.log(users[0].tripName);
            var allUsers = JSON.stringify(users);
            reply.view('dbresponse', {
                dbresponse: allUsers
            });
        });
    }
});



//Find returns one user

server.route({
    method: 'GET',
    path: '/find/{tripName}',
    handler: function (request, reply) {
        Trip.findOne({
            where: {
                tripName: encodeURIComponent(request.params.tripName),
            }
        }).then(function (user) {
            var currentUser = "";
            currentUser = JSON.stringify(user);
            //console.log(currentUser);
            currentUser = JSON.parse(currentUser);
            console.log(currentUser);
            reply.view('find', {
                dbresponse: currentUser
            });

        });
    }
});


server.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);

});
