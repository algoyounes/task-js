import {type Cradle} from '@fastify/awilix';
import {type Product} from '@/domain/product/product.entity.js';
import {type ProductsManager} from '@/managers/products.manager.js';
import {type IProductHandler} from '@/domain/product/services/product-handler.port.js';
import {ProductType} from '@/types/product.types.js';

export class SeasonalProductHandler implements IProductHandler {
	public readonly type = ProductType.SEASONAL;

	private readonly productsManager: ProductsManager;

	public constructor({productsManager}: Pick<Cradle, 'productsManager'>) {
		this.productsManager = productsManager;
	}

	public async handle(product: Product): Promise<void> 
	{
		const now = new Date();

		if (product.isInSeason(now) && product.hasStock()) {
			await this.productsManager.reserveStock(product);
			return;
		}

		const restockArrivesAfterSeasonEnds = product.seasonWindow?.endsBefore(product.restockArrivalDate(now)) ?? false;

		if (restockArrivesAfterSeasonEnds) {
			this.productsManager.notifyOutOfStock(product);
			await this.productsManager.markOutOfStock(product);
			
			return;
		}

		const seasonHasNotStarted = product.seasonWindow?.startsAfter(now) ?? false;

		if (seasonHasNotStarted) {
			this.productsManager.notifyOutOfStock(product);
			await this.productsManager.markOutOfStock(product);
			
			return;
		}

		this.productsManager.notifyDelay(product);
	}
}
