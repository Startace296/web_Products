// Layer: service — pure business logic, no Express import (req/res).
import { newsletterRepository } from "../repositories/newsletterRepository";
import type { SubscribeNewsletterInput } from "../validations/newsletterValidation";

const subscribe = async (input: SubscribeNewsletterInput): Promise<void> => {
  await newsletterRepository.upsertByEmail(input);
};

export const newsletterService = {
  subscribe,
};
