export class ExpirationDate {
	public constructor(private readonly date: Date) {}

	public hasExpiredAt(now: Date): boolean {
		return now > this.date;
	}

	public raw(): Date {
		return this.date;
	}
}
