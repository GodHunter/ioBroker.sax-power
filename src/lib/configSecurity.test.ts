import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("configuration security", () => {
	it("encrypts and protects the cloud password through io-package metadata", () => {
		const ioPackage = JSON.parse(
			readFileSync(join(process.cwd(), "io-package.json"), "utf8"),
		) as { encryptedNative?: string[]; protectedNative?: string[] };

		assert.deepEqual(ioPackage.encryptedNative, ["password"]);
		assert.deepEqual(ioPackage.protectedNative, ["password"]);

		const adminSource = readFileSync(
			join(process.cwd(), "src-admin", "src", "App.tsx"),
			"utf8",
		);
		assert.doesNotMatch(
			adminSource,
			/encryptedFields\s*:/,
			"GenericApp must consume encryptedNative and must not decrypt the password a second time",
		);
	});
});
