export class SeasonWindow {
	public constructor(
		private readonly startDate: Date,
		private readonly endDate: Date,
	) {
		if (startDate >= endDate) {
			throw new Error('SeasonWindow: start date must be strictly before end date');
		}
	}

	public contains(date: Date): boolean {
		return date > this.startDate && date < this.endDate;
	}

	public endsBefore(date: Date): boolean {
		return this.endDate < date;
	}

	public startsAfter(date: Date): boolean {
		return this.startDate > date;
	}
}
