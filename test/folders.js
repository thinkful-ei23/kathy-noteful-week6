'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');
const Folder = require('../models/folder');
const seedFolders = require('../db/seed/folders');
const User = require('../models/user');
const seedUsers = require('../db/seed/users');


const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Folders', function () {

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });
  let token;
  let user;

  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      Folder.insertMany(seedFolders),
      Folder.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username })
        // user is defined console.log('1111 user in beforeEach', user);
      })

  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET /api/folders', function () {

    it('should return a list sorted by name with the correct number of folders', function () {
      // updates endpoint to return userId, folderId, folder.name
      const dbPromise = Folder.find({ userId: user.id }); //add a filter to the database query
      const apiPromise = chai.request(app) // update the assertion
        .get('/api/folders')
        .set('Authorization', `Bearer ${token}`); // Update your test with the Authorization header

      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list with the correct fields and values', function () {
      const dbPromise = Folder.find({ userId: user.id });
      console.log('token', token);
      const apiPromise = chai.request(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        //Folder.find().sort('name'), //replaced with dbPromice
        //chai.request(app).get('/api/folders') // replaced with apiPromise
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          // expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item, i) {
            expect(item).to.be.an('object');
            expect(item).to.have.all.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
            expect(item.id).to.equal(data[i].id);
            expect(item.name).to.equal(data[i].name);
            expect(item.user).to.equal(data.user_id)
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);

          });
        });
    });
  });

  describe('GET /api/folders/:id', function () {

    it('should return correct folder', function () {
      let data;
      const dbPromise = Folder.find({ userId: user.id });

      return dbPromise
        .then(_data => {
          data = _data[0];
          console.log('data', data);
          return chai.request(app)
            .get(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          //console.log('11111111111res.body', res.body);
          expect(res.body).to.have.all.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id',

      function () {
        const dbPromise = Folder.findOne({ userId: user.id });
        const apiPromise = chai.request(app)
          .get('/api/folders/NOT-A-VALID-ID')
          .set('Authorization', `Bearer ${token}`);

        return Promise.all([dbPromise, apiPromise])
          .then(([data, res]) => {
            expect(res).to.be.json;
            expect(res).to.have.status(400);
            expect(res.body.message).to.eql('The `id` is not valid');
          });
      });

    it('should respond with a 404 for an ID that does not exist', function () {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      const dbPromise = Folder.findOne({ userId: user.id });
      const apiPromise = chai.request(app)
        .get('/api/folders/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`);
      return Promise.all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.be.json;
          expect(res).to.have.status(404);
        });
    });

  });

  describe('POST /api/folders', function () {

    it('should create and return a new item when provided valid data', function () {
      const newFolder = { 'name': 'newName' };
      let body;
      return chai.request(app) // post new folder to api with a user JWT
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newFolder)
        .then(function (res) {   // get response - verify res is correct
          body = res.body;
          expect(res).to.have.status(201);  //checking that the create folder was successful line 166 - 170
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res).to.have.a.header('location');
          expect(res.body).to.have.all.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
          return Folder.findById(body.id);   // search db for new folder by id and userId
        })
        .then(function (folder) { //folder = data
          expect(body.id).to.equal(folder.id);  // get id from API-res and verify it to one in the db
          expect(body.name).to.equal(folder.name);  // validate name in db is what was sent
          expect(new Date(body.createdAt)).to.eql(folder.createdAt);
          expect(new Date(body.updatedAt)).to.eql(folder.updatedAt);

        })
    });

    it('should return an error when missing "name" field', function () {
      const newFolder = {};
      //const dbPromise = Folder.find({ userId: user.id });
      //const apiPromise =
      return chai.request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newFolder)

        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.findOne()
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app)
            .post('/api/folders')
            .set('Authorization', `Bearer ${token}`)
            .send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

  });

  describe('PUT /api/folders/:id', function () {

    it('should update the folder', function () {
      const updateFolder = { 'name': 'Updated Name' };
      let data;
      return Folder.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateFolder);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateFolder.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect item to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });


    it('should respond with a 400 for an invalid id', function () {
      const updateItem = { 'name': 'Blah' };
      return chai.request(app)
        .put('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eql('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      const updateItem = { 'name': 'Blah' };
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .put('/api/folders/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function () {
      const updateItem = {};
      let data;
      return Folder.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.find().limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/folders/${item1.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(item1);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

  });

  describe('DELETE /api/folders/:id', function () {

    it('should delete an existing document and respond with 204', function () {
      let data;
      return Folder.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app)
            .delete(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Folder.count({ _id: data.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

  });

});