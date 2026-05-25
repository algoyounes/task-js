import {type Cradle} from '@fastify/awilix';
import {eq} from 'drizzle-orm';
import {type Product as ProductRow, products} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

export class ProductsRepository {
	private readonly db: Database;

	public constructor({db}: Pick<Cradle, 'db'>) {
		this.db = db;
	}

	public async findById(id: number): Promise<ProductRow | null> {
		const row = await this.db.query.products.findFirst({
			where: eq(products.id, id),
		});

		return row ?? null;
	}
}
