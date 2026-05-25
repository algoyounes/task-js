export const ProductType = {
	NORMAL: 'NORMAL',
	SEASONAL: 'SEASONAL',
	EXPIRABLE: 'EXPIRABLE',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];
