const assert = require('assert');
const fs = require('fs');
const moment = require('moment');
const chai = require('chai');

const { Rating, Tick } = require('@cdx/util');

const testPredefinedStrategy = (path) => {
  const strategyDate = JSON.parse(fs.readFileSync(path, 'utf8'));

  const firstTick = new Tick(
    strategyDate.initial.value,
    new Date(strategyDate.initial.time * 1000),
  );

  const rating = Rating.fromTick(firstTick);

  strategyDate.ticks.forEach((b) => {
    const t = new Tick(
      b.value,
      new Date(b.time * 1000),
    );

    rating.addTick(t);

    assert.strictEqual(rating.nTicks, b.rating.values_amount);
    chai.expect(rating.incomeAverage).to.be.closeTo(b.rating.iav, 0.0001);
    chai.expect(rating.maxDrawdown).to.be.closeTo(b.rating.maxdd, 0.0001);
    chai.expect(rating.maxRecoveryTimeShare).to.be.closeTo(b.rating.dmaxdd, 0.01);
    chai.expect(rating.ratingValue).to.be.closeTo(b.rating.rating, 0.001);
  });
};

describe('Rating object', () => {
  describe('Initializing from the state', () => {
    let initialTick;

    const strategies = {
      bitcoin: {
        values: './tests/data/bitcoin-strategy-values.json',
      },
      ethereum: {
        values: './tests/data/ethereum-strategy-values.json',
      },
      usd: {
        values: './tests/data/usd-strategy-values.json',
      },
    };

    before(() => {
      initialTick = new Tick(30, moment());
    });

    it('Should init from initial tick', () => {
      const rating = Rating.fromTick(initialTick);

      assert.strictEqual(rating.volatilitySqr, 0.0);
      assert.strictEqual(rating.maxRecoveryTimeShare, 0.0);
      assert.strictEqual(rating.maxDrawdown, 0.0);
      assert.strictEqual(rating.incomeAverage, 0.0);
      assert.strictEqual(rating.ratingValue, NaN);
    });

    it('Should correctly process the sequence of pre-defined absolute ticks (Bitcoin)', () => {
      testPredefinedStrategy(strategies.bitcoin.values);
    });
  });
});
