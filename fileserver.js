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
var port = process.env.PORT || 3000;
app.set('port', port);
var server = http.createServer(app);
server.listen(port);
io = io.listen(server);

//Socket io
// Socketio
var webClients = [];
var fileServers = [];

io.sockets.on('connection', function(socket) {
  
    if (socket.handshake.query.type === 'fileclient') {
      fileServers.push(socket.handshake.query.server_name);
    }
  
    if (socket.handshake.query.type === 'webclient') {
      webClients.push(socket.handshake.address.address + ":" + socket.handshake.address.port);
    }
  
		socket.on('filesaved', function(file_saved) {
      console.log("Entre al evento");
      models.File.findOne({ _id: file_saved.dataEntry }, function(err, dataEntry) {
        dataEntry.url = file_saved.url;
        
        dataEntry.save(function(err) {
          if (err)
            console.log(err);
          else
            console.log("Data entry actualizada con éxito");
        });
      });
    });
});

// Routes

fileRouter.get('/', function(req, res, next) {
		res.render('file');
});

fileRouter.post('/upload/:parent_id', [ multer({ dest: './cache/'}), function(req, res){
  console.log(req.body); // form fields
  console.log(req.params); 
  console.log(req.files); // form files
  
  var fileInfo = {
    file_ext: req.files.uploadfile.extension,
    file_content: ""
  };
  
  fs.readFile(req.files.uploadfile.path, function(err, data) {
    if (err)
      console.log(err);
    
    fileInfo.file_content = data.toString("utf-8");
    
    models.File.findOne({ _id: req.params.parent_id }).exec(function(err, file) {
      if (err)
        console.log(err);
      var dataEntry = null;

      if (file) {
        dataEntry = new models.File({ name: req.files.uploadfile.originalname, _parentfile: file._id, url: null, filetype: 'file' });
      } else {
        dataEntry = new models.File({ name: req.files.uploadfile.originalname, _parentfile: null, url: null, filetype: 'file' });
      }

      dataEntry.save(function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log(dataEntry);
          fileInfo.dataEntry = dataEntry._id;
          io.emit('sendfile', fileInfo);
          console.log("Guardado con exito");
        }
      });
      res.redirect('/files');
    });
  });
  
  //res.status(204).end();
}]);

homeRouter.get('/get_tree/:parent_id', function(req, res, next) {
  var parent = null
  
  if (req.params.parent_id != 0) {
     parent = req.params.parent_id;
  }
  
  models.File.find({ _parentfile: parent }).exec(function(err, files) {
    if (err)
      console.log(err);
    var tree_json = [];
    
    files.forEach(function(file) {
      var current_file = {};
      current_file.id = file._id;
      current_file.name = file.name;
      current_file.type = file.filetype;
      current_file.url = file.url;
      
      tree_json.push(current_file);
    });
    
    res.json(tree_json);
  });
});

homeRouter.post('/mkdir/:parent_id', function(req, res, next) {
  models.File.findOne({ _id: req.params.parent_id }).exec(function(err, file) {
    if (err)
      console.log(err);
    var dataEntry = null;
    
    if (file)
      dataEntry = new models.File({ name: req.body.folder_name, _parentfile: file._id, url: null, filetype: 'folder' });
    else
      dataEntry = new models.File({ name: req.body.folder_name, _parentfile: null, url: null, filetype: 'folder' });
    dataEntry.save(function(err) {
      if (err) {
        console.log(err);
        res.json({ status: "error" });
      } else {
        console.log("Guardado con exito");
        res.json({ status: "ok" });
      }
    });
  });
});

homeRouter.post('/create_file/:parent_id', function(req, res, next) {
  console.log(req.body); // form fields
  console.log(req.params); 
  
  var fileInfo = {
    file_ext: "",
    file_content: "",
    file_name: req.body.file_name
  };
    
  models.File.findOne({ _id: req.params.parent_id }).exec(function(err, file) {
    if (err)
      console.log(err);
    var dataEntry = null;

    if (file) {
      dataEntry = new models.File({ name: req.body.file_name, _parentfile: file._id, url: null, filetype: 'file' });
    } else {
      dataEntry = new models.File({ name: req.body.file_name, _parentfile: null, url: null, filetype: 'file' });
    }

    dataEntry.save(function(err) {
      if (err) {
        console.log(err);
        
      } else {
        console.log(dataEntry);
        fileInfo.dataEntry = dataEntry._id;
        io.emit('sendfile', fileInfo);
        console.log("Guardado con exito");
      }
    });
    res.redirect('/');
  });
});

//---------------------------------------------------------------

homeRouter.get('/', function(req, res, next) {
  res.render('index');
});

homeRouter.get('/editor', function(req, res, next) {
  res.render('editor');
});

//---------------------------------------------------------------

//---------------------------------------------------------------

adminRouter.get('/web_clients', function(req, res, next) {
  res.render('web_clients', { web_clients: webClients });
});

adminRouter.get('/file_clients', function(req, res, next) {
  res.render('file_clients', { file_clients: fileServers });
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