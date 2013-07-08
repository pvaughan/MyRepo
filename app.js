//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , format = require('util').format
    , sqlServer = require("./models/mysqlDB.js")
    , routes = require('./routes')
    , dropbox = require('./routes/dropbox')
    , reviews = require('./routes/reviews')
    , info = require('./routes/info')
    , rsvp = require('./routes/rsvp')
    , io = require('socket.io')
    , hbsPrecompiler = require('handlebars-precompiler')
    , port = (process.env.PORT || 3000);

//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhhhhhh!"}));
    server.use(connect.static(__dirname + '/static'));
    server.use('/node_modules', connect.static('node_modules'));
    server.use(server.router);
    hbsPrecompiler.watchDir(
        __dirname + "/views",
        __dirname + "/static/js/templates.js",
        ['handlebars', 'hbs']
    );
});

//setup the errors
server.error(function (err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: { 
                  title : '404 - Not Found'
                 ,description: ''
                 ,author: 'Paul Vaughan'
                 ,analyticssiteid: 'UA-38061682-1'
                },status: 404 });
    } else {
        res.render('500.jade', { locals: { 
                  title : 'The Server Encountered an Error'
                 ,description: 'Test webapp with express and backbone'
                 ,author: 'Paul Vaughan'
                 ,analyticssiteid: 'UA-38061682-1'
                 ,error: err 
                },status: 500 });
    }
});
server.listen( port);

//Setup Socket.IO

var io = io.listen(server);
io.sockets.on('connection', function(socket){
  console.log('Client Connected');
  socket.on('message', function(data){
    socket.broadcast.emit('server_message',data);
    socket.emit('server_message',data);
  });
  socket.on('disconnect', function(){
    console.log('Client Disconnected.');
  });
});





///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', routes.index);

server.get('/info', info.info);
server.get('/rsvp', rsvp.rsvp);

server.get('/photo',reviews.photoUpload);
server.post('/api/photos',function(req, res){
    dropbox.photoUpload(req, res, sqlServer);
});


server.get('/media',function(req, res){
    reviews.showAllMedia(req, res, sqlServer);
});



server.delete('/cartItems/:id?', function(req, res ){
    sqlServer.removeGiftItemForGuest(req, res, function(result ) {
        res.send(result);
    });
});

server.put('/cartItems/:id?', function(req, res){
    sqlServer.updateGiftItemForGuest(req, res, function(result ) {
        res.send(result);
    });
});

server.post('/cartItems', function(req, res){
    sqlServer.addGiftItemsForGuest(req, res, function(result ) {
        res.send(result);
    });
});


server.get('/cartItems', function(req, res){
    sqlServer.getGiftItemsForGuest(req, res, function(giftItems) {
        res.send(giftItems);
    });
});

server.get('/reviews', restrict, reviews.reviews);

server.get('/items', function(req, res){
    sqlServer.getItems(function(itmes) {
        res.send(itmes);
    });
});

server.get('/env', function(req, res){
        res.send(process.env.VCAP_SERVICES);
});




server.post('/items', function(req, res){
    sqlServer.addItem(req, res, function(itmem) {
        res.send(itmem);
    });
});

server.post('/rsvp/code', function (req, res){
    sqlServer.getGuestWithCode(req, res, function (guests) {
         if (guests) {
            var userName =  "";
            for (var i = 0; i < guests.length; i++) {
                userName += guests[i].Name + " ";
            }

            req.session.regenerate(function(){
                req.session.guests = guests;
                req.session.success = 'Authenticated as ' + userName;
                res.send(guests);

            });
         }
    });
});

server.post('/rsvp/confirmRVP', function (req, res){
    sqlServer.updateGuestWithRSVP(req, res);
});




//Login
function restrict(req, res, next) {
    if (req.session.guests) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.render('login.jade', {
            locals : {
                title : 'Login'
                ,description: 'Sven en laura gaan trouwen whoohooo!!'
                ,page: 'login'
                ,author: 'Paul Vaughan'
                ,analyticssiteid: 'UA-38061682-1'
            }
        });
    }
}

server.get('/login', function(req, res){
    res.render('login.jade', {
        locals : {
            title : 'Login'
            ,description: 'Sven en laura gaan trouwen whoohooo!!'
            ,page: 'login'
            ,author: 'Paul Vaughan'
            ,analyticssiteid: 'UA-38061682-1'
        }
    });

});

server.post('/login', function(req, res){
    sqlServer.getGuestWithCode(req, res, function (guests) {
        if (guests) {
            // Regenerate session when signing in
            // to prevent fixation
            var userName =  "";
            for (var i = 0; i < guests.length; i++) {
                userName += guests[i].Name + " ";
            }

            req.session.regenerate(function(){
                // Store the user's primary key
                // in the session store to be retrieved,
                // or in this case the entire user object
                req.session.guests = guests;
                req.session.success = 'Authenticated as ' + userName
                    + ' click to <a href="/logout">logout</a>. '
                    + ' You may now access <a href="/restricted">/restricted</a>.';
                res.redirect('back');
            });
        } else {
            req.session.error = 'Authentication failed, please check your '
                + ' username and password.'
                + ' (use "tj" and "foobar")';
            res.redirect('login');
        }
    });
});

server.get('/logout', function(req, res){
    // destroy the user's session to log them out
    // will be re-created next request
    req.session.destroy(function(){
        res.redirect('/');
    });
});



//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );