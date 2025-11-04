"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateToPipeline = updateToPipeline;
const lodash = require("lodash");
function buildUnsetValue(key, value, prefixKey) {
    if (prefixKey) {
        return {
            key,
            value: {
                $unsetField: {
                    field: key,
                    input: `$$${prefixKey}`,
                },
            },
        };
    }
    return null;
}
function buildCurrentDateValue(key, value, prefixKey) {
    const path = prefixKey ? `$$${prefixKey}.${key}` : `$${key}`;
    if (value === true || value?.$type === 'date')
        return { key, value: '$$NOW' };
    if (value?.$type === 'timestamp')
        return { key, value: '$$CLUSTER_TIME' };
    return { key, value: path };
}
function buildSetOnInsertValue(key, value, options) {
    return {
        key,
        value: {
            $cond: {
                if: { $eq: [{ $type: `$${options?.versionKey ?? '__v'}` }, 'missing'] },
                then: value,
                else: `$${key}`,
            },
        },
    };
}
function buildPushValue(key, value, prefixKey) {
    const path = prefixKey ? `$$${prefixKey}.${key}` : `$${key}`;
    const pushValue = value.$each ?? [value];
    let keyValue = value.$position >= 0
        ? { $concatArrays: [{ $slice: [path, 0, value.$position] }, pushValue, { $slice: [path, value.$position] }] }
        : value.$position < 0
            ? {
                $concatArrays: [
                    { $slice: [path, 0, { $subtract: [{ $size: path }, value.$position] }] },
                    pushValue,
                    { $slice: [path, value.$position] },
                ],
            }
            : { $concatArrays: [path, pushValue] };
    if (value.$sort)
        keyValue = { $sortArray: { input: keyValue, sortBy: value.$sort } };
    if (!lodash.isNil(value.$slice)) {
        keyValue = value.$slice >= 0 ? { $slice: [keyValue, 0, value.$slice] } : { $slice: [keyValue, value.$slice] };
    }
    return { key, value: keyValue };
}
function getPullFilter(obj, item, path) {
    const filter = [];
    Object.keys(obj).forEach(k => {
        const v = obj[k];
        if (lodash.startsWith(k, '$')) {
            if (k === '$elemMatch')
                filter.push({ $and: getPullFilter(v, item, path) });
            else
                filter.push({ [k]: [item, v] });
        }
        else if (typeof v !== 'object') {
            filter.push({ $eq: [`${item}.${k}`, v] });
        }
        else {
            filter.push({ $and: getPullFilter(v, `${item}.${k}`, `${path}.${k}`) });
        }
    });
    return filter;
}
function buildPullValue(key, value, prefixKey) {
    const path = prefixKey ? `$$${prefixKey}.${key}` : `$${key}`;
    if (typeof value !== 'object') {
        return { key, value: { $filter: { input: path, as: 'item', cond: { $ne: ['$$item', value] } } } };
    }
    const pullValue = {
        $filter: {
            input: path,
            as: 'item',
            cond: { $not: { $or: getPullFilter(value, `$$item`, prefixKey ? `${prefixKey}.${key}` : key) } },
        },
    };
    return { key, value: pullValue };
}
function buildPullAllValue(key, value, prefixKey) {
    const path = prefixKey ? `$$${prefixKey}.${key}` : `$${key}`;
    const pullValue = {
        $filter: {
            input: path,
            as: 'item',
            cond: { $not: { $or: getPullFilter({ $in: value }, `$$item`, prefixKey ? `${prefixKey}.${key}` : key) } },
        },
    };
    return { key, value: pullValue };
}
function buildValue(operator, key, value, prefixKey, options) {
    const path = prefixKey ? `$$${prefixKey}.${key}` : `$${key}`;
    switch (operator) {
        case '$set':
            return { key, value };
        case '$setOnInsert':
            return buildSetOnInsertValue(key, value, options);
        case '$inc':
            return { key, value: { $add: [path, value] } };
        case '$mul':
            return { key, value: { $multiply: [path, value] } };
        case '$currentDate':
            return buildCurrentDateValue(key, value, prefixKey);
        case '$min':
            return { key, value: { $min: [path, value] } };
        case '$max':
            return { key, value: { $max: [path, value] } };
        case '$rename':
            return { key: value, value: path };
        case '$unset':
            return buildUnsetValue(key, value, prefixKey);
        case '$push':
            return buildPushValue(key, value, prefixKey);
        case '$pull':
            return buildPullValue(key, value, prefixKey);
        case '$pullAll':
            return buildPullAllValue(key, value, prefixKey);
        default:
            throw new Error(`unmanaged ${operator} operator`);
    }
}
function getFilter(filters, array, property, as, prefix) {
    if (array === '$[]')
        return [];
    let path;
    if (array === '$')
        path = prefix ? `${prefix}.${property}` : property;
    else if (array)
        path = array;
    else
        path = property;
    const propertyFilter = [];
    (filters ?? []).forEach(filter => {
        Object.keys(filter).forEach(key => {
            if (key === path || key.startsWith(`${path}.`)) {
                const value = key === property ? `$$${as}` : `$$${as}.${key.slice(path.length + 1)}`;
                const filterValue = filter[key];
                if (typeof filterValue === 'object') {
                    propertyFilter.push(...Object.keys(filterValue).map(k => k.startsWith('$') ? { [k]: [value, filterValue[k]] } : { $eq: [value, filterValue[k]] }));
                }
                else
                    propertyFilter.push({ $eq: [value, filterValue] });
            }
        });
    });
    return propertyFilter;
}
function parsePropertyValue(key) {
    let base, array, path;
    key.split('.').forEach(k => {
        if (array === undefined && k.includes('$')) {
            if (k === '$' || k === '$[]')
                array = k;
            else if (k.startsWith('$[') && k.endsWith(']'))
                array = k.slice(2, k.length - 1);
            else
                array = k.slice(1);
        }
        else if (array !== undefined)
            path = path ? `${path}.${k}` : k;
        else
            base = base ? `${base}.${k}` : k;
    });
    return { property: base, array, path: path };
}
function mapStageValue(operator, key, value, filters, parent, options) {
    const { property, array, path } = parsePropertyValue(key);
    const as = parent ? `${parent}Elemt${property}Elemt` : `${property}Elemt`;
    const input = parent ? `$$${parent}Elemt.${property}` : `$${property}`;
    let mergeValue;
    if (lodash.includes(path, '$')) {
        const mapped = mapStageValue(operator, path, value, filters, parent ? `$parent}.${property}` : property, options);
        if (!mapped)
            return;
        const toMerge = {};
        lodash.set(toMerge, mapped.key, mapped.value);
        mergeValue = { $mergeObjects: [`$$${as}`, toMerge] };
    }
    else {
        const v = buildValue(operator, path, value, as, options);
        if (!v)
            return;
        if (operator === '$unset')
            mergeValue = v.value;
        else {
            const toMerge = {};
            lodash.set(toMerge, v.key, v.value);
            mergeValue = { $mergeObjects: [`$$${as}`, toMerge] };
        }
    }
    const propertyFilter = getFilter(filters, array, property, as, parent);
    const transform = propertyFilter.length
        ? { $cond: { if: { $and: propertyFilter }, then: mergeValue, else: `$$${as}` } }
        : mergeValue;
    return { key: property, value: { $map: { input, as, in: transform } } };
}
function mapStage(operator, filter, update, options) {
    const stageUpdate = {};
    const filters = (filter ? [filter] : []).concat(options?.arrayFilters ?? []);
    Object.keys(update ?? {}).forEach(key => {
        if (lodash.includes(key, '$')) {
            const mapped = mapStageValue(operator, key, update[key], filters, undefined, options);
            if (mapped) {
                if (stageUpdate[mapped.key]) {
                    stageUpdate[mapped.key] = lodash.merge(stageUpdate[mapped.key], mapped.value);
                }
                else
                    stageUpdate[mapped.key] = mapped.value;
            }
        }
        else {
            const v = buildValue(operator, key, update[key], undefined, options);
            if (!v)
                return;
            stageUpdate[v.key] = v.value;
        }
    });
    return stageUpdate;
}
function warn(options, ...message) {
    if (options?.disabledWarn)
        return;
    console.warn.apply(console, message);
}
function updateToPipeline(filter, update, options) {
    if (Array.isArray(update))
        return update;
    const pipeline = [];
    lodash.forEach(lodash.keys(update), operator => {
        const rootUpdate = lodash.filter(lodash.keys(update[operator]), k => !lodash.includes(k, '$'));
        switch (operator) {
            case '$set':
            case '$inc':
            case '$mul':
            case '$currentDate':
            case '$min':
            case '$max':
            case '$push':
            case '$pull':
            case '$pullAll':
                return pipeline.push({ $set: mapStage(operator, filter, update[operator], options) });
            case '$setOnInsert':
                warn(options, `$setOnInsert is based on version property '__v' addebd by mongoose, it is possible to specify it via 'versionKey' option`);
                pipeline.push({ $set: mapStage(operator, filter, update[operator], options) });
                pipeline.push({
                    $set: { [options?.versionKey ?? '__v']: { $ifNull: [`$${options?.versionKey ?? '__v'}`, 0] } },
                });
                return;
            case '$rename':
                pipeline.push({ $set: mapStage('$rename', filter, update[operator], options) });
                if (rootUpdate.length)
                    pipeline.push({ $unset: rootUpdate });
                return;
            case '$unset':
                const unset = mapStage('$unset', filter, update[operator], options);
                if (lodash.keys(unset).length)
                    pipeline.push({ $set: unset });
                if (rootUpdate.length)
                    pipeline.push({ $unset: rootUpdate });
                return;
            default:
                throw new Error(`unmanaged ${operator} operator`);
        }
    });
    return pipeline;
}
