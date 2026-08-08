// Integration test qua HTTP thật cho luồng cập nhật trạng thái đơn hàng của admin
// (tính năng vừa thêm — xem AdminOrderList.tsx phía frontend). Cố tình test bằng DB
// MySQL thật thay vì mock Prisma: transition CANCELLED phải hoàn kho THẬT trong 1
// transaction (orderService.updateStatus) — 1 mock repository dễ "cho qua" bug ở chính
// bước ghi DB đó, còn assert trên state đã persist thì không thể giả được.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Product, User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { app, createTestAdmin, createTestUser, authHeaderFor } from "./helpers";

const createProduct = (stock: number): Promise<Product> =>
  prisma.product.create({
    data: {
      name: "Test Headphones",
      slug: `test-headphones-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      description: "For testing only",
      category: "Audio",
      price: 100_000,
      stock,
    },
  });

interface CreateOrderOpts {
  user: User;
  product: Product;
  quantity: number;
  status: "CONFIRMED" | "SHIPPING" | "COMPLETED" | "CANCELLED" | "PENDING_PAYMENT";
}

const createOrder = ({ user, product, quantity, status }: CreateOrderOpts) =>
  prisma.order.create({
    data: {
      userId: user.id,
      status,
      paymentMethod: "COD",
      paymentStatus: "UNPAID",
      totalAmount: product.price * quantity,
      recipientName: user.name,
      recipientPhone: "0900000000",
      shippingAddress: "123 Test Street, Test City",
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity,
            imageUrl: product.imageUrl,
          },
        ],
      },
    },
  });

describe("PATCH /api/v1/orders/admin/:id/status", () => {
  let admin: User;
  let customer: User;

  beforeEach(async () => {
    admin = await createTestAdmin();
    customer = await createTestUser();
  });

  it("lets an admin move a CONFIRMED order to SHIPPING", async () => {
    const product = await createProduct(8);
    const order = await createOrder({ user: customer, product, quantity: 2, status: "CONFIRMED" });

    const res = await request(app)
      .patch(`/api/v1/orders/admin/${order.id}/status`)
      .set(...authHeaderFor(admin))
      .send({ status: "SHIPPING" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SHIPPING");
  });

  it("rejects a non-admin even when authenticated", async () => {
    const product = await createProduct(8);
    const order = await createOrder({ user: customer, product, quantity: 2, status: "CONFIRMED" });

    const res = await request(app)
      .patch(`/api/v1/orders/admin/${order.id}/status`)
      .set(...authHeaderFor(customer))
      .send({ status: "SHIPPING" });

    expect(res.status).toBe(403);
  });

  it("rejects a request with no auth at all", async () => {
    const product = await createProduct(8);
    const order = await createOrder({ user: customer, product, quantity: 2, status: "CONFIRMED" });

    const res = await request(app).patch(`/api/v1/orders/admin/${order.id}/status`).send({ status: "SHIPPING" });

    expect(res.status).toBe(401);
  });

  it("rejects an invalid status transition (SHIPPING -> CONFIRMED)", async () => {
    const product = await createProduct(8);
    const order = await createOrder({ user: customer, product, quantity: 2, status: "SHIPPING" });

    const res = await request(app)
      .patch(`/api/v1/orders/admin/${order.id}/status`)
      .set(...authHeaderFor(admin))
      .send({ status: "CONFIRMED" });

    expect(res.status).toBe(400);
  });

  it("restores stock when an admin cancels a CONFIRMED order", async () => {
    // stock=8 mô phỏng trạng thái NGAY SAU khi đơn qty=2 đã được tạo từ kho gốc 10
    // (xem orderService.create — COD trừ kho thật lúc tạo đơn).
    const product = await createProduct(8);
    const order = await createOrder({ user: customer, product, quantity: 2, status: "CONFIRMED" });

    const res = await request(app)
      .patch(`/api/v1/orders/admin/${order.id}/status`)
      .set(...authHeaderFor(admin))
      .send({ status: "CANCELLED" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stock).toBe(10);
  });

  it("returns 404 for an order id that does not exist", async () => {
    const res = await request(app)
      .patch("/api/v1/orders/admin/cknonexistentid000000000/status")
      .set(...authHeaderFor(admin))
      .send({ status: "SHIPPING" });

    expect(res.status).toBe(404);
  });
});
