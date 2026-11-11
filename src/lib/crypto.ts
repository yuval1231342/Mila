import { createHmac, randomBytes } from "node:crypto";
import { required } from "./env";
export const newToken = () => randomBytes(32).toString("base64url");
export const hmac = (v: string) => createHmac("sha256", required("SESSION_SECRET")).update(v).digest("hex");
export const hashIp = (ip: string) => hmac("ip:" + ip).slice(0, 32);
