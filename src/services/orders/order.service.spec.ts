import {describe, it, expect, vi} from 'vitest';
import {mockDeep} from 'vitest-mock-extended';
import {type OrdersManager} from '@/managers/orders.manager.js';
import {OrderNotFoundError} from '@/errors/order-not-found.error.js';
import {Product} from '@/domain/product/product.entity.js';
import {type IProductHandler} from '@/domain/product/services/product-handler.port.js';
import {type ProductHandlerRegistry} from '@/domain/product/services/product-handler.registry.js';
import {ProductType} from '@/types/product.types.js';
import {type OrderWithProducts} from '@/types/order.types.js';
import {OrderService} from './order.service.js';

const buildProduct = (overrides: Partial<{id: number; type: ProductType; name: string; available: number; leadTime: number}> = {}): Product => Product.fromPersistence({
	id: overrides.id ?? 1,
	name: overrides.name ?? 'Sample',
	type: overrides.type ?? ProductType.NORMAL,
	available: overrides.available ?? 1,
	leadTime: overrides.leadTime ?? 0,
	seasonStartDate: null,
	seasonEndDate: null,
	expiryDate: null,
});

describe('OrderService.processOrder', () => {
	it('throws OrderNotFoundError when the order is missing', async () => {
		const ordersManager = mockDeep<OrdersManager>();
		ordersManager.findById.mockResolvedValue(null);

		const service = new OrderService({
			ordersManager,
			productHandlerRegistry: mockDeep<ProductHandlerRegistry>(),
		});

		await expect(service.processOrder(42)).rejects.toBeInstanceOf(OrderNotFoundError);
	});

	it('dispatches every line item to the handler matching its type', async () => {
		const normal = buildProduct({id: 1, type: ProductType.NORMAL});
		const seasonal = buildProduct({id: 2, type: ProductType.SEASONAL});
		const expirable = buildProduct({id: 3, type: ProductType.EXPIRABLE});

		const order: OrderWithProducts = {
			id: 7,
			products: [normal, seasonal, expirable],
		};

		const ordersManager = mockDeep<OrdersManager>();
		ordersManager.findById.mockResolvedValue(order);

		const normalHandler: IProductHandler = {type: ProductType.NORMAL, handle: vi.fn().mockResolvedValue(undefined)};
		const seasonalHandler: IProductHandler = {type: ProductType.SEASONAL, handle: vi.fn().mockResolvedValue(undefined)};
		const expirableHandler: IProductHandler = {type: ProductType.EXPIRABLE, handle: vi.fn().mockResolvedValue(undefined)};

		const registry = mockDeep<ProductHandlerRegistry>();
		registry.for.mockImplementation(type => {
			if (type === ProductType.NORMAL) return normalHandler;
			if (type === ProductType.SEASONAL) return seasonalHandler;
			return expirableHandler;
		});

		const service = new OrderService({ordersManager, productHandlerRegistry: registry});
		await service.processOrder(7);

		expect(normalHandler.handle).toHaveBeenCalledWith(normal);
		expect(seasonalHandler.handle).toHaveBeenCalledWith(seasonal);
		expect(expirableHandler.handle).toHaveBeenCalledWith(expirable);
	});
});
