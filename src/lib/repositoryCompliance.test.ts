import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("repository inclusion compliance", () => {
	it("does not advertise direct GitHub or npm installation", () => {
		const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
		const installationSection = readme.match(/## Installation([\s\S]*?)(?=\n## )/)?.[1] ?? "";

		assert.doesNotMatch(installationSection, /github\.com|npm\s+(?:i|install)/i);
	});

	it("does not declare inactive Modbus configuration fields", () => {
		const ioPackage = JSON.parse(
			readFileSync(join(process.cwd(), "io-package.json"), "utf8"),
		) as { native: Record<string, unknown> };

		for (const field of [
			"modbusControlEnabled",
			"modbusInstance",
			"modbusChargePowerStateId",
			"modbusDischargePowerStateId",
		]) {
			assert.equal(field in ioPackage.native, false, `${field} must not be exposed before it is implemented`);
		}
	});

	it("does not use deprecated directional power roles", () => {
		for (const path of ["src/lib/stateDefinitions.ts", "src/lib/stateEngine.ts"]) {
			const source = readFileSync(join(process.cwd(), path), "utf8");
			assert.doesNotMatch(source, /value\.power\.(?:consumption|production)/);
		}
	});

	it("keeps the English-only admin UI free of German text", () => {
		const source = readFileSync(
			join(process.cwd(), "src-admin", "src", "App.tsx"),
			"utf8",
		);

		assert.doesNotMatch(source, /[äöüÄÖÜß]/);
		assert.doesNotMatch(
			source,
			/\b(?:Anmeldung|Aktualisierungsintervall|Batteriegesundheit|Einstellungen|Nicht verfügbar|Speicher)\b/,
		);
	});
});
