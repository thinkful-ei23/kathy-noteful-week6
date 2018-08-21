'use strict';

// require jwt and
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { JWT_SECRET } = require('../config');
// require jwt above

//create object
const options = {
	secretOrKey: JWT_SECRET,
	jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
	algorithms: ['HS256']
};

const jwtStrategy = new JwtStrategy(options, (payload, done) => {
	done(null, payload.user);
});

module.exports = jwtStrategy;