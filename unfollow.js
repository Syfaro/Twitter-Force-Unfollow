var Twit = require('twit');
var fs = require('fs');
var async = require('async');
var inquirer = require('inquirer');

var T = new Twit({
	consumer_key: 'Rw3qBb7rtWQGYolBKOlREQ',
	consumer_secret: 'zrkxZrQIRYkn8caQquQwbRuTcug65h5ZLnnW9vz6cU',
	access_token: '457415010-6pNUkwqq8AOd6NOgXFzH73yueYSwyH0tisMuT44',
	access_token_secret: 'ujpOFkEvwmd6QitsF0CTQEEB6XClsEdoFELUxfx2dpE'
});

Array.prototype.chunk = function(size) {
	var array = this;

	return [].concat.apply([], array.map(function(elem, i) {
		return i % size ? [] : [array.slice(i, i + size)];
	}));
};

var handleUserData = function(users) {
	inquirer.prompt([{
		type: 'confirm',
		name: 'valid',
		message: 'Are you sure you want to continue?',
		default: false
	}], function(answers) {
		if(!answers.valid)
			return console.log('ABORTING');

		async.eachSeries(users, function(user, callback) {
			T.post('blocks/create', { user_id: user.id_str }, function(err) {
				if(err) {
					return callback(err);
				}

				T.post('blocks/destroy', { user_id: user.id_str }, function(err) {
					if(err) {
						return callback(err);
					}

					console.log('Force unfollower: ' + user.screen_name);

					callback();
				});
			});
		}, function(err) {
			console.log('Complete.');
			console.log('You softblocked ' + users.length + ' users.');
		});
	});
};

var getUserData = function(chunks) {
	var nonmutual = [];

	async.eachSeries(chunks, function(users, callback) {
		T.post('users/lookup', { user_id: users.join(',') }, function(err, people) {
			if(err) {
				return callback(err);
			}

			for(var i = 0; i < people.length; i++) {
				var person = people[i];

				if(!person.following) {
					nonmutual.push(person);
				}
			}

			callback(err);
		});
	}, function(err) {
		if(err) {
			console.error('ERROR! ABORTING');
			throw err;
			return;
		}

		inquirer.prompt([{
			type: 'confirm',
			name: 'valid',
			message: 'Do you have ' + nonmutual.length + ' non-mutual followers?',
			default: false
		}], function(answers) {
			if(!answers.valid)
				return console.log('ABORTING');

			handleUserData(nonmutual);
		});
	});
};

T.get('followers/ids', { count: 5000 }, function(err, followers) {
	if(err) {
		console.error('ERROR! ABORTING');
		throw err;
		return;
	}

	var users = followers.ids;

	inquirer.prompt([{
		type: 'confirm',
		name: 'valid',
		message: 'Do you have ' + users.length + ' followers?',
		default: false
	}], function(answers) {
		if(!answers.valid)
			return console.log('ABORTING');

		var chunks = users.chunk(100);

		getUserData(chunks);
	});
});
