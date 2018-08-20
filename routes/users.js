'use strict';

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const User = require('../models/user');

// POST user to db
router.post('/users', (req, res, next) => {
	const { username, password } = req.body;


	return User.find({ username })
		.count()
		.then(count => {
			if (count > 0) {
				return Promise.reject({
					code: 422,
					reason: 'ValidationError',
					message: 'Username already taken',
					location: 'username'
				});
			}
			return User.hashPassword(password);
		})
		.then(result => {
			if (result) {
				res.location(`${req.originalUrl}/${result.id}`)
					.status(201)
					.json(result);
			}
		})
		.catch(err => {
			if (err.code === 11000) {
				err = new Error('Username already exists');
				err.status = 400;
			}
			next(err);
		})
});


module.exports = router;