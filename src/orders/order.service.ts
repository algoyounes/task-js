import {type Cradle} from '@fastify/awilix';
import {type OrdersManager} from '@/managers/orders.manager.js';
import {type OrderWithProducts} from '@/types/order.types.js';

export class OrderService {
	private readonly ordersManager: OrdersManager;

	public constructor({
		ordersManager
	}: Pick<Cradle, 'ordersManager'>) {
		this.ordersManager = ordersManager;
	}

	private async findOrderByIdOrFail(orderId: number): Promise<OrderWithProducts> {
		const order = await this.ordersManager.findById(orderId);
		if (order === null) {
			throw new Error(`Order with id ${orderId} not found`);
		}

		return order;
	}
}
