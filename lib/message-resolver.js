'use strict';


/**
 * Localized error message resolver.
 *
 * @protected
 * @memberof module:x2node-validators
 * @inner
 */
class MessageResolver {

	/**
	 * Create new resolver.
	 *
	 * @param {string} lang Language preference specification as in the HTTP's
	 * "Accept-Language" request header.
	 */
	constructor(lang) {

		this._langs = lang
			.replace(/^\s+|\s+$/g, '')
			.split(/\s*,\s*/)
			.map(l => {
				const m = l.match(/^(.*?)(?:;q=(.*))?$/);
				return {
					lang: m[1],
					qvalue: (m[2] !== undefined ? Number(m[2]) : 1)
				};
			})
			.filter(l => ((l.lang !== '*') && (l.qvalue > 0)))
			.sort((l1, l2) => {
				if (l1.qvalue < l2.qvalue)
					return -1;
				if (l1.qvalue > l2.qvalue)
					return 1;
				return 0;
			})
			.map(l => l.lang.toLowerCase());
	}

	/**
	 * Get the message text.
	 *
	 * @param {Object.<string,(string|Object.<string,string>)>} messagesStore
	 * Messages store.
	 * @param {string} message Message id in curly braces or message template.
	 * @param {Object.<string,*>} [params] Parameter values for the placeholders
	 * in the message template. Keys are parameter names as they appear in the
	 * placeholders, values are values to insert.
	 * @returns {string} Rendered message text.
	 */
	getMessage(messagesStore, message, params) {

		const messageTmpls = (
			/^\{.+\}$/.test(message) ?
				messagesStore[message.substring(1, message.length - 1)] ||
					messagesStore['*'] :
				message
		);

		return this.renderMessage(messageTmpls, params);
	}

	/**
	 * Given a templates set, render the message.
	 *
	 * @param {(string|Object.<string,string>)} messageTmpls Message template
	 * string or message templates set by language codes.
	 * @param {Object.<string,*>} [params] Message parameters.
	 * @returns {string} The resulting message.
	 */
	renderMessage(messageTmpls, params) {

		const messageTmpl = (
			(typeof messageTmpls) === 'string' ?
				messageTmpls : this._findMessageTemplate(messageTmpls));

		return (params ? this._replaceParams(messageTmpl, params) : messageTmpl);
	}

	/**
	 * Find message template according to the resolver's preferred languages
	 * list.
	 *
	 * @private
	 * @param {Object.<string,string>} messageTmpls Message templates by language
	 * codes.
	 * @returns {string} Matched message template, or first template in the
	 * provided templates if no language match.
	 */
	_findMessageTemplate(messageTmpls) {

		for (let lang of this._langs) {
			const messageTmpl = messageTmpls[lang];
			if (messageTmpl)
				return messageTmpl;
		}

		for (let lang in messageTmpls)
			return messageTmpls[lang];
	}

	/**
	 * Replace message parameters.
	 *
	 * @private
	 * @param {string} messageTmpl Message template.
	 * @param {Object.<string,*>} params Message parameters.
	 * @returns {string} Resulting message.
	 */
	_replaceParams(messageTmpl, params) {

		const re = new RegExp('\\$\\{([^}]+)\\}', 'g');
		let m, lastMatchIndex = 0, message = '';
		while ((m = re.exec(messageTmpl)) !== null) {
			message += messageTmpl.substring(lastMatchIndex, m.index);
			lastMatchIndex = re.lastIndex;
			message += String(params[m[1]]);
		}
		message = (
			lastMatchIndex > 0 ?
				message + messageTmpl.substring(lastMatchIndex) : messageTmpl);

		return message;
	}
}

// export the class
module.exports = MessageResolver;
