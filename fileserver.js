//------------------------------------------------------------------------------
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer  = require('multer');
var io = require('socket.io');
var Schema = require('mongoose').Schema;
var timeout = require('connect-timeout');

// Routers
var fileRouter = express.Router();
var homeRouter = express.Router();
var adminRouter = express.Router();
var apiRouter = express.Router();

var http = require('http');
var fs = require('fs');
var cors = require('cors');

var models = require('./models/models');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(timeout('1200s'));
app.use(bodyParser.json());
app.use(haltOnTimedout);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//CORS
app.use(cors());

// connection timeout
function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

// Server
//var port = process.env.PORT || 3000;
var port = 3000;
app.set('port', port);
var server = http.createServer(app);
server.listen(port);
io = io.listen(server);

//Socket io
var fileServers = [];
var fileServerSockets = [];
var currentServer = 0;

var getCurrentServer = function() {
  if (!thereAreFileClients()) {
    return null;
  } else {
    if (currentServer >= fileServers.length) {
      currentServer = 0;
      return currentServer;
    } else {
      currentServer = currentServer + 1;
      return currentServer - 1;
    }
  }
};

var thereAreFileClients = function() {
  return fileServers.length > 0;
};

io.sockets.on('connection', function(socket) {

    if (socket.handshake.query.type === 'fileclient') {
      fileServers.push(socket.handshake.query.server_name);
      fileServerSockets.push(socket.id);
    }

		socket.on('filesaved', function(file_saved) {
      models.Song.findOne({ _id: file_saved.songId }, function(err, song) {
        song.url = file_saved.url;

        song.save(function(err) {
          if (err)
            console.log(err);
          else
            console.log("Canción actualizada con éxito.");
        });
      });
    });
});

// Routes
fileRouter.post('/upload', [multer({ dest: './cache/', limits: { fieldSize: 20 * 1024 * 1024 }}), function(req, res) {
  var fileInfo = {
    file_ext: req.files.uploadfile.extension,
    file_content: ""
  };

  if (!thereAreFileClients()) {
    res.json({ status: 'failed' });
  } else {
    fs.readFile(req.files.uploadfile.path, function(err, data) {
      if (err)
        console.log(err);

      fileInfo.file_content = data.toString("binary");

      currentSong = new models.Song({ name: req.files.uploadfile.originalname });

      currentSong.save(function(err) {
        if (err) {
          console.log(err);
        } else {
          fileInfo.songId = currentSong._id;
          var nextFileServer = getCurrentServer();
          io.to(fileServerSockets[nextFileServer]).emit('sendfile', fileInfo);
        }
      });

      res.json({ status: 'ok' });
    });
  }
}]);


//---------------------------------------------------------------


//---------------------------------------------------------------
adminRouter.get('/file_clients', function(req, res, next) {
  res.json({ file_clients: fileServers });
});

//---------------------------------------------------------------

//---------------------------------------------------------------
apiRouter.get('/songs', function(req, res, next) {
  models.Songs.find(function(err, songs) {
    if (err) {
      console.log(err);
    } else {
      res.json(songs);
    }
  });
});

//---------------------------------------------------------------

app.use('/', homeRouter);
app.use('/files', fileRouter);
app.use('/admin', adminRouter);
app.use('/api/', apiRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: {}
  });
});
