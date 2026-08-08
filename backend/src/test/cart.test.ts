// Integration test qua HTTP thật (supertest + Express thật + MySQL test thật) cho
// CRUD giỏ hàng. Trọng tâm: subtotal/totalAmount tính đúng, cộng dồn quantity khi thêm
// lại cùng 1 sản phẩm, chặn vượt MAX_QUANTITY_PER_ITEM/stock, cô lập giỏ hàng giữa các
// user — và 1 test dựng lại race điều kiện 2 request "thêm vào giỏ" chạy song song, vì
// cartService.addItem đọc existing.quantity rồi mới check cap (không atomic với việc ghi
// increment ở DB), xem cartService.ts.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Product, User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { MAX_QUANTITY_PER_ITEM } from "../validations/cartValidation";
import { app, createTestUser, authHeaderFor } from "./helpers";

interface CreateProductOpts {
  price?: number;
  stock?: number;
}

const createProduct = ({ price = 100_000, stock = 20 }: CreateProductOpts = {}): Promise<Product> =>
  prisma.product.create({
    data: {
      name: "Test Headphones",
      slug: `test-headphones-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      description: "For testing only",
      category: "Audio",
      price,
      stock,
    },
  });

const addCartItem = (userId: string, productId: string, quantity: number) =>
  prisma.cartItem.create({ data: { userId, productId, quantity } });

describe("Cart", () => {
  let customer: User;
  let other: User;

  beforeEach(async () => {
    customer = await createTestUser();
    other = await createTestUser();
  });

  describe("GET /api/v1/cart", () => {
    it("returns an empty cart for a user who has never added anything", async () => {
      const res = await request(app).get("/api/v1/cart").set(...authHeaderFor(customer));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ items: [], totalItems: 0, totalAmount: 0 });
    });

    it("computes subtotal/totalItems/totalAmount live from the current product price", async () => {
      const product = await createProduct({ price: 150_000, stock: 20 });
      await addCartItem(customer.id, product.id, 3);

      const res = await request(app).get("/api/v1/cart").set(...authHeaderFor(customer));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]).toMatchObject({ productId: product.id, quantity: 3, subtotal: 450_000 });
      expect(res.body.data.totalItems).toBe(3);
      expect(res.body.data.totalAmount).toBe(450_000);
    });

    it("only shows the requesting user's own items", async () => {
      const product = await createProduct();
      await addCartItem(other.id, product.id, 2);

      const res = await request(app).get("/api/v1/cart").set(...authHeaderFor(customer));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });

    it("rejects a request with no auth at all", async () => {
      const res = await request(app).get("/api/v1/cart");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/cart/items", () => {
    it("adds a new product to an empty cart", async () => {
      const product = await createProduct({ price: 100_000, stock: 20 });

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set(...authHeaderFor(customer))
        .send({ productId: product.id, quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body.data.items).toEqual([expect.objectContaining({ productId: product.id, quantity: 2 })]);
    });

    it("accumulates quantity when the same product is added again instead of overwriting it", async () => {
      const product = await createProduct({ stock: 20 });
      await addCartItem(customer.id, product.id, 3);

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set(...authHeaderFor(customer))
        .send({ productId: product.id, quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body.data.items[0].quantity).toBe(5);
    });

    it(`rejects adding past the ${MAX_QUANTITY_PER_ITEM}-unit cap, counting what is already in the cart`, async () => {
      const product = await createProduct({ stock: 20 });
      await addCartItem(customer.id, product.id, 9);

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set(...authHeaderFor(customer))
        .send({ productId: product.id, quantity: 2 });

      expect(res.status).toBe(400);
      const item = await prisma.cartItem.findUniqueOrThrow({
        where: { userId_productId: { userId: customer.id, productId: product.id } },
      });
      expect(item.quantity).toBe(9);
    });

    it("rejects adding more than the available stock", async () => {
      const product = await createProduct({ stock: 5 });

      const res = await request(app)
        .post("/api/v1/cart/items")
        .set(...authHeaderFor(customer))
        .send({ productId: product.id, quantity: 6 });

      expect(res.status).toBe(400);
    });

    it("returns 404 for a product id that does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/cart/items")
        .set(...authHeaderFor(customer))
        .send({ productId: "cknonexistentid000000000", quantity: 1 });

      expect(res.status).toBe(404);
    });

    it("rejects a request with no auth at all", async () => {
      const product = await createProduct();
      const res = await request(app).post("/api/v1/cart/items").send({ productId: product.id, quantity: 1 });
      expect(res.status).toBe(401);
    });

    // cartService.addItem reads `existing.quantity` and validates the cap BEFORE the DB
    // write, then writes via an atomic `increment` — the validation itself is not atomic
    // with the write. Two requests that each individually stay within the cap can both
    // read the same pre-write quantity and both pass, so the increments stack past the cap.
    it("does not let two concurrent add-to-cart requests push quantity past the cap", async () => {
      const product = await createProduct({ stock: 100 });
      await addCartItem(customer.id, product.id, 8);

      const [resA, resB] = await Promise.all([
        request(app)
          .post("/api/v1/cart/items")
          .set(...authHeaderFor(customer))
          .send({ productId: product.id, quantity: 2 }),
        request(app)
          .post("/api/v1/cart/items")
          .set(...authHeaderFor(customer))
          .send({ productId: product.id, quantity: 2 }),
      ]);

      // At least one of the two must be rejected once the total would exceed the cap —
      // both succeeding means the cap was silently violated.
      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 400]);

      const item = await prisma.cartItem.findUniqueOrThrow({
        where: { userId_productId: { userId: customer.id, productId: product.id } },
      });
      expect(item.quantity).toBeLessThanOrEqual(MAX_QUANTITY_PER_ITEM);
    });
  });

  describe("PATCH /api/v1/cart/items/:productId", () => {
    it("sets the quantity to the given absolute value", async () => {
      const product = await createProduct({ price: 100_000, stock: 20 });
      await addCartItem(customer.id, product.id, 2);

      const res = await request(app)
        .patch(`/api/v1/cart/items/${product.id}`)
        .set(...authHeaderFor(customer))
        .send({ quantity: 7 });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0]).toMatchObject({ quantity: 7, subtotal: 700_000 });
    });

    it("removes the item when quantity is set to 0", async () => {
      const product = await createProduct({ stock: 20 });
      await addCartItem(customer.id, product.id, 2);

      const res = await request(app)
        .patch(`/api/v1/cart/items/${product.id}`)
        .set(...authHeaderFor(customer))
        .send({ quantity: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      const item = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: customer.id, productId: product.id } },
      });
      expect(item).toBeNull();
    });

    it("rejects setting a quantity above the available stock", async () => {
      const product = await createProduct({ stock: 5 });
      await addCartItem(customer.id, product.id, 2);

      const res = await request(app)
        .patch(`/api/v1/cart/items/${product.id}`)
        .set(...authHeaderFor(customer))
        .send({ quantity: 6 });

      expect(res.status).toBe(400);
    });

    it("returns 404 when the product was never added to this user's cart", async () => {
      const product = await createProduct();

      const res = await request(app)
        .patch(`/api/v1/cart/items/${product.id}`)
        .set(...authHeaderFor(customer))
        .send({ quantity: 3 });

      expect(res.status).toBe(404);
    });

    it("cannot update another user's cart item", async () => {
      const product = await createProduct({ stock: 20 });
      await addCartItem(other.id, product.id, 2);

      const res = await request(app)
        .patch(`/api/v1/cart/items/${product.id}`)
        .set(...authHeaderFor(customer))
        .send({ quantity: 5 });

      expect(res.status).toBe(404);
      const untouched = await prisma.cartItem.findUniqueOrThrow({
        where: { userId_productId: { userId: other.id, productId: product.id } },
      });
      expect(untouched.quantity).toBe(2);
    });
  });

  describe("DELETE /api/v1/cart/items/:productId", () => {
    it("removes the item and returns the updated cart", async () => {
      const productA = await createProduct({ price: 100_000, stock: 20 });
      const productB = await createProduct({ price: 50_000, stock: 20 });
      await addCartItem(customer.id, productA.id, 1);
      await addCartItem(customer.id, productB.id, 1);

      const res = await request(app)
        .delete(`/api/v1/cart/items/${productA.id}`)
        .set(...authHeaderFor(customer));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([expect.objectContaining({ productId: productB.id })]);
    });

    it("returns 404 when the item is not in this user's cart", async () => {
      const product = await createProduct();

      const res = await request(app)
        .delete(`/api/v1/cart/items/${product.id}`)
        .set(...authHeaderFor(customer));

      expect(res.status).toBe(404);
    });

    it("cannot remove another user's cart item", async () => {
      const product = await createProduct();
      await addCartItem(other.id, product.id, 1);

      const res = await request(app)
        .delete(`/api/v1/cart/items/${product.id}`)
        .set(...authHeaderFor(customer));

      expect(res.status).toBe(404);
      const untouched = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: other.id, productId: product.id } },
      });
      expect(untouched).not.toBeNull();
    });
  });
});
