export interface SaxPowerApiClientOptions {
baseUrl: string;
username: string;
password: string;
requestTimeoutMs?: number;
}

export interface SaxPowerTokenResponse {
access?: string;
access_token?: string;
token?: string;
refresh?: string;
refresh_token?: string;
[key: string]: unknown;
}

export interface SaxPowerLiveDataResponse {
data?: unknown;
[key: string]: unknown;
}

export interface SaxPowerEnergyRecord {
de_time?: string;
me_time?: string;
year?: number;

m2?: number | null;
m2N?: number | null;
m4?: number | null;
m5?: number | null;
m5N?: number | null;

total_m2?: number | null;
total_m2N?: number | null;
total_m4?: number | null;
total_m5?: number | null;
total_m5N?: number | null;
}

export type SaxPowerEnergyChartResponse =
Record<string, SaxPowerEnergyRecord[]>;

export class SaxPowerApiError extends Error {
	public readonly statusCode?: number;
	public readonly responseBody?: string;

	public constructor(
		message: string,
		options?: {
statusCode?: number;
responseBody?: string;
cause?: unknown;
},
	) {
		super(message, {
			cause: options?.cause,
		});

		this.name = "SaxPowerApiError";
		this.statusCode = options?.statusCode;
		this.responseBody = options?.responseBody;
	}
}

export class SaxPowerApiClient {
	private readonly baseUrl: string;
	private readonly username: string;
	private readonly password: string;
	private readonly requestTimeoutMs: number;

	private accessToken: string | undefined;
	private refreshToken: string | undefined;

	public constructor(options: SaxPowerApiClientOptions) {
		this.baseUrl = options.baseUrl.replace(/\/+$/, "");
		this.username = options.username;
		this.password = options.password;
		this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
	}

	public get hasAccessToken(): boolean {
		return Boolean(this.accessToken);
	}

	public clearTokens(): void {
		this.accessToken = undefined;
		this.refreshToken = undefined;
	}

	public async login(): Promise<void> {
		const body = new globalThis.URLSearchParams({
			email: this.username,
			password: this.password,
			stayLoggedIn: "false",
		});

		const response = await this.request<SaxPowerTokenResponse>(
			"/api/auth/token/",
			{
				method: "POST",
				headers: {
					"Content-Type":
						"application/x-www-form-urlencoded",
					Origin: "https://app.sax-power.net",
					Referer: "https://app.sax-power.net/",
				},
				body: body.toString(),
			},
			false,
		);

		const accessToken =
response.access ??
response.access_token ??
response.token;

		if (
			typeof accessToken !== "string" ||
accessToken.length === 0
		) {
			throw new SaxPowerApiError(
				"The SAX Power login response did not contain an access token.",
			);
		}

		this.accessToken = accessToken;

		const refreshToken =
response.refresh ??
response.refresh_token;

		this.refreshToken =
typeof refreshToken === "string" &&
refreshToken.length > 0
	? refreshToken
	: undefined;
	}

	public async getLiveData(): Promise<SaxPowerLiveDataResponse> {
		if (!this.accessToken) {
			await this.login();
		}

		try {
			return await this.request<SaxPowerLiveDataResponse>(
				"/api/auth/data/",
				{
					method: "GET",
				},
				true,
			);
		} catch (error) {
			if (
				error instanceof SaxPowerApiError &&
error.statusCode === 401
			) {
				this.clearTokens();
				await this.login();

				return this.request<SaxPowerLiveDataResponse>(
					"/api/auth/data/",
					{
						method: "GET",
					},
					true,
				);
			}

			throw error;
		}
	}


	public async getEnergyChart(
		serialNumber: string,
		days: string,
	): Promise<SaxPowerEnergyChartResponse> {
		if (!this.accessToken) {
			await this.login();
		}

		const query =
new globalThis.URLSearchParams({
	sn: serialNumber,
	m2: "true",
	m4: "true",
	m5: "true",
	days,
});

		const path =
`/api/auth/energy_chart/?${query.toString()}`;

		try {
			return await this.request<
SaxPowerEnergyChartResponse
>(
	path,
	{
		method: "GET",
	},
	true,
);
		} catch (error) {
			if (
				error instanceof SaxPowerApiError &&
error.statusCode === 401
			) {
				this.clearTokens();
				await this.login();

				return this.request<
SaxPowerEnergyChartResponse
>(
	path,
	{
		method: "GET",
	},
	true,
);
			}

			throw error;
		}
	}


	private async request<T>(
		path: string,
		init: NonNullable<Parameters<typeof globalThis.fetch>[1]>,
		authenticated: boolean,
	): Promise<T> {
		const timeoutSignal = globalThis.AbortSignal.timeout(
			this.requestTimeoutMs,
		);

		const headers = new globalThis.Headers(init.headers);

		headers.set("Accept", "application/json");

		if (
			init.body !== undefined &&
			!headers.has("Content-Type")
		) {
			headers.set("Content-Type", "application/json");
		}

		if (authenticated) {
			if (!this.accessToken) {
				throw new SaxPowerApiError(
					"An authenticated SAX Power request was attempted without an access token.",
				);
			}

			headers.set(
				"Authorization",
				`Bearer ${this.accessToken}`,
			);
		}

		try {
			const response = await globalThis.fetch(
				`${this.baseUrl}${path}`,
				{
					...init,
					headers,
					signal: timeoutSignal,
				},
			);

			const responseBody = await response.text();

			if (!response.ok) {
				throw new SaxPowerApiError(
					`SAX Power API request failed with HTTP ${response.status}.`,
					{
						statusCode: response.status,
						responseBody,
					},
				);
			}

			if (responseBody.length === 0) {
				return {} as T;
			}

			try {
				return JSON.parse(responseBody) as T;
			} catch (error) {
				throw new SaxPowerApiError(
					"The SAX Power API returned invalid JSON.",
					{
						statusCode: response.status,
						responseBody,
						cause: error,
					},
				);
			}
		} catch (error) {
			if (error instanceof SaxPowerApiError) {
				throw error;
			}

			if (
				error instanceof Error &&
				(
					error.name === "AbortError" ||
					error.name === "TimeoutError"
				)
			) {
				throw new SaxPowerApiError(
					`SAX Power API request timed out after ${this.requestTimeoutMs} ms.`,
					{
						cause: error,
					},
				);
			}

			throw new SaxPowerApiError(
				"Unable to communicate with the SAX Power API.",
				{
					cause: error,
				},
			);
		}
	}
}
