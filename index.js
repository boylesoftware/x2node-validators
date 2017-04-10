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
const standard = require('./lib/standard.js');


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
 * @param {Array} params Validator parameters from the subject definition.
 * @param {module:x2node-validators~ValidationContext} ctx Current validation
 * context.
 * @param {*} value The value to validate/normalize.
 * @returns {*} Normalized value, which, if different from the current value, is
 * set back into the record object.
 */
/**
 * Validator/normalizer function curried with the parameters.
 *
 * @protected
 * @callback module:x2node-validators.curriedValidator
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

/**
 * Used to by record types library extensions to mark record type and property
 * descriptors to disable validators.
 *
 * @private
 * @constant {Symbol}
 */
const VALIDATORS_DISABLED = Symbol('VALIDATORS_DISABLED');

/**
 * Can be used by record types library extensions to mark record type and
 * property descriptors so that the validators extension does not install any
 * validators on it (including the default ones).
 *
 * @param {*} desc Descriptor object to mark.
 */
exports.disable = function(desc) {

	desc[VALIDATORS_DISABLED] = true;
};

/**
 * Symbol on the context for the validation error messages stack.
 *
 * @private
 * @constant {Symbol}
 */
const VALIDATION_ERROR_MESSAGES_STACK = Symbol('VALIDATION_ERROR_MESSAGES');

/**
 * Symbol on the context for the validator definition stack.
 *
 * @private
 * @constant {Symbol}
 */
const VALIDATOR_DEFS_STACK = Symbol('VALIDATOR_DEFS');

function createValidationErrorMessages(base, subjDef) {

	if (!subjDef.validationErrorMessages)
		return base;

	const validationErrorMessages = Object.create(base);
	for (let messageId in subjDef.validationErrorMessages) {
		const messageDef = subjDef.validationErrorMessages[messageId];
		const existingMessageDef = validationErrorMessages[messageId];
		let newMessageDef;
		if (existingMessageDef &&
			(typeof existingMessageDef) === 'object' &&
			(typeof messageDef) === 'object') {
			newMessageDef = Object.create(existingMessageDef);
			for (let lang in messageDef)
				newMessageDef[lang] = messageDef[lang];
		} else {
			newMessageDef = messageDef;
		}
		validationErrorMessages[messageId] = newMessageDef;
	}

	return validationErrorMessages;
}

function createValidatorFuncs(base, subjDef, subjDescription) {

	if (!subjDef.validatorDefs)
		return base;

	const validatorFuncs = Object.create(base);
	for (let validatorId in subjDef.validatorDefs) {
		const validatorFunc = subjDef.validatorDefs[validatorId];
		if ((typeof validatorFunc) !== 'function')
			throw new common.X2UsageError(
				'Validator definition "' + validatorId + '" on ' +
					subjDescription + ' is not a function.');
		validatorFuncs[validatorId] = validatorFunc;
	}

	return validatorFuncs;
}

function createValidators(
	validatorFuncs, defaultValidators, subjDef, subjDescription) {

	const sets = new Object(defaultValidators);
	if (subjDef.validators) {
		if (Array.isArray(subjDef.validators)) {
			if (sets['*'])
				sets['*'] = sets['*'].concat(subjDef.validators);
			else
				sets['*'] = subjDef.validators;
		} else if ((typeof subjDef.validators) === 'object') {
			for (let setsSpec in subjDef.validators) {
				const setValidators = subjDef.validators[setsSpec];
				if (!Array.isArray(setValidators))
					throw new common.X2UsageError(
						'Invalid validators specification on ' +
							subjDescription + ': expected an array for' +
							' validation set ' + setsSpec + '.');
				for (let setId of setValidators.split(',')) {
					let set = sets[setId];
					if (!set)
						sets[setId] = set = new Array();
					for (let validatorSpec of setValidators)
						set.push(validatorSpec);
				}
			}
		} else {
			throw new common.X2UsageError(
				'Invalid validators specification on ' + subjDescription +
					': expected an object or an array.');
		}
	}

	let numValidators = 0;
	for (let setId in sets) {
		let validators = new Array();
		for (let validatorSpec of sets[setId]) {
			let validatorId, params;
			if ((typeof validatorSpec) === 'string') {
				validatorId = validatorSpec;
				if (validatorId.startsWith('-')) {
					validatorId = validatorId.substring(1);
					validators = validators.filter(v => (v.id !== validatorId));
					continue;
				}
			} else if (Array.isArray(validatorSpec) && (validatorSpec.length > 0)) {
				validatorId = validatorSpec[0];
				if (validatorSpec.length > 1)
					params = validatorSpec.slice(1);
			} else {
				throw new common.X2UsageError(
					'Invalid validators specification on ' + subjDescription +
						': each validator must be either a string or a' +
						' non-empty array.');
			}
			const validatorFunc = validatorFuncs[validatorId];
			if (!validatorFunc)
				throw new common.X2UsageError(
					'Invalid validators specification on ' + subjDescription +
						': unknown validator "' + validatorId + '".');
			validators.push({
				id: validatorId,
				func: validatorFunc.bind(undefined, params)
			});
		}
		if (validators.length > 0) {
			sets[setId] = validators.map(v => v.func);
			numValidators += validators.length;
		}
	}

	return (numValidators > 0 ? sets : null);
}

// extend record types library
exports.extendRecordTypesLibrary = function(ctx, recordTypes) {

	// tag the library
	if (recordTypes[TAG])
		throw new common.X2UsageError(
			'The library is already extended by the validators module.');
	recordTypes[TAG] = true;

	// create top validation error messages and set them on the context
	ctx[VALIDATION_ERROR_MESSAGES_STACK] = new Array();
	ctx[VALIDATION_ERROR_MESSAGES_STACK].push(createValidationErrorMessages(
		standard.VALIDATION_ERROR_MESSAGES, recordTypes.definition));

	// create top validator definitions and set them on the context
	ctx[VALIDATOR_DEFS_STACK] = new Array();
	ctx[VALIDATOR_DEFS_STACK].push(createValidatorFuncs(
		standard.VALIDATOR_DEFS, recordTypes.definition));

	// return it
	return recordTypes;
};

/**
 * Validators module specific
 * [RecordTypeDescriptor]{@link module:x2node-records~RecordTypeDescriptor}
 * extension.
 *
 * @mixin RecordTypeDescriptorWithValidators
 * @static
 */

// extend record type descriptors and property containers
exports.extendPropertiesContainer = function(ctx, container) {

	// subject description for errors
	const subjDescription = 'record type ' + String(container.recordTypeName) + (
		container.isRecordType() ? '' : ' property ' + container.nestedPath);

	// push and pop context validation error messgaes and validator definitions
	const validationErrorMessagesStack = ctx[VALIDATION_ERROR_MESSAGES_STACK];
	const validationErrorMessages = createValidationErrorMessages(
		validationErrorMessagesStack[validationErrorMessagesStack.length - 1],
		container.definition);
	validationErrorMessagesStack.push(validationErrorMessages);
	const validatorDefsStack = ctx[VALIDATOR_DEFS_STACK];
	const validatorFuncs = createValidatorFuncs(
		validatorDefsStack[validatorDefsStack.length - 1],
		container.definition, subjDescription);
	validatorDefsStack.push(validatorFuncs);
	ctx.onContainerComplete(() => {
		validationErrorMessagesStack.pop();
		validatorDefsStack.pop();
	});

	// extend record type
	if (container.isRecordType()) {

		// get record type title
		container._title = (
			container.definition.title || String(container.recordTypeName));

		// set validation error messages on the record type descriptor
		container._validationErrorMessages = validationErrorMessages;

		// set up record validators
		container._validators = null;
		ctx.onContainerComplete(container => {
			if (!container[VALIDATORS_DISABLED])
				container._validators = createValidators(
					validatorFuncs, {}, container.definition, subjDescription);
		});

		/**
		 * Record type title.
		 *
		 * @member {(string|Object.<string|string>)} module:x2node-validators.RecordTypeDescriptorWithValidators#title
		 * @readonly
		 */
		Object.defineProperty(container, 'title', {
			get() { return this._title; }
		});

		/**
		 * Context validation error messages for the record type and its
		 * properties. The keys are message ids, the values are either message
		 * template strings, or objects with language codes as keys and localized
		 * message templates strings as values.
		 *
		 * @member {Object.<string,(string|Object.<string,string>)>} module:x2node-validators.RecordTypeDescriptorWithValidators#validationErrorMessages
		 * @readonly
		 */
		Object.defineProperty(container, 'validationErrorMessages', {
			get() { return this._validationErrorMessages; }
		});

		/**
		 * Record validators/normalizers or <code>null</code> if no validators.
		 * The keys are validation sets, including "*" for the validators that
		 * always run, and the values are the functions.
		 *
		 * @member {?Object.<string,Array.<module:x2node-validators.curriedValidator>>} module:x2node-validators.RecordTypeDescriptorWithValidators#validators
		 * @readonly
		 */
		Object.defineProperty(container, 'validators', {
			get() { return this._validators; }
		});
	}

	// return the container
	return container;
};

/**
 * Validators module specific
 * [PropertyDescriptor]{@link module:x2node-records~PropertyDescriptor}
 * extension.
 *
 * @mixin PropertyDescriptorWithValidators
 * @static
 */

// extend property descriptors
exports.extendPropertyDescriptor = function(ctx, propDesc) {

	// get property title
	propDesc._title = (propDesc.definition.title || propDesc.name);

	// subject description for errors
	const subjDescription = 'property ' + propDesc.container.nestedPath +
		propDesc.name + ' of record type ' +
		String(propDesc.container.recordTypeName);

	// create context validation error messages and validator definitions
	const validationErrorMessagesStack = ctx[VALIDATION_ERROR_MESSAGES_STACK];
	let validationErrorMessages = createValidationErrorMessages(
		validationErrorMessagesStack[validationErrorMessagesStack.length - 1],
		propDesc.definition
	);
	const validatorDefsStack = ctx[VALIDATOR_DEFS_STACK];
	let validatorFuncs = createValidatorFuncs(
		validatorDefsStack[validatorDefsStack.length - 1],
		propDesc.definition, subjDescription);

	// set validation error messages on the property descriptor
	propDesc._validationErrorMessages = validationErrorMessages;

	// setup validators is not a view
	propDesc._validators = null;
	if (!propDesc.isView()) {

		// set up property validators
		ctx.onContainerComplete(() => {
			if (!propDesc[VALIDATORS_DISABLED]) {

				// determine default validators
				const defaultValidators = [];
				const defaultElementValidators = [];
				if (!propDesc.optional)
					defaultValidators.push('required');
				let contextValidators = defaultValidators;
				if (propDesc.isArray()) {
					defaultValidators.push('array');
					if (propDesc.scalarValueType === 'object')
						defaultElementValidators.push('required');
					contextValidators = defaultElementValidators;
				} else if (propDesc.isMap()) {
					defaultValidators.push('object');
					if (propDesc.scalarValueType === 'object')
						defaultElementValidators.push('required');
					contextValidators = defaultElementValidators;
				}
				switch (propDesc.scalarValueType) {
				case 'string':
					contextValidators.push('string');
					contextValidators.push('trim');
					break;
				case 'number':
					contextValidators.push('number');
					break;
				case 'boolean':
					contextValidators.push('boolean');
					break;
				case 'datetime':
					contextValidators.push('datetime');
					break;
				case 'ref':
					contextValidators.push([ 'ref', propDesc.refTarget ]);
					break;
				case 'object':
					contextValidators.push('object');
				}

				// set up the validators
				propDesc._validators = createValidators(
					validatorFuncs, {
						'*': defaultValidators,
						'element:*': defaultElementValidators
					},
					propDesc.definition, subjDescription);
			}
		});
	}

	/**
	 * Property title.
	 *
	 * @member {(string|Object.<string|string>)} module:x2node-validators.PropertyDescriptorWithValidators#title
	 * @readonly
	 */
	Object.defineProperty(propDesc, 'title', {
		get() { return this._title; }
	});

	/**
	 * Context validation error messages for the property (and nested properties
	 * if the property is a nested object). The keys are message ids, the values
	 * are either message template strings, or objects with language codes as
	 * keys and localized message templates strings as values.
	 *
	 * @member {Object.<string,(string|Object.<string,string>)>} module:x2node-validators.PropertyDescriptorWithValidators#validationErrorMessages
	 * @readonly
	 */
	Object.defineProperty(propDesc, 'validationErrorMessages', {
		get() { return this._validationErrorMessages; }
	});

	/**
	 * Property validators/normalizers or <code>null</code> if no validators. The
	 * keys are validation sets, including "*" for the validators that always
	 * run, and the values are the functions.
	 *
	 * @member {?Object.<string,Array.<module:x2node-validators.curriedValidator>>} module:x2node-validators.PropertyDescriptorWithValidators#validators
	 * @readonly
	 */
	Object.defineProperty(propDesc, 'validators', {
		get() { return this._validators; }
	});

	// return the descriptor
	return propDesc;
};
