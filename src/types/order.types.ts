import {type Product} from '@/domain/product/product.entity.js';

export type OrderWithProducts = {
	id: number;
	products: Product[];
};
