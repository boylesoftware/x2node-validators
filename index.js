/**
 * Record validation/normalization module.
 *
 * @module x2node-validators
 * @requires module:x2node-common
 * @requires module:x2node-records
 * @requires module:x2node-patches
 * @implements {module:x2node-records.Extension}
 */
'use strict';

const common = require('x2node-common');

const recordNormalizer = require('./lib/record-normalizer.js');


/////////////////////////////////////////////////////////////////////////////////
// Module
/////////////////////////////////////////////////////////////////////////////////

/**
 * Compatibility tag.
 *
 * @private
 * @constant {Symbol}
 */
const TAG = Symbol('X2NODE_VALIDATORS');

/**
 * Tell if the provided object is supported by the module. Currently, only a
 * record types library instance can be tested using this function and it tells
 * if the library was constructed with the <code>x2node-validators</code>
 * extension.
 *
 * @param {*} obj Object to test.
 * @returns {boolean} <code>true</code> if supported by the validators module.
 */
exports.isSupported = function(obj) {

	return (obj[TAG] ? true : false);
};

/**
 * Validator/normalizer function.
 *
 * @callback module:x2node-validators.validator
 * @param {module:x2node-validators~ValidationContext} ctx Current validation
 * context.
 * @param {*} value The value to validate/normalize.
 * @returns {*} Normalized value, which, if different from the current value, is
 * set back into the record object.
 */

/**
 * Validation errors object. The keys are RFC 6901 JSON pointers for the invalid
 * parts of the record (empty string for error about the record as a whole). The
 * values are arrays of error messages.
 *
 * @typedef {Object.<string,Array.<string>>} module:x2node-validators~ValidationErrors
 */

// export record normalization function
exports.normalizeRecord = function(
	recordTypes, recordTypeName, record, lang, validationSets) {

	if (!recordTypes[TAG])
		throw new common.X2UsageError(
			'Record types library does not have the validators extension.');

	return recordNormalizer.normalize(
		recordTypes, recordTypeName, record, lang, validationSets);
}


/////////////////////////////////////////////////////////////////////////////////
// Record Types Library Extension
/////////////////////////////////////////////////////////////////////////////////

//...
