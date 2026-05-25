import {type Product} from '@/domain/product/product.entity.js';
import {type ProductType} from '@/types/product.types.js';

export type IProductHandler = {
	readonly type: ProductType;
	handle(product: Product): Promise<void>;
};
