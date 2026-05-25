import {type Cradle} from '@fastify/awilix';
import {eq} from 'drizzle-orm';
import {type Order as OrderRow, type Product as ProductRow, orders} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

export type OrderRowWithProductRows = OrderRow & {
	products: Array<{product: ProductRow}>;
};

export class OrdersRepository {
	private readonly db: Database;

	public constructor({db}: Pick<Cradle, 'db'>) {
		this.db = db;
	}

	public async findById(id: number): Promise<OrderRowWithProductRows | null> {
		const row = await this.db.query.orders.findFirst({
			where: eq(orders.id, id),
			with: {
				products: {
					columns: {},
					with: {product: true},
				},
			},
		});

		return row ?? null;
	}
}
