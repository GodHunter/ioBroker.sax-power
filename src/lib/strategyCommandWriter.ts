export interface StrategyCommandWriter {
	setForeignState(
		stateId: string,
		value: number,
		acknowledged: false,
	): Promise<void>;
}
