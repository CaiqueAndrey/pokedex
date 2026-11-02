import { expect, test, type Page } from "@playwright/test";

// Seeds found with the engine: picking the strongest offer every round, `e2e0` wins all five
// battles and `e2e6` loses the first one. Battles are deterministic, so these never flake.

async function draftStrongest(page: Page) {
  for (let round = 1; round <= 6; round++) {
    await expect(page.getByRole("heading", { name: `Draft · rodada ${round} de 6` })).toBeVisible();
    await page
      .getByRole("button", { name: /^Escolher / })
      .last()
      .click();
  }
  await expect(page.getByRole("button", { name: "Batalhar!" })).toBeVisible();
}

async function fightAndSkip(page: Page) {
  await page.getByRole("button", { name: "Batalhar!" }).click();
  await page.getByRole("button", { name: "Pular animação" }).click();
}

test("drafts a team, wins five battles and keeps the badge after reload", async ({ page }) => {
  await page.goto("/gym?seed=e2e0");
  await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
  await expect(page.getByTestId("die-result")).toContainText("O dado caiu em");
  await draftStrongest(page);
  await expect(page.getByTestId("order-item")).toHaveCount(6);

  for (let battle = 1; battle <= 5; battle++) {
    await expect(page.getByText(`Batalha ${battle} de 5`)).toBeVisible();
    await fightAndSkip(page);
    await page.getByRole("button", { name: battle < 5 ? "Próxima batalha" : "Vitória!" }).click();
  }
  await expect(page.getByRole("heading", { name: "Insígnia da Rocha conquistada!" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Insígnia da Rocha conquistada!" })).toBeVisible();
  await page.getByRole("button", { name: "Novo desafio" }).last().click();
  await expect(page.getByRole("img", { name: "Insígnia da Rocha" })).toBeVisible();
});

test("a defeat ends the run", async ({ page }) => {
  await page.goto("/gym?seed=e2e6");
  await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
  await draftStrongest(page);
  await fightAndSkip(page);
  await expect(page.getByTestId("battle-log")).toContainText("Derrota…");
  await page.getByRole("button", { name: "Derrota…" }).click();
  await expect(page.getByRole("heading", { name: "Fim do desafio" })).toBeVisible();
});

test("the draft survives a reload and the reroll can be used once", async ({ page }) => {
  await page.goto("/gym?seed=e2e1");
  await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
  await page
    .getByRole("button", { name: /^Escolher / })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();

  const reroll = page.getByRole("button", { name: /Rolar de novo/ });
  await reroll.click();
  await expect(reroll).toBeDisabled();
});

test("the team order can be changed before a battle", async ({ page }) => {
  await page.goto("/gym?seed=e2e0");
  await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
  await draftStrongest(page);
  const first = page.getByTestId("order-item").first();
  const before = await first.innerText();
  await page
    .getByRole("button", { name: /^Descer / })
    .first()
    .click();
  await expect(first).not.toHaveText(before);
});

test.describe("modes, history and controls", () => {
  test("easy mode shows the opponent in order and your stats", async ({ page }) => {
    await page.goto("/gym?seed=e2e0");
    await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
    await expect(page.getByTestId("mini-stats").first()).toBeVisible();
    await draftStrongest(page);
    await expect(page.getByTestId("opponent-pokemon")).toHaveCount(6);
    await expect(page.getByText("Abre a batalha", { exact: true })).toBeVisible();
    await expect(page.getByTestId("opponent-power")).toContainText("Força total");
    await expect(page.getByTestId("order-item").first().getByTestId("mini-stats")).toBeVisible();
  });

  test("hard mode hides the opponent's team and your stats", async ({ page }) => {
    await page.goto("/gym?seed=e2e0");
    await page.getByRole("button", { name: "Começar desafio: Difícil" }).click();
    await expect(page.getByTestId("mini-stats")).toHaveCount(0);
    await draftStrongest(page);
    await expect(page.getByTestId("hidden-pokemon")).toHaveCount(6);
    await expect(page.getByTestId("opponent-pokemon")).toHaveCount(0);
    await expect(page.getByText(/Modo Difícil · Semente/)).toBeVisible();
  });

  test("the path records each battle and resets with a new run", async ({ page }) => {
    await page.goto("/gym?seed=e2e0");
    await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
    await draftStrongest(page);
    await expect(page.getByTestId("path-next")).toHaveCount(1);
    await fightAndSkip(page);
    await page.getByRole("button", { name: "Próxima batalha" }).click();
    await expect(page.getByTestId("path-won")).toHaveCount(1);
    await expect(page.getByTestId("path-won")).toContainText("Campista Liam");

    await page.getByRole("button", { name: "Abandonar desafio" }).click();
    await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
    await draftStrongest(page);
    await expect(page.getByTestId("path-won")).toHaveCount(0);
  });

  test("a defeat shows game over and the path of battles", async ({ page }) => {
    await page.goto("/gym?seed=e2e6");
    await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
    await draftStrongest(page);
    await fightAndSkip(page);
    await page.getByRole("button", { name: "Derrota…" }).click();
    await expect(page.getByRole("img", { name: /Game over/ })).toBeVisible();
    await expect(page.getByTestId("path-lost")).toHaveCount(1);
  });

  test("team order: tap two Pokémon to swap them", async ({ page }) => {
    await page.goto("/gym?seed=e2e0");
    await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
    await draftStrongest(page);
    const items = page.getByTestId("order-item");
    const names = async () => (await items.allInnerTexts()).map((t) => t.split("\n").join(" "));
    const before = await names();

    await items.nth(0).getByRole("button", { pressed: false }).first().click();
    await items.nth(2).getByRole("button", { pressed: false }).first().click();
    const swapped = await names();
    expect(swapped[0]).toContain(before[2]?.split(" ")[1] ?? "");
  });

  test("battle speed is selectable and remembered", async ({ page }) => {
    await page.goto("/gym");
    await page.getByRole("button", { name: "Rápida" }).click();
    await expect(page.getByRole("button", { name: "Rápida" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.reload();
    await expect(page.getByRole("button", { name: "Rápida" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

test.describe("drag and drop (desktop mouse)", () => {
  // A mouse, not touch: HTML5 drag events only fire for mouse input.
  test.use({ hasTouch: false, isMobile: false, viewport: { width: 1280, height: 900 } });

  test("dragging a Pokémon onto the first slot reorders the team", async ({ page }) => {
    await page.goto("/gym?seed=e2e0");
    await page.getByRole("button", { name: "Começar desafio: Fácil" }).click();
    await draftStrongest(page);
    const items = page.getByTestId("order-item");
    // Drag by the grip handle onto the first row (rows next to each other: no scrolling in between).
    const second = (await items.nth(1).innerText()).split("\n")[1] ?? "";
    await items.nth(1).scrollIntoViewIfNeeded();
    await items.nth(1).dragTo(items.nth(0), { sourcePosition: { x: 12, y: 30 } });
    await expect(items.nth(0)).toContainText(second);
  });
});
