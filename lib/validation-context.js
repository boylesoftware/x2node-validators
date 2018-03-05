'use strict';

const pointers = require('x2node-pointers');

const ValidationErrors = require('./validation-errors.js');


/**
 * Validation context used by the validator functions to access the validation
 * environment and report errors.
 *
 * @memberof module:x2node-validators
 * @inner
 */
class ValidationContext {

	/**
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Instances of the context are provided to the validators by the
	 * framework.
	 *
	 * @private
	 * @param {module:x2node-records~RecordTypesLibrary} recordTypes Record types
	 * library.
	 * @param {module:x2node-records~RecordTypeDescriptor} recordTypeDesc Record
	 * type descriptor.
	 * @param {module:x2node-validators~MessageResolver} messageResolver Message
	 * resolver for the validation error messages.
	 * @param {Set.<string>} validationSets Validation sets.
	 */
	constructor(recordTypes, recordTypeDesc, messageResolver, validationSets) {

		this._recordTypes = recordTypes;
		this._recordTypeDesc = recordTypeDesc;
		this._messageResolver = messageResolver;
		this._validationSets = validationSets;

		this._curPointer = pointers.parse(recordTypeDesc, '');
		this._pointerStack = new Array();
		this._containersChain = new Array();

		this._result = new ValidationErrors();
	}

	/**
	 * Descend into validating a nested element (property or collection element).
	 *
	 * @protected
	 * @param {string} pointerToken Child pointer token (no slash).
	 * @param {(Object|Array)} containerObj Parent container object or array of
	 * the nested element.
	 */
	descend(pointerToken, containerObj) {

		this._pointerStack.push(this._curPointer);
		this._curPointer = this._curPointer.createChildPointer(pointerToken);
		this._containersChain.push(containerObj);
	}

	/**
	 * Ascend from validating a nested element.
	 *
	 * @protected
	 */
	ascend() {

		this._curPointer = this._pointerStack.pop();
		this._containersChain.pop();
	}

	/**
	 * Tell if the specified validation set active. Note that default validation
	 * set (set id "*") is always active.
	 *
	 * @param {string} setId Set id.
	 * @returns {boolean} <code>true</code> if the set is active.
	 */
	isValidationSet(setId) {

		return this._validationSets.has(setId);
	}

	/**
	 * Add validation error associated with the record element currently being
	 * validated.
	 *
	 * @param {string} message Validation error message id in curly braces or
	 * message template.
	 * @param {Object.<string,*>} [params] Validation error message parameters.
	 */
	addError(message, params) {

		this.addErrorFor(this._curPointer, message, params);
	}

	/**
	 * Record types library.
	 *
	 * @member {module:x2node-records~RecordTypesLibrary}
	 * @readonly
	 */
	get recordTypes() { return this._recordTypes; }

	/**
	 * Record type descriptor.
	 *
	 * @member {module:x2node-records~RecordTypeDescriptor}
	 * @readonly
	 */
	get recordTypeDesc() { return this._recordTypeDesc; }

	/**
	 * Pointer at the record element currently being validated.
	 *
	 * @member {module:x2node-pointers~RecordElementPointer}
	 * @readonly
	 */
	get currentPointer() { return this._curPointer; }

	/**
	 * Property descriptor associated with the record element being validated, or
	 * <code>null</code> if record itself.
	 *
	 * @member {module:x2node-records~PropertyDescriptor}
	 * @readonly
	 */
	get currentPropDesc() { return this._curPointer.propDesc; }

	/**
	 * Chain of parent container objects and array leading to the record element
	 * being currently validated. For the record itself, the chain is empty. For
	 * all other elements the first element in the chain is the record itself and
	 * the last element is the immediate container of the current element being
	 * validated.
	 *
	 * @member {Array.<(Object|Array)>}
	 * @readonly
	 */
	get containersChain() { return this._containersChain; }

	/**
	 * Add validation error associated with the record element specified by a
	 * JSON pointer.
	 *
	 * @param {(string|module:x2node-pointers~RecordElementPointer)} ptr The
	 * pointer.
	 * @param {string} message Validation error message id in curly braces or
	 * message template.
	 * @param {Object.<string,*>} [params] Validation error message parameters.
	 */
	addErrorFor(ptr, message, params) {

		const propPtr = (
			(typeof ptr) === 'string' ?
				pointers.parse(this._recordTypeDesc, ptr) : ptr);

		const subjDesc = (
			propPtr.propDesc === null ? this._recordTypeDesc : propPtr.propDesc);

		const paramsWithTitle = (params ? Object.create(params) : new Object());
		const title = this._messageResolver.renderMessage(subjDesc.title);
		paramsWithTitle['field'] = title;
		paramsWithTitle['Field'] =
			title.charAt(0).toUpperCase() + title.substring(1);

		this._result.addError(ptr, this._messageResolver.getMessage(
			subjDesc.validationErrorMessages, message, paramsWithTitle));
	}

	/**
	 * Get title for the record element described by the pointer.
	 *
	 * @param {(string|module:x2node-pointers~RecordElementPointer)} ptr The
	 * pointer.
	 * @returns {string} The corresponding property or record type title.
	 */
	getElementTitle(ptr) {

		const propPtr = (
			(typeof ptr) === 'string' ?
				pointers.parse(this._recordTypeDesc, ptr) : ptr);

		const subjDesc = (
			propPtr.propDesc === null ? this._recordTypeDesc : propPtr.propDesc);

		return this._messageResolver.renderMessage(subjDesc.title);
	}

	/**
	 * Tell if there are validation errors for the specified pointer. When the
	 * validation runs on a record it first validates the deepest record elements
	 * gradually proceeding to the top record, which is validates the last.
	 * Therefore, a validator can use this method to check for validity of any of
	 * the properties that are below the current one. Also, validators for a
	 * single record element are run in the order they are specified on the
	 * element (with the default ones first, followed by the custom ones).
	 *
	 * @param {(string|module:x2node-pointers~RecordElementPointer)} ptr The
	 * pointer.
	 * @returns {boolean} <code>true</code> if has errors.
	 */
	hasErrorsFor(ptr) {

		return this._result.hasErrors(ptr);
	}

	/**
	 * Tell if the provided value is <code>undefined</code> or <code>null</code>.
	 * May be useful in validation function implementations that often need to
	 * perform this kind of a test and always have the context available.
	 *
	 * @param {*} val Value to test.
	 * @returns {boolean} <code>true</code> if empty.
	 */
	isEmpty(val) {

		return ((val === undefined) || (val === null));
	}

	/**
	 * Get validation result.
	 *
	 * @protected
	 * @returns {module:x2node-validators~ValidationErrors} Validation errors or
	 * <code>null</code> if none.
	 */
	getResult() {

		return (this._result.isEmpty() ? null : this._result);
	}
}

// export the class
module.exports = ValidationContext;
