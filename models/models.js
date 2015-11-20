var mongoose = require('mongoose');

var connection = mongoose.connect('mongodb://localhost/sound-now', function(error) {
	if (error)
		console.log(error);
});

var models = {};

var Schema = mongoose.Schema;

//------------------------------------------------------
var songSchema = new Schema({
  name: String,
  url: String,
});

models.Song = connection.model('Song', songSchema);



//ConversationSchema.statics.getAllConversations = function(username, callback) {
	//var query = this.find().or([{to: username }, { from: username }]);
	//query.exec(callback);
//};

//------------------------------------------------------
module.exports = models;
