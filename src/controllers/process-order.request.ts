import {z} from 'zod';

export const processOrderParams = z.object({
	orderId: z.coerce.number().int().positive(),
});

export type ProcessOrderParams = z.infer<typeof processOrderParams>;
