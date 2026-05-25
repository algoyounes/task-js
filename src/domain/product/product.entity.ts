import {type ProductType} from '@/types/product.types.js';
import {SeasonWindow} from './value-objects/season-window.js';
import {ExpirationDate} from './value-objects/expiration-date.js';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export type ProductPersistenceData = {
	id: number;
	name: string;
	type: string;
	available: number;
	leadTime: number;
	seasonStartDate: Date | null;
	seasonEndDate: Date | null;
	expiryDate: Date | null;
};

export class Product {
	public constructor(
		public readonly id: number,
		public readonly name: string,
		public readonly type: ProductType,
		public readonly available: number,
		public readonly leadTime: number,
		public readonly seasonWindow: SeasonWindow | null,
		public readonly expiration: ExpirationDate | null,
	) {}

	public static fromPersistence(data: ProductPersistenceData): Product 
	{
		const seasonWindow = data.seasonStartDate !== null && data.seasonEndDate !== null
			? new SeasonWindow(data.seasonStartDate, data.seasonEndDate)
			: null;

		const expiration = data.expiryDate !== null
			? new ExpirationDate(data.expiryDate)
			: null;

		return new Product(
			data.id,
			data.name,
			data.type as ProductType,
			data.available,
			data.leadTime,
			seasonWindow,
			expiration,
		);
	}

	public hasStock(): boolean {
		return this.available > 0;
	}

	public canBeRestocked(): boolean {
		return this.leadTime > 0;
	}

	public isInSeason(now: Date): boolean {
		return this.seasonWindow?.contains(now) ?? false;
	}

	public isExpired(now: Date): boolean {
		return this.expiration?.hasExpiredAt(now) ?? false;
	}

	public restockArrivalDate(now: Date): Date {
		return new Date(now.getTime() + (this.leadTime * ONE_DAY_MS));
	}
}
