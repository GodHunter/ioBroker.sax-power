"use strict";

// Makes ts-node ignore warnings, so mocha --watch does work
process.env.TS_NODE_IGNORE_WARNINGS = "TRUE";
// Sets the correct tsconfig for testing
process.env.TS_NODE_PROJECT = "tsconfig.json";
// Make ts-node respect the "include" key in tsconfig.json
process.env.TS_NODE_FILES = "TRUE";
// Mocha 11 loads TypeScript test files through its ESM-aware loader on Node 22.
// Keep ts-node in CommonJS mode for tests so extensionless local imports continue
// to resolve exactly like they do in the existing adapter test suite.
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
	module: "CommonJS",
	moduleResolution: "node",
});

// Don't silently swallow unhandled rejections
process.on("unhandledRejection", (e) => {
	throw e;
});

// enable the should interface with sinon
// and load chai-as-promised and sinon-chai by default
const sinonChai = require("sinon-chai");
const chaiAsPromised = require("chai-as-promised");
const { should, use } = require("chai");

should();
use(sinonChai);
use(chaiAsPromised);