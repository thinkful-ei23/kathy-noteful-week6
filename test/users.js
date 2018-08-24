'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');

const User = require('../models/user');
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');


const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Users', function () {
	const username = 'exampleUser';
	const password = 'examplePass';
	const fullname = 'Example User';

	before(function () {
		return mongoose.connect(TEST_MONGODB_URI)
			.then(() => mongoose.connection.db.dropDatabase());
	});

	let user;
	let token;
	beforeEach(function () {
		return Promise.all([
			User.insertMany(seedUsers),
			Note.insertMany(seedNotes),
			Folder.insertMany(seedFolders),
			Tag.insertMany(seedTags)
		])
			.then(([users]) => {
				user = users[0];
				//console.log('1111111111111111 user in beforeEach', user);
				token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
				// user is defined

			})
	});

	afterEach(function () {
		return mongoose.connection.db.dropDatabase();
	});

	after(function () {
		return mongoose.disconnect();
	});

	describe('/api/users', function () {
		describe('POST', function () {
			it('Should create a new user', function () {
				const testUser = { username, password, fullname };

				let res;
				return chai
					.request(app)
					.post('/api/users')
					.send(testUser)
					.then(_res => {
						res = _res;
						expect(res).to.have.status(201);
						expect(res.body).to.be.an('object');
						expect(res.body).to.have.keys('id', 'username', 'fullname');

						expect(res.body.id).to.exist;
						expect(res.body.username).to.equal(testUser.username);
						expect(res.body.fullname).to.equal(testUser.fullname);

						return User.findOne({ username });
					})
					.then(user => {
						expect(user).to.exist;
						expect(user.id).to.equal(res.body.id);
						expect(user.fullname).to.equal(testUser.fullname);
						return user.validatePassword(password);
					})
					.then(isValid => {
						expect(isValid).to.be.true;
					});
			});
			it('Should reject users with missing username', function () {
				const testUser = { password, fullname };
				return chai.request(app).post('/api/users').send(testUser)
					.then(res => {

            /**
             * CREATE YOUR ASSERTIONS HERE
             */

					});
			});

      /**
       * COMPLETE ALL THE FOLLOWING TESTS
       */
			it('Should reject users with missing password');
			it('Should reject users with non-string username');
			it('Should reject users with non-string password');
			it('Should reject users with non-trimmed username');
			it('Should reject users with non-trimmed password');
			it('Should reject users with empty username');
			it('Should reject users with password less than 8 characters');
			it('Should reject users with password greater than 72 characters');
			it('Should reject users with duplicate username');
			it('Should trim fullname');
		});
	});
});