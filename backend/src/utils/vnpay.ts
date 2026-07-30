// Tầng: utils — thuần crypto + string building, KHÔNG đụng Express/Prisma.
//
// Thuật toán ký của VNPay (theo sample chính thức của họ): mỗi value được
// encodeURIComponent() rồi thay "%20" thành "+" TRƯỚC khi ghép chuỗi ký — sai bước
// encode này (vd: dùng querystring.stringify để nó tự encode, hoặc bỏ qua bước thay
// "+"),chữ ký sẽ luôn sai dù logic còn lại đúng. Tham số được sắp theo alphabet
// trước khi ký. Không cần thêm dependency nào — crypto là module lõi của Node.
import crypto from "crypto";
import { env } from "../config/env";

export interface VnpayBuildParams {
  txnRef: string;
  amountVnd: number;
  orderInfo: string;
  ipAddr: string;
  createDate?: Date;
  expireMinutes?: number;
}

export interface VnpayVerifyResult {
  isValid: boolean;
  responseCode: string | undefined;
  txnRef: string | undefined;
  amountVnd: number | undefined;
}

const formatVnpDate = (date: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(
    date.getMinutes()
  )}${pad(date.getSeconds())}`;
};

// application/x-www-form-urlencoded: space -> "+", không phải "%20".
const encodeValue = (value: string): string => encodeURIComponent(value).replace(/%20/g, "+");

const buildSignData = (params: Record<string, string>): string =>
  Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeValue(params[key])}`)
    .join("&");

const sign = (params: Record<string, string>): string =>
  crypto.createHmac("sha512", env.VNPAY_HASH_SECRET).update(Buffer.from(buildSignData(params), "utf-8")).digest("hex");

// So sánh hằng thời gian — endpoint xác minh chữ ký thanh toán không nên lộ thông tin
// qua thời gian phản hồi của phép so sánh chuỗi thông thường (===).
const timingSafeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const buildPaymentUrl = ({
  txnRef,
  amountVnd,
  orderInfo,
  ipAddr,
  createDate = new Date(),
  expireMinutes = 15,
}: VnpayBuildParams): string => {
  const expireDate = new Date(createDate.getTime() + expireMinutes * 60_000);

  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.VNPAY_TMN_CODE,
    // VNPay không có đơn vị lẻ cho VND — luôn nhân 100 theo đúng spec của họ.
    vnp_Amount: String(Math.round(amountVnd * 100)),
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: env.VNPAY_RETURN_URL,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: formatVnpDate(createDate),
    vnp_ExpireDate: formatVnpDate(expireDate),
  };

  const secureHash = sign(params);
  return `${env.VNPAY_URL}?${buildSignData(params)}&vnp_SecureHash=${secureHash}`;
};

// query: các tham số vnp_* đã được Express decode (req.query), string-only.
const verify = (query: Record<string, string>): VnpayVerifyResult => {
  const { vnp_SecureHash: receivedHash, vnp_SecureHashType: _ignored, ...rest } = query;
  const expectedHash = sign(rest);

  return {
    isValid: Boolean(receivedHash) && timingSafeEqual(receivedHash, expectedHash),
    responseCode: rest.vnp_ResponseCode,
    txnRef: rest.vnp_TxnRef,
    amountVnd: rest.vnp_Amount ? Number(rest.vnp_Amount) / 100 : undefined,
  };
};

export const vnpay = {
  buildPaymentUrl,
  verify,
};
