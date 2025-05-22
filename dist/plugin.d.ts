import { UpdateWithAggregationPipeline } from 'mongoose';
type Options = {
    arrayFilters?: any[];
    versionKey?: string;
    disabledWarn?: boolean;
};
export declare function updateToPipeline(filter: any, update: any, options?: Options): UpdateWithAggregationPipeline;
export {};
