/** @format */

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as lodash from 'lodash';
import mongoose, { SchemaTypes, Types } from 'mongoose';
import { inspect } from 'node:util';
import { updateToPipeline } from './plugin';

const mongoUrl = `mongodb://localhost:4242/test-datatable`;
mongoose.set('strictQuery', false);

const schema = new mongoose.Schema({
  code: { type: String },
  date: { type: Date },
  timestamp: { type: Number },
  description: { type: String },
  prix: { type: Number },
  tags: { type: [String] },
  sousProduits: {
    type: [
      {
        _id: { type: SchemaTypes.ObjectId },
        code: { type: String },
        date: { type: Date },
        timestamp: { type: Number },
        description: { type: String },
        prix: { type: Number },
        pieces: {
          type: [
            {
              _id: { type: SchemaTypes.ObjectId },
              code: { type: String },
              date: { type: Date },
              timestamp: { type: Number },
              nom: { type: String },
              prix: { type: Number },
            },
          ],
        },
      },
    ],
  },
});

const baseModel: mongoose.Model<any> = mongoose.model('ProductBase', schema) as any;
const testModel: mongoose.Model<any> = mongoose.model('ProductTest', schema) as any;

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Update to pipeline', () => {
  before(done => {
    mongoose.connect(mongoUrl);
    mongoose.connection.on('error', done);
    mongoose.connection.on('open', done);
  });

  beforeEach(reset);

  describe('$set', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $set: { description: 'test' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $set: { 'sousProduits.$[].description': 'test' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $set: { 'sousProduits.$.description': 'test' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update fields in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $set: { 'sousProduits.$.description': 'test', 'sousProduits.$.prix': 10 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $set: { 'sousProduits.$[elmt].description': 'test' } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update fields in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $set: { 'sousProduits.$[elmt].description': 'test', 'sousProduits.$[elmt].prix': 10 } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $set: { 'sousProduits.$[].pieces.$[].nom': 'test' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $set: { 'sousProduits.$[].pieces.$[elmt].nom': 'test' } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$inc', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $inc: { prix: 5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $inc: { 'sousProduits.$[].prix': -5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $inc: { 'sousProduits.$.prix': 5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $inc: { 'sousProduits.$[elmt].prix': -5 } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $inc: { 'sousProduits.$[].pieces.$[].prix': 5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $inc: { 'sousProduits.$[].pieces.$[elmt].prix': -5 } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$mul', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $mul: { prix: 5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $mul: { 'sousProduits.$[].prix': -5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $mul: { 'sousProduits.$.prix': 5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $mul: { 'sousProduits.$[elmt].prix': -5 } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $mul: { 'sousProduits.$[].pieces.$[].prix': 5 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $mul: { 'sousProduits.$[].pieces.$[elmt].prix': -5 } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$currentDate', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { date: true } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[].date': true } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $currentDate: { 'sousProduits.$.date': true } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[elmt].date': true } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[].pieces.$[].date': true } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[].pieces.$[elmt].date': true } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$currentDate timestamp', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { timestamp: { $type: 'timestamp' } } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[].timestamp': { $type: 'timestamp' } } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $currentDate: { 'sousProduits.$.timestamp': { $type: 'timestamp' } } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[elmt].timestamp': { $type: 'timestamp' } } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[].pieces.$[].timestamp': { $type: 'timestamp' } } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $currentDate: { 'sousProduits.$[].pieces.$[elmt].timestamp': { $type: 'timestamp' } } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$min', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { prix: 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[].prix': 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $min: { 'sousProduits.$.prix': 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[elmt].prix': 0 } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[].pieces.$[].prix': 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[].pieces.$[elmt].prix': 0 } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$min no update', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { prix: 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[].prix': 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $min: { 'sousProduits.$.prix': 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[elmt].prix': 1000000 } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[].pieces.$[].prix': 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $min: { 'sousProduits.$[].pieces.$[elmt].prix': 1000000 } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$max', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { prix: 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[].prix': 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $max: { 'sousProduits.$.prix': 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[elmt].prix': 1000000 } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[].pieces.$[].prix': 1000000 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[].pieces.$[elmt].prix': 1000000 } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$max no update', () => {
    it('Update field', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { prix: 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[].prix': 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $max: { 'sousProduits.$.prix': 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[elmt].prix': 0 } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[].pieces.$[].prix': 0 } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Update field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $max: { 'sousProduits.$[].pieces.$[elmt].prix': 0 } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$rename', () => {
    it('Rename field', async () => {
      const filter = { code: 'P12345' };
      const update = { $rename: { description: 'test' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$unset', () => {
    it('Unset field', async () => {
      const filter = { code: 'P12345' };
      const update = { $unset: { description: '' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Unset field in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $unset: { 'sousProduits.$[].description': '' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Unset field in one sub array elements', async () => {
      const filter = { code: 'P12345', 'sousProduits.code': 'SP123A' };
      const update = { $unset: { 'sousProduits.$.description': '' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Unset field in one sub array elements with arrayFilter', async () => {
      const filter = { code: 'P12345' };
      const update = { $unset: { 'sousProduits.$[elmt].description': '' } };
      const arrayFilters = [{ 'elmt.code': 'SP123A' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Unset field in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $unset: { 'sousProduits.$[].pieces.$[].nom': '' } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Unset field in one sub array elements with arrayFilter in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = { $unset: { 'sousProduits.$[].pieces.$[elmt].nom': '' } };
      const arrayFilters = [{ 'elmt.code': 'PI123A1' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$push', () => {
    it('Push in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $push: {
          sousProduits: {
            _id: new Types.ObjectId(),
            code: 'new-product-code',
            description: 'new-product-description',
            prix: 9.99,
            pieces: [
              { _id: new Types.ObjectId(), code: 'PI678A1', nom: 'Colle spéciale', prix: 2.99 },
              { _id: new Types.ObjectId(), code: 'PI678A2', nom: 'Mini-tournevis', prix: 4.99 },
            ],
          },
        },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Push in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $push: {
          'sousProduits.$[].pieces': { _id: new Types.ObjectId(), code: 'PI678A1', nom: 'Colle spéciale', prix: 2.99 },
        },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$push $each / $sort / $slice / $position', () => {
    it('Push in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $push: {
          sousProduits: {
            $sort: { code: -1 },
            $position: 1,
            $slice: 2,
            $each: [
              {
                _id: new Types.ObjectId(),
                code: 'new-product-code',
                description: 'new-product-description',
                prix: 9.99,
                pieces: [
                  { _id: new Types.ObjectId(), code: 'PI678A1', nom: 'Colle spéciale', prix: 2.99 },
                  { _id: new Types.ObjectId(), code: 'PI678A2', nom: 'Mini-tournevis', prix: 4.99 },
                ],
              },
              {
                _id: new Types.ObjectId(),
                code: 'new-product-code',
                description: 'new-product-description',
                prix: 9.99,
                pieces: [
                  { _id: new Types.ObjectId(), code: 'PI678A1', nom: 'Colle spéciale', prix: 2.99 },
                  { _id: new Types.ObjectId(), code: 'PI678A2', nom: 'Mini-tournevis', prix: 4.99 },
                ],
              },
            ],
          },
        },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Push in all sub array elements in all sub array elements', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $push: {
          'sousProduits.$[].pieces': {
            $sort: { code: 1 },
            $position: -1,
            $slice: -2,
            $each: [
              { _id: new Types.ObjectId(), code: 'PI678A1', nom: 'Colle spéciale', prix: 2.99 },
              { _id: new Types.ObjectId(), code: 'PI678A1', nom: 'Colle spéciale', prix: 2.99 },
            ],
          },
        },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$pull', () => {
    it('Pull one element from array', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $pull: { tags: 'T1' },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Pull two element from array', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $pull: { tags: { $in: ['T1', 'T2'] } },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Pull one element from obj array', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $pull: { sousProduits: { code: 'SP123A' } },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Pull two element from obj array', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $pull: { sousProduits: { code: { $in: ['SP123A', 'SP123B'] } } },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Pull one element from one sub array', async () => {
      const filter = { code: 'P12345' };
      const update = { $pull: { 'sousProduits.$[elmt].pieces': { code: 'PI678A1' } } };
      const arrayFilters = [{ 'elmt.code': 'P12345' }];
      const pipelineUpdate = updateToPipeline(filter, update, { arrayFilters });
      await baseModel.updateOne(filter, update, { arrayFilters });
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Pull one element from all sub array', async () => {
      const filter = { code: 'P12345' };
      const update = { $pull: { 'sousProduits.$[].pieces': { code: 'PI678A1' } } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Pull one element from all sub array obj style', async () => {
      const filter = { code: 'P12345' };
      const update = { $pull: { sousProduits: { pieces: { $elemMatch: { code: 'PI678A1' } } } } };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$pullAll', () => {
    it('Pull one element from array', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $pullAll: { tags: ['T1'] },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });

    it('Pull two element from array', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $pullAll: { tags: ['T1', 'T2'] },
      };
      const pipelineUpdate = updateToPipeline(filter, update);
      await baseModel.updateOne(filter, update);
      await testModel.updateOne(filter, pipelineUpdate);
      await check(update, pipelineUpdate);
    });
  });

  describe('$setOnInsert', () => {
    it('Set on insert on not existing', async () => {
      const filter = { code: 'setOnInsert' };
      const update = {
        $setOnInsert: { code: 'setOnInsert', date: new Date(), prix: 0, tags: ['T1', 'T2', 'T3'] },
        $set: { description: 'setOnInsert' },
      };
      const pipelineUpdate = updateToPipeline(filter, update, { disabledWarn: true });
      await baseModel.updateOne(filter, update, { upsert: true });
      await testModel.updateOne(filter, pipelineUpdate, { upsert: true });
      await check(update, pipelineUpdate, true);
    });

    it('Set on insert on existing', async () => {
      const filter = { code: 'P12345' };
      const update = {
        $setOnInsert: { code: 'P12345', date: new Date(), prix: 0, tags: ['T1', 'T2', 'T3'] },
        $set: { description: 'insert' },
      };
      const pipelineUpdate = updateToPipeline(filter, update, { disabledWarn: true });
      await baseModel.updateOne(filter, update, { upsert: true });
      await testModel.updateOne(filter, pipelineUpdate, { upsert: true });
      await check(update, pipelineUpdate);
    });
  });

  after(() => {
    mongoose.connection.close();
  });
});

async function check(update: any, pipelineUpdate: any, omitId = false): Promise<void> {
  const baseData = (await baseModel.find()).map(d => d.toObject());
  const testData = (await testModel.find()).map(d => d.toObject());
  function customizer(v1: any, v2: any) {
    if (Array.isArray(v1) || Array.isArray(v2)) return;
    if (typeof v1 === 'object' && typeof v2 === 'object') {
      if (typeof v1.toHexString === 'function' && typeof v2.toHexString === 'function') {
        if (omitId) return true;
        return lodash.isEqual(v1.toHexString(), v2.toHexString());
      }
      if (v1 instanceof Date && v2 instanceof Date) {
        return lodash.isEqual(Math.round(v1.valueOf() / 1000), Math.round(v2.valueOf() / 1000));
      }
    }
  }
  const same = lodash.isEqualWith(baseData, testData, customizer);
  if (!same) {
    console.log(inspect({ update, pipelineUpdate }, false, null, true));
    for (let i = 0; i < Math.max(baseData.length, testData.length); ++i) {
      if (!lodash.isEqualWith(baseData[i], testData[i], customizer)) {
        console.log(
          `diff on index ${i}:`,
          inspect({ baseData: baseData[i], testData: testData[i] }, false, null, true)
        );
      }
    }
  }
  expect(same, `update and update pipeline should produce same result`).to.be.true;
}

async function reset(): Promise<void> {
  await baseModel.deleteMany();
  await seed();
  await baseModel.aggregate([{ $out: testModel.collection.collectionName }]);
}

async function seed(): Promise<void> {
  await baseModel.insertMany([
    {
      code: 'P12345',
      date: '2025-03-31T00:00:00.000Z',
      description: 'Produit électronique haute performance',
      prix: 199.99,
      tags: ['T1', 'T2', 'T3'],
      sousProduits: [
        {
          code: 'SP123A',
          description: 'Batterie rechargeable',
          prix: 29.99,
          pieces: [
            { code: 'PI123A1', nom: 'Cellule lithium', prix: 10.99 },
            { code: 'PI123A2', nom: 'Circuit de protection', prix: 5.99 },
          ],
        },
        {
          code: 'SP123B',
          description: 'Chargeur rapide',
          prix: 19.99,
          pieces: [
            { code: 'PI123B1', nom: 'Transformateur', prix: 8.99 },
            { code: 'PI123B2', nom: 'Câble USB-C', prix: 3.99 },
          ],
        },
      ],
    },
    {
      code: 'P67890',
      date: '2025-03-30T00:00:00.000Z',
      description: 'Accessoire en bois écologique',
      prix: 29.99,
      sousProduits: [
        {
          code: 'SP678A',
          description: 'Kit de réparation',
          prix: 9.99,
          pieces: [
            { code: 'PI678A1', nom: 'Colle spéciale', prix: 2.99 },
            { code: 'PI678A2', nom: 'Mini-tournevis', prix: 4.99 },
          ],
        },
        {
          code: 'SP678B',
          description: 'Housse de protection',
          prix: 14.99,
          pieces: [
            { code: 'PI678B1', nom: 'Tissu imperméable', prix: 7.99 },
            { code: 'PI678B2', nom: 'Fermeture éclair', prix: 3.49 },
          ],
        },
      ],
    },
    {
      code: 'P54321',
      date: '2025-03-29T00:00:00.000Z',
      description: 'Outil de jardinage ergonomique',
      prix: 49.5,
      sousProduits: [
        {
          code: 'SP543A',
          description: 'Poignée supplémentaire',
          prix: 5.99,
          pieces: [
            { code: 'PI543A1', nom: 'Caoutchouc antidérapant', prix: 2.99 },
            { code: 'PI543A2', nom: 'Visserie inox', prix: 1.99 },
          ],
        },
        {
          code: 'SP543B',
          description: 'Lame de rechange',
          prix: 12.99,
          pieces: [
            { code: 'PI543B1', nom: 'Acier trempé', prix: 7.99 },
            { code: 'PI543B2', nom: 'Revêtement anti-rouille', prix: 3.99 },
          ],
        },
      ],
    },
    {
      code: 'P98765',
      date: '2025-03-28T00:00:00.000Z',
      description: 'Vêtement de sport respirant',
      prix: 59.99,
      sousProduits: [
        {
          code: 'SP987A',
          description: 'Bande anti-transpiration',
          prix: 4.99,
          pieces: [
            { code: 'PI987A1', nom: 'Microfibre absorbante', prix: 2.99 },
            { code: 'PI987A2', nom: 'Élastique ajustable', prix: 1.99 },
          ],
        },
        {
          code: 'SP987B',
          description: 'Filet de lavage',
          prix: 6.99,
          pieces: [
            { code: 'PI987B1', nom: 'Maille résistante', prix: 3.99 },
            { code: 'PI987B2', nom: 'Cordon de serrage', prix: 2.49 },
          ],
        },
      ],
    },
  ]);
  // console.log(inspect(await baseModel.find(), false, null, true));
}
