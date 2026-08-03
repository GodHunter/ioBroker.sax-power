import type {
	SaxPowerEnergyChartResponse,
} from "./saxPowerHistory";

export interface SaxPowerHistoryRequestOptions {
baseUrl: string;
accessToken: string;
timeoutMs?: number;
}

export class SaxPowerHistoryError
	extends Error {
	public constructor(
		message: string,
public readonly statusCode?: number,
	) {
		super(message);

		this.name = "SaxPowerHistoryError";
	}
}

export class SaxPowerHistoryClient {
	private readonly baseUrl: string;
	private readonly accessToken: string;
	private readonly timeoutMs: number;

	public constructor(
		options: SaxPowerHistoryRequestOptions,
	) {
		this.baseUrl =
options.baseUrl.replace(
	/\/+$/,
	"",
);

		this.accessToken =
options.accessToken;

		this.timeoutMs =
options.timeoutMs ?? 30_000;
	}

	public async getEnergyChart(
		serialNumber: string,
		days: string,
	): Promise<SaxPowerEnergyChartResponse> {
		const url =
new globalThis.URL(
	`${this.baseUrl}/api/auth/energy_chart/`,
);

		url.searchParams.set(
			"sn",
			serialNumber,
		);

		url.searchParams.set(
			"m2",
			"true",
		);

		url.searchParams.set(
			"m4",
			"true",
		);

		url.searchParams.set(
			"m5",
			"true",
		);

		url.searchParams.set(
			"days",
			days,
		);

		const controller =
new globalThis.AbortController();

		const timeout =
globalThis.setTimeout(
	() => controller.abort(),
	this.timeoutMs,
);

		try {
			const response =
await globalThis.fetch(
	url,
	{
		method: "GET",
		headers: {
			Accept:
"application/json",

			Authorization:
`Bearer ${this.accessToken}`,
		},
		signal:
controller.signal,
	},
);

			if (!response.ok) {
				throw new SaxPowerHistoryError(
					`SAX Power history request failed with HTTP ${response.status}.`,
					response.status,
				);
			}

			const payload: unknown =
await response.json();

			if (
				typeof payload !==
"object" ||
payload === null ||
Array.isArray(payload)
			) {
				throw new SaxPowerHistoryError(
					"The SAX Power history response is not an object.",
				);
			}

			return payload as
SaxPowerEnergyChartResponse;
		} catch (error) {
			if (
				error instanceof
SaxPowerHistoryError
			) {
				throw error;
			}

			if (
				error instanceof Error &&
error.name === "AbortError"
			) {
				throw new SaxPowerHistoryError(
					"The SAX Power history request timed out.",
				);
			}

			throw new SaxPowerHistoryError(
				error instanceof Error
					? error.message
					: String(error),
			);
		} finally {
			globalThis.clearTimeout(
				timeout,
			);
		}
	}
}
