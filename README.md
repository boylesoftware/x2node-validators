# X2 Framework for Node.js | Record Validation and Normalization

This module extends the basic X2 Framework's [record types library](https://www.npmjs.com/package/x2node-records) and adds validation and value normalization rules to the records and record properties.

## Table of Contents

* [Usage](#usage)
* [Collection Element Validators](#collection-element-validators)
* [Customizing Validation Error Messages](#customizing-validation-error-messages)
* [Validation Error Messages Internationalization](#validation-error-messages-internationalization)
* [Standard Validators](#standard-validators)
* [Validation Sets](#validation-sets)
* [Disabling Default Validators](#disabling-default-validators)
* [Writing Custom Validators](#writing-custom-validators)
  * [Validation Functions](#validation-functions)
  * [Validation Context](#validation-context)
  * [Object Validators and Validation Order](#object-validators-and-validation-order)
* [Record Types Library Extension](#record-types-library-extension)
* [Changing Default Validation Rules in Extensions](#changing-default-validation-rules-in-extensions)

## Usage

The basic module usage includes adding validation rules to the record types library definition and then invoking the validation function whenever a record needs to be validated. In the simplest case:

```javascript
const records = require('x2node-records');
const validators = require('x2node-validators');

const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'Contact': {
			properties: {
				'id': {
					valueType: 'number',
					role: 'id'
				},
				'name': {
					valueType: 'string',
					validators: [ [ 'maxLength', 50 ] ]
				},
				'rank': {
					valueType: 'number',
					validators: [ 'integer', [ 'range', 1, 10 ] ]
				},
				'email': {
					valueType: 'string',
					optional: true,
					validators: [ 'email', 'lowercase' ]
				},
				'status': {
					valueType: 'string',
					validators: [ [ 'pattern', /^(ACTIVE|INACTIVE)$/ ] ]
				}
			}
		}
	}
});

const contactRecord = {
	id: 1,
	name: 'John Silver',
	rank: 9,
	email: 'John@Walrus.com',
	status: 'ACTIVE'
};

const errors = validators.normalizeRecord(recordTypes, 'Contact', contactRecord);
if (errors)
	console.log('Validation errors:', errors);
else
	console.log('The record is valid!');
```

Any property or the record type definition can have a `validators` attribute, which is an array of validator/normalizator references, possibly with parameters. Each reference is either a string with a registered the validator id or, if the validator requires parameters, an array where the first element is the validator id followed by the parameters.

Each validator may have two functions: value _validation_ and value _normalization_. The validation checks if the value is approprivate and if not, reports a specific validation error message. Also, a validator may normalize the value (for example trim a string, convert it to all lowercase, remove non-digits, etc.). The normalized value is set back into the record. In the example above the `lowercase` normalizer used on the `email` property updates the `email` property of the provided record to _john@<span></span>walrus.com_ from _John@<span></span>Walrus.com_ after the `normalizeRecord()` function call.

Upon successful validation, the returned by the `normalizeRecord()` function `errors` object is `null`. However, if there are validation errors, they are reported in that object. The keys in that case will be JSON pointers (see [RFC 6901 JSON Pointer](https://tools.ietf.org/html/rfc6901)) for the invalid record elements and values will be arrays of corresponding validation error messages (at least one). So, for example the following invalid _Contact_ record:

```json
{
  "id": 1,
  "rank": 0,
  "email": true,
  "status": "OHNO"
}
```

will yield the following `errors` object:

```json
{
  "/name": [ "Missing value." ],
  "/rank": [ "Out of range." ],
  "/email": [ "Invalid value type boolean, expected string." ],
  "/status": [ "Does not match the pattern." ]
}
```

The `name` is reported as missing value, because the validators module automatically adds certain validators to the properties based on their basic definition type. For example, all non-optional properties get a `required` standard validator responsible for missing value error and described further in this manual. Also, all properties get a validator that ensured the correct value type and format, so the `email` property gets the error message in the above example.

## Collection Element Validators

For collection properties it is often necessary to specify validators for the collection as a whole and separately for the collection elements. Collection element validators are specified using `elementValidators` definition attribute. For example:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'Student': {
			properties: {
				...
				'monthlyScores': {
					valueType: 'number[]',
					validators: [ [ 'maxLength', 12 ] ],
					elementValidators: [ [ 'precision', 1 ], [ 'range', 0, 10 ] ]
				},
				...
			}
		}
	}
});
```

## Customizing Validation Error Messages

As it will be described further in this manual, when a validator detects an error it reports the error message using an error message id. Associating a different error message with a specific message id allows overriding the default error messages. In the example above, the invalid `status` property value is reported as not matching the pattern, which is too generic. The validator reponsible for the message is `pattern` and it uses message id `invalidPattern` to report errors. Here is a way to customize the message:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'Contact': {
			properties: {
				...
				'status': {
					valueType: 'string',
					validators: [ [ 'pattern', /^(ACTIVE|INACTIVE)$/ ] ],
					validationErrorMessages: {
						'invalidPattern': 'Invalid contact status value.'
					}
				},
				...
			}
		}
	}
});
```

The `validationErrorMessages` attribute is used to associate messages with message ids and it can be defined in different scopes. In the example above, it is defined on the property descriptor, so it affects only the validators specified on that property. It could be, however, specified on the record type or even the whole record types library.

The messages associated with the ids are actually message templates as they allow placeholders for values provided by the validator. For example, the `range` validator on the `rank` property in the _Contact_ record example is responsible for the out of range validation error message. The message id used by the validator is `outOfRange` and the default template does not provide any information about the expected range limits. However, the validator provides that information in two message template parameters called `min` and `max`. So, the error message could be customized like the following:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'Contact': {
			properties: {
				...
				'rank': {
					valueType: 'number',
					validators: [ 'integer', [ 'range', 1, 10 ] ],
					validationErrorMessages: {
						'outOfRange': 'The rank must be between ${min} and ${max}.'
					}
				},
				...
			}
		}
	}
});
```

One message template parameter provided to all templates regardless of the validator used is `${field}`, which is the property or record type title. By default, the title of a property or a record type is the property or the record type name, but it can be modified by providing a `title` attribute on the record type of the property definition. In addition to the `${field}` parameters there is also a `${Field}` parameter, which is the same, but automatically capitalized to use at the beginning of an error message template.

## Validation Error Messages Internationalization

The validation error messages can be localized for different languages. To do that, wherever a message template is specified as a string, it can be specified as an object where keys are language codes and values are the corresponding message templates. For example:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'Contact': {
			properties: {
				...
				'rank': {
					valueType: 'number',
					validators: [ 'integer', [ 'range', 1, 10 ] ],
					validationErrorMessages: {
						'outOfRange': {
							'en-US': 'The rank must be between ${min} and ${max}.',
							'es': 'El rango debe estar entre ${min} y ${max}.'
						}
					}
				},
				...
			}
		}
	}
});
```

The error message language preference is provided to the module's `normalizeRecord()` function as the fourth optional argument. For example:

```javascript
const errors = validators.normalizeRecord(
	recordTypes, 'Contact', contactRecord, 'es');
```

The parameter actually allows specification of multiple preferred languages using the exact same syntax as used for "Accept-Language" HTTP request header. So, the following is also possible:

```javascript
const errors = validators.normalizeRecord(
	recordTypes, 'Contact', contactRecord, 'en-US,en;q=0.8,es-419;q=0.6,es;q=0.4');
```

If the preferred language is not provided, or there is no specific template matching any of the requested languages, the first language in the `validationErrorMessages` attribute is used (in the example above that would be "en-US").

The same localization technique also applies to the `title` property or record type definition attribute. For example:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'Contact': {
			validationErrorMessages: {
				'outOfRange': {
					'en-US': 'The ${field} must be between ${min} and ${max}.',
					'es': 'El ${field} debe estar entre ${min} y ${max}.'
				}
			},
			properties: {
				...
				'rank': {
					title: {
						'en-US': 'rank',
						'es': 'rango'
					},
					valueType: 'number',
					validators: [ 'integer', [ 'range', 1, 10 ] ]
				},
				...
			}
		}
	}
});
```

Note how the validation error messages in the example above are specified on the record type, so that any _Contact_ property that uses `range` validator will have the customized error message including the specific property title.

## Standard Validators

The module provides the following validators and normalizers out of the box:

* `'required'` - Makes sure that the property value is present. That includes checking for `null`, `undefined` and, for collection properties, empty arrays and maps. Error is reported using `missing` message id. This validator is automatically added to all non-optional properties.

* `'empty'` - Opposite of `required`, makes sure the property is empty. Uses message id `notEmpty`.

* `'string'` - Makes sure the property value is a string. Uses message id `invalidValueType` with two parameters: `${expected}` and `${actual}` for the expected (always "string") and the actual value types. Automatically added to all properties with scalar value type `string`.

* `'number'` - Makes sure the property value is a finite (see `Number.isFinite()`) number. Uses message id `invalidValueType` with two parameters: `${expected}` and `${actual}` for the expected (always "number") and the actual value types. Automatically added to all properties with scalar value type `number`.

* `'boolean'` - Makes sure the property value is a boolean. Uses message id `invalidValueType` with two parameters: `${expected}` and `${actual}` for the expected (always "boolean") and the actual value types. Automatically added to all properties with scalar value type `boolean`.

* `'datetime'` - Makes sure the property value is a string in ISO 8601 format. Uses message id `invalidValueType` with two parameters: `${expected}` and `${actual}` for the expected (always "string") and the actual value types. If string, but invalid format, uses message id `invalidFormat`. If valid format, but invalid (impossible) date, uses message id `invalidDatetime`. Also performs normalization, so for example "2017-02-30T22:55:10Z" becomes "2017-03-02T22:55:10.000Z". Automatically added to all properties with scalar value type `datetime`.

* `'ref'` - Makes sure the property value is a reference with the correct target referred record type. Uses message id `invalidValueType` with two parameters: `${expected}` and `${actual}` for the expected (always "string") and the actual value types. If string but in an invalid format, uses message id `invalidFormat`. If reference target does not match, uses `invalidRefTarget` (or `invalidRefTargetPoly` for polymorphic reference) with `${expected}` and `${actual}` parameters. If referred record type uses numeric ids and the id in the reference is not a number, uses message id `invalidRefTargetIdNumber`. Automatically added to all properties with scalar value type `ref`.

* `'object'` - Makes sure the property value is an object. Uses message id `invalidValueType` with two parameters: `${expected}` and `${actual}` for the expected (always "object") and the actual value types. Automatically added to all properties with scalar value type `object` as well as to the map properties.

* `'array'` - Makes sure the property value is an array. Uses message id `notArray`. Automatically added to all array properties.

* `'noDupes'` - Makes sure an array property does not have duplicate elements. Compares elements using JavaScript's `===` operator. Uses message id `duplicates`. Automatically added to all array properties whose `allowDuplicates` attribute is `false`.

* `'integer'` - Can be added to a number property to make sure the property value is an integer. Uses message id `invalidInteger`.

* `[ 'precision', numDigits ]` - This is a normalizer that can be added to a number property to round it to the specified maximum number of digits after the decimal point. Does not perform any validation.

* `'trim'` - Normalizer that removes leading and trailing whitespace from a string property. Automatically added to all properties with scalar value type `string`.

* `[ 'pattern', regExp ]` - Makes sure a string property matches the specified regular expression. The expression can be provided as a string or as a `RegExp`. Uses message id `invalidPattern`.

* `[ 'maxLength', length ]` - Makes sure a string or an array property is not longer than the specified maximum length. Uses message id `tooLong` with parameter `${max}`.

* `[ 'minLength', length ]` - Makes sure a string or an array property is not shorter than the specified minimum length. Uses message id `tooShort` with parameter `${min}`.

* `[ 'max', value ]` - Makes sure a number property is not greater than the specified maximum value. Uses message id `tooLarge` with parameter `${max}`.

* `[ 'min', value ]` - Makes sure a number property is not smaller than the specified minimum value. Uses message id `tooSmall` with parameter `${min}`.

* `[ 'range', min, max ]` - Makes sure a number property is within the specified range. Uses message id `outOfRange` with `${min}` and `${max}` parameters.

* `[ 'oneof', value1, value2, ... ]` - Makes sure the property has one of the specified values. Javascript's `===` operator is used to compare the values. Uses message id `invalidValue`.

* `'lowercase'` - Normalizer that converts strings to all lowercase.

* `'uppercase'` - Normalizer that converts strings to all uppercase.

* `'email'` - Makes sure that a string property is a valid email address. Uses message id `invalidEmail`.

* `'date'` - Makes sure that a string property is a date in format "yyyy-mm-dd". Uses message id `invalidDate`.

* `[ 'time', [granularity] ]` - Makes sure that a string property is a time in "hh:mm" format using 24-hour notation. If optional granularity parameter is provided, the time must be aligned to the specified number of minutes (for example granularity value 15 will allow "22:30" but will not allow "22:32"). Uses message ids `invalidTime` and `invalidTimeGranularity`.

* `'timeToSecond'` - Makes sure that a string property is a time in "hh:mm:ss" format using 24-hours notation. Uses message id `invalidTime`.

* `'ccNumber'` - Makes sure that a string property is a valid credit card number. Uses message id `invalidCCNumber`.

* `'bankRoutingNumber'` - Makes sure that a string property is a valid bank routing number. Uses message id `invalidBankRoutingNumber`.

* `'weekday2'` - Makes sure that a string property is one of "MO", "TU", "WE", "TH", "FR", "SA" or "SU", ignoring the case. Normalizes the value to all uppercase. Uses message id `invalidWeekday`.

* `'weekday3'` - Makes sure that a string property is one of "MON", "TUE", "WED", "THU", "FRI", "SAT" or "SUN", ignoring the case. Normalizes the value to all uppercase. Uses message id `invalidWeekday`.

* `'loc_US:state2'` - Makes sure that a string property is a valid US state two-character code, ignoring the case. Normalizes the value to all uppercase. Uses message id `invalidUSState`.

* `'loc_US:zip5'` - Makes sure that a string property is a 5-digit US ZIP code. Uses message id `invalidUSZip`.

* `'loc_US:phone10'` - Makes sure that a string property is a 10-digit phone number. Normalizes the value by removing all spaces, dashes and parentheses. Uses message id `invalidUSPhone`.

## Validation Sets

Sometimes it is necessary to invoke different sets of validators for the same property depending on the specific situation. The validators module allows groupping validators into named validation sets. Wherever an array of validators appears in the record type and property definitions, an object can be used with keys being validation set ids and values being arrays of the validators for that set. In the keys, multiple validation set ids can be listed using a comma and special validation set id "*" is used for validators that are applied always. For example:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'MyRecord': {
			properties: {
				'myProperty': {
					valueType: 'string',
					validators: {
						'set1': [ 'validator1' ],
						'set2': [ 'validator2' ],
						'set1,set2': [ 'validator3' ],
						'*': [ 'validator4' ]
					}
				},
			}
		}
	}
});
```

The validation sets are passed in a comma-separated list, if more than one, to the module's `normalizeRecord()` function as the optional firth argument. So, for example, if called like the following:

```javascript
const errors = validators.normalizeRecord(
	recordTypes, 'MyRecord', record, 'en-US', 'set1');
```

the following validators will be called in this specific order: `validator1`, `validator3` and `validator4`.

## Disabling Default Validators

As mentioned eralier in this manual, the module automatically adds certain validators to the properties depending on their specific type and options. Sometimes such automatically added validator needs to be removed from the property. For example, the module adds a `trim` normalizer to every string property. If we have a string property, for which having leading and trailing spaces is important, the normalizer added by default stands in the way. To remove any previously added validator it can be listed with a minus sign in the validators list. For example:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	recordTypes: {
		'MyRecord': {
			properties: {
				'spaceAreCharactersToo': {
					valueType: 'string',
					validators: [ '-trim' ]
				},
			}
		}
	}
});
```

The above will disable the `trim` normalizer on the `spacesAreCharactersToo` property.

## Writing Custom Validators

Custom validators can be added to the record types library using `validatorDefs` attribute that can be specified on the definition of any record type, property or the record types library as a whole. Where the custom validators are defined determines the scope of where they are available. The `validatorDefs` attribute is an object with keys being validator ids and values being the validation functions. For example:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	validatorDefs: {
		'contactUsage': function(params, ctx, value) {

			if (((typeof value) === 'string') &&
				!/^(CALL|EMAIL|TEXT|NONE)$/.test(value)) {
				ctx.addError('Invalid contact usage value.');
			}

			return value;
		}
	},
	recordTypes: {
		'Contact': {
			properties: {
				...
				'usage': {
					valueType: 'string',
					validators: [ 'contactUsage' ]
				},
				...
			}
		}
	}
});
```

### Validation Functions

The validator function takes three arguments:

* `params` - This is an array of validator parameters when the validator is used with parameters. So, for example, if a validator is used as `[ [ 'myValidator', 1, 'param2' ] ]`, the `params` argument will be an array `[ 1, 'param2' ]`.

* `ctx` - This is the validation context object that allows the validator to communicate back to the framework. In the example above the context is used to report an error. The complete context object interface is described slightly furhter in this manual.

* `value` - The value being validated.

The validator function must not assume that the value it receives for validation is valid according to any other validators that may be present on the property or the record type and must perform the validation/normalization only if it can work with the value. In the example above, the function makes sure that the value is a string before it checks it.

The function returns the normalized value that, if different from the current one, will be set back into the record. If the value is invalid, or the validator does not apply to it for any other reason, it must be returned as is.

### Validation Context

The validation context object provided to the validation functions exposes the following API:

* `addError(message, params)` - Adds a validation error associated with the record element being currently validated by the validation function. The `message` argument can be either the message itself, or a validation error message id enclosed in curly braces (e.g. `'This property is invalid!'` for the message or `'{invalidProp}'` for the message id). The `params` optional arguments is parameters for the message template. It is an object with keys being parameter names and values being the substitution values.

* `addErrorFor(ptr, message, params)` - Like `addError()`, but allows adding errors for any record element, not only the current record element. The `ptr` argument is the element JSON pointer, which can be a string or a `RecordElementPointer` object from the `x2node-pointers` module.

* `hasErrorsFor(ptr)` - Tells if the context already has errors for the record element specified by the `ptr` argument, which is a JSON pointer as a string or as a `RecordElementPointer` object from the `x2node-pointers` module.

* `recordTypes` - Reference to the `RecordTypesLibrary` (from the `x2node-records` module) object.

* `currentPointer` - `RecordElementPointer` (from the `x2node-pointers` module) pointing at the record element being currently validated by the validation function.

* `currentPropDesc` - `PropertyDescriptor` (from the `x2node-records` module) for the property being currently validated by the validation function, or `null` if it's the whole record.

* `containersChain` - Array of objects and arrays that in a nested fashion contain the record element being validated. The first element is the record as a whole and the last element is the immediate container of the current record element. For the record validator, the chain is an empty array.

### Object Validators and Validation Order

Validators specified on record types and nested object properties allow validating complex objects and checking integrity when it depends on values of multiple properties. For example, if we have a calendar entry record, we must make sure that the "from" time is not greater than the "to" time. It can be done with a custom validator like this:

```javascript
const recordTypes = records.with(validators).buildLibrary({
	validatorDefs: {
		'timeRange': function(params, ctx, value) {

			const curPtr = ctx.currentPointer.toString();
			if (!ctx.hasErrorsFor(curPtr + '/timeFrom') &&
				!ctx.hasErrorsFor(curPtr + '/timeTo')) {
				if (value.timeFrom > value.timeTo)
					ctx.addError('Invalid time range.');
			}

			return value;
		}
	},
	recordTypes: {
		'CalendarEntry': {
			validators: [ 'timeRange' ],
			properties: {
				...
				'timeFrom': {
					valueType: 'string',
					validators: [ 'time' ]
				},
				'timeTo': {
					valueType: 'string',
					validators: [ 'time' ]
				},
				...
			}
		}
	}
});
```

This logic relies on the specific order, in which validators are called. The framework first calls validators on the deepest nested properties gradually proceeding upwards, so that the top record validators, if any, are always called last after all the nested properties have been validated and normalized. That way, the `timeRange` validator in the example above verifies that it makes sense to execute its logic by first checking that the "from" and "to" times are valid by themselves and only then comparing them.

## Record Types Library Extension

As a record types library extension, the validators module adds its own properties to `RecordTypeDescriptor` and `PropertyDescriptor` objects:

* `title` - The record type of property title, which can be a string for a non-internationalized title or an object with language code keys for an internationalized title.

* `validationErrorMessages` - Context validation error message templates. It is an object with keys being message ids and values being either strings, or objects with language keys depending on whether the message is internationalized or not.

* `validators` - The validators or `null` if none. The value is an object with keys being validation set ids and values being arrays of validation functions. The functions are curried with the first `params` argument.

## Changing Default Validation Rules in Extensions

_This is an advanced topic for record type library extensions writers. It will be covered in future versions of this manual._
