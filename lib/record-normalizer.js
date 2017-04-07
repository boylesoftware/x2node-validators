'use strict';

const common = require('x2node-common');

const ValidationContext = require('./validation-context.js');
const MessageResolver = require('./message-resolver.js');


/**
 * Validate and normalize the specified record.
 *
 * @function module:x2node-validators.normalizeRecord
 * @param {module:x2node-records~RecordTypesLibrary} recordType Record types
 * library.
 * @param {string} recordTypeName Record type name.
 * @param {Object} record The record to validate. May not be <code>null</code> or
 * <code>undefined</code>.
 * @param {string} [lang] Language for the error messages in the same format as
 * used by the HTTP's "Accept-Language" request header. If not provided, "*" is
 * assumed.
 * @param {string} [validationSet] Validation set name. If not provided, the
 * default validation set is used.
 * @returns {module:x2node-validators~ValidationErrors} Errors if the record is
 * invalid, or <code>null</code> if it has been successfully validated and
 * normalized.
 * @throws {module:x2node-common.X2UsageError} If unknown record type, record was
 * not provided or invalid language or validation set specification.
 */
function normalize(recordTypes, recordTypeName, record, lang, validationSet) {

	// check that we have the record
	if ((record === null) || ((typeof record) !== 'object'))
		throw new common.X2UsageError('Record object was not provided.');

	// get the record type descriptor (or throw error if invalid record type)
	const recordTypeDesc = recordTypes.getRecordTypeDesc(recordTypeName);

	// create validation context
	const ctx = new ValidationContext(
		recordTypeDesc, new MessageResolver(lang || '*'));

	// run recursive validation/normalization
	normalizeContainer(ctx, recordTypeDesc, record, validationSet);

	// return the result
	return ctx.getResult();
}

function normalizeContainer(ctx, container, containerObj, validationSet) {

	//...
}

// export the normalization function
exports.normalize = normalize;
