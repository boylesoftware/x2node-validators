/**
 * Record validation/normalization module.
 *
 * @module x2node-validators
 * @requires module:x2node-common
 * @requires module:x2node-records
 * @requires module:x2node-pointers
 * @implements {module:x2node-records.Extension}
 */
'use strict';

const common = require('x2node-common');

const recordNormalizer = require('./lib/record-normalizer.js');
const standard = require('./lib/standard.js');
const ValidationErrors = require('./lib/validation-errors.js');


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

// export record normalization function
exports.normalizeRecord = function(
	recordTypes, recordTypeName, record, lang, validationSets) {

	if (!recordTypes[TAG])
		throw new common.X2UsageError(
			'Record types library does not have the validators extension.');

	return recordNormalizer.normalize(
		recordTypes, recordTypeName, record, lang, validationSets);
}

/**
 * Create new, empty validation errors object.
 *
 * @returns {module:x2node-validators~ValidationErrors} Validation errors object.
 */
exports.createValidationErrors = function() {

	return new ValidationErrors();
};

/**
 * Tell if the provided object is a validation errors object.
 *
 * @param {*} obj The object to test.
 * @returns {boolean} <code>true</code> if instance of
 * [ValidationErrors]{@link module:x2node-validators~ValidationErrors}.
 */
exports.isValidationErrors = function(obj) {

	return (obj instanceof ValidationErrors);
};


/////////////////////////////////////////////////////////////////////////////////
// Record Types Library Extension
/////////////////////////////////////////////////////////////////////////////////

/**
 * Used to by record types library extensions to associate alternative list of
 * default validators with record type and property descriptors.
 *
 * @private
 * @constant {Symbol}
 */
const DEFAULT_VALIDATORS = Symbol('DEFAULT_VALIDATORS');

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

/**
 * Can be used by record types library extensions to replace the default set of
 * validators on a record type or property descriptor. Note that the validators
 * module installs validators on properties and record types in an
 * <code>onContainerComplete</code> handler, so extensions must call this
 * function before that.
 *
 * @param {(module:x2node-records~RecordTypeDescriptor|module:x2node-records~PropertyDescriptor)} desc
 * The descriptor. May not be a view.
 * @param {Object.<string,Array.<(string|Array)>>} validators Validator
 * specifications as would be provided on the definition.
 */
exports.replaceDefaultValidators = function(desc, validators) {

	if (desc.isView && desc.isView())
		throw new common.X2UsageError(
			'May not have validators on a view property.');

	desc[DEFAULT_VALIDATORS] = validators;
};

/**
 * Can be used by record types library extensions to add validators to the
 * default set of validators on a record type or property descriptor. Note that
 * the validators module installs validators on properties and record types in an
 * <code>onContainerComplete</code> handler, so extensions must call this
 * function before that.
 *
 * @param {(module:x2node-records~RecordTypeDescriptor|module:x2node-records~PropertyDescriptor)} desc
 * The descriptor. May not be a view.
 * @param {Object.<string,Array.<(string|Array)>>} validators Validator
 * specifications as would be provided on the definition.
 */
exports.addDefaultValidators = function(desc, validators) {

	if (desc.isView && desc.isView())
		throw new common.X2UsageError(
			'May not have validators on a view property.');

	const defaultValidators = desc[DEFAULT_VALIDATORS];
	for (let setId in validators) {
		const setValidators = validators[setId];
		let defaultSetValidators = defaultValidators[setId];
		if (!defaultSetValidators)
			defaultValidators[setId] = defaultSetValidators = new Array();
		for (let validator of setValidators)
			defaultSetValidators.push(validator);
	}
};

/**
 * Can be used by record types library extensions to register additional
 * validation error messages available to the library. Depending on where the
 * function is called the registred message scope is determined. For example, if
 * called in the extention's <code>extendRecordTypesLibrary()</code> method, the
 * message is registred for the whole library.
 *
 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
 * construction context.
 * @param {string} messageId Message identifier.
 * @param {Object.<string,string>} messageDef Message definition. The keys are
 * language codes, the values are message templates.
 */
exports.registerValidationErrorMessage = function(ctx, messageId, messageDef) {

	const validationErrorMessagesStack = ctx[VALIDATION_ERROR_MESSAGES_STACK];
	const validationErrorMessages = validationErrorMessagesStack[
		validationErrorMessagesStack.length - 1];

	validationErrorMessages[messageId] = messageDef;
};

/**
 * Can be used by record types library extensions to register additional
 * validators available to the library. Depending on where the function is called
 * the registred validator scope is determined. For example, if called in the
 * extention's <code>extendRecordTypesLibrary()</code> method, the validator is
 * registred for the whole library.
 *
 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
 * construction context.
 * @param {string} validatorId Validator id.
 * @param {module:x2node-validators.validator} Validator function.
 */
exports.registerValidator = function(ctx, validatorId, validatorFunc) {

	const validatorDefsStack = ctx[VALIDATOR_DEFS_STACK];
	const validatorFuncs = validatorDefsStack[validatorDefsStack.length - 1];

	validatorFuncs[validatorId] = validatorFunc;
};

/**
 * Create validation error messages set for the specified container or property.
 *
 * @private
 * @param {Object.<string,Object<string,string>>} base Base validation error
 * messages set from the context.
 * @param {Object} subjDef Subject definition object possibly containing a
 * <code>validationErrorMessages</code> attribute.
 * @returns {Object.<string,Object<string,string>>} Validation error messages set
 * to use for the subject.
 */
function createValidationErrorMessages(base, subjDef) {

	if (!subjDef.validationErrorMessages &&
		(base !== standard.VALIDATION_ERROR_MESSAGES))
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

/**
 * Create validator functions set for the specified container or property.
 *
 * @private
 * @param {Object.<string,module:x2node-validators.validator>} base Base
 * validator functions set from the context.
 * @param {Object} subjDef Subject definition object possibly containing a
 * <code>validatorDefs</code> attribute.
 * @param {string} subjDescription Subject description for error messages.
 * @returns {Object.<string,module:x2node-validators.validator>} validator
 * functions set to use for the subject.
 */
function createValidatorFuncs(base, subjDef, subjDescription) {

	if (!subjDef.validatorDefs && (base !== standard.VALIDATOR_DEFS))
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

/**
 * Create validators for the container or property.
 *
 * @private
 * @param {Object.<string,module:x2node-validators.validator>} validatorFuncs
 * Validator functions set.
 * @param {Object} defaultValidators Default validators specification for the
 * subject.
 * @param (Object} subjDef Subject definition object possibly containing a
 * <code>validators</code> attribute.
 * @param {string} subjDescription Subject description for error messages.
 * @returns {Object.<string,Array.<module:x2node-validators.curriedValidator>>}
 * The validators for the subject.
 */
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
				for (let setId of setsSpec.split(',')) {
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

	if (subjDef.elementValidators) {
		if (Array.isArray(subjDef.elementValidators)) {
			if (sets['element:*'])
				sets['element:*'] = sets['element:*'].concat(
					subjDef.elementValidators);
			else
				sets['element:*'] = subjDef.elementValidators;
		} else if ((typeof subjDef.elementValidators) === 'object') {
			for (let setsSpec in subjDef.elementValidators) {
				const setValidators = subjDef.elementValidators[setsSpec];
				if (!Array.isArray(setValidators))
					throw new common.X2UsageError(
						'Invalid element validators specification on ' +
							subjDescription + ': expected an array for' +
							' validation set ' + setsSpec + '.');
				for (let setId of setsSpec.split(',')) {
					let set = sets['element:' + setId];
					if (!set)
						sets['element:' + setId] = set = new Array();
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
		container[DEFAULT_VALIDATORS] = new Object();
		ctx.onContainerComplete(container => {
			container._validators = createValidators(
				validatorFuncs, container[DEFAULT_VALIDATORS],
				container.definition, subjDescription);
		});

		/**
		 * Record type title.
		 *
		 * @member {(string|Object.<string,string>)} module:x2node-validators.RecordTypeDescriptorWithValidators#title
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
	if (!propDesc.isView() && !propDesc.isPolymorphObjectType()) {

		// determine default validators
		const defaultValidators = [];
		const defaultElementValidators = [];
		if (!propDesc.optional)
			defaultValidators.push('required');
		let contextValidators = defaultValidators;
		if (propDesc.isArray()) {
			defaultValidators.push('array');
			if (propDesc.scalarValueType === 'object') {
				defaultElementValidators.push('required');
			} else if (!propDesc.allowDuplicates) {
				defaultValidators.push('noDupes');
			}
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
		propDesc[DEFAULT_VALIDATORS] = {
			'*': defaultValidators,
			'element:*': defaultElementValidators
		};

		// set up property validators
		ctx.onContainerComplete(() => {
			propDesc._validators = createValidators(
				validatorFuncs, propDesc[DEFAULT_VALIDATORS],
				propDesc.definition, subjDescription);
		});
	}

	/**
	 * Property title.
	 *
	 * @member {(string|Object.<string,string>)} module:x2node-validators.PropertyDescriptorWithValidators#title
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
