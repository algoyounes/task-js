import {type Cradle, diContainer} from '@fastify/awilix';
import {asClass, asValue} from 'awilix';
import {type FastifyBaseLogger, type FastifyInstance} from 'fastify';
import {type INotificationService} from '@/services/notifications.port.js';
import {NotificationService} from '@/services/impl/notification.service.js';
import {type Database} from '@/db/type.js';
import {OrdersRepository} from '@/repositories/orders.repository.js';
import {ProductsRepository} from '@/repositories/products.repository.js';
import {OrdersManager} from '@/managers/orders.manager.js';
import {ProductsManager} from '@/managers/products.manager.js';
import { OrderService } from '@/orders/order.service';

declare module '@fastify/awilix' {
	interface Cradle { // eslint-disable-line @typescript-eslint/consistent-type-definitions
		logger: FastifyBaseLogger;
		db: Database;
		ns: INotificationService;
		ordersRepository: OrdersRepository;
		productsRepository: ProductsRepository;
		ordersManager: OrdersManager;
		productsManager: ProductsManager;
		OrderService: OrderService;
	}
}

export async function configureDiContext(server: FastifyInstance): Promise<void> {
	diContainer.register({
		logger: asValue(server.log),
		db: asValue(server.database),
		ns: asClass(NotificationService).singleton(),
		ordersRepository: asClass(OrdersRepository).singleton(),
		productsRepository: asClass(ProductsRepository).singleton(),
		ordersManager: asClass(OrdersManager).singleton(),
		productsManager: asClass(ProductsManager).singleton(),
		normalProductHandler: asClass(NormalProductHandler).singleton(),
		seasonalProductHandler: asClass(SeasonalProductHandler).singleton(),
		expirableProductHandler: asClass(ExpirableProductHandler).singleton(),
		productHandlerRegistry: asClass(ProductHandlerRegistry).singleton(),
		orderService: asClass(OrderService).singleton(),
		orderController: asClass(OrderController).singleton(),
	});
}

export function resolve<Service extends keyof Cradle>(service: Service): Cradle[Service] {
	return diContainer.resolve(service);
}
