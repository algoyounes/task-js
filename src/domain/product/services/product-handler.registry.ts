import {type Cradle} from '@fastify/awilix';
import {type IProductHandler} from './product-handler.port.js';
import {type ProductType} from '@/types/product.types.js';

export class ProductHandlerRegistry {
	private readonly handlersByType: Map<ProductType, IProductHandler>;

	public constructor({
		normalProductHandler,
		seasonalProductHandler,
		expirableProductHandler,
	}: Pick<Cradle, 'normalProductHandler' | 'seasonalProductHandler' | 'expirableProductHandler'>) {
		const handlers: IProductHandler[] = [
			normalProductHandler,
			seasonalProductHandler,
			expirableProductHandler,
		];
		this.handlersByType = new Map(handlers.map(h => [h.type, h]));
	}

	public for(type: ProductType): IProductHandler {
		const handler = this.handlersByType.get(type);
		if (!handler) {
			throw new Error(`No product handler registered for type "${type}"`);
		}

		return handler;
	}
}
