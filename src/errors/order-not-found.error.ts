import {BaseError} from './base.error.js';

export class OrderNotFoundError extends BaseError {
	public readonly status = 404;
	public readonly code = 'ORDER_NOT_FOUND';

	public constructor(orderId: number) {
		super(`Order ${orderId} not found`);
	}
}
