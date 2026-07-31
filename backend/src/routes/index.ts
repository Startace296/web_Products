import { Router } from "express";
import { authRouter } from "./authRoutes";
import { productRouter } from "./productRoutes";
import { reviewRouter } from "./reviewRoutes";
import { voteRouter } from "./voteRoutes";
import { commentRouter } from "./commentRoutes";
import { notificationRouter } from "./notificationRoutes";
import { userRouter } from "./userRoutes";
import { cartRouter } from "./cartRoutes";
import { orderRouter } from "./orderRoutes";
import { paymentRouter } from "./paymentRoutes";
import { newsletterRouter } from "./newsletterRoutes";

export const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "TechPulse API is running" });
});

router.use("/auth", authRouter);
router.use("/products", productRouter);
router.use("/reviews", reviewRouter);
router.use("/reviews", voteRouter);
router.use("/comments", commentRouter);
router.use("/notifications", notificationRouter);
router.use("/users", userRouter);
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);
router.use("/payments/vnpay", paymentRouter);
router.use("/newsletter", newsletterRouter);
