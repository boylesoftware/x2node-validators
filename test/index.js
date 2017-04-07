'use strict';

const expect = require('chai').expect;

const validators = require('../index.js');

describe('x2node-validators Module', function() {
	describe('.isSupported()', function() {
		it('should return false for untagged object', function() {
			expect(validators.isSupported({})).to.be.false;
		});
	});
});
