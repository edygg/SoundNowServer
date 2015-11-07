var mongoose = require('mongoose');

var connection = mongoose.connect('mongodb://localhost/wild-drive', function(error) {
	if (error)
		console.log(error);
});

var models = {};

var Schema = mongoose.Schema;

//------------------------------------------------------
var fileSchema = new Schema({
  name: String,
  _parentfile: { type: Schema.Types.ObjectId, ref: 'File' },
  url: String,
  filetype: String,
});

models.File = connection.model('File', fileSchema);



//ConversationSchema.statics.getAllConversations = function(username, callback) {
	//var query = this.find().or([{to: username }, { from: username }]);
	//query.exec(callback);
//};

//------------------------------------------------------
module.exports = models;


