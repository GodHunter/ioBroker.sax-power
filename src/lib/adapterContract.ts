export interface SaxPowerObjectAdapter {
extendObjectAsync(
id: string,
object: ioBroker.PartialObject,
): Promise<unknown>;

setStateAsync(
id: string,
state: ioBroker.SettableState,
): Promise<unknown>;

delObjectAsync(
id: string,
options?: {
recursive?: boolean;
},
): Promise<unknown>;
}
