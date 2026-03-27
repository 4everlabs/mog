import type { MogRuntime } from "@mog/core";
import type { GatewayClient } from "@mog/types";

export const createInProcessGatewayClient = (runtime: MogRuntime): GatewayClient => {
  runtime.kernel.start();
  return runtime.gateway;
};
