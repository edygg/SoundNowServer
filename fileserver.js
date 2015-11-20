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
var fileRouter = express.Router();
var homeRouter = express.Router();
var adminRouter = express.Router();
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//CORS
app.use(cors());

// Server
//var port = process.env.PORT || 3000;
var port = 3000;
app.set('port', port);
var server = http.createServer(app);
server.listen(port);
io = io.listen(server);

//Socket io
var fileServers = [];

io.sockets.on('connection', function(socket) {

    if (socket.handshake.query.type === 'fileclient') {
      fileServers.push(socket.handshake.query.server_name);
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
fileRouter.post('/upload', [multer({ dest: './cache/'}), function(req, res){
  var fileInfo = {
    file_ext: req.files.uploadfile.extension,
    file_content: ""
  };

  fs.readFile(req.files.uploadfile.path, function(err, data) {
    if (err)
      console.log(err);

    fileInfo.file_content = data.toString("utf-8");

    currentSong = new models.Song({ name: req.files.uploadfile.originalname });

    currentSong.save(function(err) {
      if (err) {
        console.log(err);
      } else {
        fileInfo.songId = currentSong._id;
        io.emit('sendfile', fileInfo);
      }
    });

    res.json({ status: 'ok' });
}]);


//---------------------------------------------------------------


//---------------------------------------------------------------
adminRouter.get('/file_clients', function(req, res, next) {
  res.json({ file_clients: fileServers });
});

//---------------------------------------------------------------

app.use('/', homeRouter);
app.use('/files', fileRouter);
app.use('/admin', adminRouter);


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
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
