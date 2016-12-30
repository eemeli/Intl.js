import plurals from 'make-plural/es6/plurals';

import {
  Intl
} from './8.intl.js';

import {
  GetOption,
  GetNumberOption,
  SupportedLocales,
  ResolveLocale,
  CanonicalizeLocaleList
} from './9.negotiation.js';

import {
  FormatNumberToString,
  SetNumberFormatDigitOptions,
} from './11.numberformat.js';

import {
  internals,
  getInternalProperties,
  Record,
  List,
  hop,
  objCreate,
  fnBind,
  toObject,
  secret,
  createRegExpRestore,
  defineProperty
} from './util.js';

export function PluralRules() {
  let locales = arguments[0];
  let options = arguments[1];

  if (!this || this === Intl) {
      return new Intl.PluralRules(locales, options);
  }
  return InitializePluralRules(toObject(this), locales, options);
}

defineProperty(Intl, 'PluralRules', {
  configurable: true,
  writable: true,
  value: PluralRules
});

defineProperty(PluralRules, 'prototype', {
  writable: false
});

export function InitializePluralRules (pluralRules, locales, options) {
  let internal = getInternalProperties(pluralRules);

  if (internal['[[InitializedIntlObject]]'] === true)
    throw new TypeError('`this` object has already been initialized as an Intl object');

  defineProperty(pluralRules, '__getInternalProperties', {
    value: function () {
      // NOTE: Non-standard, for internal use only
      if (arguments[0] === secret)
        return internal;
    }
  });

  internal['[[InitializedIntlObject]]'] = true;

  let requestedLocales = CanonicalizeLocaleList(locales);

	if (options === undefined)
			options = {};
	else
			options = toObject(options);

  let t = GetOption(options, 'type', 'string', new List('cardinal', 'ordinal'), 'cardinal');
  internal['[[type]]'] = t;

  let opt = new Record();

  let matcher =  GetOption(options, 'localeMatcher', 'string', new List('lookup', 'best fit'), 'best fit');
  opt['[[localeMatcher]]'] = matcher;

  SetNumberFormatDigitOptions(internals, options, 0);

  if (internals['[[maximumFractionDigits]]'] === undefined) {
    internals['[[maximumFractionDigits]]'] = Math.max(internals['[[minimumFractionDigits]]'], 3);
  }


  let localeData = internals.PluralRules['[[localeData]]'];
  let r = ResolveLocale(
    internals.PluralRules['[[availableLocales]]'], requestedLocales,
    opt, internals.PluralRules['[[relevantExtensionKeys]]'], localeData
  );

  internal['[[locale]]'] = r['[[locale]]'];
  internal['[[InitializedPluralRules]]'] = true;

  return pluralRules;
}

// make-plural also handles GetOperands
function PluralRuleSelection(locale, type, s) {
  for (let l = locale; l; l = l.replace(/[-_]?[^-_]*$/, '')) {
    const pf = plurals[l];
    if (pf) return pf(s, type === 'ordinal');
  }
  return 'other';
}

function ResolvePlural(pluralRules, n) {
  if (!Number.isFinite(n)) {
    return 'other';
  }

  let internal = getInternalProperties(pluralRules);
  let locale = internal['[[locale]]'];
  let type = internal['[[type]]'];
  let s = FormatNumberToString(pluralRules, n);
  return PluralRuleSelection(locale, type, s);
}

internals.PluralRules = {
  '[[availableLocales]]' : [],
  '[[relevantExtensionKeys]]': [],
  '[[localeData]]': {}
}

defineProperty(Intl.PluralRules, 'supportedLocalesOf', {
    configurable: true,
    writable: true,
    value: fnBind.call(function (locales) {
        // Bound functions only have the `this` value altered if being used as a constructor,
        // this lets us imitate a native function that has no constructor
        if (!hop.call(this, '[[availableLocales]]'))
            throw new TypeError('supportedLocalesOf() is not a constructor');

        // Create an object whose props can be used to restore the values of RegExp props
        let regexpRestore = createRegExpRestore(),

        // 1. If options is not provided, then let options be undefined.
            options = arguments[1],

        // 2. Let availableLocales be the value of the [[availableLocales]] internal
        //    property of the standard built-in object that is the initial value of
        //    Intl.NumberFormat.

            availableLocales = this['[[availableLocales]]'],

        // 3. Let requestedLocales be the result of calling the CanonicalizeLocaleList
        //    abstract operation (defined in 9.2.1) with argument locales.
            requestedLocales = CanonicalizeLocaleList(locales);

        // Restore the RegExp properties
        regexpRestore();

        // 4. Return the result of calling the SupportedLocales abstract operation
        //    (defined in 9.2.8) with arguments availableLocales, requestedLocales,
        //    and options.
        return SupportedLocales(availableLocales, requestedLocales, options);
    }, internals.PluralRules)
});



defineProperty(Intl.PluralRules.prototype, 'select', {
  configurable: true,
  value: function(value) {
    let pluralRules = this;
    let n = Number(value);
    return ResolvePlural(pluralRules, n);
  }
})

defineProperty(Intl.PluralRules.prototype, 'resolvedOptions', {
  configurable: true,
  writable: true,
  value: function() {
    let prop,
      descs = new Record(),
      props = [
        'locale', 'type',
        'minimumIntegerDigits', 'minimumFractionDigits', 'maximumFractionDigits',
        'minimumSignificantDigits', 'maximumSignificantDigits',
      ],
      internal = this !== null && typeof this === 'object' && getInternalProperties(this);

    if (!internal || !internal['[[InitializedPluralRules]]'])
      throw new TypeError('`this` value for resolvedOptions() is not an initialized Intl.PluralRules object.');

    for (let i = 0, max = props.length; i < max; i++) {
      if (hop.call(internal, prop = '[['+ props[i] +']]'))
        descs[props[i]] = { value: internal[prop], writable: true, configurable: true, enumerable: true };
    }

    return objCreate({}, descs);
  }
});
