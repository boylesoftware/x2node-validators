'use strict';


/**
 * Standard validation error messages.
 *
 * @protected
 * @type {Object.<string,Object.<string,string>>}
 */
exports.VALIDATION_ERROR_MESSAGES = {
	'*': {
		'en-US': 'Invalid.'
	},
	'missing': {
		'en-US': 'Missing value.'
	},
	'invalidType': {
		'en-US': 'Missing or invalid type.'
	},
	'notEmpty': {
		'en-US': 'Expected to be empty.'
	},
	'invalidValueType': {
		'en-US': 'Invalid value type ${actual}, expected ${expected}.'
	},
	'invalidValue': {
		'en-US': 'Invalid value.'
	},
	'invalidFormat': {
		'en-US': 'Invalid format.'
	},
	'invalidNumber': {
		'en-US': 'Not a number.'
	},
	'invalidInteger': {
		'en-US': 'Not an integer.'
	},
	'invalidDatetime': {
		'en-US': 'Invalid datetime.'
	},
	'invalidRefTarget': {
		'en-US': 'Invalid reference target ${actual}, expected ${expected}.'
	},
	'invalidRefTargetPoly': {
		'en-US': 'Invalid reference target ${actual},' +
			' expected one of: ${expected}.'
	},
	'invalidRefTargetIdNumber': {
		'en-US': 'Invalid target record id value ${value}, expected a number.'
	},
	'invalidPattern': {
		'en-US': 'Does not match the pattern.'
	},
	'notArray': {
		'en-US': 'Not an array.'
	},
	'duplicates': {
		'en-US': 'Contains duplicates.'
	},
	'tooLong': {
		'en-US': 'Too long.'
	},
	'tooShort': {
		'en-US': 'Too short.'
	},
	'tooLarge': {
		'en-US': 'Too large.'
	},
	'tooSmall': {
		'en-US': 'Too small.'
	},
	'outOfRange': {
		'en-US': 'Out of range.'
	},
	'invalidEmail': {
		'en-US': 'Invalid e-mail address.'
	},
	'invalidDate': {
		'en-US': 'Invalid date.'
	},
	'invalidTime': {
		'en-US': 'Invalid time.'
	},
	'invalidTimeGranularity': {
		'en-US': 'Must be aligned to ${granularity} minutes.'
	},
	'invalidWeekday': {
		'en-US': 'Invalid weekday.'
	},
	'invalidCCNumber': {
		'en-US': 'Invalid credit card number.'
	},
	'invalidBankRoutingNumber': {
		'en-US': 'Invalid routing number.'
	},
	'invalidUSState': {
		'en-US': 'Invalid state.'
	},
	'invalidUSZip': {
		'en-US': 'Invalid ZIP code.'
	},
	'invalidUSPhone': {
		'en-US': 'Invalid phone number.'
	},
	'invalidRangeDef': {
		'en-US': 'Must be greater than ${rangeLoName}.'
	},
	'missingWhen': {
		'en-US': 'Required with ${prop}.'
	},
	'missingWhenNot': {
		'en-US': 'Required when ${prop} is empty.'
	},
	'missingWhenValue': {
		'en-US': 'Requried when ${prop} is ${value}.'
	},
	'missingWhenNotValue': {
		'en-US': 'Required when ${prop} is not ${value}.'
	},
	'missingWhenPattern': {
		'en-US': 'Required when ${prop} has the provided value.'
	},
	'missingWhenNotPattern': {
		'en-US': 'Required when ${prop} has the provided value.'
	},
	'notEmptyWhen': {
		'en-US': 'Expected to be empty with ${prop}.'
	},
	'notEmptyWhenNot': {
		'en-US': 'Expected to be empty when ${prop} is empty.'
	},
	'notEmptyWhenValue': {
		'en-US': 'Expected to be empty when ${prop} is ${value}.'
	},
	'notEmptyWhenNotValue': {
		'en-US': 'Expected to be empty when ${prop} is not ${value}.'
	},
	'notEmptyWhenPattern': {
		'en-US': 'Expected to be empty when ${prop} has the provided value.'
	},
	'notEmptyWhenNotPattern': {
		'en-US': 'Expected to be empty when ${prop} has the provided value.'
	}
};

/**
 * Tell if the specified property value can be considered empty.
 *
 * @private
 * @param {module:x2node-pointers~RecordElementPointer} ptr Property pointer.
 * @param {module:x2node-records~PropertyDescriptor} propDesc Property
 * descriptor.
 * @param {*} value Property value to test.
 * @returns {boolean} <code>true</code> if empty.
 */
function isEmpty(ptr, propDesc, value) {

	if ((value === undefined) || (value === null))
		return true;

	if (propDesc.isArray() && !ptr.collectionElement && Array.isArray(value)) {
		if (value.length === 0)
			return true;
	} else if (propDesc.isMap() && !ptr.collectionElement &&
		((typeof value) === 'object')) {
		if (Object.keys(value).length === 0)
			return true;
	} else if ((propDesc.isScalar() || ptr.collectionElement) &&
		(propDesc.scalarValueType === 'string') &&
		((typeof value) === 'string')) {
		if (value.length === 0)
			return true;
	}

	return false;
}

/**
 * Tell if the specified context container has specified property and it
 * optionally matches the specified test value.
 *
 * @private
 * @param {module:x2node-validators~ValidationContext} ctx Current validation
 * context.
 * @param {string} propName Sibling property name.
 * @param {(*|RegExp)} [testValue] Test value.
 * @param {boolean} whenErrors What to return when <code>propName</code> has
 * validation errors.
 * @returns {boolean} <code>true</code> if has matching sibling.
 */
function hasMatchingSibling(ctx, propName, testValue, whenErrors) {

	const containerDesc = ctx.currentPropDesc.container;
	const propDesc = containerDesc.getPropertyDesc(propName);

	let propPtr;
	if (containerDesc.parentContainer &&
		containerDesc.parentContainer.isPolymorphObject()) {
		const pathParts = containerDesc.nestedPath.split('.');
		propPtr = ctx.currentPointer.parent.createChildPointer(
			`${pathParts[pathParts.length - 2]}:${propName}`);
	} else {
		propPtr = ctx.currentPointer.parent.createChildPointer(propName);
	}

	if (ctx.hasErrorsFor(propPtr))
		return whenErrors;

	const container = ctx.containersChain[ctx.containersChain.length - 1];
	const propValue = container[propName];
	if (testValue !== undefined) {
		if (((testValue instanceof RegExp) && testValue.test(propValue)) ||
			(propValue === testValue))
			return true;
	} else {
		if (!isEmpty(propPtr, propDesc, propValue))
			return true;
	}

	return false;
}

/**
 * Used to store dependency validators errors on the validation context.
 *
 * @private
 * @constant {Symbol}
 */
const DEPS_ERRORS = Symbol('DEPS_ERRORS');

/**
 * Add dependecy validator error to the context if no dependency validator errors
 * already added for the current property.
 *
 * @private
 * @param {module:x2node-validators~ValidationContext} ctx Current validation
 * context.
 * @param {string} type Validator type.
 * @param {string} propName Dependency property name.
 * @param {(*|RegExp)} testValue Dependecy property test value.
 */
function addDepsError(ctx, type, propName, testValue) {

	let depsErrors = ctx[DEPS_ERRORS];
	if (!depsErrors)
		depsErrors = ctx[DEPS_ERRORS] = {};

	const curPtrStr = ctx.currentPointer.toString();

	if (depsErrors[curPtrStr])
		return;
	depsErrors[curPtrStr] = true;

	const hasTestValue = (testValue !== undefined);
	const testValueIsPattern = (testValue instanceof RegExp);
	ctx.addError(
		(
			hasTestValue ? (
				testValueIsPattern ? `{${type}Pattern}`
					: `{${type}Value}`
			) : `{${type}}`
		), {
			prop: propName,
			[testValueIsPattern ? 'pattern' : 'value']: testValue
		}
	);
}

/**
 * Standard validator/normalizer definitions.
 *
 * @protected
 * @type {Object.<string,module:x2node-validators.validator>}
 */
exports.VALIDATOR_DEFS = {

	'required': function(_, ctx, value) {

		if (isEmpty(ctx.currentPointer, ctx.currentPropDesc, value))
			ctx.addError('{missing}');

		return value;
	},

	'empty': function(_, ctx, value) {

		if (!isEmpty(ctx.currentPointer, ctx.currentPropDesc, value))
			ctx.addError('{notEmpty}');

		return value;
	},

	'string': function(_, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const actual = (typeof value);
		if (actual !== 'string')
			ctx.addError('{invalidValueType}', {
				expected: 'string',
				actual: actual
			});

		return value;
	},

	'number': function(_, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const actual = (typeof value);
		if (actual !== 'number')
			ctx.addError('{invalidValueType}', {
				expected: 'number',
				actual: actual
			});
		else if (!Number.isFinite(value))
			ctx.addError('{invalidNumber}', {
				value: value
			});

		return value;
	},

	'boolean': function(_, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const actual = (typeof value);
		if (actual !== 'boolean')
			ctx.addError('{invalidValueType}', {
				expected: 'boolean',
				actual: actual
			});

		return value;
	},

	'datetime': function(_, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const actual = (typeof value);
		if (actual !== 'string') {
			ctx.addError('{invalidValueType}', {
				expected: 'string',
				actual: actual
			});
		} else if (
			!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
			ctx.addError('{invalidFormat}');
		} else {
			const dateVal = Date.parse(value);
			if (Number.isNaN(dateVal))
				ctx.addError('{invalidDatetime}', {
					value: value
				});
			else
				return (new Date(dateVal)).toISOString();
		}

		return value;
	},

	'ref': function(params, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const actual = (typeof value);
		if (actual !== 'string') {
			ctx.addError('{invalidValueType}', {
				expected: 'string',
				actual: actual
			});
		} else {
			const hashInd = value.indexOf('#');
			if ((hashInd <= 0) || (hashInd === value.length - 1)) {
				ctx.addError('{invalidFormat}');
			} else {
				const refTarget = value.substring(0, hashInd);
				if (!params.some(rtn => (rtn === refTarget))) {
					if (params.length > 1) {
						ctx.addError('{invalidRefTargetPoly}', {
							actual: refTarget,
							expected: params.join(', ')
						});
					} else {
						ctx.addError('{invalidRefTarget}', {
							actual: refTarget,
							expected: params[0]
						});
					}
				} else {
					const targetRecordTypeDesc =
						ctx.recordTypes.getRecordTypeDesc(refTarget);
					const idPropDesc = targetRecordTypeDesc.getPropertyDesc(
						targetRecordTypeDesc.idPropertyName);
					if (idPropDesc.scalarValueType === 'number') {
						const targetIdString = value.substring(hashInd + 1);
						const targetId = Number(targetIdString);
						if (!Number.isFinite(targetId))
							ctx.addError('{invalidRefTargetIdNumber}', {
								value: targetIdString
							});
						else
							return refTarget + '#' + String(targetId);
					}
				}
			}
		}

		return value;
	},

	'object': function(_, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const actual = (typeof value);
		if (actual !== 'object')
			ctx.addError('{invalidValueType}', {
				expected: 'object',
				actual: actual
			});

		return value;
	},

	'array': function(_, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		if (!Array.isArray(value))
			ctx.addError('{notArray}');

		return value;
	},

	'noDupes': function(_, ctx, value) {

		if (Array.isArray(value)) {
			TOP: for (let i = 0, len = value.length; i < len - 1; i++) {
				const el = value[i];
				for (let j = i + 1; j < len; j++) {
					if (value[j] === el) {
						ctx.addError('{duplicates}');
						break TOP;
					}
				}
			}
		}

		return value;
	},

	'integer': function(_, ctx, value) {

		if (((typeof value) === 'number') && !Number.isInteger(value))
			ctx.addError('{invalidInteger}');

		return value;
	},

	'precision': function(params, _, value) {

		if (((typeof value) === 'number') && Number.isFinite(value)) {
			const p = Math.pow(10, params[0]);
			return Math.round(value * p) / p;
		}

		return value;
	},

	'dropEmptyString': function(_, __, value) {

		if (((typeof value) === 'string') && (value.length === 0))
			return undefined;

		return value;
	},

	'trim': function(_, __, value) {

		if ((typeof value) === 'string')
			return value.replace(/^\s+|\s+$/g, '');

		return value;
	},

	'pattern': function(params, ctx, value) {

		const pattern = params[0];
		const re = (
			pattern instanceof RegExp ? pattern : new RegExp(pattern));

		if (((typeof value) === 'string') && !re.test(value))
			ctx.addError('{invalidPattern}', {
				pattern: re
			});

		return value;
	},

	'maxLength': function(params, ctx, value) {

		if ((Array.isArray(value) || ((typeof value) === 'string')) &&
			(value.length > params[0]))
			ctx.addError('{tooLong}', {
				max: params[0]
			});

		return value;
	},

	'minLength': function(params, ctx, value) {

		if ((Array.isArray(value) || ((typeof value) === 'string')) &&
			(value.length < params[0]))
			ctx.addError('{tooShort}', {
				min: params[0]
			});

		return value;
	},

	'max': function(params, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const maxVal = params[0];
		if (((typeof value) === (typeof maxVal)) && (value > maxVal))
			ctx.addError('{tooLarge}', {
				max: maxVal
			});

		return value;
	},

	'min': function(params, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const minVal = params[0];
		if (((typeof value) === (typeof minVal)) && (value < minVal))
			ctx.addError('{tooSmall}', {
				min: minVal
			});

		return value;
	},

	'range': function(params, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const minVal = params[0];
		const maxVal = params[1];
		if (((typeof value) === (typeof minVal)) &&
			((typeof value) === (typeof maxVal)) &&
			((value < minVal) || (value > maxVal)))
			ctx.addError('{outOfRange}', {
				min: minVal,
				max: maxVal
			});

		return value;
	},

	'oneOf': function(params, ctx, value) {

		if ((value === undefined) || (value === null))
			return value;

		const validVals = (Array.isArray(params[0]) ? params[0] : params);
		if (!validVals.some(validVal => (value === validVal)))
			ctx.addError('{invalidValue}');

		return value;
	},

	'lowercase': function(_, __, value) {

		if ((typeof value) === 'string')
			return value.toLowerCase();

		return value;
	},

	'uppercase': function(_, __, value) {

		if ((typeof value) === 'string')
			return value.toUpperCase();

		return value;
	},

	'email': function(_, ctx, value) {

		const re = new RegExp(
			'^[a-z0-9._%+\'-]+' +
				'@[a-z0-9][a-z0-9-]{0,63}(?:\\.[a-z0-9][a-z0-9-]{0,63})+$', 'i');

		if (((typeof value) === 'string') && !re.test(value))
			ctx.addError('{invalidEmail}');

		return value;
	},

	'date': function(_, ctx, value) {

		if (((typeof value) === 'string') &&
			!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/.test(value))
			ctx.addError('{invalidDate}');

		return value;
	},

	'time': function(params, ctx, value) {

		const param1 = params && params[0];
		const param2 = params && params[1];
		const granularity = Number.isInteger(param1) && param1;
		const options = (
			((typeof param1 === 'string') && param1) ||
				((typeof param2 === 'string') && param2)
		);

		const re = (
			options && /\ballow24\b/.test(options) ?
				/^24:00|([0-1][0-9]|2[0-3]):[0-5][0-9]$/
				: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
		);
		if ((typeof value) === 'string') {
			if (!re.test(value)) {
				ctx.addError('{invalidTime}');
			} else if (granularity) {
				if (Number(value.substring(3)) % granularity !== 0)
					ctx.addError('{invalidTimeGranularity}', {
						granularity: granularity
					});
			}
		}

		return value;
	},

	'timeToSecond': function(_, ctx, value) {

		if (((typeof value) === 'string') &&
			!/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(value))
			ctx.addError('{invalidTime}');

		return value;
	},

	'ccNumber': function(_, ctx, value) {

		if ((typeof value) === 'string') {
			if (!/^\d{13,16}$/.test(value)) {
				ctx.addError('{invalidCCNumber}');
			} else {
				let sum = 0, even = false;
				for (let i = value.length - 1; i >= 0; i--) {
					let digit = Number(value.charAt(i));
					if (even)
						digit *= 2;
					if (digit > 9)
						digit = digit / 10 + digit % 10;
					sum += digit;
					even = !even;
				}
				if (sum % 10 !== 0)
					ctx.addError('{invalidCCNumber}');
			}
		}

		return value;
	},

	'bankRoutingNumber': function(_, ctx, value) {

		if ((typeof value) === 'string') {
			if (!/^\d{9}$/.test(value)) {
				ctx.addError('{invalidBankRoutingNumber}');
			} else {
				const sum = (
					7 * (
						Number(value.charAt(0)) + Number(value.charAt(3)) +
							Number(value.charAt(6))
					) + 3 * (
						Number(value.charAt(1)) + Number(value.charAt(4)) +
							Number(value.charAt(7))
					) + 9 * (
						Number(value.charAt(2)) + Number(value.charAt(5)))
				);
				if (sum % 10 !== Number(value.charAt(8)))
					ctx.addError('{invalidBankRoutingNumber}');
			}
		}

		return value;
	},

	'weekday2': function(_, ctx, value) {

		const re = new RegExp('^(MO|TU|WE|TH|FR|SA|SU)$', 'i');

		if ((typeof value) === 'string') {
			if (re.test(value))
				value = value.toUpperCase();
			else
				ctx.addError('{invalidWeekday}');
		}

		return value;
	},

	'weekday3': function(_, ctx, value) {

		const re = new RegExp('^(MON|TUE|WED|THU|FRI|SAT|SUN)$', 'i');

		if ((typeof value) === 'string') {
			if (re.test(value))
				value = value.toUpperCase();
			else
				ctx.addError('{invalidWeekday}');
		}

		return value;
	},

	'loc_US:state2': function(_, ctx, value) {

		const re = new RegExp(
			'^(AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA' +
				'|ME|MD|MH|MA|MI|FM|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH' +
				'|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VA|VI|WA|WV|WI|WY)$', 'i');

		if ((typeof value) === 'string') {
			if (re.test(value))
				value = value.toUpperCase();
			else
				ctx.addError('{invalidUSState}');
		}

		return value;
	},

	'loc_US:zip5': function(_, ctx, value) {

		if (((typeof value) === 'string') && !/^\d{5}$/.test(value))
			ctx.addError('{invalidUSZip}');

		return value;
	},

	'loc_US:phone10': function(_, ctx, value) {

		if ((typeof value) === 'string') {
			const normValue = value.replace(/[\s()-]/g, '');
			if (/^\d{10}$/.test(normValue))
				value = normValue;
			else
				ctx.addError('{invalidUSPhone}');
		}

		return value;
	},

	'rangeDef': function(params, ctx, value) {

		if ((value === undefined) || (value === null) ||
			((typeof value) !== 'object'))
			return value;

		const propLo = params[0];
		const propHi = params[1];

		const curPtr = ctx.currentPointer.toString();

		let propLoPtr, propHiPtr;
		const containerDesc = (
			ctx.currentPropDesc ? ctx.currentPropDesc.nestedProperties
				: ctx.recordTypeDesc
		);
		if (containerDesc.isPolymorphObject()) {
			if (ctx.hasErrorsFor(`${curPtr}/${containerDesc.typePropertyName}`))
				return value;
			const subtype = value[containerDesc.typePropertyName];
			propLoPtr = `${curPtr}/${subtype}:${propLo}`;
			propHiPtr = `${curPtr}/${subtype}:${propHi}`;
		} else {
			propLoPtr = `${curPtr}/${propLo}`;
			propHiPtr = `${curPtr}/${propHi}`;
		}

		if (ctx.hasErrorsFor(propLoPtr) || ctx.hasErrorsFor(propHiPtr))
			return value;

		const propLoVal = value[propLo];
		const propHiVal = value[propHi];
		if ((propLoVal === undefined) || (propLoVal === null) ||
			(propHiVal === undefined) || (propHiVal === null))
			return value;

		const nonZero = /\bnonZero\b/.test(params[2]);
		if ((nonZero && (propLoVal >= propHiVal)) || (!nonZero && (propLoVal > propHiVal))) {
			const propLoTitle = ctx.getElementTitle(propLoPtr);
			ctx.addErrorFor(propHiPtr, '{invalidRangeDef}', {
				rangeLoName: propLoTitle,
				rangeLoNameCaps: propLoTitle.charAt(0).toUpperCase() +
					propLoTitle.substring(1)
			});
		}

		return value;
	},

	'requiredIf': function(params, ctx, value) {

		if (isEmpty(ctx.currentPointer, ctx.currentPropDesc, value)) {
			const propName = params[0];
			const testValue = params[1];
			if (hasMatchingSibling(ctx, propName, testValue, false))
				addDepsError(ctx, 'missingWhen', propName, testValue);
		}

		return value;
	},

	'requiredUnless': function(params, ctx, value) {

		if (isEmpty(ctx.currentPointer, ctx.currentPropDesc, value)) {
			const propName = params[0];
			const testValue = params[1];
			if (!hasMatchingSibling(ctx, propName, testValue, true))
				addDepsError(ctx, 'missingWhenNot', propName, testValue);
		}

		return value;
	},

	'emptyIf': function(params, ctx, value) {

		if (!isEmpty(ctx.currentPointer, ctx.currentPropDesc, value)) {
			const propName = params[0];
			const testValue = params[1];
			if (hasMatchingSibling(ctx, propName, testValue, false))
				addDepsError(ctx, 'notEmptyWhen', propName, testValue);
		}

		return value;
	},

	'emptyUnless': function(params, ctx, value) {

		if (!isEmpty(ctx.currentPointer, ctx.currentPropDesc, value)) {
			const propName = params[0];
			const testValue = params[1];
			if (!hasMatchingSibling(ctx, propName, testValue, true))
				addDepsError(ctx, 'notEmptyWhenNot', propName, testValue);
		}

		return value;
	}
};
