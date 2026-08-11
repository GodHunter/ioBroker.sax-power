import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SaxPowerObjectAdapter } from "./adapterContract";
import { SaxPowerStateEngine } from "./stateEngine";

describe("object hierarchy", () => {
	it("declares the info channel before its instance states", () => {
		const ioPackage = JSON.parse(
			readFileSync(join(process.cwd(), "io-package.json"), "utf8"),
		) as { instanceObjects: ioBroker.Object[] };

		const infoIndex = ioPackage.instanceObjects.findIndex(
			(object) => object._id === "info",
		);
		const connectionIndex = ioPackage.instanceObjects.findIndex(
			(object) => object._id === "info.connection",
		);

		assert.notEqual(infoIndex, -1);
		assert.equal(ioPackage.instanceObjects[infoIndex]?.type, "channel");
		assert.ok(infoIndex < connectionIndex);
	});

	it("creates the devices container as a folder", async () => {
		const extendedObjects: Array<{
			id: string;
			object: ioBroker.PartialObject;
		}> = [];
		const adapter: SaxPowerObjectAdapter = {
			extendObjectAsync: async (id, object) => {
				extendedObjects.push({ id, object });
			},
			setStateAsync: async () => undefined,
			delObjectAsync: async () => undefined,
		};
		const engine = new SaxPowerStateEngine(adapter);

		await (
			engine as unknown as { ensureRootObject(): Promise<void> }
		).ensureRootObject();

		assert.deepEqual(extendedObjects, [
			{
				id: "devices",
				object: {
					type: "folder",
					common: { name: "SAX Power devices" },
					native: {},
				},
			},
		]);
	});
});
