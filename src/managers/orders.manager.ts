import {type Cradle} from '@fastify/awilix';
import {Product} from '@/domain/product/product.entity.js';
import {type OrdersRepository} from '@/repositories/orders.repository.js';
import {type OrderWithProducts} from '@/types/order.types.js';

export class OrdersManager {
	private readonly ordersRepository: OrdersRepository;

	public constructor({ordersRepository}: Pick<Cradle, 'ordersRepository'>) {
		this.ordersRepository = ordersRepository;
	}

	public async findById(id: number): Promise<OrderWithProducts | null> {
		const row = await this.ordersRepository.findById(id);
		if (row === null) {
			return null;
		}

		return {
			id: row.id,
			products: row.products.map(({product}) => Product.fromPersistence(product)),
		};
	}
}
