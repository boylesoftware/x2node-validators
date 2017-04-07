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
 * @param {string} [validationSets] Comma-separated validation set names. If not
 * provided, the default validation set is used.
 * @returns {module:x2node-validators~ValidationErrors} Errors if the record is
 * invalid, or <code>null</code> if it has been successfully validated and
 * normalized.
 * @throws {module:x2node-common.X2UsageError} If unknown record type, record was
 * not provided or invalid language or validation set specification.
 */
function normalize(recordTypes, recordTypeName, record, lang, validationSets) {

	// check that we have the record
	if ((record === null) || ((typeof record) !== 'object'))
		throw new common.X2UsageError('Record object was not provided.');

	// get the record type descriptor (or throw error if invalid record type)
	const recordTypeDesc = recordTypes.getRecordTypeDesc(recordTypeName);

	// create validation context
	const ctx = new ValidationContext(
		recordTypeDesc, new MessageResolver(lang || '*'));

	// extract validation sets
	var sets = new Set(
		(validationSets ? validationSets + ',*' : '*').split(','));

	// run recursive validation/normalization of the record properties
	normalizeChildren(ctx, recordTypeDesc, record, sets);

	// validate/normalize the record as a whole
	const recordValidators = getValidators(recordTypeDesc, sets);
	if (recordValidators)
		for (let validator of recordValidators)
			validator(ctx, record);

	// return the result
	return ctx.getResult();
}

/**
 * Recursively validate/normalize record element's children.
 *
 * @private
 * @param {module:x2node-validators~ValidationContext} ctx Validation context.
 * @param {module:x2node-records~PropertiesContainer} container Container
 * descriptor.
 * @param {Object} containerObj Unvalidated container object matching the
 * container descriptor.
 * @param {Set.<string>} validationSets Validation sets.
 */
function normalizeChildren(ctx, container, containerObj, validationSets) {

	for (let propName of container.allPropertyNames) {
		const propDesc = container.getPropertyDesc(propName);

		if (propDesc.isView())
			continue;

		const originalValue = containerObj[propName];
		const validators = getValidators(propDesc, validationSets);

		let value = originalValue;
		if (propDesc.scalarValueType === 'object') {
			if (propDesc.isArray()) {
				//...
			} else if (propDesc.isMap()) {
				//...
			} else {
				//...
			}
		} else if (validators) {
			if (propDesc.isArray()) {
				//...
			} else if (propDesc.isMap()) {
				//...
			} else {
				ctx.descend(propName, containerObj);
				for (let validator of validators)
					value = validator(ctx, value);
				ctx.ascend();
			}
		}

		if (value !== originalValue)
			containerObj[propName] = value;
	}
}

/**
 * Get validators sequence for the specified subject descriptor.
 *
 * @private
 * @param {(module:x2node-records~RecordTypeDescriptor|module:x2node-records~PropertyDescriptor)} subjDesc
 * Descriptor with validators on it.
 * @param {Set.<string>} validationSets Validation sets.
 * @returns {Array.<module:x2node-validators.validator>} List of validators to
 * run or <code>null</code> if none.
 */
function getValidators(subjDesc, validationSets) {

	const validators = subjDesc.validators;

	if (!validators)
		return null;

	const allValidators = new Array();
	for (let set in validators) {
		if (validationSets.has(set))
			for (let validator of validators[set])
				allValidators.push(validator);
	}

	return (allValidators.length > 0 ? allValidators : null);
}

// export the normalization function
exports.normalize = normalize;
