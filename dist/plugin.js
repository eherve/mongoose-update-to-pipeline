"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateToPipeline = updateToPipeline;
const lodash = require("lodash");
function buildValue(stage, key, value, prefixKey) {
    const path = prefixKey ? `$$${prefixKey}.${key}` : `$${key}`;
    switch (stage) {
        case '$set':
            return { key, value };
        case '$inc':
            return { key, value: { $add: [path, value] } };
        case '$mul':
            return { key, value: { $multiply: [path, value] } };
        case '$currentDate':
            return {
                key,
                value: value === true || value?.$type === 'date' ? '$$NOW' : value?.$type === 'timestamp' ? '$$CLUSTER_TIME' : path,
            };
        case '$min':
            return { key, value: { $min: [path, value] } };
        case '$max':
            return { key, value: { $max: [path, value] } };
        case '$rename':
            return { key: value, value: path };
        case '$unset':
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
            return;
        case '$push':
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
        case '$pull':
            if (typeof value !== 'object') {
                return { key, value: { $filter: { input: path, as: 'item', cond: { $ne: ['$$item', value] } } } };
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
            const pullValue = {
                $filter: {
                    input: path,
                    as: 'item',
                    cond: { $not: { $or: getPullFilter(value, `$$item`, prefixKey ? `${prefixKey}.${key}` : key) } },
                },
            };
            return { key, value: pullValue };
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
function mapStageValue(stage, key, value, filters, parent) {
    const { property, array, path } = parsePropertyValue(key);
    const as = parent ? `${parent}Elemt${property}Elemt` : `${property}Elemt`;
    const input = parent ? `$$${parent}Elemt.${property}` : `$${property}`;
    let mergeValue;
    if (lodash.includes(path, '$')) {
        const mapped = mapStageValue(stage, path, value, filters, parent ? `$parent}.${property}` : property);
        if (!mapped)
            return;
        mergeValue = { $mergeObjects: [`$$${as}`, { [mapped.key]: mapped.value }] };
    }
    else {
        const v = buildValue(stage, path, value, as);
        if (!v)
            return;
        if (stage === '$unset')
            mergeValue = v.value;
        else
            mergeValue = { $mergeObjects: [`$$${as}`, { [v.key]: v.value }] };
    }
    const propertyFilter = getFilter(filters, array, property, as, parent);
    const transform = propertyFilter.length
        ? { $cond: { if: { $and: propertyFilter }, then: mergeValue, else: `$$${as}` } }
        : mergeValue;
    return { key: property, value: { $map: { input, as, in: transform } } };
}
function mapStage(stage, filter, update, options) {
    const stageUpdate = {};
    const filters = (filter ? [filter] : []).concat(options?.arrayFilters ?? []);
    Object.keys(update ?? {}).forEach(key => {
        if (lodash.includes(key, '$')) {
            const mapped = mapStageValue(stage, key, update[key], filters);
            if (mapped)
                stageUpdate[mapped.key] = mapped.value;
        }
        else {
            const v = buildValue(stage, key, update[key]);
            if (v)
                stageUpdate[v.key] = v.value;
        }
    });
    return stageUpdate;
}
function updateToPipeline(filter, update, options) {
    if (Array.isArray(update))
        return update;
    const pipeline = [];
    lodash.forEach(lodash.keys(update), key => {
        const rootUpdate = lodash.filter(lodash.keys(update[key]), k => !lodash.includes(k, '$'));
        switch (key) {
            case '$set':
            case '$inc':
            case '$mul':
            case '$currentDate':
            case '$min':
            case '$max':
            case '$push':
            case '$pull':
                return pipeline.push({ $set: mapStage(key, filter, update[key], options) });
            case '$rename':
                pipeline.push({ $set: mapStage('$rename', filter, update[key], options) });
                if (rootUpdate.length)
                    pipeline.push({ $unset: rootUpdate });
                return;
            case '$unset':
                const unset = mapStage('$unset', filter, update[key], options);
                if (lodash.keys(unset).length)
                    pipeline.push({ $set: unset });
                if (rootUpdate.length)
                    pipeline.push({ $unset: rootUpdate });
                return;
            default:
                throw new Error(`unmanaged ${key}`);
        }
    });
    return pipeline;
}
