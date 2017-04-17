'use strict';


/**
 * Validation errors object. The own enumarable property names are RFC 6901 JSON
 * pointers for the invalid parts of the record (empty string for error about the
 * record as a whole). The values are arrays of corresponding error messages.
 *
 * @memberof module:x2node-validators
 * @inner
 */
class ValidationErrors {

	/**
	 * Add error.
	 *
	 * @param {(string|module:x2node-pointers~RecordElementPointer)} ptr The
	 * pointer.
	 * @param {string} message The message.
	 */
	addError(ptr, message) {

		const errorKey = ptr.toString();

		let errors = this[errorKey];
		if (!errors)
			this[errorKey] = errors = new Array();

		errors.push(message);
	}

	/**
	 * Tell is has errors.
	 *
	 * @param {(string|module:x2node-pointers~RecordElementPointer)} ptr The
	 * pointer.
	 * @returns {boolean} <code>true</code> if has errors.
	 */
	hasErrors(ptr) {

		const errorKey = ptr.toString();

		const errors = this[errorKey];

		return (Array.isArray(errors) && (errors.length > 0));
	}

	/**
	 * Tell if empty.
	 *
	 * @returns {boolean} <code>true</code> if empty.
	 */
	isEmpty() {

		return (Object.keys(this).length === 0);
	}
}

// export the class
module.exports = ValidationErrors;
