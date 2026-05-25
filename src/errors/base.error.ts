export abstract class BaseError extends Error {
	public abstract readonly status: number;
	public abstract readonly code: string;

	public constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}
