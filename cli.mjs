#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Deno globals removed for Node.js compatibility
const noColor = false;
let enabled = !noColor;
function setColorEnabled(value) {
    if (false) {
        return;
    }
    enabled = value;
}
function getColorEnabled() {
    return enabled;
}
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code) {
    return enabled ? `${code.open}${str.replace(code.regexp, code.open)}${code.close}` : str;
}
function bold(str) {
    return run(str, code([
        1
    ], 22));
}
function dim(str) {
    return run(str, code([
        2
    ], 22));
}
function italic(str) {
    return run(str, code([
        3
    ], 23));
}
function underline(str) {
    return run(str, code([
        4
    ], 24));
}
function red(str) {
    return run(str, code([
        31
    ], 39));
}
function green(str) {
    return run(str, code([
        32
    ], 39));
}
function yellow(str) {
    return run(str, code([
        33
    ], 39));
}
function brightBlue(str) {
    return run(str, code([
        94
    ], 39));
}
function brightMagenta(str) {
    return run(str, code([
        95
    ], 39));
}
const ANSI_PATTERN = new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TXZcf-nq-uy=><~]))"
].join("|"), "g");
function stripAnsiCode(string) {
    return string.replace(ANSI_PATTERN, "");
}
const { ceil } = Math;
const peq = new Uint32Array(0x110000);
function myers32(t, p) {
    const n = t.length;
    const m = p.length;
    for(let i = 0; i < m; i++){
        peq[p[i].codePointAt(0)] |= 1 << i;
    }
    const last = m - 1;
    let pv = -1;
    let mv = 0;
    let score = m;
    for(let j = 0; j < n; j++){
        const eq = peq[t[j].codePointAt(0)];
        const xv = eq | mv;
        const xh = (eq & pv) + pv ^ pv | eq;
        let ph = mv | ~(xh | pv);
        let mh = pv & xh;
        score += (ph >>> last & 1) - (mh >>> last & 1);
        ph = ph << 1 | 1;
        mh = mh << 1;
        pv = mh | ~(xv | ph);
        mv = ph & xv;
    }
    for(let i = 0; i < m; i++){
        peq[p[i].codePointAt(0)] = 0;
    }
    return score;
}
function myersX(t, p) {
    const n = t.length;
    const m = p.length;
    const h = new Int8Array(n).fill(1);
    const bmax = ceil(m / 32) - 1;
    for(let b = 0; b < bmax; b++){
        const start = b * 32;
        const end = (b + 1) * 32;
        for(let i = start; i < end; i++){
            peq[p[i].codePointAt(0)] |= 1 << i;
        }
        let pv = -1;
        let mv = 0;
        for(let j = 0; j < n; j++){
            const hin = h[j];
            let eq = peq[t[j].codePointAt(0)];
            const xv = eq | mv;
            eq |= hin >>> 31;
            const xh = (eq & pv) + pv ^ pv | eq;
            let ph = mv | ~(xh | pv);
            let mh = pv & xh;
            h[j] = (ph >>> 31) - (mh >>> 31);
            ph = ph << 1 | -hin >>> 31;
            mh = mh << 1 | hin >>> 31;
            pv = mh | ~(xv | ph);
            mv = ph & xv;
        }
        for(let i = start; i < end; i++){
            peq[p[i].codePointAt(0)] = 0;
        }
    }
    const start = bmax * 32;
    for(let i = start; i < m; i++){
        peq[p[i].codePointAt(0)] |= 1 << i;
    }
    const last = m - 1;
    let pv = -1;
    let mv = 0;
    let score = m;
    for(let j = 0; j < n; j++){
        const hin = h[j];
        let eq = peq[t[j].codePointAt(0)];
        const xv = eq | mv;
        eq |= hin >>> 31;
        const xh = (eq & pv) + pv ^ pv | eq;
        let ph = mv | ~(xh | pv);
        let mh = pv & xh;
        score += (ph >>> last & 1) - (mh >>> last & 1);
        ph = ph << 1 | -hin >>> 31;
        mh = mh << 1 | hin >>> 31;
        pv = mh | ~(xv | ph);
        mv = ph & xv;
    }
    for(let i = start; i < m; i++){
        peq[p[i].codePointAt(0)] = 0;
    }
    return score;
}
function levenshteinDistance(str1, str2) {
    let t = [
        ...str1
    ];
    let p = [
        ...str2
    ];
    if (t.length < p.length) {
        [p, t] = [
            t,
            p
        ];
    }
    if (p.length === 0) {
        return t.length;
    }
    return p.length <= 32 ? myers32(t, p) : myersX(t, p);
}
function closestString(givenWord, possibleWords, options) {
    if (possibleWords.length === 0) {
        throw new TypeError("When using closestString(), the possibleWords array must contain at least one word");
    }
    const { caseSensitive, compareFn = levenshteinDistance } = {
        ...options
    };
    if (!caseSensitive) {
        givenWord = givenWord.toLowerCase();
    }
    let nearestWord = possibleWords[0];
    let closestStringDistance = Infinity;
    for (const each of possibleWords){
        const distance = caseSensitive ? compareFn(givenWord, each) : compareFn(givenWord, each.toLowerCase());
        if (distance < closestStringDistance) {
            nearestWord = each;
            closestStringDistance = distance;
        }
    }
    return nearestWord;
}
function paramCaseToCamelCase(str) {
    return str.replace(/-([a-z])/g, (g)=>g[1].toUpperCase());
}
function getOption(flags, name) {
    while(name[0] === "-"){
        name = name.slice(1);
    }
    for (const flag of flags){
        if (isOption(flag, name)) {
            return flag;
        }
    }
    return;
}
function didYouMeanOption(option, options) {
    const optionNames = options.map((option)=>[
            option.name,
            ...option.aliases ?? []
        ]).flat().map((option)=>getFlag(option));
    return didYouMean(" Did you mean option", getFlag(option), optionNames);
}
function didYouMeanType(type, types) {
    return didYouMean(" Did you mean type", type, types);
}
function didYouMean(message, type, types) {
    const match = types.length ? closestString(type, types) : undefined;
    return match ? `${message} "${match}"?` : "";
}
function getFlag(name) {
    if (name.startsWith("-")) {
        return name;
    }
    if (name.length > 1) {
        return `--${name}`;
    }
    return `-${name}`;
}
function isOption(option, name) {
    return option.name === name || option.aliases && option.aliases.indexOf(name) !== -1;
}
function matchWildCardOptions(name, flags) {
    for (const option of flags){
        if (option.name.indexOf("*") === -1) {
            continue;
        }
        let matched = matchWildCardOption(name, option);
        if (matched) {
            matched = {
                ...matched,
                name
            };
            flags.push(matched);
            return matched;
        }
    }
}
function matchWildCardOption(name, option) {
    const parts = option.name.split(".");
    const parts2 = name.split(".");
    if (parts.length !== parts2.length) {
        return false;
    }
    const count = Math.max(parts.length, parts2.length);
    for(let i = 0; i < count; i++){
        if (parts[i] !== parts2[i] && parts[i] !== "*") {
            return false;
        }
    }
    return option;
}
function getDefaultValue(option) {
    return typeof option.default === "function" ? option.default() : option.default;
}
class FlagsError extends Error {
    constructor(message){
        super(message);
        Object.setPrototypeOf(this, FlagsError.prototype);
    }
}
class UnknownRequiredOptionError extends FlagsError {
    constructor(option, options){
        super(`Unknown required option "${getFlag(option)}".${didYouMeanOption(option, options)}`);
        Object.setPrototypeOf(this, UnknownRequiredOptionError.prototype);
    }
}
class UnknownConflictingOptionError extends FlagsError {
    constructor(option, options){
        super(`Unknown conflicting option "${getFlag(option)}".${didYouMeanOption(option, options)}`);
        Object.setPrototypeOf(this, UnknownConflictingOptionError.prototype);
    }
}
class UnknownTypeError extends FlagsError {
    constructor(type, types){
        super(`Unknown type "${type}".${didYouMeanType(type, types)}`);
        Object.setPrototypeOf(this, UnknownTypeError.prototype);
    }
}
class ValidationError extends FlagsError {
    constructor(message){
        super(message);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
class DuplicateOptionError extends ValidationError {
    constructor(name){
        super(`Option "${getFlag(name).replace(/^--no-/, "--")}" can only occur once, but was found several times.`);
        Object.setPrototypeOf(this, DuplicateOptionError.prototype);
    }
}
class InvalidOptionError extends ValidationError {
    constructor(option, options){
        super(`Invalid option "${getFlag(option)}".${didYouMeanOption(option, options)}`);
        Object.setPrototypeOf(this, InvalidOptionError.prototype);
    }
}
class UnknownOptionError extends ValidationError {
    constructor(option, options){
        super(`Unknown option "${getFlag(option)}".${didYouMeanOption(option, options)}`);
        Object.setPrototypeOf(this, UnknownOptionError.prototype);
    }
}
class MissingOptionValueError extends ValidationError {
    constructor(option){
        super(`Missing value for option "${getFlag(option)}".`);
        Object.setPrototypeOf(this, MissingOptionValueError.prototype);
    }
}
class InvalidOptionValueError extends ValidationError {
    constructor(option, expected, value){
        super(`Option "${getFlag(option)}" must be of type "${expected}", but got "${value}".`);
        Object.setPrototypeOf(this, InvalidOptionValueError.prototype);
    }
}
class UnexpectedOptionValueError extends ValidationError {
    constructor(option, value){
        super(`Option "${getFlag(option)}" doesn't take a value, but got "${value}".`);
        Object.setPrototypeOf(this, InvalidOptionValueError.prototype);
    }
}
class OptionNotCombinableError extends ValidationError {
    constructor(option){
        super(`Option "${getFlag(option)}" cannot be combined with other options.`);
        Object.setPrototypeOf(this, OptionNotCombinableError.prototype);
    }
}
class ConflictingOptionError extends ValidationError {
    constructor(option, conflictingOption){
        super(`Option "${getFlag(option)}" conflicts with option "${getFlag(conflictingOption)}".`);
        Object.setPrototypeOf(this, ConflictingOptionError.prototype);
    }
}
class DependingOptionError extends ValidationError {
    constructor(option, dependingOption){
        super(`Option "${getFlag(option)}" depends on option "${getFlag(dependingOption)}".`);
        Object.setPrototypeOf(this, DependingOptionError.prototype);
    }
}
class MissingRequiredOptionError extends ValidationError {
    constructor(option){
        super(`Missing required option "${getFlag(option)}".`);
        Object.setPrototypeOf(this, MissingRequiredOptionError.prototype);
    }
}
class UnexpectedRequiredArgumentError extends ValidationError {
    constructor(arg){
        super(`An required argument cannot follow an optional argument, but "${arg}"  is defined as required.`);
        Object.setPrototypeOf(this, UnexpectedRequiredArgumentError.prototype);
    }
}
class UnexpectedArgumentAfterVariadicArgumentError extends ValidationError {
    constructor(arg){
        super(`An argument cannot follow an variadic argument, but got "${arg}".`);
        Object.setPrototypeOf(this, UnexpectedArgumentAfterVariadicArgumentError.prototype);
    }
}
class InvalidTypeError extends ValidationError {
    constructor({ label, name, value, type }, expected){
        super(`${label} "${name}" must be of type "${type}", but got "${value}".` + (expected ? ` Expected values: ${expected.map((value)=>`"${value}"`).join(", ")}` : ""));
        Object.setPrototypeOf(this, MissingOptionValueError.prototype);
    }
}
var OptionType;
(function(OptionType) {
    OptionType["STRING"] = "string";
    OptionType["NUMBER"] = "number";
    OptionType["INTEGER"] = "integer";
    OptionType["BOOLEAN"] = "boolean";
})(OptionType || (OptionType = {}));
const __boolean = (type)=>{
    if (~[
        "1",
        "true"
    ].indexOf(type.value)) {
        return true;
    }
    if (~[
        "0",
        "false"
    ].indexOf(type.value)) {
        return false;
    }
    throw new InvalidTypeError(type, [
        "true",
        "false",
        "1",
        "0"
    ]);
};
const number = (type)=>{
    const value = Number(type.value);
    if (Number.isFinite(value)) {
        return value;
    }
    throw new InvalidTypeError(type);
};
const string = ({ value })=>{
    return value;
};
function validateFlags(ctx, opts, options = new Map()) {
    if (!opts.flags) {
        return;
    }
    setDefaultValues(ctx, opts);
    const optionNames = Object.keys(ctx.flags);
    if (!optionNames.length && opts.allowEmpty) {
        return;
    }
    if (ctx.standalone) {
        validateStandaloneOption(ctx, options, optionNames);
        return;
    }
    for (const [name, option] of options){
        validateUnknownOption(option, opts);
        validateConflictingOptions(ctx, option);
        validateDependingOptions(ctx, option);
        validateRequiredValues(ctx, option, name);
    }
    validateRequiredOptions(ctx, options, opts);
}
function validateUnknownOption(option, opts) {
    if (!getOption(opts.flags ?? [], option.name)) {
        throw new UnknownOptionError(option.name, opts.flags ?? []);
    }
}
function setDefaultValues(ctx, opts) {
    if (!opts.flags?.length) {
        return;
    }
    for (const option of opts.flags){
        let name;
        let defaultValue = undefined;
        if (option.name.startsWith("no-")) {
            const propName = option.name.replace(/^no-/, "");
            if (typeof ctx.flags[propName] !== "undefined") {
                continue;
            }
            const positiveOption = getOption(opts.flags, propName);
            if (positiveOption) {
                continue;
            }
            name = paramCaseToCamelCase(propName);
            defaultValue = true;
        }
        if (!name) {
            name = paramCaseToCamelCase(option.name);
        }
        const hasDefaultValue = (!opts.ignoreDefaults || typeof opts.ignoreDefaults[name] === "undefined") && typeof ctx.flags[name] === "undefined" && (typeof option.default !== "undefined" || typeof defaultValue !== "undefined");
        if (hasDefaultValue) {
            ctx.flags[name] = getDefaultValue(option) ?? defaultValue;
            ctx.defaults[option.name] = true;
            if (typeof option.value === "function") {
                ctx.flags[name] = option.value(ctx.flags[name]);
            }
        }
    }
}
function validateStandaloneOption(ctx, options, optionNames) {
    if (!ctx.standalone || optionNames.length === 1) {
        return;
    }
    for (const [_, opt] of options){
        if (!ctx.defaults[opt.name] && opt !== ctx.standalone) {
            throw new OptionNotCombinableError(ctx.standalone.name);
        }
    }
}
function validateConflictingOptions(ctx, option) {
    if (!option.conflicts?.length) {
        return;
    }
    for (const flag of option.conflicts){
        if (isset(flag, ctx.flags)) {
            throw new ConflictingOptionError(option.name, flag);
        }
    }
}
function validateDependingOptions(ctx, option) {
    if (!option.depends) {
        return;
    }
    for (const flag of option.depends){
        if (!isset(flag, ctx.flags) && !ctx.defaults[option.name]) {
            throw new DependingOptionError(option.name, flag);
        }
    }
}
function validateRequiredValues(ctx, option, name) {
    if (!option.args) {
        return;
    }
    const isArray = option.args.length > 1;
    for(let i = 0; i < option.args.length; i++){
        const arg = option.args[i];
        if (arg.optional) {
            continue;
        }
        const hasValue = isArray ? typeof ctx.flags[name][i] !== "undefined" : typeof ctx.flags[name] !== "undefined";
        if (!hasValue) {
            throw new MissingOptionValueError(option.name);
        }
    }
}
function validateRequiredOptions(ctx, options, opts) {
    if (!opts.flags?.length) {
        return;
    }
    const optionsValues = [
        ...options.values()
    ];
    for (const option of opts.flags){
        if (!option.required || paramCaseToCamelCase(option.name) in ctx.flags) {
            continue;
        }
        const conflicts = option.conflicts ?? [];
        const hasConflict = conflicts.find((flag)=>!!ctx.flags[flag]);
        const hasConflicts = hasConflict || optionsValues.find((opt)=>opt.conflicts?.find((flag)=>flag === option.name));
        if (hasConflicts) {
            continue;
        }
        throw new MissingRequiredOptionError(option.name);
    }
}
function isset(flagName, flags) {
    const name = paramCaseToCamelCase(flagName);
    return typeof flags[name] !== "undefined";
}
const integer = (type)=>{
    const value = Number(type.value);
    if (Number.isInteger(value)) {
        return value;
    }
    throw new InvalidTypeError(type);
};
const DefaultTypes = {
    string,
    number,
    integer,
    boolean: __boolean
};
function parseFlags(argsOrCtx, opts = {}) {
    let args;
    let ctx;
    if (Array.isArray(argsOrCtx)) {
        ctx = {};
        args = argsOrCtx;
    } else {
        ctx = argsOrCtx;
        args = argsOrCtx.unknown;
        argsOrCtx.unknown = [];
    }
    args = args.slice();
    ctx.flags ??= {};
    ctx.literal ??= [];
    ctx.unknown ??= [];
    ctx.stopEarly = false;
    ctx.stopOnUnknown = false;
    ctx.defaults ??= {};
    opts.dotted ??= true;
    validateOptions(opts);
    const options = parseArgs(ctx, args, opts);
    validateFlags(ctx, opts, options);
    if (opts.dotted) {
        parseDottedOptions(ctx);
    }
    return ctx;
}
function validateOptions(opts) {
    opts.flags?.forEach((opt)=>{
        opt.depends?.forEach((flag)=>{
            if (!opts.flags || !getOption(opts.flags, flag)) {
                throw new UnknownRequiredOptionError(flag, opts.flags ?? []);
            }
        });
        opt.conflicts?.forEach((flag)=>{
            if (!opts.flags || !getOption(opts.flags, flag)) {
                throw new UnknownConflictingOptionError(flag, opts.flags ?? []);
            }
        });
    });
}
function parseArgs(ctx, args, opts) {
    const optionsMap = new Map();
    let inLiteral = false;
    for(let argsIndex = 0; argsIndex < args.length; argsIndex++){
        let option;
        let current = args[argsIndex];
        let currentValue;
        let negate = false;
        if (inLiteral) {
            ctx.literal.push(current);
            continue;
        } else if (current === "--") {
            inLiteral = true;
            continue;
        } else if (ctx.stopEarly || ctx.stopOnUnknown) {
            ctx.unknown.push(current);
            continue;
        }
        const isFlag = current.length > 1 && current[0] === "-";
        if (!isFlag) {
            if (opts.stopEarly) {
                ctx.stopEarly = true;
            }
            ctx.unknown.push(current);
            continue;
        }
        const isShort = current[1] !== "-";
        const isLong = isShort ? false : current.length > 3 && current[2] !== "-";
        if (!isShort && !isLong) {
            throw new InvalidOptionError(current, opts.flags ?? []);
        }
        if (isShort && current.length > 2 && current[2] !== ".") {
            args.splice(argsIndex, 1, ...splitFlags(current));
            current = args[argsIndex];
        } else if (isLong && current.startsWith("--no-")) {
            negate = true;
        }
        const equalSignIndex = current.indexOf("=");
        if (equalSignIndex !== -1) {
            currentValue = current.slice(equalSignIndex + 1) || undefined;
            current = current.slice(0, equalSignIndex);
        }
        if (opts.flags) {
            option = getOption(opts.flags, current);
            if (!option) {
                const name = current.replace(/^-+/, "");
                option = matchWildCardOptions(name, opts.flags);
                if (!option) {
                    if (opts.stopOnUnknown) {
                        ctx.stopOnUnknown = true;
                        ctx.unknown.push(args[argsIndex]);
                        continue;
                    }
                    throw new UnknownOptionError(current, opts.flags);
                }
            }
        } else {
            option = {
                name: current.replace(/^-+/, ""),
                optionalValue: true,
                type: OptionType.STRING
            };
        }
        if (option.standalone) {
            ctx.standalone = option;
        }
        const positiveName = negate ? option.name.replace(/^no-?/, "") : option.name;
        const propName = paramCaseToCamelCase(positiveName);
        if (typeof ctx.flags[propName] !== "undefined") {
            if (!opts.flags?.length) {
                option.collect = true;
            } else if (!option.collect && !ctx.defaults[option.name]) {
                throw new DuplicateOptionError(current);
            }
        }
        if (option.type && !option.args?.length) {
            option.args = [
                {
                    type: option.type,
                    optional: option.optionalValue,
                    variadic: option.variadic,
                    list: option.list,
                    separator: option.separator
                }
            ];
        }
        if (opts.flags?.length && !option.args?.length && typeof currentValue !== "undefined") {
            throw new UnexpectedOptionValueError(option.name, currentValue);
        }
        let optionArgsIndex = 0;
        let inOptionalArg = false;
        const next = ()=>currentValue ?? args[argsIndex + 1];
        const previous = ctx.flags[propName];
        parseNext(option);
        if (typeof ctx.flags[propName] === "undefined") {
            if (option.args?.length && !option.args?.[optionArgsIndex].optional) {
                throw new MissingOptionValueError(option.name);
            } else if (typeof option.default !== "undefined" && (option.type || option.value || option.args?.length)) {
                ctx.flags[propName] = getDefaultValue(option);
            } else {
                setFlagValue(true);
            }
        }
        if (option.value) {
            const value = option.value(ctx.flags[propName], previous);
            setFlagValue(value);
        } else if (option.collect) {
            const value = typeof previous !== "undefined" ? Array.isArray(previous) ? previous : [
                previous
            ] : [];
            value.push(ctx.flags[propName]);
            setFlagValue(value);
        }
        optionsMap.set(propName, option);
        opts.option?.(option, ctx.flags[propName]);
        function parseNext(option) {
            if (negate) {
                setFlagValue(false);
                return;
            } else if (!option.args?.length) {
                setFlagValue(undefined);
                return;
            }
            const arg = option.args[optionArgsIndex];
            if (!arg) {
                const flag = next();
                throw new UnknownOptionError(flag, opts.flags ?? []);
            }
            if (!arg.type) {
                arg.type = OptionType.BOOLEAN;
            }
            if (!option.args?.length && arg.type === OptionType.BOOLEAN && arg.optional === undefined) {
                arg.optional = true;
            }
            if (arg.optional) {
                inOptionalArg = true;
            } else if (inOptionalArg) {
                throw new UnexpectedRequiredArgumentError(option.name);
            }
            let result;
            let increase = false;
            if (arg.list && hasNext(arg)) {
                const parsed = next().split(arg.separator || ",").map((nextValue)=>{
                    const value = parseValue(option, arg, nextValue);
                    if (typeof value === "undefined") {
                        throw new InvalidOptionValueError(option.name, arg.type ?? "?", nextValue);
                    }
                    return value;
                });
                if (parsed?.length) {
                    result = parsed;
                }
            } else {
                if (hasNext(arg)) {
                    result = parseValue(option, arg, next());
                } else if (arg.optional && arg.type === OptionType.BOOLEAN) {
                    result = true;
                }
            }
            if (increase && typeof currentValue === "undefined") {
                argsIndex++;
                if (!arg.variadic) {
                    optionArgsIndex++;
                } else if (option.args[optionArgsIndex + 1]) {
                    throw new UnexpectedArgumentAfterVariadicArgumentError(next());
                }
            }
            if (typeof result !== "undefined" && (option.args.length > 1 || arg.variadic)) {
                if (!ctx.flags[propName]) {
                    setFlagValue([]);
                }
                ctx.flags[propName].push(result);
                if (hasNext(arg)) {
                    parseNext(option);
                }
            } else {
                setFlagValue(result);
            }
            function hasNext(arg) {
                if (!option.args?.length) {
                    return false;
                }
                const nextValue = currentValue ?? args[argsIndex + 1];
                if (!nextValue) {
                    return false;
                }
                if (option.args.length > 1 && optionArgsIndex >= option.args.length) {
                    return false;
                }
                if (!arg.optional) {
                    return true;
                }
                if (option.equalsSign && arg.optional && !arg.variadic && typeof currentValue === "undefined") {
                    return false;
                }
                if (arg.optional || arg.variadic) {
                    return nextValue[0] !== "-" || typeof currentValue !== "undefined" || arg.type === OptionType.NUMBER && !isNaN(Number(nextValue));
                }
                return false;
            }
            function parseValue(option, arg, value) {
                const result = opts.parse ? opts.parse({
                    label: "Option",
                    type: arg.type || OptionType.STRING,
                    name: `--${option.name}`,
                    value
                }) : parseDefaultType(option, arg, value);
                if (typeof result !== "undefined") {
                    increase = true;
                }
                return result;
            }
        }
        function setFlagValue(value) {
            ctx.flags[propName] = value;
            if (ctx.defaults[propName]) {
                delete ctx.defaults[propName];
            }
        }
    }
    return optionsMap;
}
function parseDottedOptions(ctx) {
    ctx.flags = Object.keys(ctx.flags).reduce((result, key)=>{
        if (~key.indexOf(".")) {
            key.split(".").reduce((result, subKey, index, parts)=>{
                if (index === parts.length - 1) {
                    result[subKey] = ctx.flags[key];
                } else {
                    result[subKey] = result[subKey] ?? {};
                }
                return result[subKey];
            }, result);
        } else {
            result[key] = ctx.flags[key];
        }
        return result;
    }, {});
}
function splitFlags(flag) {
    flag = flag.slice(1);
    const normalized = [];
    const index = flag.indexOf("=");
    const flags = (index !== -1 ? flag.slice(0, index) : flag).split("");
    if (isNaN(Number(flag[flag.length - 1]))) {
        flags.forEach((val)=>normalized.push(`-${val}`));
    } else {
        normalized.push(`-${flags.shift()}`);
        if (flags.length) {
            normalized.push(flags.join(""));
        }
    }
    if (index !== -1) {
        normalized[normalized.length - 1] += flag.slice(index);
    }
    return normalized;
}
function parseDefaultType(option, arg, value) {
    const type = arg.type || OptionType.STRING;
    const parseType = DefaultTypes[type];
    if (!parseType) {
        throw new UnknownTypeError(type, Object.keys(DefaultTypes));
    }
    return parseType({
        label: "Option",
        type,
        name: `--${option.name}`,
        value
    });
}
function getFlag1(name) {
    if (name.startsWith("-")) {
        return name;
    }
    if (name.length > 1) {
        return `--${name}`;
    }
    return `-${name}`;
}
function didYouMean1(message, type, types) {
    const match = types.length ? closestString(type, types) : undefined;
    return match ? `${message} "${match}"?` : "";
}
function didYouMeanCommand(command, commands, excludes = []) {
    const commandNames = commands.map((command)=>command.getName()).filter((command)=>!excludes.includes(command));
    return didYouMean1(" Did you mean command", command, commandNames);
}
const ARGUMENT_REGEX = /^[<\[].+[\]>]$/;
const ARGUMENT_DETAILS_REGEX = /[<\[:>\]]/;
function splitArguments(args) {
    const parts = args.trim().split(/[, =] */g);
    const typeParts = [];
    while(parts[parts.length - 1] && ARGUMENT_REGEX.test(parts[parts.length - 1])){
        typeParts.unshift(parts.pop());
    }
    const typeDefinition = typeParts.join(" ");
    return {
        flags: parts,
        typeDefinition,
        equalsSign: args.includes("=")
    };
}
function parseArgumentsDefinition(argsDefinition, validate = true, all) {
    const argumentDetails = [];
    let hasOptional = false;
    let hasVariadic = false;
    const parts = argsDefinition.split(/ +/);
    for (const arg of parts){
        if (validate && hasVariadic) {
            throw new UnexpectedArgumentAfterVariadicArgumentError(arg);
        }
        const parts = arg.split(ARGUMENT_DETAILS_REGEX);
        if (!parts[1]) {
            if (all) {
                argumentDetails.push(parts[0]);
            }
            continue;
        }
        const type = parts[2] || OptionType.STRING;
        const details = {
            optional: arg[0] === "[",
            name: parts[1],
            action: parts[3] || type,
            variadic: false,
            list: type ? arg.indexOf(type + "[]") !== -1 : false,
            type
        };
        if (validate && !details.optional && hasOptional) {
            throw new UnexpectedRequiredArgumentError(details.name);
        }
        if (arg[0] === "[") {
            hasOptional = true;
        }
        if (details.name.length > 3) {
            const istVariadicLeft = details.name.slice(0, 3) === "...";
            const istVariadicRight = details.name.slice(-3) === "...";
            hasVariadic = details.variadic = istVariadicLeft || istVariadicRight;
            if (istVariadicLeft) {
                details.name = details.name.slice(3);
            } else if (istVariadicRight) {
                details.name = details.name.slice(0, -3);
            }
        }
        argumentDetails.push(details);
    }
    return argumentDetails;
}
function dedent(str) {
    const lines = str.split(/\r?\n|\r/g);
    let text = "";
    let indent = 0;
    for (const line of lines){
        if (text || line.trim()) {
            if (!text) {
                text = line.trimStart();
                indent = line.length - text.length;
            } else {
                text += line.slice(indent);
            }
            text += "\n";
        }
    }
    return text.trimEnd();
}
function getDescription(description, __short) {
    return __short ? description.trim().split("\n", 1)[0].trim() : dedent(description);
}
function underscoreToCamelCase(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/_([a-z])/g, (g)=>g[1].toUpperCase());
}
class CommandError extends Error {
    constructor(message){
        super(message);
        Object.setPrototypeOf(this, CommandError.prototype);
    }
}
class ValidationError1 extends CommandError {
    exitCode;
    cmd;
    constructor(message, { exitCode } = {}){
        super(message);
        Object.setPrototypeOf(this, ValidationError1.prototype);
        this.exitCode = exitCode ?? 2;
    }
}
class DuplicateOptionNameError extends CommandError {
    constructor(optionName, commandName){
        super(`An option with name '${bold(getFlag1(optionName))}' is already registered on command '${bold(commandName)}'. If it is intended to override the option, set the '${bold("override")}' option of the '${bold("option")}' method to true.`);
        Object.setPrototypeOf(this, DuplicateOptionNameError.prototype);
    }
}
class MissingCommandNameError extends CommandError {
    constructor(){
        super("Missing command name.");
        Object.setPrototypeOf(this, MissingCommandNameError.prototype);
    }
}
class DuplicateCommandNameError extends CommandError {
    constructor(name){
        super(`Duplicate command name "${name}".`);
        Object.setPrototypeOf(this, DuplicateCommandNameError.prototype);
    }
}
class DuplicateCommandAliasError extends CommandError {
    constructor(alias){
        super(`Duplicate command alias "${alias}".`);
        Object.setPrototypeOf(this, DuplicateCommandAliasError.prototype);
    }
}
class CommandNotFoundError extends CommandError {
    constructor(name, commands, excluded){
        super(`Unknown command "${name}".${didYouMeanCommand(name, commands, excluded)}`);
        Object.setPrototypeOf(this, CommandNotFoundError.prototype);
    }
}
class DuplicateTypeError extends CommandError {
    constructor(name){
        super(`Type with name "${name}" already exists.`);
        Object.setPrototypeOf(this, DuplicateTypeError.prototype);
    }
}
class DuplicateCompletionError extends CommandError {
    constructor(name){
        super(`Completion with name "${name}" already exists.`);
        Object.setPrototypeOf(this, DuplicateCompletionError.prototype);
    }
}
class DuplicateExampleError extends CommandError {
    constructor(name){
        super(`Example with name "${name}" already exists.`);
        Object.setPrototypeOf(this, DuplicateExampleError.prototype);
    }
}
class DuplicateEnvVarError extends CommandError {
    constructor(name){
        super(`Environment variable with name "${name}" already exists.`);
        Object.setPrototypeOf(this, DuplicateEnvVarError.prototype);
    }
}
class MissingRequiredEnvVarError extends ValidationError1 {
    constructor(envVar){
        super(`Missing required environment variable "${envVar.names[0]}".`);
        Object.setPrototypeOf(this, MissingRequiredEnvVarError.prototype);
    }
}
class TooManyEnvVarValuesError extends CommandError {
    constructor(name){
        super(`An environment variable can only have one value, but "${name}" has more than one.`);
        Object.setPrototypeOf(this, TooManyEnvVarValuesError.prototype);
    }
}
class UnexpectedOptionalEnvVarValueError extends CommandError {
    constructor(name){
        super(`An environment variable cannot have an optional value, but "${name}" is defined as optional.`);
        Object.setPrototypeOf(this, UnexpectedOptionalEnvVarValueError.prototype);
    }
}
class UnexpectedVariadicEnvVarValueError extends CommandError {
    constructor(name){
        super(`An environment variable cannot have an variadic value, but "${name}" is defined as variadic.`);
        Object.setPrototypeOf(this, UnexpectedVariadicEnvVarValueError.prototype);
    }
}
class DefaultCommandNotFoundError extends CommandError {
    constructor(name, commands){
        super(`Default command "${name}" not found.${didYouMeanCommand(name, commands)}`);
        Object.setPrototypeOf(this, DefaultCommandNotFoundError.prototype);
    }
}
class UnknownCommandError extends ValidationError1 {
    constructor(name, commands, excluded){
        super(`Unknown command "${name}".${didYouMeanCommand(name, commands, excluded)}`);
        Object.setPrototypeOf(this, UnknownCommandError.prototype);
    }
}
class NoArgumentsAllowedError extends ValidationError1 {
    constructor(name){
        super(`No arguments allowed for command "${name}".`);
        Object.setPrototypeOf(this, NoArgumentsAllowedError.prototype);
    }
}
class MissingArgumentsError extends ValidationError1 {
    constructor(names){
        super(`Missing argument(s): ${names.join(", ")}`);
        Object.setPrototypeOf(this, MissingArgumentsError.prototype);
    }
}
class MissingArgumentError extends ValidationError1 {
    constructor(name){
        super(`Missing argument: ${name}`);
        Object.setPrototypeOf(this, MissingArgumentError.prototype);
    }
}
class TooManyArgumentsError extends ValidationError1 {
    constructor(args){
        super(`Too many arguments: ${args.join(" ")}`);
        Object.setPrototypeOf(this, TooManyArgumentsError.prototype);
    }
}
function exit(code) {
    const { Deno: Deno1, process } = globalThis;
    const exit = Deno1?.exit ?? process?.exit;
    if (exit) {
        exit(code);
    }
    throw new Error("unsupported runtime");
}
function getArgs() {
    const { Deno: Deno1, process } = globalThis;
    return Deno1?.args ?? process?.argv.slice(2) ?? [];
}
function getEnv(name) {
    const { Deno: Deno1, process } = globalThis;
    if (Deno1) {
        return Deno1.env.get(name);
    } else if (process) {
        return process.env[name];
    }
    throw new Error("unsupported runtime");
}
const border = {
    top: "─",
    topMid: "┬",
    topLeft: "┌",
    topRight: "┐",
    bottom: "─",
    bottomMid: "┴",
    bottomLeft: "└",
    bottomRight: "┘",
    left: "│",
    leftMid: "├",
    mid: "─",
    midMid: "┼",
    right: "│",
    rightMid: "┤",
    middle: "│"
};
class Cell {
    value;
    options;
    get length() {
        return this.toString().length;
    }
    get unclosedAnsiRuns() {
        return this.options.unclosedAnsiRuns ?? "";
    }
    set unclosedAnsiRuns(val) {
        this.options.unclosedAnsiRuns = val;
    }
    static from(value) {
        let cell;
        if (value instanceof Cell) {
            cell = new this(value.getValue());
            cell.options = {
                ...value.options
            };
        } else {
            cell = new this(value);
        }
        return cell;
    }
    constructor(value){
        this.value = value;
        this.options = {};
    }
    toString() {
        return this.value.toString();
    }
    getValue() {
        return this.value;
    }
    setValue(value) {
        this.value = value;
        return this;
    }
    clone(value) {
        return Cell.from(value ?? this);
    }
    border(enable = true, override = true) {
        if (override || typeof this.options.border === "undefined") {
            this.options.border = enable;
        }
        return this;
    }
    colSpan(span, override = true) {
        if (override || typeof this.options.colSpan === "undefined") {
            this.options.colSpan = span;
        }
        return this;
    }
    rowSpan(span, override = true) {
        if (override || typeof this.options.rowSpan === "undefined") {
            this.options.rowSpan = span;
        }
        return this;
    }
    align(direction, override = true) {
        if (override || typeof this.options.align === "undefined") {
            this.options.align = direction;
        }
        return this;
    }
    getBorder() {
        return this.options.border === true;
    }
    getColSpan() {
        return typeof this.options.colSpan === "number" && this.options.colSpan > 0 ? this.options.colSpan : 1;
    }
    getRowSpan() {
        return typeof this.options.rowSpan === "number" && this.options.rowSpan > 0 ? this.options.rowSpan : 1;
    }
    getAlign() {
        return this.options.align ?? "left";
    }
}
class Column {
    static from(options) {
        const opts = options instanceof Column ? options.opts : options;
        return new Column().options(opts);
    }
    opts = {};
    options(options) {
        Object.assign(this.opts, options);
        return this;
    }
    minWidth(width) {
        this.opts.minWidth = width;
        return this;
    }
    maxWidth(width) {
        this.opts.maxWidth = width;
        return this;
    }
    border(border = true) {
        this.opts.border = border;
        return this;
    }
    padding(padding) {
        this.opts.padding = padding;
        return this;
    }
    align(direction) {
        this.opts.align = direction;
        return this;
    }
    getMinWidth() {
        return this.opts.minWidth;
    }
    getMaxWidth() {
        return this.opts.maxWidth;
    }
    getBorder() {
        return this.opts.border;
    }
    getPadding() {
        return this.opts.padding;
    }
    getAlign() {
        return this.opts.align;
    }
}
let tables = null;
const data = {
    "UNICODE_VERSION": "15.0.0",
    "tables": [
        {
            "d": "AAECAwQFBgcICQoLDA0OAw8DDwkQCRESERIA",
            "r": "AQEBAgEBAQEBAQEBAQEBBwEHAVABBwcBBwF4"
        },
        {
            "d": "AAECAwQFBgcGCAYJCgsMDQ4PEAYREhMUBhUWFxgZGhscHR4fICEiIyIkJSYnKCkqJSssLS4vMDEyMzQ1Njc4OToGOzwKBj0GPj9AQUIGQwZEBkVGR0hJSktMTQZOBgoGT1BRUlNUVVZXWFkGWgZbBlxdXl1fYGFiY2RlZmdoBmlqBmsGAQZsBm1uO29wcXI7czt0dXZ3OwY7eHkGent8Bn0Gfn+AgYKDhIWGBoc7iAZdO4kGiosGAXGMBo0GjgaPBpAGkQaSBpMGlJUGlpcGmJmam5ydnp+gLgahLKIGo6SlpganqKmqqwasBq0Grq8GsLGyswa0BrUGtre4Brm6uwZHvAa9vga/wME7wjvDxAbFO8bHO8gGyQbKywbMzQbOBs/Q0QbSBr8GvgbT1AbUBtUG1gbXBtjZ2tsG3N0G3t/g4eLjO+Tl5ufoO+k76gbrBuztOwbu7/AGO+XxCgYKCwZd8g==",
            "r": "AQEBAQEBAQEBAQEBAQEBAQEBAQMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQECBQEOAQEBAQEBAQEBAwEBAQEBAQEBAQIBAwEIAQEBAQEBAQEBAQEBAQIBAQEBAQEBAQEBAQEBAQEBDQEBBQEBAQEBAgEBAwEBAQEBAQEBAQEBbQHaAQEFAQEBBAECAQEBAQEBAQEBAwGuASFkCAELAQEBAQEBAQEHAQMBAQEaAQIBCAEFAQEBAQEBAQEBAQEBAQEBAQEBAQECAQEBAQIBAQEBAQEBAwEDAQEBAQEBAQUBAQEBAQEBBAEBAVIBAdkBARABAQFfARMBAYoBBAEBBQEmAUkBAQcBAQIBHgEBARUBAQEBAQUBAQcBDwEBARoBAgEBAQEBAQECAQEBAQEBAQEBAQEBAQEBAQMBBAEBAgEBAQEUfwEBAQIDAXj/AQ=="
        },
        {
            "d": "AFUVAF3Xd3X/93//VXVVV9VX9V91f1/31X93XVXdVdVV9dVV/VVX1X9X/131VfXVVXV3V1VdVV1V1/1dV1X/3VUAVf3/3/9fVf3/3/9fVV1V/11VFQBQVQEAEEEQVQBQVQBAVFUVAFVUVQUAEAAUBFBVFVFVAEBVBQBUVRUAVVFVBRAAAVBVAVVQVQBVBQBAVUVUAQBUUQEAVQVVUVVUAVRVUVUFVUVBVVRBFRRQUVVQUVUBEFRRVQVVBQBRVRQBVFVRVUFVBVVFVVRVUVVUVQRUBQRQVUFVBVVFVVBVBVVQVRVUAVRVUVUFVVFVRVUFRFVRAEBVFQBAVVEAVFUAQFVQVRFRVQEAQAAEVQEAAQBUVUVVAQQAQVVQBVRVAVRVRUFVUVVRVaoAVQFVBVRVBVUFVQVVEABQVUUBAFVRVRUAVUFVUVVAFVRVRVUBVRUUVUUAQEQBAFQVABRVAEBVAFUEQFRFVRUAVVBVBVAQUFVFUBFQVQAFVUAABABUUVVUUFUVANd/X3//BUD3XdV1VQAEAFVXVdX9V1VXVQBUVdVdVdV1VX111VXVV9V//1X/X1VdVf9fVV9VdVdV1VX31dfVXXX9193/d1X/VV9VV3VVX//1VfVVXVVdVdVVdVWlVWlVqVaWVf/f/1X/Vf/1X1Xf/19V9VVf9df1X1X1X1XVVWlVfV31VVpVd1V3VapV33/fVZVVlVX1WVWlVelV+v/v//7/31Xv/6/77/tVWaVVVlVdVWaVmlX1/1WpVVZVlVWVVlVW+V9VFVBVAKqaqlWqWlWqVaoKoKpqqapqgapVqaqpqmqqVapqqv+qVqpqVRVAAFBVBVVQVUUVVUFVVFVQVQBQVRVVBQBQVRUAUFWqVkBVFQVQVVFVAUBBVRVVVFVUVQQUVAVRVVBVRVVRVFFVqlVFVQCqWlUAqmqqaqpVqlZVqmpVAV1VUVVUVQVAVQFBVQBVQBVVQVUAVRVUVQFVBQBUVQVQVVFVAEBVFFRVFVBVFUBBUUVVUVVAVRUAAQBUVRVVUFUFAEBVARRVFVAEVUVVFQBAVVRVBQBUAFRVAAVEVUVVFQBEFQRVBVBVEFRVUFUVAEARVFUVUQAQVQEFEABVFQBBVRVEFVUABVVUVQEAQFUVABRAVRVVAUABVQUAQFBVAEAAEFUFAAUABEFVAUBFEAAQVVARVRVUVVBVBUBVRFVUFQBQVQBUVQBAVRVVFUBVqlRVWlWqVapaVapWVaqpqmmqalVlVWpZVapVqlVBAFUAUABAVRVQVRUAQAEAVQVQVQVUVQBAFQBUVVFVVFUVAAEAVQBAABQAEARAVUVVAFUAQFUAQFVWVZVV/39V/1//X1X/76uq6v9XVWpVqlWqVlVaVapaVapWVamqmqqmqlWqapWqVapWqmqmqpaqWlWVaqpVZVVpVVZVlapVqlpVVmqpVapVlVZVqlZVqlVWVapqqpqqVapWqlZVqpqqWlWlqlWqVlWqVlVRVQD/Xw==",
            "r": "CBcBCAEBAQEBAQEBAQECAQEBAQEBAQEBAQEBAQMBAQECAQEBAQEBAQEBAQEBBAEBGAEDAQwBAwEIAQEBAQEBAQgcCAEDAQEBAQEDAQEBDQEDEAELAQEBEQEKAQEBDgEBAgIBAQoBBQQBCAEBAQEBAQEHAQEHBgEWAQIBDQECAgEFAQECAgEKAQ0BAQIKAQ0BDQEBAQEBAQEBAgEHAQ4BAQEBAQQBBgEBDgEBAQEBAQcBAQIBAQEBBAEFAQEBDgEBAQEBAQECAQcBDwECAQwCDQEBAQEBAQECAQgBAQEEAQcBDQEBAQEBAQQBBwERAQEBARYBAQECAQEBGAECAQIBARIBBgEBDQECAQEBAQECAQgBAQEZAQEBAgYBAQEDAQECAQEBAQMBCBgIBwEMAQEGAQcBBwEQAQEBAQEBAgIBCgEBDQEIAQ0BAQEBAQEBBgEBDgEBAQEBAQEBAgEMBwEMAQwBAQEBCQECAwEHAQEBAQ0BAQEBDgIBBgEDAQEBAQEBAQMBAQEBAgEBAQEBAQEBCAEBAgEBAQEBAQkBCAgBAwECAQEBAgEBAQkBAQEBAwECAQMBAQIBBwEFAQEDAQYBAQEBAgEBAQEBAQEBAQECAgEDAQECBAIDAgIBBQEEAQEBAwEPAQEBCyIBCAEJAwQBAQIBAQEBAgECAQEBAQMBAQEBAwEBAQEBAQEBAQgBAQMDAgEBAwEEAQIBAQEBBAEBAQEBAQECAQEBAQEBAQEBAQEHAQQBAwEBAQcBAgUBBgECAQYBAQwBAQEUAQELCAYBFgMFAQYDAQoBAQMBARQBAQkBAQoBBgEVAwsBCgIPAQ0BGQEBAgEHARQBAwIBBgEBAQUBBgQBAgEJAQEBBQECAQMHAQELAQECCQEQAQECAgECAQsBDAEBAQEBCgEBAQsBAQEECQ4BCAQCAQEECAEEAQEFCAEPAQEEAQEPAQgBFAEBAQEBAQEKAQEJAQ8BEAEBEwEBAQIBCwEBDgENAwEKAQEBAQELAQEBAQECAQwBCAEBAQEBDgEDAQwBAQECAQEXAQEBAQEHAgEBBQEIAQEBAQEQAgEBBQEUAQEBAQEbAQEBAQEGARQBAQEBARkBAQEBCQEBAQEQAQIBDwEBARQBAQEBBwEBAQkBAQEBAQECAQEBCwECAQEVAQEBAQQBBQEBAQEOAQEBAQEBEgEBFgEBAgEMAQEBAQ8BAQMBFgEBDgEBBQEPAQETAQECAQMOAgUBCgIBGQEBAQEIAQMBBwEBAwECEwgBAQcLAQUBFwEBAQEDAQEBBwEBBAEBDg0BAQwBAQEDAQQBAQEDBAEBBAEBAQEBEAEPAQgBAQsBAQ4BEQEMAgEBBwEOAQEHAQEBAQQBBAEDCwECAQEBAwEBBggBAgEBAREBBQMKAQEBAwQCEQEBHgEPAQIBAQYEAQYBAwEUAQUMAQEBAQEBAQECAQEBAgEIAwEBBgsBAgEODAMBAgEBCwEBAQEBAwECAQECAQEBBwgPAQ=="
        }
    ]
};
function lookupWidth(cp) {
    if (!tables) tables = data.tables.map(runLengthDecode);
    const t1Offset = tables[0][cp >> 13 & 0xff];
    const t2Offset = tables[1][128 * t1Offset + (cp >> 6 & 0x7f)];
    const packedWidths = tables[2][16 * t2Offset + (cp >> 2 & 0xf)];
    const width = packedWidths >> 2 * (cp & 0b11) & 0b11;
    return width === 3 ? 1 : width;
}
const cache = new Map();
function charWidth(__char) {
    if (cache.has(__char)) return cache.get(__char);
    const codePoint = __char.codePointAt(0);
    let width = null;
    if (codePoint < 0x7f) {
        width = codePoint >= 0x20 ? 1 : codePoint === 0 ? 0 : null;
    } else if (codePoint >= 0xa0) {
        width = lookupWidth(codePoint);
    } else {
        width = null;
    }
    cache.set(__char, width);
    return width;
}
function unicodeWidth(str) {
    return [
        ...str
    ].map((ch)=>charWidth(ch) ?? 0).reduce((a, b)=>a + b, 0);
}
function runLengthDecode({ d, r }) {
    const data = atob(d);
    const runLengths = atob(r);
    let out = "";
    for (const [i, ch] of [
        ...runLengths
    ].entries()){
        out += data[i].repeat(ch.codePointAt(0));
    }
    return Uint8Array.from([
        ...out
    ].map((x)=>x.codePointAt(0)));
}
const strLength = (str)=>{
    return unicodeWidth(stripAnsiCode(str));
};
function consumeWords(length, content) {
    let consumed = "";
    const words = content.split("\n")[0]?.split(/ /g);
    for(let i = 0; i < words.length; i++){
        const word = words[i];
        if (consumed) {
            const nextLength = strLength(word);
            const consumedLength = strLength(consumed);
            if (consumedLength + nextLength >= length) {
                break;
            }
        }
        consumed += (i > 0 ? " " : "") + word;
    }
    return consumed;
}
function longest(index, rows, maxWidth) {
    const cellLengths = rows.map((row)=>{
        const cell = row[index];
        const cellValue = cell instanceof Cell && cell.getColSpan() > 1 ? "" : cell?.toString() || "";
        return cellValue.split("\n").map((line)=>{
            const str = typeof maxWidth === "undefined" ? line : consumeWords(maxWidth, line);
            return strLength(str) || 0;
        });
    }).flat();
    return Math.max(...cellLengths);
}
const ansiRegexSource = /\x1b\[(?:(?<_0>0)|(?<_22>1|2|22)|(?<_23>3|23)|(?<_24>4|24)|(?<_27>7|27)|(?<_28>8|28)|(?<_29>9|29)|(?<_39>30|31|32|33|34|35|36|37|38;2;\d+;\d+;\d+|38;5;\d+|39|90|91|92|93|94|95|96|97)|(?<_49>40|41|42|43|44|45|46|47|48;2;\d+;\d+;\d+|48;5;\d+|49|100|101|102|103|104|105|106|107))m/.source;
function consumeChars(length, content) {
    let consumed = "";
    const chars = [
        ...content.split("\n")[0].matchAll(new RegExp(`(?:${ansiRegexSource})+|.`, "gu"))
    ].map(([match])=>match);
    for (const __char of chars){
        if (consumed) {
            const nextLength = strLength(__char);
            const consumedLength = strLength(consumed);
            if (consumedLength + nextLength > length) {
                break;
            }
        }
        consumed += __char;
    }
    return consumed;
}
function getUnclosedAnsiRuns(text) {
    const tokens = [];
    for (const { groups } of text.matchAll(new RegExp(ansiRegexSource, "g"))){
        const [_kind, content] = Object.entries(groups).find(([_, val])=>val);
        tokens.push({
            kind: _kind.slice(1),
            content
        });
    }
    let unclosed = [];
    for (const token of tokens){
        unclosed = [
            ...unclosed.filter((y)=>y.kind !== token.kind),
            token
        ];
    }
    unclosed = unclosed.filter(({ content, kind })=>content !== kind);
    const currentSuffix = unclosed.map(({ kind })=>`\x1b[${kind}m`).reverse().join("");
    const nextPrefix = unclosed.map(({ content })=>`\x1b[${content}m`).join("");
    return {
        currentSuffix,
        nextPrefix
    };
}
class Row extends Array {
    options = {};
    static from(cells) {
        const row = new this(...cells);
        if (cells instanceof Row) {
            row.options = {
                ...cells.options
            };
        }
        return row;
    }
    clone() {
        const row = new Row(...this.map((cell)=>cell instanceof Cell ? cell.clone() : cell));
        row.options = {
            ...this.options
        };
        return row;
    }
    border(enable = true, override = true) {
        if (override || typeof this.options.border === "undefined") {
            this.options.border = enable;
        }
        return this;
    }
    align(direction, override = true) {
        if (override || typeof this.options.align === "undefined") {
            this.options.align = direction;
        }
        return this;
    }
    getBorder() {
        return this.options.border === true;
    }
    hasBorder() {
        return this.getBorder() || this.some((cell)=>cell instanceof Cell && cell.getBorder());
    }
    getAlign() {
        return this.options.align ?? "left";
    }
}
class TableLayout {
    table;
    options;
    constructor(table, options){
        this.table = table;
        this.options = options;
    }
    toString() {
        const opts = this.createLayout();
        return opts.rows.length ? this.renderRows(opts) : "";
    }
    createLayout() {
        Object.keys(this.options.chars).forEach((key)=>{
            if (typeof this.options.chars[key] !== "string") {
                this.options.chars[key] = "";
            }
        });
        const hasBodyBorder = this.table.getBorder() || this.table.hasBodyBorder();
        const hasHeaderBorder = this.table.hasHeaderBorder();
        const hasBorder = hasHeaderBorder || hasBodyBorder;
        const rows = this.#getRows();
        const columns = Math.max(...rows.map((row)=>row.length));
        for(let rowIndex = 0; rowIndex < rows.length; rowIndex++){
            const row = rows[rowIndex];
            const length = row.length;
            if (length < columns) {
                const diff = columns - length;
                for(let i = 0; i < diff; i++){
                    row.push(this.createCell(null, row, rowIndex, length + i));
                }
            }
        }
        const padding = [];
        const width = [];
        for(let colIndex = 0; colIndex < columns; colIndex++){
            const column = this.options.columns.at(colIndex);
            const minColWidth = column?.getMinWidth() ?? (Array.isArray(this.options.minColWidth) ? this.options.minColWidth[colIndex] : this.options.minColWidth);
            const maxColWidth = column?.getMaxWidth() ?? (Array.isArray(this.options.maxColWidth) ? this.options.maxColWidth[colIndex] : this.options.maxColWidth);
            const colWidth = longest(colIndex, rows, maxColWidth);
            width[colIndex] = Math.min(maxColWidth, Math.max(minColWidth, colWidth));
            padding[colIndex] = column?.getPadding() ?? (Array.isArray(this.options.padding) ? this.options.padding[colIndex] : this.options.padding);
        }
        return {
            padding,
            width,
            rows,
            columns,
            hasBorder,
            hasBodyBorder,
            hasHeaderBorder
        };
    }
    #getRows() {
        const header = this.table.getHeader();
        const rows = header ? [
            header,
            ...this.table
        ] : this.table.slice();
        const hasSpan = rows.some((row)=>row.some((cell)=>cell instanceof Cell && (cell.getColSpan() > 1 || cell.getRowSpan() > 1)));
        if (hasSpan) {
            return this.spanRows(rows);
        }
        return rows.map((row, rowIndex)=>{
            const newRow = this.createRow(row);
            for(let colIndex = 0; colIndex < row.length; colIndex++){
                newRow[colIndex] = this.createCell(row[colIndex], newRow, rowIndex, colIndex);
            }
            return newRow;
        });
    }
    spanRows(rows) {
        const rowSpan = [];
        let colSpan = 1;
        let rowIndex = -1;
        while(true){
            rowIndex++;
            if (rowIndex === rows.length && rowSpan.every((span)=>span === 1)) {
                break;
            }
            const row = rows[rowIndex] = this.createRow(rows[rowIndex] || []);
            let colIndex = -1;
            while(true){
                colIndex++;
                if (colIndex === row.length && colIndex === rowSpan.length && colSpan === 1) {
                    break;
                }
                if (colSpan > 1) {
                    colSpan--;
                    rowSpan[colIndex] = rowSpan[colIndex - 1];
                    row.splice(colIndex, this.getDeleteCount(rows, rowIndex, colIndex), row[colIndex - 1]);
                    continue;
                }
                if (rowSpan[colIndex] > 1) {
                    rowSpan[colIndex]--;
                    rows[rowIndex].splice(colIndex, this.getDeleteCount(rows, rowIndex, colIndex), rows[rowIndex - 1][colIndex]);
                    continue;
                }
                const cell = row[colIndex] = this.createCell(row[colIndex] || null, row, rowIndex, colIndex);
                colSpan = cell.getColSpan();
                rowSpan[colIndex] = cell.getRowSpan();
            }
        }
        return rows;
    }
    getDeleteCount(rows, rowIndex, colIndex) {
        return colIndex <= rows[rowIndex].length - 1 && typeof rows[rowIndex][colIndex] === "undefined" ? 1 : 0;
    }
    createRow(row) {
        return Row.from(row).border(this.table.getBorder(), false).align(this.table.getAlign(), false);
    }
    createCell(cell, row, rowIndex, colIndex) {
        const column = this.options.columns.at(colIndex);
        const isHeaderRow = this.isHeaderRow(rowIndex);
        return Cell.from(cell ?? "").border((isHeaderRow ? null : column?.getBorder()) ?? row.getBorder(), false).align((isHeaderRow ? null : column?.getAlign()) ?? row.getAlign(), false);
    }
    isHeaderRow(rowIndex) {
        return rowIndex === 0 && this.table.getHeader() !== undefined;
    }
    renderRows(opts) {
        let result = "";
        const rowSpan = new Array(opts.columns).fill(1);
        for(let rowIndex = 0; rowIndex < opts.rows.length; rowIndex++){
            result += this.renderRow(rowSpan, rowIndex, opts);
        }
        return result.slice(0, -1);
    }
    renderRow(rowSpan, rowIndex, opts, isMultiline) {
        const row = opts.rows[rowIndex];
        const prevRow = opts.rows[rowIndex - 1];
        const nextRow = opts.rows[rowIndex + 1];
        let result = "";
        let colSpan = 1;
        if (!isMultiline && rowIndex === 0 && row.hasBorder()) {
            result += this.renderBorderRow(undefined, row, rowSpan, opts);
        }
        let isMultilineRow = false;
        result += " ".repeat(this.options.indent || 0);
        for(let colIndex = 0; colIndex < opts.columns; colIndex++){
            if (colSpan > 1) {
                colSpan--;
                rowSpan[colIndex] = rowSpan[colIndex - 1];
                continue;
            }
            result += this.renderCell(colIndex, row, opts);
            if (rowSpan[colIndex] > 1) {
                if (!isMultiline) {
                    rowSpan[colIndex]--;
                }
            } else if (!prevRow || prevRow[colIndex] !== row[colIndex]) {
                rowSpan[colIndex] = row[colIndex].getRowSpan();
            }
            colSpan = row[colIndex].getColSpan();
            if (rowSpan[colIndex] === 1 && row[colIndex].length) {
                isMultilineRow = true;
            }
        }
        if (opts.columns > 0) {
            if (row[opts.columns - 1].getBorder()) {
                result += this.options.chars.right;
            } else if (opts.hasBorder) {
                result += " ";
            }
        }
        result += "\n";
        if (isMultilineRow) {
            return result + this.renderRow(rowSpan, rowIndex, opts, isMultilineRow);
        }
        if (opts.rows.length > 1 && (rowIndex === 0 && opts.hasHeaderBorder || rowIndex < opts.rows.length - 1 && opts.hasBodyBorder)) {
            result += this.renderBorderRow(row, nextRow, rowSpan, opts);
        }
        if (rowIndex === opts.rows.length - 1 && row.hasBorder()) {
            result += this.renderBorderRow(row, undefined, rowSpan, opts);
        }
        return result;
    }
    renderCell(colIndex, row, opts, noBorder) {
        let result = "";
        const prevCell = row[colIndex - 1];
        const cell = row[colIndex];
        if (!noBorder) {
            if (colIndex === 0) {
                if (cell.getBorder()) {
                    result += this.options.chars.left;
                } else if (opts.hasBorder) {
                    result += " ";
                }
            } else {
                if (cell.getBorder() || prevCell?.getBorder()) {
                    result += this.options.chars.middle;
                } else if (opts.hasBorder) {
                    result += " ";
                }
            }
        }
        let maxLength = opts.width[colIndex];
        const colSpan = cell.getColSpan();
        if (colSpan > 1) {
            for(let o = 1; o < colSpan; o++){
                maxLength += opts.width[colIndex + o] + opts.padding[colIndex + o];
                if (opts.hasBorder) {
                    maxLength += opts.padding[colIndex + o] + 1;
                }
            }
        }
        const { current, next } = this.renderCellValue(cell, maxLength);
        row[colIndex].setValue(next);
        if (opts.hasBorder) {
            result += " ".repeat(opts.padding[colIndex]);
        }
        result += current;
        if (opts.hasBorder || colIndex < opts.columns - 1) {
            result += " ".repeat(opts.padding[colIndex]);
        }
        return result;
    }
    renderCellValue(cell, maxLength) {
        const length = Math.min(maxLength, strLength(cell.toString()));
        let words = consumeWords(length, cell.toString());
        const breakWord = strLength(words) > length;
        if (breakWord) {
            words = consumeChars(length, words);
        }
        const next = cell.toString().slice(words.length + (breakWord ? 0 : 1));
        words = cell.unclosedAnsiRuns + words;
        const { currentSuffix, nextPrefix } = getUnclosedAnsiRuns(words);
        words += currentSuffix;
        cell.unclosedAnsiRuns = nextPrefix;
        const fillLength = maxLength - strLength(words);
        const align = cell.getAlign();
        let current;
        if (fillLength === 0) {
            current = words;
        } else if (align === "left") {
            current = words + " ".repeat(fillLength);
        } else if (align === "center") {
            current = " ".repeat(Math.floor(fillLength / 2)) + words + " ".repeat(Math.ceil(fillLength / 2));
        } else if (align === "right") {
            current = " ".repeat(fillLength) + words;
        } else {
            throw new Error("Unknown direction: " + align);
        }
        return {
            current,
            next
        };
    }
    renderBorderRow(prevRow, nextRow, rowSpan, opts) {
        let result = "";
        let colSpan = 1;
        for(let colIndex = 0; colIndex < opts.columns; colIndex++){
            if (rowSpan[colIndex] > 1) {
                if (!nextRow) {
                    throw new Error("invalid layout");
                }
                if (colSpan > 1) {
                    colSpan--;
                    continue;
                }
            }
            result += this.renderBorderCell(colIndex, prevRow, nextRow, rowSpan, opts);
            colSpan = nextRow?.[colIndex].getColSpan() ?? 1;
        }
        return result.length ? " ".repeat(this.options.indent) + result + "\n" : "";
    }
    renderBorderCell(colIndex, prevRow, nextRow, rowSpan, opts) {
        const a1 = prevRow?.[colIndex - 1];
        const a2 = nextRow?.[colIndex - 1];
        const b1 = prevRow?.[colIndex];
        const b2 = nextRow?.[colIndex];
        const a1Border = !!a1?.getBorder();
        const a2Border = !!a2?.getBorder();
        const b1Border = !!b1?.getBorder();
        const b2Border = !!b2?.getBorder();
        const hasColSpan = (cell)=>(cell?.getColSpan() ?? 1) > 1;
        const hasRowSpan = (cell)=>(cell?.getRowSpan() ?? 1) > 1;
        let result = "";
        if (colIndex === 0) {
            if (rowSpan[colIndex] > 1) {
                if (b1Border) {
                    result += this.options.chars.left;
                } else {
                    result += " ";
                }
            } else if (b1Border && b2Border) {
                result += this.options.chars.leftMid;
            } else if (b1Border) {
                result += this.options.chars.bottomLeft;
            } else if (b2Border) {
                result += this.options.chars.topLeft;
            } else {
                result += " ";
            }
        } else if (colIndex < opts.columns) {
            if (a1Border && b2Border || b1Border && a2Border) {
                const a1ColSpan = hasColSpan(a1);
                const a2ColSpan = hasColSpan(a2);
                const b1ColSpan = hasColSpan(b1);
                const b2ColSpan = hasColSpan(b2);
                const a1RowSpan = hasRowSpan(a1);
                const a2RowSpan = hasRowSpan(a2);
                const b1RowSpan = hasRowSpan(b1);
                const b2RowSpan = hasRowSpan(b2);
                const hasAllBorder = a1Border && b2Border && b1Border && a2Border;
                const hasAllRowSpan = a1RowSpan && b1RowSpan && a2RowSpan && b2RowSpan;
                const hasAllColSpan = a1ColSpan && b1ColSpan && a2ColSpan && b2ColSpan;
                if (hasAllRowSpan && hasAllBorder) {
                    result += this.options.chars.middle;
                } else if (hasAllColSpan && hasAllBorder && a1 === b1 && a2 === b2) {
                    result += this.options.chars.mid;
                } else if (a1ColSpan && b1ColSpan && a1 === b1) {
                    result += this.options.chars.topMid;
                } else if (a2ColSpan && b2ColSpan && a2 === b2) {
                    result += this.options.chars.bottomMid;
                } else if (a1RowSpan && a2RowSpan && a1 === a2) {
                    result += this.options.chars.leftMid;
                } else if (b1RowSpan && b2RowSpan && b1 === b2) {
                    result += this.options.chars.rightMid;
                } else {
                    result += this.options.chars.midMid;
                }
            } else if (a1Border && b1Border) {
                if (hasColSpan(a1) && hasColSpan(b1) && a1 === b1) {
                    result += this.options.chars.bottom;
                } else {
                    result += this.options.chars.bottomMid;
                }
            } else if (b1Border && b2Border) {
                if (rowSpan[colIndex] > 1) {
                    result += this.options.chars.left;
                } else {
                    result += this.options.chars.leftMid;
                }
            } else if (b2Border && a2Border) {
                if (hasColSpan(a2) && hasColSpan(b2) && a2 === b2) {
                    result += this.options.chars.top;
                } else {
                    result += this.options.chars.topMid;
                }
            } else if (a1Border && a2Border) {
                if (hasRowSpan(a1) && a1 === a2) {
                    result += this.options.chars.right;
                } else {
                    result += this.options.chars.rightMid;
                }
            } else if (a1Border) {
                result += this.options.chars.bottomRight;
            } else if (b1Border) {
                result += this.options.chars.bottomLeft;
            } else if (a2Border) {
                result += this.options.chars.topRight;
            } else if (b2Border) {
                result += this.options.chars.topLeft;
            } else {
                result += " ";
            }
        }
        const length = opts.padding[colIndex] + opts.width[colIndex] + opts.padding[colIndex];
        if (rowSpan[colIndex] > 1 && nextRow) {
            result += this.renderCell(colIndex, nextRow, opts, true);
            if (nextRow[colIndex] === nextRow[nextRow.length - 1]) {
                if (b1Border) {
                    result += this.options.chars.right;
                } else {
                    result += " ";
                }
                return result;
            }
        } else if (b1Border && b2Border) {
            result += this.options.chars.mid.repeat(length);
        } else if (b1Border) {
            result += this.options.chars.bottom.repeat(length);
        } else if (b2Border) {
            result += this.options.chars.top.repeat(length);
        } else {
            result += " ".repeat(length);
        }
        if (colIndex === opts.columns - 1) {
            if (b1Border && b2Border) {
                result += this.options.chars.rightMid;
            } else if (b1Border) {
                result += this.options.chars.bottomRight;
            } else if (b2Border) {
                result += this.options.chars.topRight;
            } else {
                result += " ";
            }
        }
        return result;
    }
}
class Table extends Array {
    static _chars = {
        ...border
    };
    options = {
        indent: 0,
        border: false,
        maxColWidth: Infinity,
        minColWidth: 0,
        padding: 1,
        chars: {
            ...Table._chars
        },
        columns: []
    };
    headerRow;
    static from(rows) {
        const table = new this(...rows);
        if (rows instanceof Table) {
            table.options = {
                ...rows.options
            };
            table.headerRow = rows.headerRow ? Row.from(rows.headerRow) : undefined;
        }
        return table;
    }
    static fromJson(rows) {
        return new this().fromJson(rows);
    }
    static chars(chars) {
        Object.assign(this._chars, chars);
        return this;
    }
    static render(rows) {
        Table.from(rows).render();
    }
    fromJson(rows) {
        this.header(Object.keys(rows[0]));
        this.body(rows.map((row)=>Object.values(row)));
        return this;
    }
    columns(columns) {
        this.options.columns = columns.map((column)=>column instanceof Column ? column : Column.from(column));
        return this;
    }
    column(index, column) {
        if (column instanceof Column) {
            this.options.columns[index] = column;
        } else if (this.options.columns[index]) {
            this.options.columns[index].options(column);
        } else {
            this.options.columns[index] = Column.from(column);
        }
        return this;
    }
    header(header) {
        this.headerRow = header instanceof Row ? header : Row.from(header);
        return this;
    }
    body(rows) {
        this.length = 0;
        this.push(...rows);
        return this;
    }
    clone() {
        const table = new Table(...this.map((row)=>row instanceof Row ? row.clone() : Row.from(row).clone()));
        table.options = {
            ...this.options
        };
        table.headerRow = this.headerRow?.clone();
        return table;
    }
    toString() {
        return new TableLayout(this, this.options).toString();
    }
    render() {
        console.log(this.toString());
        return this;
    }
    maxColWidth(width, override = true) {
        if (override || typeof this.options.maxColWidth === "undefined") {
            this.options.maxColWidth = width;
        }
        return this;
    }
    minColWidth(width, override = true) {
        if (override || typeof this.options.minColWidth === "undefined") {
            this.options.minColWidth = width;
        }
        return this;
    }
    indent(width, override = true) {
        if (override || typeof this.options.indent === "undefined") {
            this.options.indent = width;
        }
        return this;
    }
    padding(padding, override = true) {
        if (override || typeof this.options.padding === "undefined") {
            this.options.padding = padding;
        }
        return this;
    }
    border(enable = true, override = true) {
        if (override || typeof this.options.border === "undefined") {
            this.options.border = enable;
        }
        return this;
    }
    align(direction, override = true) {
        if (override || typeof this.options.align === "undefined") {
            this.options.align = direction;
        }
        return this;
    }
    chars(chars) {
        Object.assign(this.options.chars, chars);
        return this;
    }
    getHeader() {
        return this.headerRow;
    }
    getBody() {
        return [
            ...this
        ];
    }
    getMaxColWidth() {
        return this.options.maxColWidth;
    }
    getMinColWidth() {
        return this.options.minColWidth;
    }
    getIndent() {
        return this.options.indent;
    }
    getPadding() {
        return this.options.padding;
    }
    getBorder() {
        return this.options.border === true;
    }
    hasHeaderBorder() {
        const hasBorder = this.headerRow?.hasBorder();
        return hasBorder === true || this.getBorder() && hasBorder !== false;
    }
    hasBodyBorder() {
        return this.getBorder() || this.options.columns.some((column)=>column.getBorder()) || this.some((row)=>row instanceof Row ? row.hasBorder() : row.some((cell)=>cell instanceof Cell ? cell.getBorder() : false));
    }
    hasBorder() {
        return this.hasHeaderBorder() || this.hasBodyBorder();
    }
    getAlign() {
        return this.options.align ?? "left";
    }
    getColumns() {
        return this.options.columns;
    }
    getColumn(index) {
        return this.options.columns[index] ??= new Column();
    }
}
function inspect(value, colors) {
    // Deno globals removed for Node.js compatibility
    return Deno1?.inspect(value, {
        depth: 1,
        colors,
        trailingComma: false
    }) ?? JSON.stringify(value, null, 2);
}
class Type {
}
class HelpGenerator {
    cmd;
    indent;
    options;
    static generate(cmd, options) {
        return new HelpGenerator(cmd, options).generate();
    }
    constructor(cmd, options = {}){
        this.cmd = cmd;
        this.indent = 2;
        this.options = {
            types: false,
            hints: true,
            colors: true,
            long: false,
            ...options
        };
    }
    generate() {
        const areColorsEnabled = getColorEnabled();
        setColorEnabled(this.options.colors);
        const result = this.generateHeader() + this.generateMeta() + this.generateDescription() + this.generateOptions() + this.generateCommands() + this.generateEnvironmentVariables() + this.generateExamples();
        setColorEnabled(areColorsEnabled);
        return result;
    }
    generateHeader() {
        const usage = this.cmd.getUsage();
        const rows = [
            [
                bold("Usage:"),
                brightMagenta(this.cmd.getPath() + (usage ? " " + highlightArguments(usage, this.options.types) : ""))
            ]
        ];
        const version = this.cmd.getVersion();
        if (version) {
            rows.push([
                bold("Version:"),
                yellow(`${this.cmd.getVersion()}`)
            ]);
        }
        return "\n" + Table.from(rows).padding(1).toString() + "\n";
    }
    generateMeta() {
        const meta = Object.entries(this.cmd.getMeta());
        if (!meta.length) {
            return "";
        }
        const rows = [];
        for (const [name, value] of meta){
            rows.push([
                bold(`${name}: `) + value
            ]);
        }
        return "\n" + Table.from(rows).padding(1).toString() + "\n";
    }
    generateDescription() {
        if (!this.cmd.getDescription()) {
            return "";
        }
        return this.label("Description") + Table.from([
            [
                dedent(this.cmd.getDescription())
            ]
        ]).indent(this.indent).maxColWidth(140).padding(1).toString() + "\n";
    }
    generateOptions() {
        const options = this.cmd.getOptions(false);
        if (!options.length) {
            return "";
        }
        let groups = [];
        const hasGroups = options.some((option)=>option.groupName);
        if (hasGroups) {
            for (const option of options){
                let group = groups.find((group)=>group.name === option.groupName);
                if (!group) {
                    group = {
                        name: option.groupName,
                        options: []
                    };
                    groups.push(group);
                }
                group.options.push(option);
            }
        } else {
            groups = [
                {
                    name: "Options",
                    options
                }
            ];
        }
        let result = "";
        for (const group of groups){
            result += this.generateOptionGroup(group);
        }
        return result;
    }
    generateOptionGroup(group) {
        if (!group.options.length) {
            return "";
        }
        const hasTypeDefinitions = !!group.options.find((option)=>!!option.typeDefinition);
        if (hasTypeDefinitions) {
            return this.label(group.name ?? "Options") + Table.from([
                ...group.options.map((option)=>[
                        option.flags.map((flag)=>brightBlue(flag)).join(", "),
                        highlightArguments(option.typeDefinition || "", this.options.types),
                        red(bold("-")),
                        getDescription(option.description, !this.options.long),
                        this.generateHints(option)
                    ])
            ]).padding([
                2,
                2,
                1,
                2
            ]).indent(this.indent).maxColWidth([
                60,
                60,
                1,
                80,
                60
            ]).toString() + "\n";
        }
        return this.label(group.name ?? "Options") + Table.from([
            ...group.options.map((option)=>[
                    option.flags.map((flag)=>brightBlue(flag)).join(", "),
                    red(bold("-")),
                    getDescription(option.description, !this.options.long),
                    this.generateHints(option)
                ])
        ]).indent(this.indent).maxColWidth([
            60,
            1,
            80,
            60
        ]).padding([
            2,
            1,
            2
        ]).toString() + "\n";
    }
    generateCommands() {
        const commands = this.cmd.getCommands(false);
        if (!commands.length) {
            return "";
        }
        const hasTypeDefinitions = !!commands.find((command)=>!!command.getArgsDefinition());
        if (hasTypeDefinitions) {
            return this.label("Commands") + Table.from([
                ...commands.map((command)=>[
                        [
                            command.getName(),
                            ...command.getAliases()
                        ].map((name)=>brightBlue(name)).join(", "),
                        highlightArguments(command.getArgsDefinition() || "", this.options.types),
                        red(bold("-")),
                        command.getShortDescription()
                    ])
            ]).indent(this.indent).maxColWidth([
                60,
                60,
                1,
                80
            ]).padding([
                2,
                2,
                1,
                2
            ]).toString() + "\n";
        }
        return this.label("Commands") + Table.from([
            ...commands.map((command)=>[
                    [
                        command.getName(),
                        ...command.getAliases()
                    ].map((name)=>brightBlue(name)).join(", "),
                    red(bold("-")),
                    command.getShortDescription()
                ])
        ]).maxColWidth([
            60,
            1,
            80
        ]).padding([
            2,
            1,
            2
        ]).indent(this.indent).toString() + "\n";
    }
    generateEnvironmentVariables() {
        const envVars = this.cmd.getEnvVars(false);
        if (!envVars.length) {
            return "";
        }
        return this.label("Environment variables") + Table.from([
            ...envVars.map((envVar)=>[
                    envVar.names.map((name)=>brightBlue(name)).join(", "),
                    highlightArgumentDetails(envVar.details, this.options.types),
                    red(bold("-")),
                    this.options.long ? dedent(envVar.description) : envVar.description.trim().split("\n", 1)[0],
                    envVar.required ? `(${yellow(`required`)})` : ""
                ])
        ]).padding([
            2,
            2,
            1,
            2
        ]).indent(this.indent).maxColWidth([
            60,
            60,
            1,
            80,
            10
        ]).toString() + "\n";
    }
    generateExamples() {
        const examples = this.cmd.getExamples();
        if (!examples.length) {
            return "";
        }
        return this.label("Examples") + Table.from(examples.map((example)=>[
                dim(bold(example.name)),
                dedent(example.description)
            ])).padding(1).indent(this.indent).maxColWidth(150).toString() + "\n";
    }
    generateHints(option) {
        if (!this.options.hints) {
            return "";
        }
        const hints = [];
        option.required && hints.push(yellow(`required`));
        if (typeof option.default !== "undefined") {
            const defaultValue = typeof option.default === "function" ? option.default() : option.default;
            if (typeof defaultValue !== "undefined") {
                hints.push(bold(`Default: `) + inspect(defaultValue, this.options.colors));
            }
        }
        option.depends?.length && hints.push(yellow(bold(`Depends: `)) + italic(option.depends.map(getFlag1).join(", ")));
        option.conflicts?.length && hints.push(red(bold(`Conflicts: `)) + italic(option.conflicts.map(getFlag1).join(", ")));
        const type = this.cmd.getType(option.args[0]?.type)?.handler;
        if (type instanceof Type) {
            const possibleValues = type.values?.(this.cmd, this.cmd.getParent());
            if (possibleValues?.length) {
                hints.push(bold(`Values: `) + possibleValues.map((value)=>inspect(value, this.options.colors)).join(", "));
            }
        }
        if (hints.length) {
            return `(${hints.join(", ")})`;
        }
        return "";
    }
    label(label) {
        return "\n" + bold(`${label}:`) + "\n\n";
    }
}
function highlightArguments(argsDefinition, types = true) {
    if (!argsDefinition) {
        return "";
    }
    return parseArgumentsDefinition(argsDefinition, false, true).map((arg)=>typeof arg === "string" ? arg : highlightArgumentDetails(arg, types)).join(" ");
}
function highlightArgumentDetails(arg, types = true) {
    let str = "";
    str += yellow(arg.optional ? "[" : "<");
    let name = "";
    name += arg.name;
    if (arg.variadic) {
        name += "...";
    }
    name = brightMagenta(name);
    str += name;
    if (types) {
        str += yellow(":");
        str += red(arg.type);
        if (arg.list) {
            str += green("[]");
        }
    }
    str += yellow(arg.optional ? "]" : ">");
    return str;
}
class BooleanType extends Type {
    parse(type) {
        return __boolean(type);
    }
    complete() {
        return [
            "true",
            "false"
        ];
    }
}
class StringType extends Type {
    parse(type) {
        return string(type);
    }
}
class FileType extends StringType {
    constructor(){
        super();
    }
}
class IntegerType extends Type {
    parse(type) {
        return integer(type);
    }
}
class NumberType extends Type {
    parse(type) {
        return number(type);
    }
}
class Command {
    types = new Map();
    rawArgs = [];
    literalArgs = [];
    _name = "COMMAND";
    _parent;
    _globalParent;
    ver;
    desc = "";
    _usage;
    actionHandler;
    globalActionHandler;
    options = [];
    commands = new Map();
    examples = [];
    envVars = [];
    aliases = [];
    completions = new Map();
    cmd = this;
    argsDefinition;
    throwOnError = false;
    _allowEmpty = false;
    _stopEarly = false;
    defaultCommand;
    _useRawArgs = false;
    args = [];
    isHidden = false;
    isGlobal = false;
    hasDefaults = false;
    _versionOptions;
    _helpOptions;
    _versionOption;
    _helpOption;
    _help;
    _shouldExit;
    _meta = {};
    _groupName = null;
    _noGlobals = false;
    errorHandler;
    versionOption(flags, desc, opts) {
        this._versionOptions = flags === false ? flags : {
            flags,
            desc,
            opts: typeof opts === "function" ? {
                action: opts
            } : opts
        };
        return this;
    }
    helpOption(flags, desc, opts) {
        this._helpOptions = flags === false ? flags : {
            flags,
            desc,
            opts: typeof opts === "function" ? {
                action: opts
            } : opts
        };
        return this;
    }
    command(nameAndArguments, cmdOrDescription, override) {
        this.reset();
        const result = splitArguments(nameAndArguments);
        const name = result.flags.shift();
        const aliases = result.flags;
        if (!name) {
            throw new MissingCommandNameError();
        }
        if (this.getBaseCommand(name, true)) {
            if (!override) {
                throw new DuplicateCommandNameError(name);
            }
            this.removeCommand(name);
        }
        let description;
        let cmd;
        if (typeof cmdOrDescription === "string") {
            description = cmdOrDescription;
        }
        if (cmdOrDescription instanceof Command) {
            cmd = cmdOrDescription.reset();
        } else {
            cmd = new Command();
        }
        cmd._name = name;
        cmd._parent = this;
        if (description) {
            cmd.description(description);
        }
        if (result.typeDefinition) {
            cmd.arguments(result.typeDefinition);
        }
        aliases.forEach((alias)=>cmd.alias(alias));
        this.commands.set(name, cmd);
        this.select(name);
        return this;
    }
    alias(alias) {
        if (this.cmd._name === alias || this.cmd.aliases.includes(alias)) {
            throw new DuplicateCommandAliasError(alias);
        }
        this.cmd.aliases.push(alias);
        return this;
    }
    reset() {
        this._groupName = null;
        this.cmd = this;
        return this;
    }
    select(name) {
        const cmd = this.getBaseCommand(name, true);
        if (!cmd) {
            throw new CommandNotFoundError(name, this.getBaseCommands(true));
        }
        this.cmd = cmd;
        return this;
    }
    name(name) {
        this.cmd._name = name;
        return this;
    }
    version(version) {
        if (typeof version === "string") {
            this.cmd.ver = ()=>version;
        } else if (typeof version === "function") {
            this.cmd.ver = version;
        }
        return this;
    }
    meta(name, value) {
        this.cmd._meta[name] = value;
        return this;
    }
    getMeta(name) {
        return typeof name === "undefined" ? this._meta : this._meta[name];
    }
    help(help) {
        if (typeof help === "string") {
            this.cmd._help = ()=>help;
        } else if (typeof help === "function") {
            this.cmd._help = help;
        } else {
            this.cmd._help = (cmd, options)=>HelpGenerator.generate(cmd, {
                    ...help,
                    ...options
                });
        }
        return this;
    }
    description(description) {
        this.cmd.desc = description;
        return this;
    }
    usage(usage) {
        this.cmd._usage = usage;
        return this;
    }
    hidden() {
        this.cmd.isHidden = true;
        return this;
    }
    global() {
        this.cmd.isGlobal = true;
        return this;
    }
    arguments(args) {
        this.cmd.argsDefinition = args;
        return this;
    }
    action(fn) {
        this.cmd.actionHandler = fn;
        return this;
    }
    globalAction(fn) {
        this.cmd.globalActionHandler = fn;
        return this;
    }
    allowEmpty(allowEmpty) {
        this.cmd._allowEmpty = allowEmpty !== false;
        return this;
    }
    stopEarly(stopEarly = true) {
        this.cmd._stopEarly = stopEarly;
        return this;
    }
    useRawArgs(useRawArgs = true) {
        this.cmd._useRawArgs = useRawArgs;
        return this;
    }
    default(name) {
        this.cmd.defaultCommand = name;
        return this;
    }
    globalType(name, handler, options) {
        return this.type(name, handler, {
            ...options,
            global: true
        });
    }
    type(name, handler, options) {
        if (this.cmd.types.get(name) && !options?.override) {
            throw new DuplicateTypeError(name);
        }
        this.cmd.types.set(name, {
            ...options,
            name,
            handler: handler
        });
        if (handler instanceof Type && (typeof handler.complete !== "undefined" || typeof handler.values !== "undefined")) {
            const completeHandler = (cmd, parent)=>handler.complete?.(cmd, parent) || [];
            this.complete(name, completeHandler, options);
        }
        return this;
    }
    globalComplete(name, complete, options) {
        return this.complete(name, complete, {
            ...options,
            global: true
        });
    }
    complete(name, complete, options) {
        if (this.cmd.completions.has(name) && !options?.override) {
            throw new DuplicateCompletionError(name);
        }
        this.cmd.completions.set(name, {
            name,
            complete,
            ...options
        });
        return this;
    }
    throwErrors() {
        this.cmd.throwOnError = true;
        return this;
    }
    error(handler) {
        this.cmd.errorHandler = handler;
        return this;
    }
    getErrorHandler() {
        return this.errorHandler ?? this._parent?.errorHandler;
    }
    noExit() {
        this.cmd._shouldExit = false;
        this.throwErrors();
        return this;
    }
    noGlobals() {
        this.cmd._noGlobals = true;
        return this;
    }
    shouldThrowErrors() {
        return this.throwOnError || !!this._parent?.shouldThrowErrors();
    }
    shouldExit() {
        return this._shouldExit ?? this._parent?.shouldExit() ?? true;
    }
    group(name) {
        this.cmd._groupName = name;
        return this;
    }
    globalOption(flags, desc, opts) {
        if (typeof opts === "function") {
            return this.option(flags, desc, {
                value: opts,
                global: true
            });
        }
        return this.option(flags, desc, {
            ...opts,
            global: true
        });
    }
    option(flags, desc, opts) {
        if (typeof opts === "function") {
            opts = {
                value: opts
            };
        }
        const result = splitArguments(flags);
        const args = result.typeDefinition ? parseArgumentsDefinition(result.typeDefinition) : [];
        const option = {
            ...opts,
            name: "",
            description: desc,
            args,
            flags: result.flags,
            equalsSign: result.equalsSign,
            typeDefinition: result.typeDefinition,
            groupName: this._groupName ?? undefined
        };
        if (option.separator) {
            for (const arg of args){
                if (arg.list) {
                    arg.separator = option.separator;
                }
            }
        }
        for (const part of option.flags){
            const arg = part.trim();
            const isLong = /^--/.test(arg);
            const name = isLong ? arg.slice(2) : arg.slice(1);
            if (this.cmd.getBaseOption(name, true)) {
                if (opts?.override) {
                    this.removeOption(name);
                } else {
                    throw new DuplicateOptionNameError(name, this.getPath());
                }
            }
            if (!option.name && isLong) {
                option.name = name;
            } else if (!option.aliases) {
                option.aliases = [
                    name
                ];
            } else {
                option.aliases.push(name);
            }
        }
        if (option.prepend) {
            this.cmd.options.unshift(option);
        } else {
            this.cmd.options.push(option);
        }
        return this;
    }
    example(name, description) {
        if (this.cmd.hasExample(name)) {
            throw new DuplicateExampleError(name);
        }
        this.cmd.examples.push({
            name,
            description
        });
        return this;
    }
    globalEnv(name, description, options) {
        return this.env(name, description, {
            ...options,
            global: true
        });
    }
    env(name, description, options) {
        const result = splitArguments(name);
        if (!result.typeDefinition) {
            result.typeDefinition = "<value:boolean>";
        }
        if (result.flags.some((envName)=>this.cmd.getBaseEnvVar(envName, true))) {
            throw new DuplicateEnvVarError(name);
        }
        const details = parseArgumentsDefinition(result.typeDefinition);
        if (details.length > 1) {
            throw new TooManyEnvVarValuesError(name);
        } else if (details.length && details[0].optional) {
            throw new UnexpectedOptionalEnvVarValueError(name);
        } else if (details.length && details[0].variadic) {
            throw new UnexpectedVariadicEnvVarValueError(name);
        }
        this.cmd.envVars.push({
            name: result.flags[0],
            names: result.flags,
            description,
            type: details[0].type,
            details: details.shift(),
            ...options
        });
        return this;
    }
    parse(args = getArgs()) {
        const ctx = {
            unknown: args.slice(),
            flags: {},
            env: {},
            literal: [],
            stopEarly: false,
            stopOnUnknown: false,
            defaults: {},
            actions: []
        };
        return this.parseCommand(ctx);
    }
    async parseCommand(ctx) {
        try {
            this.reset();
            this.registerDefaults();
            this.rawArgs = ctx.unknown.slice();
            if (this._useRawArgs) {
                await this.parseEnvVars(ctx, this.envVars);
                return await this.execute(ctx.env, ctx.unknown);
            }
            let preParseGlobals = false;
            let subCommand;
            if (ctx.unknown.length > 0) {
                subCommand = this.getSubCommand(ctx);
                if (!subCommand) {
                    const optionName = ctx.unknown[0].replace(/^-+/, "").split("=")[0];
                    const option = this.getOption(optionName, true);
                    if (option?.global) {
                        preParseGlobals = true;
                        await this.parseGlobalOptionsAndEnvVars(ctx);
                    }
                }
            }
            if (subCommand || ctx.unknown.length > 0) {
                subCommand ??= this.getSubCommand(ctx);
                if (subCommand) {
                    subCommand._globalParent = this;
                    return subCommand.parseCommand(ctx);
                }
            }
            await this.parseOptionsAndEnvVars(ctx, preParseGlobals);
            const options = {
                ...ctx.env,
                ...ctx.flags
            };
            const args = this.parseArguments(ctx, options);
            this.literalArgs = ctx.literal;
            if (ctx.actions.length) {
                await Promise.all(ctx.actions.map((action)=>action.call(this, options, ...args)));
                if (ctx.standalone) {
                    return {
                        options,
                        args,
                        cmd: this,
                        literal: this.literalArgs
                    };
                }
            }
            return await this.execute(options, args);
        } catch (error) {
            this.handleError(error);
        }
    }
    getSubCommand(ctx) {
        const subCommand = this.getCommand(ctx.unknown[0], true);
        if (subCommand) {
            ctx.unknown.shift();
        }
        return subCommand;
    }
    async parseGlobalOptionsAndEnvVars(ctx) {
        const isHelpOption = this.getHelpOption()?.flags.includes(ctx.unknown[0]);
        const envVars = [
            ...this.envVars.filter((envVar)=>envVar.global),
            ...this.getGlobalEnvVars(true)
        ];
        await this.parseEnvVars(ctx, envVars, !isHelpOption);
        const options = [
            ...this.options.filter((option)=>option.global),
            ...this.getGlobalOptions(true)
        ];
        this.parseOptions(ctx, options, {
            stopEarly: true,
            stopOnUnknown: true,
            dotted: false
        });
    }
    async parseOptionsAndEnvVars(ctx, preParseGlobals) {
        const helpOption = this.getHelpOption();
        const isVersionOption = this._versionOption?.flags.includes(ctx.unknown[0]);
        const isHelpOption = helpOption && ctx.flags?.[helpOption.name] === true;
        const envVars = preParseGlobals ? this.envVars.filter((envVar)=>!envVar.global) : this.getEnvVars(true);
        await this.parseEnvVars(ctx, envVars, !isHelpOption && !isVersionOption);
        const options = this.getOptions(true);
        this.parseOptions(ctx, options);
    }
    registerDefaults() {
        if (this.hasDefaults || this.getParent()) {
            return this;
        }
        this.hasDefaults = true;
        this.reset();
        !this.types.has("string") && this.type("string", new StringType(), {
            global: true
        });
        !this.types.has("number") && this.type("number", new NumberType(), {
            global: true
        });
        !this.types.has("integer") && this.type("integer", new IntegerType(), {
            global: true
        });
        !this.types.has("boolean") && this.type("boolean", new BooleanType(), {
            global: true
        });
        !this.types.has("file") && this.type("file", new FileType(), {
            global: true
        });
        if (!this._help) {
            this.help({});
        }
        if (this._versionOptions !== false && (this._versionOptions || this.ver)) {
            this.option(this._versionOptions?.flags || "-V, --version", this._versionOptions?.desc || "Show the version number for this program.", {
                standalone: true,
                prepend: true,
                action: async function() {
                    const __long = this.getRawArgs().includes(`--${this._versionOption?.name}`);
                    if (__long) {
                        await checkVersion(this);
                        this.showLongVersion();
                    } else {
                        this.showVersion();
                    }
                    this.exit();
                },
                ...this._versionOptions?.opts ?? {}
            });
            this._versionOption = this.options[0];
        }
        if (this._helpOptions !== false) {
            this.option(this._helpOptions?.flags || "-h, --help", this._helpOptions?.desc || "Show this help.", {
                standalone: true,
                global: true,
                prepend: true,
                action: async function() {
                    const __long = this.getRawArgs().includes(`--${this.getHelpOption()?.name}`);
                    await checkVersion(this);
                    this.showHelp({
                        long: __long
                    });
                    this.exit();
                },
                ...this._helpOptions?.opts ?? {}
            });
            this._helpOption = this.options[0];
        }
        return this;
    }
    async execute(options, args) {
        if (this.defaultCommand) {
            const cmd = this.getCommand(this.defaultCommand, true);
            if (!cmd) {
                throw new DefaultCommandNotFoundError(this.defaultCommand, this.getCommands());
            }
            cmd._globalParent = this;
            return cmd.execute(options, args);
        }
        await this.executeGlobalAction(options, args);
        if (this.actionHandler) {
            await this.actionHandler(options, ...args);
        }
        return {
            options,
            args,
            cmd: this,
            literal: this.literalArgs
        };
    }
    async executeGlobalAction(options, args) {
        if (!this._noGlobals) {
            await this._parent?.executeGlobalAction(options, args);
        }
        await this.globalActionHandler?.(options, ...args);
    }
    parseOptions(ctx, options, { stopEarly = this._stopEarly, stopOnUnknown = false, dotted = true } = {}) {
        parseFlags(ctx, {
            stopEarly,
            stopOnUnknown,
            dotted,
            allowEmpty: this._allowEmpty,
            flags: options,
            ignoreDefaults: ctx.env,
            parse: (type)=>this.parseType(type),
            option: (option)=>{
                if (option.action) {
                    ctx.actions.push(option.action);
                }
            }
        });
    }
    parseType(type) {
        const typeSettings = this.getType(type.type);
        if (!typeSettings) {
            throw new UnknownTypeError(type.type, this.getTypes().map((type)=>type.name));
        }
        return typeSettings.handler instanceof Type ? typeSettings.handler.parse(type) : typeSettings.handler(type);
    }
    async parseEnvVars(ctx, envVars, validate = true) {
        for (const envVar of envVars){
            const env = await this.findEnvVar(envVar.names);
            if (env) {
                const parseType = (value)=>{
                    return this.parseType({
                        label: "Environment variable",
                        type: envVar.type,
                        name: env.name,
                        value
                    });
                };
                const propertyName = underscoreToCamelCase(envVar.prefix ? envVar.names[0].replace(new RegExp(`^${envVar.prefix}`), "") : envVar.names[0]);
                if (envVar.details.list) {
                    ctx.env[propertyName] = env.value.split(envVar.details.separator ?? ",").map(parseType);
                } else {
                    ctx.env[propertyName] = parseType(env.value);
                }
                if (envVar.value && typeof ctx.env[propertyName] !== "undefined") {
                    ctx.env[propertyName] = envVar.value(ctx.env[propertyName]);
                }
            } else if (envVar.required && validate) {
                throw new MissingRequiredEnvVarError(envVar);
            }
        }
    }
    async findEnvVar(names) {
        for (const name of names){
            const status = await globalThis.Deno?.permissions.query({
                name: "env",
                variable: name
            });
            if (!status || status.state === "granted") {
                const value = getEnv(name);
                if (value) {
                    return {
                        name,
                        value
                    };
                }
            }
        }
        return undefined;
    }
    parseArguments(ctx, options) {
        const params = [];
        const args = ctx.unknown.slice();
        if (!this.hasArguments()) {
            if (args.length) {
                if (this.hasCommands(true)) {
                    if (this.hasCommand(args[0], true)) {
                        throw new TooManyArgumentsError(args);
                    } else {
                        throw new UnknownCommandError(args[0], this.getCommands());
                    }
                } else {
                    throw new NoArgumentsAllowedError(this.getPath());
                }
            }
        } else {
            if (!args.length) {
                const required = this.getArguments().filter((expectedArg)=>!expectedArg.optional).map((expectedArg)=>expectedArg.name);
                if (required.length) {
                    const optionNames = Object.keys(options);
                    const hasStandaloneOption = !!optionNames.find((name)=>this.getOption(name, true)?.standalone);
                    if (!hasStandaloneOption) {
                        throw new MissingArgumentsError(required);
                    }
                }
            } else {
                for (const expectedArg of this.getArguments()){
                    if (!args.length) {
                        if (expectedArg.optional) {
                            break;
                        }
                        throw new MissingArgumentError(expectedArg.name);
                    }
                    let arg;
                    const parseArgValue = (value)=>{
                        return expectedArg.list ? value.split(",").map((value)=>parseArgType(value)) : parseArgType(value);
                    };
                    const parseArgType = (value)=>{
                        return this.parseType({
                            label: "Argument",
                            type: expectedArg.type,
                            name: expectedArg.name,
                            value
                        });
                    };
                    if (expectedArg.variadic) {
                        arg = args.splice(0, args.length).map((value)=>parseArgValue(value));
                    } else {
                        arg = parseArgValue(args.shift());
                    }
                    if (expectedArg.variadic && Array.isArray(arg)) {
                        params.push(...arg);
                    } else if (typeof arg !== "undefined") {
                        params.push(arg);
                    }
                }
                if (args.length) {
                    throw new TooManyArgumentsError(args);
                }
            }
        }
        return params;
    }
    handleError(error) {
        this.throw(error instanceof ValidationError ? new ValidationError1(error.message) : error instanceof Error ? error : new Error(`[non-error-thrown] ${error}`));
    }
    throw(error) {
        if (error instanceof ValidationError1) {
            error.cmd = this;
        }
        this.getErrorHandler()?.(error, this);
        if (this.shouldThrowErrors() || !(error instanceof ValidationError1)) {
            throw error;
        }
        this.showHelp();
        console.error(red(`  ${bold("error")}: ${error.message}\n`));
        exit(error instanceof ValidationError1 ? error.exitCode : 1);
    }
    getName() {
        return this._name;
    }
    getParent() {
        return this._parent;
    }
    getGlobalParent() {
        return this._globalParent;
    }
    getMainCommand() {
        return this._parent?.getMainCommand() ?? this;
    }
    getAliases() {
        return this.aliases;
    }
    getPath(name) {
        return this._parent ? this._parent.getPath(name) + " " + this._name : name || this._name;
    }
    getArgsDefinition() {
        return this.argsDefinition;
    }
    getArgument(name) {
        return this.getArguments().find((arg)=>arg.name === name);
    }
    getArguments() {
        if (!this.args.length && this.argsDefinition) {
            this.args = parseArgumentsDefinition(this.argsDefinition);
        }
        return this.args;
    }
    hasArguments() {
        return !!this.argsDefinition;
    }
    getVersion() {
        return this.getVersionHandler()?.call(this, this);
    }
    getVersionHandler() {
        return this.ver ?? this._parent?.getVersionHandler();
    }
    getDescription() {
        return typeof this.desc === "function" ? this.desc = this.desc() : this.desc;
    }
    getUsage() {
        return this._usage ?? [
            this.getArgsDefinition(),
            this.getRequiredOptionsDefinition()
        ].join(" ").trim();
    }
    getRequiredOptionsDefinition() {
        return this.getOptions().filter((option)=>option.required).map((option)=>[
                findFlag(option.flags),
                option.typeDefinition
            ].filter((v)=>v).join(" ").trim()).join(" ");
    }
    getShortDescription() {
        return getDescription(this.getDescription(), true);
    }
    getRawArgs() {
        return this.rawArgs;
    }
    getLiteralArgs() {
        return this.literalArgs;
    }
    showVersion() {
        console.log(this.getVersion());
    }
    getLongVersion() {
        return `${bold(this.getMainCommand().getName())} ${brightBlue(this.getVersion() ?? "")}` + Object.entries(this.getMeta()).map(([k, v])=>`\n${bold(k)} ${brightBlue(v)}`).join("");
    }
    showLongVersion() {
        console.log(this.getLongVersion());
    }
    showHelp(options) {
        console.log(this.getHelp(options));
    }
    getHelp(options) {
        this.registerDefaults();
        return this.getHelpHandler().call(this, this, options ?? {});
    }
    getHelpHandler() {
        return this._help ?? this._parent?.getHelpHandler();
    }
    exit(code = 0) {
        if (this.shouldExit()) {
            exit(code);
        }
    }
    hasOptions(hidden) {
        return this.getOptions(hidden).length > 0;
    }
    getOptions(hidden) {
        return this.getGlobalOptions(hidden).concat(this.getBaseOptions(hidden));
    }
    getBaseOptions(hidden) {
        if (!this.options.length) {
            return [];
        }
        return hidden ? this.options.slice(0) : this.options.filter((opt)=>!opt.hidden);
    }
    getGlobalOptions(hidden) {
        const helpOption = this.getHelpOption();
        const getGlobals = (cmd, noGlobals, options = [], names = [])=>{
            if (cmd.options.length) {
                for (const option of cmd.options){
                    if (option.global && !this.options.find((opt)=>opt.name === option.name) && names.indexOf(option.name) === -1 && (hidden || !option.hidden)) {
                        if (noGlobals && option !== helpOption) {
                            continue;
                        }
                        names.push(option.name);
                        options.push(option);
                    }
                }
            }
            return cmd._parent ? getGlobals(cmd._parent, noGlobals || cmd._noGlobals, options, names) : options;
        };
        return this._parent ? getGlobals(this._parent, this._noGlobals) : [];
    }
    hasOption(name, hidden) {
        return !!this.getOption(name, hidden);
    }
    getOption(name, hidden) {
        return this.getBaseOption(name, hidden) ?? this.getGlobalOption(name, hidden);
    }
    getBaseOption(name, hidden) {
        const option = this.options.find((option)=>option.name === name || option.aliases?.includes(name));
        return option && (hidden || !option.hidden) ? option : undefined;
    }
    getGlobalOption(name, hidden) {
        const helpOption = this.getHelpOption();
        const getGlobalOption = (parent, noGlobals)=>{
            const option = parent.getBaseOption(name, hidden);
            if (!option?.global) {
                return parent._parent && getGlobalOption(parent._parent, noGlobals || parent._noGlobals);
            }
            if (noGlobals && option !== helpOption) {
                return;
            }
            return option;
        };
        return this._parent && getGlobalOption(this._parent, this._noGlobals);
    }
    removeOption(name) {
        const index = this.options.findIndex((option)=>option.name === name);
        if (index === -1) {
            return;
        }
        return this.options.splice(index, 1)[0];
    }
    hasCommands(hidden) {
        return this.getCommands(hidden).length > 0;
    }
    getCommands(hidden) {
        return this.getGlobalCommands(hidden).concat(this.getBaseCommands(hidden));
    }
    getBaseCommands(hidden) {
        const commands = Array.from(this.commands.values());
        return hidden ? commands : commands.filter((cmd)=>!cmd.isHidden);
    }
    getGlobalCommands(hidden) {
        const getCommands = (command, noGlobals, commands = [], names = [])=>{
            if (command.commands.size) {
                for (const [_, cmd] of command.commands){
                    if (cmd.isGlobal && this !== cmd && !this.commands.has(cmd._name) && names.indexOf(cmd._name) === -1 && (hidden || !cmd.isHidden)) {
                        if (noGlobals && cmd?.getName() !== "help") {
                            continue;
                        }
                        names.push(cmd._name);
                        commands.push(cmd);
                    }
                }
            }
            return command._parent ? getCommands(command._parent, noGlobals || command._noGlobals, commands, names) : commands;
        };
        return this._parent ? getCommands(this._parent, this._noGlobals) : [];
    }
    hasCommand(name, hidden) {
        return !!this.getCommand(name, hidden);
    }
    getCommand(name, hidden) {
        return this.getBaseCommand(name, hidden) ?? this.getGlobalCommand(name, hidden);
    }
    getBaseCommand(name, hidden) {
        for (const cmd of this.commands.values()){
            if (cmd._name === name || cmd.aliases.includes(name)) {
                return cmd && (hidden || !cmd.isHidden) ? cmd : undefined;
            }
        }
    }
    getGlobalCommand(name, hidden) {
        const getGlobalCommand = (parent, noGlobals)=>{
            const cmd = parent.getBaseCommand(name, hidden);
            if (!cmd?.isGlobal) {
                return parent._parent && getGlobalCommand(parent._parent, noGlobals || parent._noGlobals);
            }
            if (noGlobals && cmd.getName() !== "help") {
                return;
            }
            return cmd;
        };
        return this._parent && getGlobalCommand(this._parent, this._noGlobals);
    }
    removeCommand(name) {
        const command = this.getBaseCommand(name, true);
        if (command) {
            this.commands.delete(command._name);
        }
        return command;
    }
    getTypes() {
        return this.getGlobalTypes().concat(this.getBaseTypes());
    }
    getBaseTypes() {
        return Array.from(this.types.values());
    }
    getGlobalTypes() {
        const getTypes = (cmd, types = [], names = [])=>{
            if (cmd) {
                if (cmd.types.size) {
                    cmd.types.forEach((type)=>{
                        if (type.global && !this.types.has(type.name) && names.indexOf(type.name) === -1) {
                            names.push(type.name);
                            types.push(type);
                        }
                    });
                }
                return getTypes(cmd._parent, types, names);
            }
            return types;
        };
        return getTypes(this._parent);
    }
    getType(name) {
        return this.getBaseType(name) ?? this.getGlobalType(name);
    }
    getBaseType(name) {
        return this.types.get(name);
    }
    getGlobalType(name) {
        if (!this._parent) {
            return;
        }
        const cmd = this._parent.getBaseType(name);
        if (!cmd?.global) {
            return this._parent.getGlobalType(name);
        }
        return cmd;
    }
    getCompletions() {
        return this.getGlobalCompletions().concat(this.getBaseCompletions());
    }
    getBaseCompletions() {
        return Array.from(this.completions.values());
    }
    getGlobalCompletions() {
        const getCompletions = (cmd, completions = [], names = [])=>{
            if (cmd) {
                if (cmd.completions.size) {
                    cmd.completions.forEach((completion)=>{
                        if (completion.global && !this.completions.has(completion.name) && names.indexOf(completion.name) === -1) {
                            names.push(completion.name);
                            completions.push(completion);
                        }
                    });
                }
                return getCompletions(cmd._parent, completions, names);
            }
            return completions;
        };
        return getCompletions(this._parent);
    }
    getCompletion(name) {
        return this.getBaseCompletion(name) ?? this.getGlobalCompletion(name);
    }
    getBaseCompletion(name) {
        return this.completions.get(name);
    }
    getGlobalCompletion(name) {
        if (!this._parent) {
            return;
        }
        const completion = this._parent.getBaseCompletion(name);
        if (!completion?.global) {
            return this._parent.getGlobalCompletion(name);
        }
        return completion;
    }
    hasEnvVars(hidden) {
        return this.getEnvVars(hidden).length > 0;
    }
    getEnvVars(hidden) {
        return this.getGlobalEnvVars(hidden).concat(this.getBaseEnvVars(hidden));
    }
    getBaseEnvVars(hidden) {
        if (!this.envVars.length) {
            return [];
        }
        return hidden ? this.envVars.slice(0) : this.envVars.filter((env)=>!env.hidden);
    }
    getGlobalEnvVars(hidden) {
        if (this._noGlobals) {
            return [];
        }
        const getEnvVars = (cmd, envVars = [], names = [])=>{
            if (cmd) {
                if (cmd.envVars.length) {
                    cmd.envVars.forEach((envVar)=>{
                        if (envVar.global && !this.envVars.find((env)=>env.names[0] === envVar.names[0]) && names.indexOf(envVar.names[0]) === -1 && (hidden || !envVar.hidden)) {
                            names.push(envVar.names[0]);
                            envVars.push(envVar);
                        }
                    });
                }
                return getEnvVars(cmd._parent, envVars, names);
            }
            return envVars;
        };
        return getEnvVars(this._parent);
    }
    hasEnvVar(name, hidden) {
        return !!this.getEnvVar(name, hidden);
    }
    getEnvVar(name, hidden) {
        return this.getBaseEnvVar(name, hidden) ?? this.getGlobalEnvVar(name, hidden);
    }
    getBaseEnvVar(name, hidden) {
        const envVar = this.envVars.find((env)=>env.names.indexOf(name) !== -1);
        return envVar && (hidden || !envVar.hidden) ? envVar : undefined;
    }
    getGlobalEnvVar(name, hidden) {
        if (!this._parent || this._noGlobals) {
            return;
        }
        const envVar = this._parent.getBaseEnvVar(name, hidden);
        if (!envVar?.global) {
            return this._parent.getGlobalEnvVar(name, hidden);
        }
        return envVar;
    }
    hasExamples() {
        return this.examples.length > 0;
    }
    getExamples() {
        return this.examples;
    }
    hasExample(name) {
        return !!this.getExample(name);
    }
    getExample(name) {
        return this.examples.find((example)=>example.name === name);
    }
    getHelpOption() {
        return this._helpOption ?? this._parent?.getHelpOption();
    }
}
async function checkVersion(cmd) {
    const mainCommand = cmd.getMainCommand();
    const upgradeCommand = mainCommand.getCommand("upgrade");
    if (!isUpgradeCommand(upgradeCommand)) {
        return;
    }
    const latestVersion = await upgradeCommand.getLatestVersion();
    const currentVersion = mainCommand.getVersion();
    if (!currentVersion || currentVersion === latestVersion) {
        return;
    }
    const versionHelpText = `(New version available: ${latestVersion}. Run '${mainCommand.getName()} upgrade' to upgrade to the latest version!)`;
    mainCommand.version(`${currentVersion}  ${bold(yellow(versionHelpText))}`);
}
function findFlag(flags) {
    for (const flag of flags){
        if (flag.startsWith("--")) {
            return flag;
        }
    }
    return flags[0];
}
function isUpgradeCommand(command) {
    return command instanceof Command && "getLatestVersion" in command;
}
function isKeyedCollection(x) {
    return x instanceof Set || x instanceof Map;
}
function prototypesEqual(a, b) {
    const pa = Object.getPrototypeOf(a);
    const pb = Object.getPrototypeOf(b);
    return pa === pb || pa === Object.prototype && pb === null || pa === null && pb === Object.prototype;
}
function isBasicObjectOrArray(obj) {
    const proto = Object.getPrototypeOf(obj);
    return proto === null || proto === Object.prototype || proto === Array.prototype;
}
function ownKeys(obj) {
    return [
        ...Object.getOwnPropertyNames(obj),
        ...Object.getOwnPropertySymbols(obj)
    ];
}
function getKeysDeep(obj) {
    const keys = new Set();
    while(obj !== Object.prototype && obj !== Array.prototype && obj != null){
        for (const key of ownKeys(obj)){
            keys.add(key);
        }
        obj = Object.getPrototypeOf(obj);
    }
    return keys;
}
const Temporal = globalThis.Temporal ?? new Proxy({}, {
    get: ()=>{}
});
const stringComparablePrototypes = new Set([
    Intl.Locale,
    RegExp,
    Temporal.Duration,
    Temporal.Instant,
    Temporal.PlainDate,
    Temporal.PlainDateTime,
    Temporal.PlainTime,
    Temporal.PlainYearMonth,
    Temporal.PlainMonthDay,
    Temporal.ZonedDateTime,
    URL,
    URLSearchParams
].filter((x)=>x != null).map((x)=>x.prototype));
function isPrimitive(x) {
    return typeof x === "string" || typeof x === "number" || typeof x === "boolean" || typeof x === "bigint" || typeof x === "symbol" || x == null;
}
const TypedArray = Object.getPrototypeOf(Uint8Array);
function compareTypedArrays(a, b) {
    if (a.length !== b.length) return false;
    for(let i = 0; i < b.length; i++){
        if (!sameValueZero(a[i], b[i])) return false;
    }
    return true;
}
function sameValueZero(a, b) {
    return a === b || Object.is(a, b);
}
function equal(a, b) {
    const seen = new Map();
    return function compare(a, b) {
        if (sameValueZero(a, b)) return true;
        if (isPrimitive(a) || isPrimitive(b)) return false;
        if (a instanceof Date && b instanceof Date) {
            return Object.is(a.getTime(), b.getTime());
        }
        if (a && typeof a === "object" && b && typeof b === "object") {
            if (!prototypesEqual(a, b)) {
                return false;
            }
            if (a instanceof TypedArray) {
                return compareTypedArrays(a, b);
            }
            if (a instanceof WeakMap) {
                throw new TypeError("Cannot compare WeakMap instances");
            }
            if (a instanceof WeakSet) {
                throw new TypeError("Cannot compare WeakSet instances");
            }
            if (a instanceof WeakRef) {
                return compare(a.deref(), b.deref());
            }
            if (seen.get(a) === b) {
                return true;
            }
            if (Object.keys(a).length !== Object.keys(b).length) {
                return false;
            }
            seen.set(a, b);
            if (isKeyedCollection(a) && isKeyedCollection(b)) {
                if (a.size !== b.size) {
                    return false;
                }
                const aKeys = [
                    ...a.keys()
                ];
                const primitiveKeysFastPath = aKeys.every(isPrimitive);
                if (primitiveKeysFastPath) {
                    if (a instanceof Set) {
                        return a.symmetricDifference(b).size === 0;
                    }
                    for (const key of aKeys){
                        if (!b.has(key) || !compare(a.get(key), b.get(key))) {
                            return false;
                        }
                    }
                    return true;
                }
                let unmatchedEntries = a.size;
                for (const [aKey, aValue] of a.entries()){
                    for (const [bKey, bValue] of b.entries()){
                        if (!compare(aKey, bKey)) continue;
                        if (aKey === aValue && bKey === bValue || compare(aValue, bValue)) {
                            unmatchedEntries--;
                            break;
                        }
                    }
                }
                return unmatchedEntries === 0;
            }
            let keys;
            if (isBasicObjectOrArray(a)) {
                keys = ownKeys({
                    ...a,
                    ...b
                });
            } else if (stringComparablePrototypes.has(Object.getPrototypeOf(a))) {
                return String(a) === String(b);
            } else {
                keys = getKeysDeep(a).union(getKeysDeep(b));
            }
            for (const key of keys){
                if (!compare(a[key], b[key])) {
                    return false;
                }
                if (key in a && !(key in b) || key in b && !(key in a)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }(a, b);
}
function getOs() {
    const { Deno: Deno1, process } = globalThis;
    if (Deno1) {
        return Deno1.build.os;
    } else if (process) {
        return process.platform;
    } else {
        throw new Error("unsupported runtime");
    }
}
const main = {
    ARROW_UP: "↑",
    ARROW_DOWN: "↓",
    ARROW_LEFT: "←",
    ARROW_RIGHT: "→",
    ARROW_UP_LEFT: "↖",
    ARROW_UP_RIGHT: "↗",
    ARROW_DOWN_RIGHT: "↘",
    ARROW_DOWN_LEFT: "↙",
    RADIO_ON: "◉",
    RADIO_OFF: "◯",
    TICK: "✔",
    CROSS: "✘",
    ELLIPSIS: "…",
    POINTER_SMALL: "›",
    POINTER_SMALL_LEFT: "‹",
    LINE: "─",
    POINTER: "❯",
    POINTER_LEFT: "❮",
    INFO: "ℹ",
    TAB_LEFT: "⇤",
    TAB_RIGHT: "⇥",
    ESCAPE: "⎋",
    BACKSPACE: "⌫",
    PAGE_UP: "⇞",
    PAGE_DOWN: "⇟",
    ENTER: "↵",
    SEARCH: "🔎",
    FOLDER: "📁",
    FOLDER_OPEN: "📂"
};
const win = {
    ...main,
    RADIO_ON: "(*)",
    RADIO_OFF: "( )",
    TICK: "√",
    CROSS: "×",
    POINTER_SMALL: "»"
};
const Figures = getOs() === "win32" ? win : main;
const keyMap = {
    up: "ARROW_UP",
    down: "ARROW_DOWN",
    left: "ARROW_LEFT",
    right: "ARROW_RIGHT",
    pageup: "PAGE_UP",
    pagedown: "PAGE_DOWN",
    tab: "TAB_RIGHT",
    enter: "ENTER",
    return: "ENTER"
};
function getFiguresByKeys(keys) {
    const figures = [];
    for (const key of keys){
        const figure = Figures[keyMap[key]] ?? key;
        if (!figures.includes(figure)) {
            figures.push(figure);
        }
    }
    return figures;
}
const { Deno: Deno2, process, Buffer } = globalThis;
const { readSync: readSyncNode } = process ? (((await import("node:fs")))) : {
    readSync: null
};
function readSync(data) {
    if (Deno2) {
        return Deno2.stdin.readSync(data);
    } else if (readSyncNode) {
        const buffer = Buffer.alloc(data.byteLength);
        const bytesRead = readSyncNode(process.stdout.fd, buffer, 0, buffer.length, null);
        for(let i = 0; i < bytesRead; i++){
            data[i] = buffer[i];
        }
        return bytesRead;
    } else {
        throw new Error("unsupported runtime");
    }
}
function setRaw(mode, { cbreak } = {}) {
    const { Deno: Deno1, process } = globalThis;
    if (Deno1) {
        Deno1.stdin.setRaw(mode, {
            cbreak
        });
    } else if (process) {
        process.stdin.setRawMode(mode);
    } else {
        throw new Error("unsupported runtime");
    }
}
function writeSync(data) {
    const { Deno: Deno1, process } = globalThis;
    if (Deno1) {
        return Deno1.stdout.writeSync(data);
    } else if (process) {
        process.stdout.write(data);
        return data.byteLength;
    } else {
        throw new Error("unsupported runtime");
    }
}
const alphabet = {
    base64: new TextEncoder().encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"),
    base64url: new TextEncoder().encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
};
const rAlphabet = {
    base64: new Uint8Array(128).fill(64),
    base64url: new Uint8Array(128).fill(64)
};
alphabet.base64.forEach((__byte, i)=>rAlphabet.base64[__byte] = i);
alphabet.base64url.forEach((__byte, i)=>rAlphabet.base64url[__byte] = i);
function calcSizeBase64(originalSize) {
    return ((originalSize + 2) / 3 | 0) * 4;
}
function encode(buffer, i, o, alphabet, padding) {
    i += 2;
    for(; i < buffer.length; i += 3){
        const x = buffer[i - 2] << 16 | buffer[i - 1] << 8 | buffer[i];
        buffer[o++] = alphabet[x >> 18];
        buffer[o++] = alphabet[x >> 12 & 0x3F];
        buffer[o++] = alphabet[x >> 6 & 0x3F];
        buffer[o++] = alphabet[x & 0x3F];
    }
    switch(i){
        case buffer.length + 1:
            {
                const x = buffer[i - 2] << 16;
                buffer[o++] = alphabet[x >> 18];
                buffer[o++] = alphabet[x >> 12 & 0x3F];
                buffer[o++] = padding;
                buffer[o++] = padding;
                break;
            }
        case buffer.length:
            {
                const x = buffer[i - 2] << 16 | buffer[i - 1] << 8;
                buffer[o++] = alphabet[x >> 18];
                buffer[o++] = alphabet[x >> 12 & 0x3F];
                buffer[o++] = alphabet[x >> 6 & 0x3F];
                buffer[o++] = padding;
                break;
            }
    }
    return o;
}
function detach(buffer, maxSize) {
    const originalSize = buffer.length;
    if (buffer.byteOffset) {
        const b = new Uint8Array(buffer.buffer);
        b.set(buffer);
        buffer = b.subarray(0, originalSize);
    }
    buffer = new Uint8Array(buffer.buffer.transfer(maxSize));
    buffer.set(buffer.subarray(0, originalSize), maxSize - originalSize);
    return [
        buffer,
        maxSize - originalSize
    ];
}
const padding = "=".charCodeAt(0);
const alphabet1 = new TextEncoder().encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
const rAlphabet1 = new Uint8Array(128).fill(64);
alphabet1.forEach((__byte, i)=>rAlphabet1[__byte] = i);
function encodeBase64(data) {
    if (typeof data === "string") {
        data = new TextEncoder().encode(data);
    } else if (data instanceof ArrayBuffer) data = new Uint8Array(data).slice();
    else data = data.slice();
    const [output, i] = detach(data, calcSizeBase64(data.length));
    encode(output, i, 0, alphabet1, padding);
    return new TextDecoder().decode(output);
}
const ESC = "\x1B";
const CSI = `${ESC}[`;
const OSC = `${ESC}]`;
const SEP = ";";
const bel = "\u0007";
const cursorPosition = `${CSI}6n`;
function cursorTo(x, y) {
    if (typeof y !== "number") {
        return `${CSI}${x}G`;
    }
    return `${CSI}${y};${x}H`;
}
function cursorMove(x, y) {
    let ret = "";
    if (x < 0) {
        ret += `${CSI}${-x}D`;
    } else if (x > 0) {
        ret += `${CSI}${x}C`;
    }
    if (y < 0) {
        ret += `${CSI}${-y}A`;
    } else if (y > 0) {
        ret += `${CSI}${y}B`;
    }
    return ret;
}
function cursorUp(count = 1) {
    return `${CSI}${count}A`;
}
function cursorDown(count = 1) {
    return `${CSI}${count}B`;
}
function cursorForward(count = 1) {
    return `${CSI}${count}C`;
}
function cursorBackward(count = 1) {
    return `${CSI}${count}D`;
}
function cursorNextLine(count = 1) {
    return `${CSI}E`.repeat(count);
}
function cursorPrevLine(count = 1) {
    return `${CSI}F`.repeat(count);
}
const cursorLeft = `${CSI}G`;
const cursorHide = `${CSI}?25l`;
const cursorShow = `${CSI}?25h`;
const cursorSave = `${ESC}7`;
const cursorRestore = `${ESC}8`;
function scrollUp(count = 1) {
    return `${CSI}S`.repeat(count);
}
function scrollDown(count = 1) {
    return `${CSI}T`.repeat(count);
}
const eraseScreen = `${CSI}2J`;
function eraseUp(count = 1) {
    return `${CSI}1J`.repeat(count);
}
function eraseDown(count = 1) {
    return `${CSI}0J`.repeat(count);
}
const eraseLine = `${CSI}2K`;
const eraseLineEnd = `${CSI}0K`;
const eraseLineStart = `${CSI}1K`;
function eraseLines(count) {
    let clear = "";
    for(let i = 0; i < count; i++){
        clear += eraseLine + (i < count - 1 ? cursorUp() : "");
    }
    clear += cursorLeft;
    return clear;
}
const clearScreen = "\u001Bc";
const clearTerminal = getOs() === "win32" ? `${eraseScreen}${CSI}0f` : `${eraseScreen}${CSI}3J${CSI}H`;
function link(text, url) {
    return [
        OSC,
        "8",
        SEP,
        SEP,
        url,
        bel,
        text,
        OSC,
        "8",
        SEP,
        SEP,
        bel
    ].join("");
}
function image(buffer, options) {
    let ret = `${OSC}1337;File=inline=1`;
    if (options?.width) {
        ret += `;width=${options.width}`;
    }
    if (options?.height) {
        ret += `;height=${options.height}`;
    }
    if (options?.preserveAspectRatio === false) {
        ret += ";preserveAspectRatio=0";
    }
    return ret + ":" + encodeBase64(buffer) + bel;
}
const mod = {
    bel: bel,
    cursorPosition: cursorPosition,
    cursorTo: cursorTo,
    cursorMove: cursorMove,
    cursorUp: cursorUp,
    cursorDown: cursorDown,
    cursorForward: cursorForward,
    cursorBackward: cursorBackward,
    cursorNextLine: cursorNextLine,
    cursorPrevLine: cursorPrevLine,
    cursorLeft: cursorLeft,
    cursorHide: cursorHide,
    cursorShow: cursorShow,
    cursorSave: cursorSave,
    cursorRestore: cursorRestore,
    scrollUp: scrollUp,
    scrollDown: scrollDown,
    eraseScreen: eraseScreen,
    eraseUp: eraseUp,
    eraseDown: eraseDown,
    eraseLine: eraseLine,
    eraseLineEnd: eraseLineEnd,
    eraseLineStart: eraseLineStart,
    eraseLines: eraseLines,
    clearScreen: clearScreen,
    clearTerminal: clearTerminal,
    link: link,
    image: image
};
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function getCursorPosition({ reader = {
    readSync,
    setRaw
}, writer = {
    writeSync
} } = {}) {
    const data = new Uint8Array(8);
    reader.setRaw(true);
    writer.writeSync(encoder.encode(cursorPosition));
    reader.readSync(data);
    reader.setRaw(false);
    const [y, x] = decoder.decode(data).match(/\[(\d+);(\d+)R/)?.slice(1, 3).map(Number) ?? [
        0,
        0
    ];
    return {
        x,
        y
    };
}
const tty = factory();
const encoder1 = new TextEncoder();
function factory(options) {
    let result = "";
    let stack = [];
    const writer = options?.writer ?? {
        writeSync
    };
    const reader = options?.reader ?? {
        readSync,
        setRaw
    };
    const tty = function(...args) {
        if (this) {
            update(args);
            writer.writeSync(encoder1.encode(result));
            return this;
        }
        return factory(args[0] ?? options);
    };
    tty.text = function(text) {
        stack.push([
            text,
            []
        ]);
        update();
        writer.writeSync(encoder1.encode(result));
        return this;
    };
    tty.getCursorPosition = ()=>getCursorPosition({
            writer,
            reader
        });
    const methodList = Object.entries(mod);
    for (const [name, method] of methodList){
        if (name === "cursorPosition") {
            continue;
        }
        Object.defineProperty(tty, name, {
            get () {
                stack.push([
                    method,
                    []
                ]);
                return this;
            }
        });
    }
    return tty;
    function update(args) {
        if (!stack.length) {
            return;
        }
        if (args) {
            stack[stack.length - 1][1] = args;
        }
        result = stack.reduce((prev, [cur, args])=>prev + (typeof cur === "string" ? cur : cur.call(tty, ...args)), "");
        stack = [];
    }
}
function getRuntimeName() {
    switch(true){
        case "Deno" in globalThis:
            return "deno";
        case "Bun" in globalThis:
            return "bun";
        case "process" in globalThis:
            return "node";
        default:
            throw new Error("unsupported runtime");
    }
}
const KeyMap = {
    "[P": "f1",
    "[Q": "f2",
    "[R": "f3",
    "[S": "f4",
    "OP": "f1",
    "OQ": "f2",
    "OR": "f3",
    "OS": "f4",
    "[11~": "f1",
    "[12~": "f2",
    "[13~": "f3",
    "[14~": "f4",
    "[[A": "f1",
    "[[B": "f2",
    "[[C": "f3",
    "[[D": "f4",
    "[[E": "f5",
    "[15~": "f5",
    "[17~": "f6",
    "[18~": "f7",
    "[19~": "f8",
    "[20~": "f9",
    "[21~": "f10",
    "[23~": "f11",
    "[24~": "f12",
    "[A": "up",
    "[B": "down",
    "[C": "right",
    "[D": "left",
    "[E": "clear",
    "[F": "end",
    "[H": "home",
    "OA": "up",
    "OB": "down",
    "OC": "right",
    "OD": "left",
    "OE": "clear",
    "OF": "end",
    "OH": "home",
    "[1~": "home",
    "[2~": "insert",
    "[3~": "delete",
    "[4~": "end",
    "[5~": "pageup",
    "[6~": "pagedown",
    "[[5~": "pageup",
    "[[6~": "pagedown",
    "[7~": "home",
    "[8~": "end"
};
const KeyMapShift = {
    "[a": "up",
    "[b": "down",
    "[c": "right",
    "[d": "left",
    "[e": "clear",
    "[2$": "insert",
    "[3$": "delete",
    "[5$": "pageup",
    "[6$": "pagedown",
    "[7$": "home",
    "[8$": "end",
    "[Z": "tab"
};
const KeyMapCtrl = {
    "Oa": "up",
    "Ob": "down",
    "Oc": "right",
    "Od": "left",
    "Oe": "clear",
    "[2^": "insert",
    "[3^": "delete",
    "[5^": "pageup",
    "[6^": "pagedown",
    "[7^": "home",
    "[8^": "end"
};
const SpecialKeyMap = {
    "\r": "return",
    "\n": "enter",
    "\t": "tab",
    "\b": "backspace",
    "\x7f": "backspace",
    "\x1b": "escape",
    " ": "space"
};
const kEscape = "\x1b";
function parse(data) {
    let index = -1;
    const keys = [];
    const input = data instanceof Uint8Array ? new TextDecoder().decode(data) : data;
    const hasNext = ()=>input.length - 1 >= index + 1;
    const next = ()=>input[++index];
    parseNext();
    return keys;
    function parseNext() {
        let ch = next();
        let s = ch;
        let escaped = false;
        const key = {
            name: undefined,
            char: undefined,
            sequence: undefined,
            code: undefined,
            ctrl: false,
            meta: false,
            shift: false
        };
        if (ch === kEscape && hasNext()) {
            escaped = true;
            s += ch = next();
            if (ch === kEscape) {
                s += ch = next();
            }
        }
        if (escaped && (ch === "O" || ch === "[")) {
            let code = ch;
            let modifier = 0;
            if (ch === "O") {
                s += ch = next();
                if (ch >= "0" && ch <= "9") {
                    modifier = (Number(ch) >> 0) - 1;
                    s += ch = next();
                }
                code += ch;
            } else if (ch === "[") {
                s += ch = next();
                if (ch === "[") {
                    code += ch;
                    s += ch = next();
                }
                const cmdStart = s.length - 1;
                if (ch >= "0" && ch <= "9") {
                    s += ch = next();
                    if (ch >= "0" && ch <= "9") {
                        s += ch = next();
                    }
                }
                if (ch === ";") {
                    s += ch = next();
                    if (ch >= "0" && ch <= "9") {
                        s += next();
                    }
                }
                const cmd = s.slice(cmdStart);
                let match;
                if (match = cmd.match(/^(\d\d?)(;(\d))?([~^$])$/)) {
                    code += match[1] + match[4];
                    modifier = (Number(match[3]) || 1) - 1;
                } else if (match = cmd.match(/^((\d;)?(\d))?([A-Za-z])$/)) {
                    code += match[4];
                    modifier = (Number(match[3]) || 1) - 1;
                } else {
                    code += cmd;
                }
            }
            key.ctrl = !!(modifier & 4);
            key.meta = !!(modifier & 10);
            key.shift = !!(modifier & 1);
            key.code = code;
            if (code in KeyMap) {
                key.name = KeyMap[code];
            } else if (code in KeyMapShift) {
                key.name = KeyMapShift[code];
                key.shift = true;
            } else if (code in KeyMapCtrl) {
                key.name = KeyMapCtrl[code];
                key.ctrl = true;
            } else {
                key.name = "undefined";
            }
        } else if (ch in SpecialKeyMap) {
            key.name = SpecialKeyMap[ch];
            key.meta = escaped;
            if (key.name === "space") {
                key.char = ch;
            }
        } else if (!escaped && ch <= "\x1a") {
            key.name = String.fromCharCode(ch.charCodeAt(0) + "a".charCodeAt(0) - 1);
            key.ctrl = true;
            key.char = key.name;
        } else if (/^[0-9A-Za-z]$/.test(ch)) {
            key.name = ch.toLowerCase();
            key.shift = /^[A-Z]$/.test(ch);
            key.meta = escaped;
            key.char = ch;
        } else if (escaped) {
            key.name = ch.length ? undefined : "escape";
            key.meta = true;
        } else {
            key.name = ch;
            key.char = ch;
        }
        key.sequence = s;
        if (s.length !== 0 && (key.name !== undefined || escaped) || charLengthAt(s, 0) === s.length) {
            keys.push(key);
        } else {
            throw new Error("Unrecognized or broken escape sequence");
        }
        if (hasNext()) {
            parseNext();
        }
    }
}
function charLengthAt(str, i) {
    const pos = str.codePointAt(i);
    if (typeof pos === "undefined") {
        return 1;
    }
    return pos >= 0x10000 ? 2 : 1;
}
function getColumns() {
    try {
        const { Deno: Deno1, process } = globalThis;
        if (Deno1) {
            return Deno1.consoleSize().columns ?? null;
        } else if (process) {
            return process.stdout.columns ?? null;
        }
    } catch (_error) {
        return null;
    }
    throw new Error("unsupported runtime");
}
function isTerminal() {
    const { Deno: Deno1, process } = globalThis;
    if (Deno1) {
        return Deno1.stdin.isTerminal();
    } else if (process) {
        return process.stdin.isTTY;
    } else {
        throw new Error("unsupported runtime");
    }
}
async function read(data) {
    const { Deno: Deno1, Bun, process } = globalThis;
    if (Deno1) {
        return await Deno1.stdin.read(data);
    } else if (Bun) {
        const reader = Bun.stdin.stream().getReader();
        const { value: buffer } = await reader.read();
        await reader.cancel();
        for(let i = 0; i < buffer.length; i++){
            data[i] = buffer[i];
        }
        return buffer.length;
    } else if (process) {
        return await new Promise((resolve, reject)=>{
            process.stdin.once("readable", ()=>{
                try {
                    const buffer = process.stdin.read();
                    if (buffer === null) {
                        return resolve(null);
                    }
                    for(let i = 0; i < buffer.length; i++){
                        data[i] = buffer[i];
                    }
                    resolve(buffer.length);
                } catch (error) {
                    reject(error);
                }
            });
        });
    } else {
        throw new Error("unsupported runtime");
    }
}
class GenericPrompt {
    static injectedValue;
    cursor = {
        x: 0,
        y: 0
    };
    #value;
    #lastError;
    #isFirstRun = true;
    #encoder = new TextEncoder();
    static inject(value) {
        GenericPrompt.injectedValue = value;
    }
    getDefaultSettings(options) {
        return {
            ...options,
            tty: tty({
                reader: {
                    readSync,
                    setRaw
                },
                writer: options.writer ?? {
                    writeSync
                }
            }),
            cbreak: options.cbreak ?? false,
            reader: options.reader ?? {
                read,
                setRaw,
                isTerminal
            },
            writer: options.writer ?? {
                writeSync
            },
            pointer: options.pointer ?? brightBlue(Figures.POINTER_SMALL),
            prefix: options.prefix ?? yellow("? "),
            indent: options.indent ?? "",
            keys: {
                submit: [
                    "enter",
                    "return"
                ],
                ...options.keys ?? {}
            }
        };
    }
    async prompt() {
        try {
            return await this.#execute();
        } finally{
            this.settings.tty.cursorShow();
        }
    }
    clear() {
        this.settings.tty.cursorLeft.eraseDown();
    }
    #execute = async ()=>{
        if (typeof GenericPrompt.injectedValue !== "undefined" && this.#lastError) {
            throw new Error(this.error());
        }
        await this.render();
        this.#lastError = undefined;
        if (!await this.read()) {
            return this.#execute();
        }
        if (typeof this.#value === "undefined") {
            throw new Error("internal error: failed to read value");
        }
        this.clear();
        const successMessage = this.success(this.#value);
        if (successMessage) {
            this.settings.writer.writeSync(this.#encoder.encode(successMessage + "\n"));
        }
        GenericPrompt.injectedValue = undefined;
        this.settings.tty.cursorShow();
        return this.#value;
    };
    async render() {
        const result = await Promise.all([
            this.message(),
            this.body?.(),
            this.footer()
        ]);
        const content = result.filter(Boolean).join("\n");
        const lines = content.split("\n");
        const columns = getColumns();
        const linesCount = columns ? lines.reduce((prev, next)=>{
            const length = stripAnsiCode(next).length;
            return prev + (length > columns ? Math.ceil(length / columns) : 1);
        }, 0) : content.split("\n").length;
        const y = linesCount - this.cursor.y - 1;
        if (!this.#isFirstRun || this.#lastError) {
            this.clear();
        }
        this.#isFirstRun = false;
        this.settings.writer.writeSync(this.#encoder.encode(content));
        if (y) {
            this.settings.tty.cursorUp(y);
        }
        this.settings.tty.cursorTo(this.cursor.x);
    }
    async read() {
        if (typeof GenericPrompt.injectedValue !== "undefined") {
            const value = GenericPrompt.injectedValue;
            await this.#validateValue(value);
        } else {
            const events = await this.#readKey();
            if (!events.length) {
                return false;
            }
            for (const event of events){
                await this.handleEvent(event);
            }
        }
        return typeof this.#value !== "undefined";
    }
    submit() {
        return this.#validateValue(this.getValue());
    }
    message() {
        return `${this.settings.indent}${this.settings.prefix}` + bold(this.settings.message) + this.defaults();
    }
    defaults() {
        let defaultMessage = "";
        if (typeof this.settings.default !== "undefined" && !this.settings.hideDefault) {
            defaultMessage += dim(` (${this.format(this.settings.default)})`);
        }
        return defaultMessage;
    }
    success(value) {
        return `${this.settings.indent}${this.settings.prefix}` + bold(this.settings.message) + this.defaults() + " " + this.settings.pointer + " " + green(this.format(value));
    }
    footer() {
        return this.error() ?? this.hint();
    }
    error() {
        return this.#lastError ? this.settings.indent + red(bold(`${Figures.CROSS} `) + this.#lastError) : undefined;
    }
    hint() {
        return this.settings.hint ? this.settings.indent + italic(brightBlue(dim(`${Figures.POINTER} `) + this.settings.hint)) : undefined;
    }
    setErrorMessage(message) {
        this.#lastError = message;
    }
    async handleEvent(event) {
        switch(true){
            case event.name === "c" && event.ctrl:
                this.clear();
                this.settings.tty.cursorShow();
                exit(130);
                return;
            case this.isKey(this.settings.keys, "submit", event):
                await this.submit();
                break;
        }
    }
    #readKey = async ()=>{
        const data = await this.#readChar();
        return data.length ? parse(data) : [];
    };
    #readChar = async ()=>{
        const buffer = new Uint8Array(getRuntimeName() === "deno" ? 8 : 4096);
        const isTty = this.settings.reader.isTerminal();
        if (isTty) {
            this.settings.reader.setRaw(true, {
                cbreak: this.settings.cbreak
            });
        }
        const nread = await this.settings.reader.read(buffer);
        if (isTty) {
            this.settings.reader.setRaw(false);
        }
        if (nread === null) {
            return buffer;
        }
        return buffer.subarray(0, nread);
    };
    #transformValue = (value)=>{
        return this.settings.transform ? this.settings.transform(value) : this.transform(value);
    };
    #validateValue = async (value)=>{
        if (!value && typeof this.settings.default !== "undefined") {
            this.#value = this.settings.default;
            return;
        }
        this.#value = undefined;
        this.#lastError = undefined;
        const validation = await (this.settings.validate ? this.settings.validate(value) : this.validate(value));
        if (validation === false) {
            this.#lastError = `Invalid answer.`;
        } else if (typeof validation === "string") {
            this.#lastError = validation;
        } else {
            this.#value = this.#transformValue(value);
        }
    };
    isKey(keys, name, event) {
        const keyNames = keys?.[name];
        return typeof keyNames !== "undefined" && (typeof event.name !== "undefined" && keyNames.indexOf(event.name) !== -1 || typeof event.sequence !== "undefined" && keyNames.indexOf(event.sequence) !== -1);
    }
}
class GenericInput extends GenericPrompt {
    inputValue = "";
    inputIndex = 0;
    getDefaultSettings(options) {
        const settings = super.getDefaultSettings(options);
        return {
            ...settings,
            keys: {
                moveCursorLeft: [
                    "left"
                ],
                moveCursorRight: [
                    "right"
                ],
                deleteCharLeft: [
                    "backspace"
                ],
                deleteCharRight: [
                    "delete"
                ],
                ...settings.keys ?? {}
            }
        };
    }
    getCurrentInputValue() {
        return this.inputValue;
    }
    message() {
        const message = super.message() + " " + this.settings.pointer + " ";
        this.cursor.x = stripAnsiCode(message).length + this.inputIndex + 1;
        return message + this.input();
    }
    input() {
        return underline(this.inputValue);
    }
    highlight(value, color1 = dim, color2 = brightBlue) {
        value = value.toString();
        const inputLowerCase = this.getCurrentInputValue().toLowerCase();
        const valueLowerCase = value.toLowerCase();
        const index = valueLowerCase.indexOf(inputLowerCase);
        const matched = value.slice(index, index + inputLowerCase.length);
        return index >= 0 ? color1(value.slice(0, index)) + color2(matched) + color1(value.slice(index + inputLowerCase.length)) : value;
    }
    async handleEvent(event) {
        switch(true){
            case this.isKey(this.settings.keys, "moveCursorLeft", event):
                this.moveCursorLeft();
                break;
            case this.isKey(this.settings.keys, "moveCursorRight", event):
                this.moveCursorRight();
                break;
            case this.isKey(this.settings.keys, "deleteCharRight", event):
                this.deleteCharRight();
                break;
            case this.isKey(this.settings.keys, "deleteCharLeft", event):
                this.deleteChar();
                break;
            case event.char && !event.meta && !event.ctrl:
                this.addChar(event.char);
                break;
            default:
                await super.handleEvent(event);
        }
    }
    addChar(__char) {
        this.inputValue = this.inputValue.slice(0, this.inputIndex) + __char + this.inputValue.slice(this.inputIndex);
        this.inputIndex++;
    }
    moveCursorLeft() {
        if (this.inputIndex > 0) {
            this.inputIndex--;
        }
    }
    moveCursorRight() {
        if (this.inputIndex < this.inputValue.length) {
            this.inputIndex++;
        }
    }
    deleteChar() {
        if (this.inputIndex > 0) {
            this.inputIndex--;
            this.deleteCharRight();
        }
    }
    deleteCharRight() {
        if (this.inputIndex < this.inputValue.length) {
            this.inputValue = this.inputValue.slice(0, this.inputIndex) + this.inputValue.slice(this.inputIndex + 1);
        }
    }
}
class GenericList extends GenericInput {
    parentOptions = [];
    get selectedOption() {
        return this.options.at(this.listIndex);
    }
    static separator(label = "------------") {
        return {
            name: label
        };
    }
    getDefaultSettings({ groupIcon = true, groupOpenIcon = groupIcon, ...options }) {
        const settings = super.getDefaultSettings(options);
        return {
            ...settings,
            listPointer: options.listPointer ?? brightBlue(Figures.POINTER),
            searchLabel: options.searchLabel ?? brightBlue(Figures.SEARCH),
            backPointer: options.backPointer ?? brightBlue(Figures.POINTER_LEFT),
            groupPointer: options.groupPointer ?? options.listPointer ?? brightBlue(Figures.POINTER),
            groupIcon: !groupIcon ? false : typeof groupIcon === "string" ? groupIcon : Figures.FOLDER,
            groupOpenIcon: !groupOpenIcon ? false : typeof groupOpenIcon === "string" ? groupOpenIcon : Figures.FOLDER_OPEN,
            maxBreadcrumbItems: options.maxBreadcrumbItems ?? 5,
            breadcrumbSeparator: options.breadcrumbSeparator ?? ` ${Figures.POINTER_SMALL} `,
            maxRows: options.maxRows ?? 10,
            options: this.mapOptions(options, options.options),
            keys: {
                next: options.search ? [
                    "down"
                ] : [
                    "down",
                    "d",
                    "n",
                    "2"
                ],
                previous: options.search ? [
                    "up"
                ] : [
                    "up",
                    "u",
                    "p",
                    "8"
                ],
                nextPage: [
                    "pagedown",
                    "right"
                ],
                previousPage: [
                    "pageup",
                    "left"
                ],
                open: [
                    "right",
                    "enter",
                    "return"
                ],
                back: [
                    "left",
                    "escape",
                    "enter",
                    "return"
                ],
                ...settings.keys ?? {}
            }
        };
    }
    mapOption(options, option) {
        if (isOption1(option)) {
            return {
                value: option.value,
                name: typeof option.name === "undefined" ? options.format?.(option.value) ?? String(option.value) : option.name,
                disabled: "disabled" in option && option.disabled === true,
                indentLevel: 0
            };
        } else {
            return {
                value: null,
                name: option.name,
                disabled: true,
                indentLevel: 0
            };
        }
    }
    mapOptionGroup(options, option, recursive = true) {
        return {
            name: option.name,
            disabled: !!option.disabled,
            indentLevel: 0,
            options: recursive ? this.mapOptions(options, option.options) : []
        };
    }
    match() {
        const input = this.getCurrentInputValue().toLowerCase();
        let options = this.getCurrentOptions().slice();
        if (input.length) {
            const matches = matchOptions(input, this.getCurrentOptions());
            options = flatMatchedOptions(matches);
        }
        this.setOptions(options);
    }
    setOptions(options) {
        this.options = [
            ...options
        ];
        const parent = this.getParentOption();
        if (parent && this.options[0] !== parent) {
            this.options.unshift(parent);
        }
        this.listIndex = Math.max(0, Math.min(this.options.length - 1, this.listIndex));
        this.listOffset = Math.max(0, Math.min(this.options.length - this.getListHeight(), this.listOffset));
    }
    getCurrentOptions() {
        return this.getParentOption()?.options ?? this.settings.options;
    }
    getParentOption(index = -1) {
        return this.parentOptions.at(index);
    }
    submitBackButton() {
        const parentOption = this.parentOptions.pop();
        if (!parentOption) {
            return;
        }
        this.match();
        this.listIndex = this.options.indexOf(parentOption);
    }
    submitGroupOption(selectedOption) {
        this.parentOptions.push(selectedOption);
        this.match();
        this.listIndex = 0;
    }
    isBackButton(option) {
        return option === this.getParentOption();
    }
    hasParent() {
        return this.parentOptions.length > 0;
    }
    isSearching() {
        return this.getCurrentInputValue() !== "";
    }
    message() {
        let message = `${this.settings.indent}${this.settings.prefix}` + bold(this.settings.message) + this.defaults();
        if (this.settings.search) {
            const input = this.isSearchSelected() ? this.input() : dim(this.input());
            message += " " + this.settings.searchLabel + " ";
            this.cursor.x = stripAnsiCode(message).length + this.inputIndex + 1;
            message += input;
        }
        return message;
    }
    body() {
        return this.getList() + this.getInfo();
    }
    getInfo() {
        if (!this.settings.info) {
            return "";
        }
        const selected = this.listIndex + 1;
        const hasGroups = this.options.some((option)=>isOptionGroup(option));
        const groupActions = hasGroups ? [
            [
                "Open",
                getFiguresByKeys(this.settings.keys.open ?? [])
            ],
            [
                "Back",
                getFiguresByKeys(this.settings.keys.back ?? [])
            ]
        ] : [];
        const actions = [
            [
                "Next",
                getFiguresByKeys(this.settings.keys.next ?? [])
            ],
            [
                "Previous",
                getFiguresByKeys(this.settings.keys.previous ?? [])
            ],
            ...groupActions,
            [
                "Next Page",
                getFiguresByKeys(this.settings.keys.nextPage ?? [])
            ],
            [
                "Previous Page",
                getFiguresByKeys(this.settings.keys.previousPage ?? [])
            ],
            [
                "Submit",
                getFiguresByKeys(this.settings.keys.submit ?? [])
            ]
        ];
        return "\n" + this.settings.indent + brightBlue(Figures.INFO) + bold(` ${selected}/${this.options.length} `) + actions.map((cur)=>`${cur[0]}: ${bold(cur[1].join(", "))}`).join(", ");
    }
    getList() {
        const list = [];
        const height = this.getListHeight();
        for(let i = this.listOffset; i < this.listOffset + height; i++){
            list.push(this.getListItem(this.options[i], this.listIndex === i));
        }
        if (!list.length) {
            list.push(this.settings.indent + dim("  No matches..."));
        }
        return list.join("\n");
    }
    getListItem(option, isSelected) {
        let line = this.getListItemIndent(option);
        line += this.getListItemPointer(option, isSelected);
        line += this.getListItemIcon(option);
        line += this.getListItemLabel(option, isSelected);
        return line;
    }
    getListItemIndent(option) {
        const indentLevel = this.isSearching() ? option.indentLevel : this.hasParent() && !this.isBackButton(option) ? 1 : 0;
        return this.settings.indent + " ".repeat(indentLevel);
    }
    getListItemPointer(option, isSelected) {
        if (!isSelected) {
            return "  ";
        }
        if (this.isBackButton(option)) {
            return this.settings.backPointer + " ";
        } else if (isOptionGroup(option)) {
            return this.settings.groupPointer + " ";
        }
        return this.settings.listPointer + " ";
    }
    getListItemIcon(option) {
        if (this.isBackButton(option)) {
            return this.settings.groupOpenIcon ? this.settings.groupOpenIcon + " " : "";
        } else if (isOptionGroup(option)) {
            return this.settings.groupIcon ? this.settings.groupIcon + " " : "";
        }
        return "";
    }
    getListItemLabel(option, isSelected) {
        let label = option.name;
        if (this.isBackButton(option)) {
            label = this.getBreadCrumb();
            label = isSelected && !option.disabled ? label : yellow(label);
        } else {
            label = isSelected && !option.disabled ? this.highlight(label, (val)=>val) : this.highlight(label);
        }
        if (this.isBackButton(option) || isOptionGroup(option)) {
            label = bold(label);
        }
        return label;
    }
    getBreadCrumb() {
        if (!this.parentOptions.length || !this.settings.maxBreadcrumbItems) {
            return "";
        }
        const names = this.parentOptions.map((option)=>option.name);
        const breadCrumb = names.length > this.settings.maxBreadcrumbItems ? [
            names[0],
            "..",
            ...names.slice(-this.settings.maxBreadcrumbItems + 1)
        ] : names;
        return breadCrumb.join(this.settings.breadcrumbSeparator);
    }
    getListHeight() {
        return Math.min(this.options.length, this.settings.maxRows || this.options.length);
    }
    getListIndex(value) {
        return Math.max(0, typeof value === "undefined" ? this.options.findIndex((option)=>!option.disabled) || 0 : this.options.findIndex((option)=>isOption1(option) && option.value === value) || 0);
    }
    getPageOffset(index) {
        if (index === 0) {
            return 0;
        }
        const height = this.getListHeight();
        return Math.min(Math.floor(index / height) * height, this.options.length - height);
    }
    getOptionByValue(value) {
        const option = this.options.find((option)=>isOption1(option) && option.value === value);
        return option && isOptionGroup(option) ? undefined : option;
    }
    read() {
        if (!this.settings.search) {
            this.settings.tty.cursorHide();
        }
        return super.read();
    }
    selectSearch() {
        this.listIndex = -1;
    }
    isSearchSelected() {
        return this.listIndex === -1;
    }
    async handleEvent(event) {
        if (this.isKey(this.settings.keys, "open", event) && isOptionGroup(this.selectedOption) && !this.isSearchSelected()) {
            if (this.isBackButton(this.selectedOption)) {
                this.selectNext();
            } else {
                this.submitGroupOption(this.selectedOption);
            }
        } else if (this.isKey(this.settings.keys, "back", event) && (this.isBackButton(this.selectedOption) || event.name === "escape") && !this.isSearchSelected()) {
            this.submitBackButton();
        } else if (this.isKey(this.settings.keys, "next", event)) {
            this.selectNext();
        } else if (this.isKey(this.settings.keys, "previous", event)) {
            this.selectPrevious();
        } else if (this.isKey(this.settings.keys, "nextPage", event) && !this.isSearchSelected()) {
            this.selectNextPage();
        } else if (this.isKey(this.settings.keys, "previousPage", event) && !this.isSearchSelected()) {
            this.selectPreviousPage();
        } else {
            await super.handleEvent(event);
        }
    }
    async submit() {
        if (this.isSearchSelected()) {
            this.selectNext();
            return;
        }
        await super.submit();
    }
    moveCursorLeft() {
        if (this.settings.search) {
            super.moveCursorLeft();
        }
    }
    moveCursorRight() {
        if (this.settings.search) {
            super.moveCursorRight();
        }
    }
    deleteChar() {
        if (this.settings.search) {
            super.deleteChar();
        }
    }
    deleteCharRight() {
        if (this.settings.search) {
            super.deleteCharRight();
            this.match();
        }
    }
    addChar(__char) {
        if (this.settings.search) {
            super.addChar(__char);
            this.match();
        }
    }
    selectPrevious(loop = true) {
        if (this.options.length < 2 && !this.isSearchSelected()) {
            return;
        }
        if (this.listIndex > 0) {
            this.listIndex--;
            if (this.listIndex < this.listOffset) {
                this.listOffset--;
            }
            if (this.selectedOption?.disabled) {
                this.selectPrevious();
            }
        } else if (this.settings.search && this.listIndex === 0 && this.getCurrentInputValue().length) {
            this.listIndex = -1;
        } else if (loop) {
            this.listIndex = this.options.length - 1;
            this.listOffset = this.options.length - this.getListHeight();
            if (this.selectedOption?.disabled) {
                this.selectPrevious();
            }
        }
    }
    selectNext(loop = true) {
        if (this.options.length < 2 && !this.isSearchSelected()) {
            return;
        }
        if (this.listIndex < this.options.length - 1) {
            this.listIndex++;
            if (this.listIndex >= this.listOffset + this.getListHeight()) {
                this.listOffset++;
            }
            if (this.selectedOption?.disabled) {
                this.selectNext();
            }
        } else if (this.settings.search && this.listIndex === this.options.length - 1 && this.getCurrentInputValue().length) {
            this.listIndex = -1;
        } else if (loop) {
            this.listIndex = this.listOffset = 0;
            if (this.selectedOption?.disabled) {
                this.selectNext();
            }
        }
    }
    selectPreviousPage() {
        if (this.options?.length) {
            const height = this.getListHeight();
            if (this.listOffset >= height) {
                this.listIndex -= height;
                this.listOffset -= height;
            } else if (this.listOffset > 0) {
                this.listIndex -= this.listOffset;
                this.listOffset = 0;
            } else {
                this.listIndex = 0;
            }
            if (this.selectedOption?.disabled) {
                this.selectPrevious(false);
            }
            if (this.selectedOption?.disabled) {
                this.selectNext(false);
            }
        }
    }
    selectNextPage() {
        if (this.options?.length) {
            const height = this.getListHeight();
            if (this.listOffset + height + height < this.options.length) {
                this.listIndex += height;
                this.listOffset += height;
            } else if (this.listOffset + height < this.options.length) {
                const offset = this.options.length - height;
                this.listIndex += offset - this.listOffset;
                this.listOffset = offset;
            } else {
                this.listIndex = this.options.length - 1;
            }
            if (this.selectedOption?.disabled) {
                this.selectNext(false);
            }
            if (this.selectedOption?.disabled) {
                this.selectPrevious(false);
            }
        }
    }
}
function isOption1(option) {
    return !!option && typeof option === "object" && "value" in option;
}
function isOptionGroup(option) {
    return option !== null && typeof option === "object" && "options" in option && Array.isArray(option.options);
}
function matchOptions(searchInput, options) {
    const matched = [];
    for (const option of options){
        if (isOptionGroup(option)) {
            const children = matchOptions(searchInput, option.options).sort(sortByDistance);
            if (children.length) {
                matched.push({
                    option,
                    distance: Math.min(...children.map((item)=>item.distance)),
                    children
                });
                continue;
            }
        }
        if (matchOption(searchInput, option)) {
            matched.push({
                option,
                distance: levenshteinDistance(option.name, searchInput),
                children: []
            });
        }
    }
    return matched.sort(sortByDistance);
    function sortByDistance(a, b) {
        return a.distance - b.distance;
    }
}
function matchOption(inputString, option) {
    return matchInput(inputString, option.name) || isOption1(option) && option.name !== option.value && matchInput(inputString, String(option.value));
}
function matchInput(inputString, value) {
    return stripAnsiCode(value).toLowerCase().includes(inputString);
}
function flatMatchedOptions(matches, indentLevel = 0, result = []) {
    for (const { option, children } of matches){
        option.indentLevel = indentLevel;
        result.push(option);
        flatMatchedOptions(children, indentLevel + 1, result);
    }
    return result;
}
class Checkbox extends GenericList {
    settings;
    options;
    listIndex;
    listOffset;
    confirmSubmit = false;
    static prompt(options) {
        return new this(options).prompt();
    }
    static inject(value) {
        GenericPrompt.inject(value);
    }
    constructor(options){
        super();
        this.settings = this.getDefaultSettings(options);
        this.options = this.settings.options.slice();
        this.listIndex = this.getListIndex();
        this.listOffset = this.getPageOffset(this.listIndex);
    }
    getDefaultSettings(options) {
        const settings = super.getDefaultSettings(options);
        return {
            confirmSubmit: true,
            ...settings,
            check: options.check ?? green(Figures.TICK),
            uncheck: options.uncheck ?? red(Figures.CROSS),
            partialCheck: options.partialCheck ?? green(Figures.RADIO_ON),
            minOptions: options.minOptions ?? 0,
            maxOptions: options.maxOptions ?? Infinity,
            options: this.mapOptions(options, options.options),
            keys: {
                check: [
                    "space"
                ],
                checkAll: [
                    "a"
                ],
                ...settings.keys ?? {},
                open: options.keys?.open ?? [
                    "right"
                ],
                back: options.keys?.back ?? [
                    "left",
                    "escape"
                ]
            }
        };
    }
    mapOptions(promptOptions, options) {
        return options.map((option)=>typeof option === "string" || typeof option === "number" ? this.mapOption(promptOptions, {
                value: option
            }) : isCheckboxOptionGroup(option) ? this.mapOptionGroup(promptOptions, option) : this.mapOption(promptOptions, option));
    }
    mapOption(options, option) {
        if (isOption1(option)) {
            return {
                ...super.mapOption(options, option),
                checked: typeof option.checked === "undefined" && options.default && options.default.indexOf(option.value) !== -1 ? true : !!option.checked,
                icon: typeof option.icon === "undefined" ? true : option.icon
            };
        } else {
            return {
                ...super.mapOption(options, option),
                checked: false,
                icon: false
            };
        }
    }
    mapOptionGroup(promptOptions, option) {
        const options = this.mapOptions(promptOptions, option.options);
        return {
            ...super.mapOptionGroup(promptOptions, option, false),
            get checked () {
                return areAllChecked(options);
            },
            options,
            icon: typeof option.icon === "undefined" ? true : option.icon
        };
    }
    match() {
        super.match();
        if (this.isSearching()) {
            this.selectSearch();
        }
    }
    getListItemIcon(option) {
        return this.getCheckboxIcon(option) + super.getListItemIcon(option);
    }
    getCheckboxIcon(option) {
        if (!option.icon) {
            return "";
        }
        const icon = option.checked ? this.settings.check + " " : isOptionGroup(option) && areSomeChecked(option.options) ? this.settings.partialCheck + " " : this.settings.uncheck + " ";
        return option.disabled ? dim(icon) : icon;
    }
    getValue() {
        return flatOptions(this.settings.options).filter((option)=>option.checked).map((option)=>option.value);
    }
    async handleEvent(event) {
        const hasConfirmed = this.confirmSubmit;
        this.confirmSubmit = false;
        switch(true){
            case this.isKey(this.settings.keys, "check", event) && !this.isSearchSelected():
                this.checkValue();
                break;
            case this.isKey(this.settings.keys, "submit", event):
                await this.submit(hasConfirmed);
                break;
            case event.ctrl && this.isKey(this.settings.keys, "checkAll", event):
                this.checkAllOption();
                break;
            default:
                await super.handleEvent(event);
        }
    }
    hint() {
        if (this.confirmSubmit) {
            const info = this.isBackButton(this.selectedOption) ? ` To leave the current group press ${getFiguresByKeys(this.settings.keys.back ?? []).join(", ")}.` : isOptionGroup(this.selectedOption) ? ` To open the selected group press ${getFiguresByKeys(this.settings.keys.open ?? []).join(", ")}.` : ` To check or uncheck the selected option press ${getFiguresByKeys(this.settings.keys.check ?? []).join(", ")}.`;
            return this.settings.indent + brightBlue(`Press ${getFiguresByKeys(this.settings.keys.submit ?? [])} again to submit.${info}`);
        }
        return super.hint();
    }
    async submit(hasConfirmed) {
        if (!hasConfirmed && this.settings.confirmSubmit && !this.isSearchSelected()) {
            this.confirmSubmit = true;
            return;
        }
        await super.submit();
    }
    checkValue() {
        const option = this.options.at(this.listIndex);
        if (!option) {
            this.setErrorMessage("No option available to select.");
            return;
        } else if (option.disabled) {
            this.setErrorMessage("This option is disabled and cannot be changed.");
            return;
        }
        this.checkOption(option, !option.checked);
    }
    checkOption(option, checked) {
        if (isOption1(option)) {
            option.checked = checked;
        } else {
            for (const childOption of option.options){
                this.checkOption(childOption, checked);
            }
        }
    }
    checkAllOption() {
        const checked = this.options.some((option)=>option.checked);
        for (const option of this.options){
            this.checkOption(option, !checked);
        }
    }
    validate(value) {
        const options = flatOptions(this.settings.options);
        const isValidValue = Array.isArray(value) && value.every((val)=>options.findIndex((option)=>equal(option.value, val)) !== -1);
        if (!isValidValue) {
            return false;
        }
        if (value.length < this.settings.minOptions) {
            return `The minimum number of options is ${this.settings.minOptions} but got ${value.length}.`;
        }
        if (value.length > this.settings.maxOptions) {
            return `The maximum number of options is ${this.settings.maxOptions} but got ${value.length}.`;
        }
        return true;
    }
    transform(value) {
        return value;
    }
    format(value) {
        return value.map((val)=>this.settings.format?.(val) ?? this.getOptionByValue(val)?.name ?? String(val)).join(", ");
    }
}
function areSomeChecked(options) {
    return options.some((option)=>isOptionGroup(option) ? areSomeChecked(option.options) : option.checked);
}
function areAllChecked(options) {
    return options.every((option)=>isOptionGroup(option) ? areAllChecked(option.options) : option.checked);
}
function flatOptions(options) {
    return flat(options);
    function flat(options, indentLevel = 0, opts = []) {
        for (const option of options){
            option.indentLevel = indentLevel;
            if (isOption1(option)) {
                opts.push(option);
            }
            if (isOptionGroup(option)) {
                flat(option.options, ++indentLevel, opts);
            }
        }
        return opts;
    }
}
function isCheckboxOptionGroup(option) {
    return isOptionGroup(option);
}
const isWindows = globalThis.Deno?.build.os === "win32" || globalThis.navigator?.platform?.startsWith("Win") || globalThis.process?.platform?.startsWith("win") || false;
function assertPath(path) {
    if (typeof path !== "string") {
        throw new TypeError(`Path must be a string, received "${JSON.stringify(path)}"`);
    }
}
function stripTrailingSeparators(segment, isSep) {
    if (segment.length <= 1) {
        return segment;
    }
    let end = segment.length;
    for(let i = segment.length - 1; i > 0; i--){
        if (isSep(segment.charCodeAt(i))) {
            end = i;
        } else {
            break;
        }
    }
    return segment.slice(0, end);
}
const CHAR_FORWARD_SLASH = 47;
function isPosixPathSeparator(code) {
    return code === 47;
}
function isPosixPathSeparator1(code) {
    return code === 47;
}
function isPathSeparator(code) {
    return code === 47 || code === 92;
}
function isWindowsDeviceRoot(code) {
    return code >= 97 && code <= 122 || code >= 65 && code <= 90;
}
function assertArg(path) {
    assertPath(path);
    if (path.length === 0) return ".";
}
function dirname(path) {
    assertArg(path);
    let end = -1;
    let matchedNonSeparator = false;
    for(let i = path.length - 1; i >= 1; --i){
        if (isPosixPathSeparator(path.charCodeAt(i))) {
            if (matchedNonSeparator) {
                end = i;
                break;
            }
        } else {
            matchedNonSeparator = true;
        }
    }
    if (end === -1) {
        return isPosixPathSeparator(path.charCodeAt(0)) ? "/" : ".";
    }
    return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator);
}
function dirname1(path) {
    assertArg(path);
    const len = path.length;
    let rootEnd = -1;
    let end = -1;
    let matchedSlash = true;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return path;
                        }
                        if (j !== last) {
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = offset = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return path;
    }
    for(let i = len - 1; i >= offset; --i){
        if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) {
        if (rootEnd === -1) return ".";
        else end = rootEnd;
    }
    return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator1);
}
function dirname2(path) {
    return isWindows ? dirname1(path) : dirname(path);
}
function assertArg1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code;
    for(let i = 0; i <= path.length; ++i){
        if (i < path.length) code = path.charCodeAt(i);
        else if (isPathSeparator(code)) break;
        else code = CHAR_FORWARD_SLASH;
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {} else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0) res += `${separator}..`;
                    else res = "..";
                    lastSegmentLength = 2;
                }
            } else {
                if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
                else res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code === 46 && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
function normalize(path) {
    assertArg1(path);
    const isAbsolute = isPosixPathSeparator(path.charCodeAt(0));
    const trailingSeparator = isPosixPathSeparator(path.charCodeAt(path.length - 1));
    path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
    if (path.length === 0 && !isAbsolute) path = ".";
    if (path.length > 0 && trailingSeparator) path += "/";
    if (isAbsolute) return `/${path}`;
    return path;
}
function join(...paths) {
    if (paths.length === 0) return ".";
    paths.forEach((path)=>assertPath(path));
    const joined = paths.filter((path)=>path.length > 0).join("/");
    return joined === "" ? "." : normalize(joined);
}
function normalize1(path) {
    assertArg1(path);
    const len = path.length;
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        } else if (j !== last) {
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            } else {
                rootEnd = 1;
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        isAbsolute = true;
                        rootEnd = 3;
                    }
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return "\\";
    }
    let tail;
    if (rootEnd < len) {
        tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
    } else {
        tail = "";
    }
    if (tail.length === 0 && !isAbsolute) tail = ".";
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
        tail += "\\";
    }
    if (device === undefined) {
        if (isAbsolute) {
            if (tail.length > 0) return `\\${tail}`;
            else return "\\";
        }
        return tail;
    } else if (isAbsolute) {
        if (tail.length > 0) return `${device}\\${tail}`;
        else return `${device}\\`;
    }
    return device + tail;
}
function join1(...paths) {
    paths.forEach((path)=>assertPath(path));
    paths = paths.filter((path)=>path.length > 0);
    if (paths.length === 0) return ".";
    let needsReplace = true;
    let slashCount = 0;
    const firstPart = paths[0];
    if (isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if (isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
                    else {
                        needsReplace = false;
                    }
                }
            }
        }
    }
    let joined = paths.join("\\");
    if (needsReplace) {
        for(; slashCount < joined.length; ++slashCount){
            if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
        }
        if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
    }
    return normalize1(joined);
}
function join2(...paths) {
    return isWindows ? join1(...paths) : join(...paths);
}
function normalize2(path) {
    return isWindows ? normalize1(path) : normalize(path);
}
async function stat(input) {
    // Deno globals removed for Node.js compatibility
    if (Deno1) {
        return Deno1.stat(input);
    }
    const { statSync } = (((await import("node:fs"))));
    const stats = statSync(input);
    return {
        get isDirectory () {
            return stats.isDirectory();
        }
    };
}
async function isDirectory(path) {
    try {
        const { isDirectory } = await stat(path);
        return isDirectory;
    } catch  {
        return false;
    }
}
async function readDir(path) {
    // Deno globals removed for Node.js compatibility
    path ||= ".";
    if (Deno1) {
        const array = [];
        for await (const item of Deno1.readDir(path)){
            array.push(item);
        }
        return array;
    }
    const fs = (((await import("node:fs"))));
    return new Promise((resolve, reject)=>{
        fs.readdir(path, (err, files)=>err ? reject(err) : resolve(files.map((name)=>({
                    name
                }))));
    });
}
const sep = getOs() === "win32" ? "\\" : "/";
class GenericSuggestions extends GenericInput {
    suggestionsIndex = -1;
    suggestionsOffset = 0;
    suggestions = [];
    #envPermissions = {};
    #hasReadPermissions;
    getDefaultSettings(options) {
        const settings = super.getDefaultSettings(options);
        return {
            ...settings,
            listPointer: options.listPointer ?? brightBlue(Figures.POINTER),
            maxRows: options.maxRows ?? 8,
            keys: {
                complete: [
                    "tab"
                ],
                next: [
                    "up"
                ],
                previous: [
                    "down"
                ],
                nextPage: [
                    "pageup"
                ],
                previousPage: [
                    "pagedown"
                ],
                ...settings.keys ?? {}
            }
        };
    }
    get localStorage() {
        if (this.settings.id && "localStorage" in window) {
            try {
                return window.localStorage;
            } catch (_) {}
        }
        return null;
    }
    loadSuggestions() {
        if (this.settings.id) {
            const json = this.localStorage?.getItem(this.settings.id);
            const suggestions = json ? JSON.parse(json) : [];
            if (!Array.isArray(suggestions)) {
                return [];
            }
            return suggestions;
        }
        return [];
    }
    saveSuggestions(...suggestions) {
        if (this.settings.id) {
            this.localStorage?.setItem(this.settings.id, JSON.stringify([
                ...suggestions,
                ...this.loadSuggestions()
            ].filter(uniqueSuggestions)));
        }
    }
    async render() {
        if (this.settings.files && this.#hasReadPermissions === undefined) {
            const status = await globalThis.Deno?.permissions.request({
                name: "read"
            });
            this.#hasReadPermissions = !status || status.state === "granted";
        }
        if (this.#isFileModeEnabled()) {
            await this.#expandInputValue(this.inputValue);
        }
        await this.match();
        return super.render();
    }
    async match() {
        this.suggestions = await this.getSuggestions();
        this.suggestionsIndex = Math.max(this.getCurrentInputValue().trim().length === 0 ? -1 : 0, Math.min(this.suggestions.length - 1, this.suggestionsIndex));
        this.suggestionsOffset = Math.max(0, Math.min(this.suggestions.length - this.getListHeight(), this.suggestionsOffset));
    }
    input() {
        return super.input() + dim(this.getSuggestion());
    }
    getSuggestion() {
        return this.suggestions[this.suggestionsIndex]?.toString().substr(this.getCurrentInputValue().length) ?? "";
    }
    async getUserSuggestions(input) {
        return typeof this.settings.suggestions === "function" ? await this.settings.suggestions(input) : this.settings.suggestions ?? [];
    }
    #isFileModeEnabled() {
        return !!this.settings.files && this.#hasReadPermissions === true;
    }
    async getFileSuggestions(input) {
        if (!this.#isFileModeEnabled()) {
            return [];
        }
        const path = await stat(input).then((file)=>file.isDirectory ? input : dirname2(input)).catch(()=>dirname2(input));
        try {
            return await listDir(path, this.settings.files);
        } catch (error) {
            if (error instanceof Error || error instanceof Error) {
                this.setErrorMessage(error.message);
                return [];
            }
            throw error;
        }
    }
    async getSuggestions() {
        const input = this.getCurrentInputValue();
        const suggestions = [
            ...this.loadSuggestions(),
            ...await this.getUserSuggestions(input),
            ...await this.getFileSuggestions(input)
        ].filter(uniqueSuggestions);
        if (!input.length) {
            return suggestions;
        }
        return suggestions.filter((value)=>stripAnsiCode(value.toString()).toLowerCase().startsWith(input.toLowerCase())).sort((a, b)=>levenshteinDistance((a || a).toString(), input) - levenshteinDistance((b || b).toString(), input));
    }
    body() {
        return this.getList() + this.getInfo();
    }
    getInfo() {
        if (!this.settings.info) {
            return "";
        }
        const selected = this.suggestionsIndex + 1;
        const matched = this.suggestions.length;
        const actions = [];
        if (this.suggestions.length) {
            if (this.settings.list) {
                actions.push([
                    "Next",
                    getFiguresByKeys(this.settings.keys?.next ?? [])
                ], [
                    "Previous",
                    getFiguresByKeys(this.settings.keys?.previous ?? [])
                ], [
                    "Next Page",
                    getFiguresByKeys(this.settings.keys?.nextPage ?? [])
                ], [
                    "Previous Page",
                    getFiguresByKeys(this.settings.keys?.previousPage ?? [])
                ]);
            } else {
                actions.push([
                    "Next",
                    getFiguresByKeys(this.settings.keys?.next ?? [])
                ], [
                    "Previous",
                    getFiguresByKeys(this.settings.keys?.previous ?? [])
                ]);
            }
            actions.push([
                "Complete",
                getFiguresByKeys(this.settings.keys?.complete ?? [])
            ]);
        }
        actions.push([
            "Submit",
            getFiguresByKeys(this.settings.keys?.submit ?? [])
        ]);
        let info = this.settings.indent;
        if (this.suggestions.length) {
            info += brightBlue(Figures.INFO) + bold(` ${selected}/${matched} `);
        }
        info += actions.map((cur)=>`${cur[0]}: ${bold(cur[1].join(" "))}`).join(", ");
        return info;
    }
    getList() {
        if (!this.suggestions.length || !this.settings.list) {
            return "";
        }
        const list = [];
        const height = this.getListHeight();
        for(let i = this.suggestionsOffset; i < this.suggestionsOffset + height; i++){
            list.push(this.getListItem(this.suggestions[i], this.suggestionsIndex === i));
        }
        if (list.length && this.settings.info) {
            list.push("");
        }
        return list.join("\n");
    }
    getListItem(value, isSelected) {
        let line = this.settings.indent ?? "";
        line += isSelected ? `${this.settings.listPointer} ` : "  ";
        if (isSelected) {
            line += underline(this.highlight(value));
        } else {
            line += this.highlight(value);
        }
        return line;
    }
    getListHeight(suggestions = this.suggestions) {
        return Math.min(suggestions.length, this.settings.maxRows || suggestions.length);
    }
    async handleEvent(event) {
        switch(true){
            case this.isKey(this.settings.keys, "next", event):
                if (this.settings.list) {
                    this.selectPreviousSuggestion();
                } else {
                    this.selectNextSuggestion();
                }
                break;
            case this.isKey(this.settings.keys, "previous", event):
                if (this.settings.list) {
                    this.selectNextSuggestion();
                } else {
                    this.selectPreviousSuggestion();
                }
                break;
            case this.isKey(this.settings.keys, "nextPage", event):
                if (this.settings.list) {
                    this.selectPreviousSuggestionsPage();
                } else {
                    this.selectNextSuggestionsPage();
                }
                break;
            case this.isKey(this.settings.keys, "previousPage", event):
                if (this.settings.list) {
                    this.selectNextSuggestionsPage();
                } else {
                    this.selectPreviousSuggestionsPage();
                }
                break;
            case this.isKey(this.settings.keys, "complete", event):
                await this.#completeValue();
                break;
            case this.isKey(this.settings.keys, "moveCursorRight", event):
                if (this.inputIndex < this.inputValue.length) {
                    this.moveCursorRight();
                } else {
                    await this.#completeValue();
                }
                break;
            default:
                await super.handleEvent(event);
        }
    }
    deleteCharRight() {
        if (this.inputIndex < this.inputValue.length) {
            super.deleteCharRight();
            if (!this.getCurrentInputValue().length) {
                this.suggestionsIndex = -1;
                this.suggestionsOffset = 0;
            }
        }
    }
    async #completeValue() {
        const inputValue = await this.complete();
        this.setInputValue(inputValue);
    }
    setInputValue(inputValue) {
        this.inputValue = inputValue;
        this.inputIndex = this.inputValue.length;
        this.suggestionsIndex = 0;
        this.suggestionsOffset = 0;
    }
    async complete() {
        let input = this.getCurrentInputValue();
        const suggestion = this.suggestions[this.suggestionsIndex]?.toString();
        if (this.settings.complete) {
            input = await this.settings.complete(input, suggestion);
        } else if (this.#isFileModeEnabled() && input.at(-1) !== sep && await isDirectory(input) && (this.getCurrentInputValue().at(-1) !== "." || this.getCurrentInputValue().endsWith(".."))) {
            input += sep;
        } else if (suggestion) {
            input = suggestion;
        }
        return this.#isFileModeEnabled() ? normalize2(input) : input;
    }
    selectPreviousSuggestion() {
        if (this.suggestions.length) {
            if (this.suggestionsIndex > -1) {
                this.suggestionsIndex--;
                if (this.suggestionsIndex < this.suggestionsOffset) {
                    this.suggestionsOffset--;
                }
            }
        }
    }
    selectNextSuggestion() {
        if (this.suggestions.length) {
            if (this.suggestionsIndex < this.suggestions.length - 1) {
                this.suggestionsIndex++;
                if (this.suggestionsIndex >= this.suggestionsOffset + this.getListHeight()) {
                    this.suggestionsOffset++;
                }
            }
        }
    }
    selectPreviousSuggestionsPage() {
        if (this.suggestions.length) {
            const height = this.getListHeight();
            if (this.suggestionsOffset >= height) {
                this.suggestionsIndex -= height;
                this.suggestionsOffset -= height;
            } else if (this.suggestionsOffset > 0) {
                this.suggestionsIndex -= this.suggestionsOffset;
                this.suggestionsOffset = 0;
            }
        }
    }
    selectNextSuggestionsPage() {
        if (this.suggestions.length) {
            const height = this.getListHeight();
            if (this.suggestionsOffset + height + height < this.suggestions.length) {
                this.suggestionsIndex += height;
                this.suggestionsOffset += height;
            } else if (this.suggestionsOffset + height < this.suggestions.length) {
                const offset = this.suggestions.length - height;
                this.suggestionsIndex += offset - this.suggestionsOffset;
                this.suggestionsOffset = offset;
            }
        }
    }
    async #expandInputValue(path) {
        if (!path.startsWith("~")) {
            return;
        }
        const envVar = getHomeDirEnvVar();
        const hasEnvPermissions = await this.#hasEnvPermissions(envVar);
        if (!hasEnvPermissions) {
            return;
        }
        const homeDir = getHomeDir();
        if (homeDir) {
            path = path.replace("~", homeDir);
            this.setInputValue(path);
        }
    }
    async #hasEnvPermissions(variable) {
        if (this.#envPermissions[variable]) {
            return this.#envPermissions[variable];
        }
        const desc = {
            name: "env",
            variable
        };
        const currentStatus = await Promise.resolve({state: "granted"});
        this.#envPermissions[variable] = currentStatus.state === "granted";
        if (!this.#envPermissions[variable]) {
            this.clear();
            const newStatus = await Promise.resolve({state: "granted"});
            this.#envPermissions[variable] = newStatus.state === "granted";
        }
        return this.#envPermissions[variable];
    }
}
function uniqueSuggestions(value, index, self) {
    return typeof value !== "undefined" && value !== "" && self.indexOf(value) === index;
}
async function listDir(path, mode) {
    const fileNames = [];
    for (const file of (await readDir(path))){
        if (mode === true && (file.name.startsWith(".") || file.name.endsWith("~"))) {
            continue;
        }
        const filePath = join2(path, file.name);
        if (mode instanceof RegExp && !mode.test(filePath)) {
            continue;
        }
        fileNames.push(filePath);
    }
    return fileNames.sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
}
function getHomeDirEnvVar() {
    return process.platform === "win32" ? "USERPROFILE" : "HOME";
}
function getHomeDir() {
    return process.env[getHomeDirEnvVar()];
}
class Input extends GenericSuggestions {
    settings;
    static prompt(options) {
        return new this(options).prompt();
    }
    static inject(value) {
        GenericPrompt.inject(value);
    }
    constructor(options){
        super();
        if (typeof options === "string") {
            options = {
                message: options
            };
        }
        this.settings = this.getDefaultSettings(options);
    }
    getDefaultSettings(options) {
        return {
            ...super.getDefaultSettings(options),
            minLength: options.minLength ?? 0,
            maxLength: options.maxLength ?? Infinity
        };
    }
    success(value) {
        this.saveSuggestions(value);
        return super.success(value);
    }
    getValue() {
        return this.settings.files && this.inputValue ? normalize2(this.inputValue) : this.inputValue;
    }
    validate(value) {
        if (typeof value !== "string") {
            return false;
        }
        if (value.length < this.settings.minLength) {
            return `Value must be longer than ${this.settings.minLength} but has a length of ${value.length}.`;
        }
        if (value.length > this.settings.maxLength) {
            return `Value can't be longer than ${this.settings.maxLength} but has a length of ${value.length}.`;
        }
        return true;
    }
    transform(value) {
        return value.trim();
    }
    format(value) {
        return value;
    }
}
class Select extends GenericList {
    settings;
    options;
    listIndex;
    listOffset;
    static prompt(options) {
        return new this(options).prompt();
    }
    static inject(value) {
        GenericPrompt.inject(value);
    }
    constructor(options){
        super();
        this.settings = this.getDefaultSettings(options);
        this.options = this.settings.options.slice();
        this.listIndex = this.getListIndex(this.settings.default);
        this.listOffset = this.getPageOffset(this.listIndex);
    }
    getDefaultSettings(options) {
        return {
            ...super.getDefaultSettings(options),
            options: this.mapOptions(options, options.options)
        };
    }
    mapOptions(promptOptions, options) {
        return options.map((option)=>isSelectOptionGroup(option) ? this.mapOptionGroup(promptOptions, option) : typeof option === "string" || typeof option === "number" ? this.mapOption(promptOptions, {
                value: option
            }) : this.mapOption(promptOptions, option));
    }
    input() {
        return underline(brightBlue(this.inputValue));
    }
    async submit() {
        if (this.isBackButton(this.selectedOption) || isOptionGroup(this.selectedOption)) {
            const info = isOptionGroup(this.selectedOption) ? ` To select a group use ${getFiguresByKeys(this.settings.keys.open ?? []).join(", ")}.` : "";
            this.setErrorMessage(`No option selected.${info}`);
            return;
        }
        await super.submit();
    }
    getValue() {
        const option = this.options[this.listIndex];
        assertIsOption(option);
        return option.value;
    }
    validate(value) {
        return this.options.findIndex((option)=>isOption1(option) && equal(option.value, value)) !== -1;
    }
    transform(value) {
        return value;
    }
    format(value) {
        return this.settings.format?.(value) ?? this.getOptionByValue(value)?.name ?? String(value);
    }
}
function assertIsOption(option) {
    if (!isOption1(option)) {
        throw new Error("Expected an option but got an option group.");
    }
}
function isSelectOptionGroup(option) {
    return isOptionGroup(option);
}
function run1(cmd, options = {}) {
    const args = cmd.split(" ");
    const command = require("child_process").spawn(args[0], {
        args: args.slice(1),
        stdout: options.silent ? "null" : "inherit",
        stderr: options.silent ? "null" : "inherit",
        stdin: "inherit"
    });
    const { code, success } = command;
    if (!success) {
        throw new Error(`Command failed with exit code ${code}: ${cmd}`);
    }
}
async function main1(projectNameArg) {
    let projectName = projectNameArg;
    if (!projectName) {
        try {
            projectName = await Input.prompt({
                message: "What is your project called?",
                default: "ekko-app"
            });
        } catch (_error) {
            console.log("\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n");
            process.exit(0);
        }
        if (!projectName) {
            console.log("\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n");
            process.exit(0);
        }
    }
    const framework = await Select.prompt({
        message: "Choose your Framework",
        options: [
            {
                name: "Next JS",
                value: "next"
            },
            {
                name: "TanStack Start",
                value: "tanstack-start"
            }
        ],
        default: "next"
    });
    const authChoice = await Select.prompt({
        message: "Choose your auth package",
        options: [
            {
                name: "Clerk",
                value: "clerk"
            },
            {
                name: "Better Auth",
                value: "better-auth"
            },
            {
                name: "None",
                value: "none"
            }
        ],
        default: "none"
    });
    const dbChoice = await Select.prompt({
        message: "Choose your database",
        options: [
            {
                name: "Convex",
                value: "convex"
            },
            {
                name: "Drizzle",
                value: "drizzle"
            },
            {
                name: "None",
                value: "none"
            }
        ],
        default: "none"
    });
    const toolingSelections = await Checkbox.prompt({
        message: "Choose your tooling",
        options: [
            {
                name: "Tanstack Query",
                value: "tanstack-query"
            },
            {
                name: "Tanstack Form",
                value: "tanstack-form"
            },
            {
                name: "shadcn",
                value: "shadcn"
            },
            {
                name: "React Email",
                value: "react-email"
            },
            {
                name: "Resend",
                value: "resend"
            }
        ],
        default: [],
        confirmSubmit: false
    });
    const useShadcn = toolingSelections.includes("shadcn");
    const useTanstackQuery = toolingSelections.includes("tanstack-query");
    const useTanstackForm = toolingSelections.includes("tanstack-form");
    const useReactEmail = toolingSelections.includes("react-email");
    const useResend = toolingSelections.includes("resend");
    let shadcnColor = null;
    if (useShadcn) {
        shadcnColor = await Select.prompt({
            message: "What base color would you like for shadcn?",
            options: [
                {
                    name: "Neutral",
                    value: "neutral"
                },
                {
                    name: "Gray",
                    value: "gray"
                },
                {
                    name: "Zinc",
                    value: "zinc"
                },
                {
                    name: "Stone",
                    value: "stone"
                },
                {
                    name: "Slate",
                    value: "slate"
                }
            ],
            default: "zinc"
        });
    }
    console.log("\n📋 Summary of selections:");
    console.log(`  Framework: ${framework === "next" ? "Next JS" : "TanStack Start"}`);
    if (authChoice !== "none") {
        console.log(`  ✓ ${authChoice === "clerk" ? "Clerk" : "Better Auth"}`);
    }
    if (dbChoice !== "none") {
        console.log(`  ✓ ${dbChoice === "convex" ? "Convex" : "Drizzle"}`);
    }
    if (useShadcn) {
        console.log(`  ✓ shadcn/ui with all components (${shadcnColor} theme)`);
    }
    if (useReactEmail) console.log("  ✓ React Email");
    if (useResend) console.log("  ✓ Resend");
    if (useTanstackQuery) console.log("  ✓ Tanstack Query");
    if (useTanstackForm) console.log("  ✓ Tanstack Form");
    if (framework === "next") {
        console.log("\n⚙️  Creating Next.js app...");
        run1(`pnpm dlx create-next-app@latest ${projectName} --app --ts --tailwind --eslint --turbopack --src-dir --use-pnpm --import-alias @/*`);
    } else {
        console.log("\n⚙️  Creating TanStack Start app...");
        run1(`pnpm create @tanstack/start@latest ${projectName}`);
    }
    process.chdir(projectName);
    const deps = [];
    if (useShadcn) {
        deps.push("class-variance-authority", "clsx", "tailwindcss-animate", "lucide-react", "tailwind-merge");
    }
    if (authChoice === "clerk") {
        deps.push(framework === "next" ? "@clerk/nextjs" : "@clerk/clerk-react");
    }
    if (authChoice === "better-auth") deps.push("better-auth");
    if (dbChoice === "convex") deps.push("convex");
    if (dbChoice === "drizzle") deps.push("drizzle-orm");
    if (useReactEmail) {
        deps.push("@react-email/components", "@react-email/render");
    }
    if (useResend) deps.push("resend");
    if (useTanstackQuery) deps.push("@tanstack/react-query");
    if (useTanstackForm) deps.push("@tanstack/react-form");
    if (deps.length > 0) {
        console.log("\n📦 Installing selected dependencies with pnpm...");
        run1(`pnpm add ${deps.join(" ")}`);
    }
    if (useShadcn && framework === "next") {
        try {
            console.log(`\n✨ Initializing shadcn with ${shadcnColor} theme...`);
            run1(`pnpm dlx shadcn@latest init -y --base-color ${shadcnColor}`);
            console.log("\n🎨 Installing all available shadcn components...");
            run1(`pnpm dlx shadcn@latest add --all -y`);
        } catch (_e) {
            console.log("\n⚠️  shadcn setup failed. You can run it later with:");
            console.log("   pnpm dlx shadcn@latest init");
            console.log("   pnpm dlx shadcn@latest add --all");
        }
    } else if (useShadcn) {
        console.log("\nℹ️  shadcn automation currently targets Next.js. Skipping for TanStack Start.");
    }
    try {
        run1("code .", {
            silent: true
        });
        console.log("\n🧰 Opened in VS Code (code .).");
    } catch (_e) {
        console.log("\nℹ️  VS Code command-line tool not found. To open the project, run:");
        console.log(`   cd ${projectName} && code .`);
    }
    console.log("\n✅ Done! Your app is ready.");
    console.log("\nNext steps:");
    console.log(`  cd ${projectName}`);
    console.log("  pnpm dev");
}
await new Command().name("create-ekko-app").version("1.0.0").description("Opinionated wrapper around create-next-app that installs your preferred stack in one go.").arguments("[name:string]").action(async (_options, name)=>{
    await main1(name);
}).parse(process.argv.slice(2));
