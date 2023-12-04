"use server";

import { auth } from "@clerk/nextjs";
import { InputType, ReturnType } from "./types";
import { prismadb } from "@/lib/prismadb";
import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/create-safe-action";
import { CopyCard } from "./schema";

const handler = async (data: InputType): Promise<ReturnType> => {
  const { userId, orgId } = auth();

  if (!userId || !orgId) {
    return { error: "Unauthorized" };
  }

  const { id, boardId } = data;

  let card;

  try {
    const cardToCopy = await prismadb.card.findFirst({
      where: { id, list: { board: { orgId } } },
    });

    if (!cardToCopy) {
      return {
        error: "Card not found",
      };
    }

    const lastCard = await prismadb.card.findFirst({
      where: { listId: cardToCopy.listId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = lastCard ? lastCard.order + 1 : 1;

    card = await prismadb.card.create({
      data: {
        title: `${cardToCopy.title} - Copy`,
        description: cardToCopy.description,
        order: newOrder,
        listId: cardToCopy.listId,
      },
    });
  } catch (error) {
    return {
      error: "Failed to copy.",
    };
  }

  revalidatePath(`/board/${boardId}`);
  return { data: card };
};

export const copyCard = createSafeAction(CopyCard, handler);
