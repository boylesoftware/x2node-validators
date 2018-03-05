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

	// extract validation sets
	var sets = new Set(
		(validationSets ? validationSets.trim() + ',*' : '*').split(/\s*,\s*/));

	// create validation context
	const ctx = new ValidationContext(
		recordTypes, recordTypeDesc, new MessageResolver(lang || '*'), sets);

	// run recursive validation/normalization of the record properties
	normalizeChildren(ctx, recordTypeDesc, null, record, sets);

	// validate/normalize the record as a whole
	const recordValidators = getValidators(recordTypeDesc, false, sets);
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
 * @param {?string} subtypeName For a subtype sub-container of a polymorphic
 * object container this is the subtype name.
 * @param {Object} containerObj Unvalidated container object matching the
 * container descriptor.
 * @param {Set.<string>} validationSets Validation sets.
 */
function normalizeChildren(
	ctx, container, subtypeName, containerObj, validationSets) {

	// validate type if polymorphic object container
	let subtype;
	if (container.isPolymorphObject()) {
		subtype = containerObj[container.typePropertyName];
		if (((typeof subtype) !== 'string') || !container.hasProperty(subtype)) {
			ctx.addErrorFor(
				ctx.currentPointer.toString() + '/' + container.typePropertyName,
				'{invalidType}');
			return;
		}
	}

	// go over container properties
	for (let propName of container.allPropertyNames) {
		const propDesc = container.getPropertyDesc(propName);

		// skip views
		if (propDesc.isView())
			continue;

		// check if subtype
		if (propDesc.isSubtype()) {
			if (propDesc.name === subtype) {
				normalizeChildren(
					ctx, propDesc.nestedProperties, subtype, containerObj,
					validationSets);
				const validators = getValidators(propDesc, false, validationSets);
				if (validators)
					for (let validator of validators)
						validator(ctx, containerObj);
			}
			continue;
		}

		// get property value from the record
		const originalValue = containerObj[propName];

		// descend into validating the property
		ctx.descend(
			(subtypeName ? subtypeName + ':' + propName : propName),
			containerObj
		);

		// validate property's nested elements if any
		let value = originalValue;
		if (propDesc.isArray()) {
			if (Array.isArray(value) && (value.length > 0)) {
				const elementValidators = getValidators(
					propDesc, true, validationSets);
				if (propDesc.scalarValueType === 'object') {
					for (let i = 0, len = value.length; i < len; i++) {
						const originalElementValue = value[i];
						let elementValue = originalElementValue;
						ctx.descend(String(i), value);
						if (((typeof elementValue) === 'object') &&
							(elementValue !== null))
							normalizeChildren(
								ctx, propDesc.nestedProperties, null,
								elementValue, validationSets);
						if (elementValidators) {
							for (let validator of elementValidators)
								elementValue = validator(ctx, elementValue);
							if (elementValue !== originalElementValue)
								value[i] = elementValue;
						}
						ctx.ascend();
					}
				} else if (elementValidators) {
					for (let i = 0, len = value.length; i < len; i++) {
						const originalElementValue = value[i];
						let elementValue = originalElementValue;
						ctx.descend(String(i), value);
						for (let validator of elementValidators)
							elementValue = validator(ctx, elementValue);
						if (elementValue !== originalElementValue)
							value[i] = elementValue;
						ctx.ascend();
					}
				}
			}
		} else if (propDesc.isMap()) {
			if (((typeof value) === 'object') && (value !== null)) {
				const keys = Object.keys(value);
				const elementValidators = getValidators(
					propDesc, true, validationSets);
				if (propDesc.scalarValueType === 'object') {
					for (let key of keys) {
						const originalElementValue = value[key];
						let elementValue = originalElementValue;
						ctx.descend(key, value);
						if (((typeof elementValue) === 'object') &&
							(elementValue !== null))
							normalizeChildren(
								ctx, propDesc.nestedProperties, null,
								elementValue, validationSets);
						if (elementValidators) {
							for (let validator of elementValidators)
								elementValue = validator(ctx, elementValue);
							if (elementValue !== originalElementValue)
								value[key] = elementValue;
						}
						ctx.ascend();
					}
				} else if (elementValidators) {
					for (let key of keys) {
						const originalElementValue = value[key];
						let elementValue = originalElementValue;
						ctx.descend(key, value);
						for (let validator of elementValidators)
							elementValue = validator(ctx, elementValue);
						if (elementValue !== originalElementValue)
							value[key] = elementValue;
						ctx.ascend();
					}
				}
			}
		} else if ((propDesc.scalarValueType === 'object') &&
			((typeof value) === 'object') && (value !== null)) {
			normalizeChildren(
				ctx, propDesc.nestedProperties, null, value, validationSets);
		}

		// run property validators
		const validators = getValidators(propDesc, false, validationSets);
		if (validators)
			for (let validator of validators)
				value = validator(ctx, value);

		// replace original value in the record if was normalized
		if (value !== originalValue)
			containerObj[propName] = value;

		// ascend from the property validation
		ctx.ascend();
	}
}

/**
 * Get validators sequence for the specified subject descriptor.
 *
 * @private
 * @param {(module:x2node-records~RecordTypeDescriptor|module:x2node-records~PropertyDescriptor)} subjDesc
 * Descriptor with validators on it.
 * @param {boolean} element <code>true</code> for collection element validators.
 * @param {Set.<string>} validationSets Validation sets.
 * @returns {Array.<module:x2node-validators.curriedValidator>} List of
 * validators to run or <code>null</code> if none.
 */
function getValidators(subjDesc, element, validationSets) {

	const validators = subjDesc.validators;

	if (!validators)
		return null;

	const allValidators = new Array();
	for (let set in validators) {
		if (element && !set.startsWith('element:'))
			continue;
		if (validationSets.has(element ? set.substring('element:'.length) : set))
			for (let validator of validators[set])
				allValidators.push(validator);
	}

	return (allValidators.length > 0 ? allValidators : null);
}

// export the normalization function
exports.normalize = normalize;
