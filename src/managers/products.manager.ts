import {type Cradle} from '@fastify/awilix';
import {Product} from '@/domain/product/product.entity.js';
import {type ProductsRepository} from '@/repositories/products.repository.js';
import {type INotificationService} from '@/services/notifications.port.js';

export class ProductsManager {
	private readonly productsRepository: ProductsRepository;
	private readonly notifications: INotificationService;

	public constructor({productsRepository, ns}: Pick<Cradle, 'productsRepository' | 'ns'>) {
		this.productsRepository = productsRepository;
		this.notifications = ns;
	}

	public async findById(id: number): Promise<Product | null> {
		const row = await this.productsRepository.findById(id);
		return row ? Product.fromPersistence(row) : null;
	}

	public async reserveStock(product: Product): Promise<void> {
		await this.productsRepository.updateAvailable(product.id, product.available - 1);
	}

	public async markOutOfStock(product: Product): Promise<void> {
		await this.productsRepository.updateAvailable(product.id, 0);
	}

	public notifyDelay(product: Product): void {
		this.notifications.sendDelayNotification(product.leadTime, product.name);
	}

	public notifyOutOfStock(product: Product): void {
		this.notifications.sendOutOfStockNotification(product.name);
	}

	public notifyExpiration(product: Product): void {
		if (product.expiration !== null) {
			this.notifications.sendExpirationNotification(product.name, product.expiration.raw());
		}
	}
}
