import {
	describe, it, expect, beforeEach, afterEach,
} from 'vitest';
import {type FastifyInstance} from 'fastify';
import supertest from 'supertest';
import {inArray} from 'drizzle-orm';
import {type DeepMockProxy, mockDeep} from 'vitest-mock-extended';
import {asValue} from 'awilix';
import {type INotificationService} from '@/services/notifications.port.js';
import {
	type ProductInsert,
	products,
	orders,
	ordersToProducts,
} from '@/db/schema.js';
import {type Database} from '@/db/type.js';
import {buildFastify} from '@/fastify.js';

describe('OrderController', () => {
	let fastify: FastifyInstance;
	let database: Database;
	let notificationServiceMock: DeepMockProxy<INotificationService>;

	beforeEach(async () => {
		notificationServiceMock = mockDeep<INotificationService>();
		fastify = await buildFastify();
		fastify.diContainer.register({
			ns: asValue(notificationServiceMock as INotificationService),
		});
		await fastify.ready();
		database = fastify.database;
	});

	afterEach(async () => {
		await fastify.close();
	});

	describe('processOrder', () => {
		it('returns 200 and the orderId for a known order', async () => {
			const orderId = await seedOrder(database, sampleProducts());

			await supertest(fastify.server)
				.post(`/orders/${orderId}/processOrder`)
				.expect(200)
				.expect('Content-Type', /application\/json/)
				.expect(({body}) => {
					expect(body).toEqual({orderId});
				});
		});

		it('decrements stock for in-stock NORMAL products and notifies delay for out-of-stock', async () => {
			const seeded = sampleProducts();
			const orderId = await seedOrder(database, seeded);

			await supertest(fastify.server).post(`/orders/${orderId}/processOrder`).expect(200);

			const productNames = seeded.map(p => p.name);
			const rows = await database.query.products.findMany({
				where: inArray(products.name, productNames),
			});
			const byName = new Map(rows.map(r => [r.name, r]));

			expect(byName.get('USB Cable')!.available).toBe(29);
			expect(byName.get('USB Dongle')!.available).toBe(0);
			expect(notificationServiceMock.sendDelayNotification).toHaveBeenCalledWith(10, 'USB Dongle');
		});

		it('decrements stock for in-season SEASONAL and marks out-of-season SEASONAL as out of stock', async () => {
			const seeded = sampleProducts();
			const orderId = await seedOrder(database, seeded);

			await supertest(fastify.server).post(`/orders/${orderId}/processOrder`).expect(200);

			const rows = await database.query.products.findMany({
				where: inArray(products.name, ['Watermelon', 'Grapes']),
			});
			const byName = new Map(rows.map(r => [r.name, r]));

			expect(byName.get('Watermelon')!.available).toBe(29);
			expect(byName.get('Grapes')!.available).toBe(0);
			expect(notificationServiceMock.sendOutOfStockNotification).toHaveBeenCalledWith('Grapes');
		});

		it('decrements stock for unexpired EXPIRABLE and notifies expiration for expired ones', async () => {
			const seeded = sampleProducts();
			const orderId = await seedOrder(database, seeded);

			await supertest(fastify.server).post(`/orders/${orderId}/processOrder`).expect(200);

			const rows = await database.query.products.findMany({
				where: inArray(products.name, ['Butter', 'Milk']),
			});
			const byName = new Map(rows.map(r => [r.name, r]));

			expect(byName.get('Butter')!.available).toBe(29);
			expect(byName.get('Milk')!.available).toBe(0);
			expect(notificationServiceMock.sendExpirationNotification).toHaveBeenCalledWith('Milk', expect.any(Date));
		});

		it('returns 404 when the order does not exist', async () => {
			await supertest(fastify.server)
				.post('/orders/999999/processOrder')
				.expect(404)
				.expect(({body}) => {
					expect(body.code).toBe('ORDER_NOT_FOUND');
				});
		});

		it('returns 400 when orderId is not a positive integer', async () => {
			await supertest(fastify.server).post('/orders/-1/processOrder').expect(400);
		});
	});

	function sampleProducts(): ProductInsert[] {
		const d = 24 * 60 * 60 * 1000;
		return [
			{leadTime: 15, available: 30, type: 'NORMAL', name: 'USB Cable'},
			{leadTime: 10, available: 0, type: 'NORMAL', name: 'USB Dongle'},
			{leadTime: 15, available: 30, type: 'EXPIRABLE', name: 'Butter', expiryDate: new Date(Date.now() + (26 * d))},
			{leadTime: 90, available: 6, type: 'EXPIRABLE', name: 'Milk', expiryDate: new Date(Date.now() - (2 * d))},
			{leadTime: 15, available: 30, type: 'SEASONAL', name: 'Watermelon', seasonStartDate: new Date(Date.now() - (2 * d)), seasonEndDate: new Date(Date.now() + (58 * d))},
			{leadTime: 15, available: 30, type: 'SEASONAL', name: 'Grapes', seasonStartDate: new Date(Date.now() + (180 * d)), seasonEndDate: new Date(Date.now() + (240 * d))},
		];
	}

	async function seedOrder(db: Database, items: ProductInsert[]): Promise<number> {
		return db.transaction(tx => {
			const productList = tx.insert(products).values(items).returning({productId: products.id}).all();
			const order = tx.insert(orders).values([{}]).returning({orderId: orders.id}).get();
			tx.insert(ordersToProducts).values(productList.map(p => ({orderId: order!.orderId, productId: p.productId}))).run();
			return order!.orderId;
		});
	}
});
