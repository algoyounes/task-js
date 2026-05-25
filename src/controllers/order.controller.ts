import {type Cradle} from '@fastify/awilix';
import {type FastifyReply, type FastifyRequest} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import {serializerCompiler, validatorCompiler, type ZodTypeProvider} from 'fastify-type-provider-zod';
import {type OrderService} from '@/services/orders/order.service.js';
import {processOrderParams, type ProcessOrderParams} from './process-order.request.js';

export class OrderController {
	private readonly orderService: OrderService;

	public constructor({orderService}: Pick<Cradle, 'orderService'>) {
		this.orderService = orderService;
	}

	public async processOrder(
		request: FastifyRequest<{Params: ProcessOrderParams}>,
		reply: FastifyReply,
	): Promise<void> {
		const {orderId} = request.params;
		await this.orderService.processOrder(orderId);
		await reply.send({orderId});
	}
}

export const orderControllerRoutes = fastifyPlugin(async server => {
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.withTypeProvider<ZodTypeProvider>().post<{Params: ProcessOrderParams}>(
		'/orders/:orderId/processOrder',
		{schema: {params: processOrderParams}},
		async (request, reply) => {
			const controller = server.diContainer.resolve('orderController');
			await controller.processOrder(request, reply);
		},
	);
});
