import { Electroview } from "electrobun/view";
import type { AppRPCSchema } from "@/shared/rpc";

export const appRpc = Electroview.defineRPC<AppRPCSchema>({
	maxRequestTime: 5 * 60 * 1000,
	handlers: {
		requests: {},
		messages: {},
	},
});

export const electroview = new Electroview({ rpc: appRpc });

void electroview;
