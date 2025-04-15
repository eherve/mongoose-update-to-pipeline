import { UpdateWithAggregationPipeline } from 'mongoose';
type Options = {
    arrayFilters?: any[];
};
export declare function updateToPipeline(filter: any, update: any, options?: Options): UpdateWithAggregationPipeline;
export {};
