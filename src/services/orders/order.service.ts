import {type Cradle} from '@fastify/awilix';
import {type OrdersManager} from '@/managers/orders.manager.js';
import {type OrderWithProducts} from '@/types/order.types.js';
import { OrderNotFoundError } from '@/errors/order-not-found.error.js';
import { ProductHandlerRegistry } from '@/domain/product/services/product-handler.registry.js';

export class OrderService {
	private readonly ordersManager: OrdersManager;
	private readonly productHandlerRegistry: ProductHandlerRegistry;

	public constructor({
		ordersManager,
		productHandlerRegistry,
	}: Pick<Cradle, 'ordersManager' | 'productHandlerRegistry'>) {
		this.ordersManager = ordersManager;
		this.productHandlerRegistry = productHandlerRegistry;
	}

	public async processOrder(orderId: number): Promise<void> {
		const order = await this.findOrderByIdOrFail(orderId);

		await Promise.all(order.products.map(async product => {
			const handler = this.productHandlerRegistry.for(product.type);

			return handler.handle(product);
		}));
	}

	public async findOrderByIdOrFail(orderId: number): Promise<OrderWithProducts> {
		const order = await this.ordersManager.findById(orderId);
		if (order === null) {
			throw new OrderNotFoundError(orderId);
		}

		return order;
	}
}
