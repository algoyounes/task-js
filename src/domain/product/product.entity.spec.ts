import {describe, it, expect} from 'vitest';
import {Product, type ProductPersistenceData} from './product.entity.js';
import {SeasonWindow} from './value-objects/season-window.js';
import {ExpirationDate} from './value-objects/expiration-date.js';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

const buildRow = (overrides: Partial<ProductPersistenceData> = {}): ProductPersistenceData => ({
	id: 1,
	name: 'Sample',
	type: 'NORMAL',
	available: 0,
	leadTime: 0,
	seasonStartDate: null,
	seasonEndDate: null,
	expiryDate: null,
	...overrides,
});

describe('Product entity', () => {
	describe('fromPersistence', () => {
		it('builds a normal product without season window or expiration', () => {
			const product = Product.fromPersistence(buildRow({type: 'NORMAL', available: 10, leadTime: 5}));
			expect(product.seasonWindow).toBeNull();
			expect(product.expiration).toBeNull();
		});

		it('builds a seasonal product with a SeasonWindow value object', () => {
			const product = Product.fromPersistence(buildRow({
				type: 'SEASONAL',
				seasonStartDate: new Date('2026-06-01'),
				seasonEndDate: new Date('2026-09-01'),
			}));
			expect(product.seasonWindow).toBeInstanceOf(SeasonWindow);
		});

		it('builds an expirable product with an ExpirationDate value object', () => {
			const product = Product.fromPersistence(buildRow({
				type: 'EXPIRABLE',
				expiryDate: new Date('2026-02-01'),
			}));
			expect(product.expiration).toBeInstanceOf(ExpirationDate);
		});
	});

	describe('predicates', () => {
		it('hasStock returns true when available > 0', () => {
			expect(Product.fromPersistence(buildRow({available: 5})).hasStock()).toBe(true);
			expect(Product.fromPersistence(buildRow({available: 0})).hasStock()).toBe(false);
		});

		it('canBeRestocked returns true when leadTime > 0', () => {
			expect(Product.fromPersistence(buildRow({leadTime: 5})).canBeRestocked()).toBe(true);
			expect(Product.fromPersistence(buildRow({leadTime: 0})).canBeRestocked()).toBe(false);
		});

		it('isInSeason returns true only inside the season window', () => {
			const product = Product.fromPersistence(buildRow({
				type: 'SEASONAL',
				seasonStartDate: new Date('2026-06-01'),
				seasonEndDate: new Date('2026-09-01'),
			}));
			expect(product.isInSeason(new Date('2026-07-15'))).toBe(true);
			expect(product.isInSeason(new Date('2026-04-15'))).toBe(false);
			expect(Product.fromPersistence(buildRow()).isInSeason(new Date())).toBe(false);
		});

		it('isExpired returns true when current date is past expiry', () => {
			const product = Product.fromPersistence(buildRow({
				type: 'EXPIRABLE',
				expiryDate: new Date('2026-01-15'),
			}));
			expect(product.isExpired(new Date('2026-02-01'))).toBe(true);
			expect(product.isExpired(new Date('2026-01-01'))).toBe(false);
			expect(Product.fromPersistence(buildRow()).isExpired(new Date())).toBe(false);
		});

		it('restockArrivalDate adds leadTime days to the given date', () => {
			const product = Product.fromPersistence(buildRow({leadTime: 3}));
			const now = new Date('2026-01-01T00:00:00Z');
			const expected = new Date(now.getTime() + 3 * ONE_DAY_MS);
			expect(product.restockArrivalDate(now).getTime()).toBe(expected.getTime());
		});
	});
});
