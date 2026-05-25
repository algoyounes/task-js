import {type Cradle} from '@fastify/awilix';
import {type Product} from '@/domain/product/product.entity.js';
import {type ProductsManager} from '@/managers/products.manager.js';
import {type IProductHandler} from '@/domain/product/services/product-handler.port.js';
import {ProductType} from '@/types/product.types.js';

export class NormalProductHandler implements IProductHandler {
	public readonly type = ProductType.NORMAL;

	private readonly productsManager: ProductsManager;

	public constructor({productsManager}: Pick<Cradle, 'productsManager'>) {
		this.productsManager = productsManager;
	}

	public async handle(product: Product): Promise<void> 
	{
		if (product.hasStock()) {
			await this.productsManager.reserveStock(product);
	
			return;
		}

		if (product.canBeRestocked()) {
			this.productsManager.notifyDelay(product);
		}
	}
}
