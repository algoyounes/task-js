import {type Cradle} from '@fastify/awilix';
import {type Product} from '@/domain/product/product.entity.js';
import {type ProductsManager} from '@/managers/products.manager.js';
import {type IProductHandler} from '@/domain/product/services/product-handler.port.js';
import {ProductType} from '@/types/product.types.js';

export class ExpirableProductHandler implements IProductHandler {
	public readonly type = ProductType.EXPIRABLE;

	private readonly productsManager: ProductsManager;

	public constructor({productsManager}: Pick<Cradle, 'productsManager'>) 
	{
		this.productsManager = productsManager;
	}

	public async handle(product: Product): Promise<void> 
	{
		const now = new Date();

		if (product.hasStock() && !product.isExpired(now)) {
			await this.productsManager.reserveStock(product);
			
			return;
		}

		if (product.expiration !== null) {
			this.productsManager.notifyExpiration(product);
		}

		await this.productsManager.markOutOfStock(product);
	}
}
