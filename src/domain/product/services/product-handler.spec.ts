import {describe, it, expect, beforeEach} from 'vitest';
import {mockDeep, type DeepMockProxy} from 'vitest-mock-extended';
import {Product} from '@/domain/product/product.entity.js';
import {type ProductsManager} from '@/managers/products.manager.js';
import { NormalProductHandler } from './handlers/normal-product.handler.js';
import {SeasonalProductHandler} from './handlers/seasonal-product.handler.js';
import {ExpirableProductHandler} from './handlers/expirable-product.handler.js';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

describe('NormalProductHandler', () => {
	let productsManager: DeepMockProxy<ProductsManager>;
	let handler: NormalProductHandler;

	beforeEach(() => {
		productsManager = mockDeep<ProductsManager>();
		handler = new NormalProductHandler({productsManager});
	});

	const buildNormalProduct = (overrides: {available?: number; leadTime?: number} = {}): Product =>
		Product.fromPersistence({
			id: 1,
			name: 'USB Cable',
			type: 'NORMAL',
			available: overrides.available ?? 10,
			leadTime: overrides.leadTime ?? 5,
			seasonStartDate: null,
			seasonEndDate: null,
			expiryDate: null,
		});

	it('reserves stock when product is in stock', async () => {
		const product = buildNormalProduct({available: 10});
		await handler.handle(product);
		expect(productsManager.reserveStock).toHaveBeenCalledWith(product);
		expect(productsManager.notifyDelay).not.toHaveBeenCalled();
	});

	it('notifies delay when out of stock and has a positive lead time', async () => {
		const product = buildNormalProduct({available: 0, leadTime: 5});
		await handler.handle(product);
		expect(productsManager.notifyDelay).toHaveBeenCalledWith(product);
		expect(productsManager.reserveStock).not.toHaveBeenCalled();
	});

	it('does nothing when out of stock and lead time is zero', async () => {
		const product = buildNormalProduct({available: 0, leadTime: 0});
		await handler.handle(product);
		expect(productsManager.reserveStock).not.toHaveBeenCalled();
		expect(productsManager.notifyDelay).not.toHaveBeenCalled();
	});
});

describe('SeasonalProductHandler', () => {
	let productsManager: DeepMockProxy<ProductsManager>;
	let handler: SeasonalProductHandler;

	beforeEach(() => {
		productsManager = mockDeep<ProductsManager>();
		handler = new SeasonalProductHandler({productsManager});
	});

	const buildSeasonalProduct = (overrides: {
		available?: number;
		leadTime?: number;
		seasonStartOffsetDays?: number;
		seasonEndOffsetDays?: number;
	} = {}): Product =>
		Product.fromPersistence({
			id: 1,
			name: 'Watermelon',
			type: 'SEASONAL',
			available: overrides.available ?? 30,
			leadTime: overrides.leadTime ?? 5,
			seasonStartDate: new Date(Date.now() + (overrides.seasonStartOffsetDays ?? -10) * ONE_DAY_MS),
			seasonEndDate: new Date(Date.now() + (overrides.seasonEndOffsetDays ?? 60) * ONE_DAY_MS),
			expiryDate: null,
		});

	it('reserves stock when in season and has stock', async () => {
		const product = buildSeasonalProduct({available: 30, seasonStartOffsetDays: -10, seasonEndOffsetDays: 30});
		await handler.handle(product);
		
		expect(productsManager.reserveStock).toHaveBeenCalledWith(product);
		expect(productsManager.notifyOutOfStock).not.toHaveBeenCalled();
		expect(productsManager.notifyDelay).not.toHaveBeenCalled();
	});

	it('marks out of stock when restock would arrive after season ends', async () => {
		const product = buildSeasonalProduct({available: 0, leadTime: 10, seasonStartOffsetDays: -30, seasonEndOffsetDays: 3});
		await handler.handle(product);
		
		expect(productsManager.notifyOutOfStock).toHaveBeenCalledWith(product);
		expect(productsManager.markOutOfStock).toHaveBeenCalledWith(product);
		expect(productsManager.reserveStock).not.toHaveBeenCalled();
		expect(productsManager.notifyDelay).not.toHaveBeenCalled();
	});

	it('marks out of stock when season has not started yet', async () => {
		const product = buildSeasonalProduct({available: 30, leadTime: 5, seasonStartOffsetDays: 30, seasonEndOffsetDays: 60});
		await handler.handle(product);
		
		expect(productsManager.notifyOutOfStock).toHaveBeenCalledWith(product);
		expect(productsManager.markOutOfStock).toHaveBeenCalledWith(product);
		expect(productsManager.reserveStock).not.toHaveBeenCalled();
	});

	it('falls back to notify delay when in season but out of stock and restock still fits within the window', async () => {
		const product = buildSeasonalProduct({available: 0, leadTime: 5, seasonStartOffsetDays: -10, seasonEndOffsetDays: 60});
		await handler.handle(product);
		
		expect(productsManager.notifyDelay).toHaveBeenCalledWith(product);
		expect(productsManager.reserveStock).not.toHaveBeenCalled();
		expect(productsManager.markOutOfStock).not.toHaveBeenCalled();
	});
});

describe('ExpirableProductHandler', () => {
	let productsManager: DeepMockProxy<ProductsManager>;
	let handler: ExpirableProductHandler;

	beforeEach(() => {
		productsManager = mockDeep<ProductsManager>();
		handler = new ExpirableProductHandler({productsManager});
	});

	const buildExpirableProduct = (overrides: {available?: number; expiryOffsetDays?: number} = {}): Product =>
		Product.fromPersistence({
			id: 1,
			name: 'Milk',
			type: 'EXPIRABLE',
			available: overrides.available ?? 10,
			leadTime: 5,
			seasonStartDate: null,
			seasonEndDate: null,
			expiryDate: new Date(Date.now() + (overrides.expiryOffsetDays ?? 30) * ONE_DAY_MS),
		});

	it('reserves stock when in stock and not expired', async () => {
		const product = buildExpirableProduct({available: 10, expiryOffsetDays: 30});
		await handler.handle(product);
		
		expect(productsManager.reserveStock).toHaveBeenCalledWith(product);
		expect(productsManager.notifyExpiration).not.toHaveBeenCalled();
		expect(productsManager.markOutOfStock).not.toHaveBeenCalled();
	});

	it('notifies expiration and marks out of stock when expired', async () => {
		const product = buildExpirableProduct({available: 10, expiryOffsetDays: -2});
		await handler.handle(product);
		
		expect(productsManager.notifyExpiration).toHaveBeenCalledWith(product);
		expect(productsManager.markOutOfStock).toHaveBeenCalledWith(product);
		expect(productsManager.reserveStock).not.toHaveBeenCalled();
	});

	it('notifies expiration and marks out of stock when out of stock even if not yet expired', async () => {
		const product = buildExpirableProduct({available: 0, expiryOffsetDays: 30});
		await handler.handle(product);
		
		expect(productsManager.notifyExpiration).toHaveBeenCalledWith(product);
		expect(productsManager.markOutOfStock).toHaveBeenCalledWith(product);
		expect(productsManager.reserveStock).not.toHaveBeenCalled();
	});
});
